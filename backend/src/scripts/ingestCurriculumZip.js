import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import 'dotenv/config';
import connectDB, { disconnectDB } from '../config/db.js';
import Teacher from '../models/Teacher.js';
import SyllabusDocument from '../models/SyllabusDocument.js';
import IngestionJob from '../models/IngestionJob.js';
import storageService from '../services/storage/storageService.js';
import { sanitizeFileName } from '../utils/fileValidation.js';
import { claimNextJob, processJob } from '../workers/ingestionWorker.js';

function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach((arg) => {
    if (arg.startsWith('--')) {
      const parts = arg.slice(2).split('=');
      const key = parts[0];
      const val = parts.length > 1 ? parts.slice(1).join('=') : true;
      args[key] = val;
    }
  });
  return args;
}

// Map folder/file keywords to canonical Neev grades
function detectGrade(filePath) {
  const norm = filePath.toLowerCase();
  if (norm.includes('class 10') || norm.includes('class10') || norm.includes('grade 10') || norm.includes('grade10')) return 'Grade 10';
  if (norm.includes('class 9') || norm.includes('class9') || norm.includes('grade 9') || norm.includes('grade9')) return 'Grade 9';
  if (norm.includes('class 8') || norm.includes('class8') || norm.includes('grade 8') || norm.includes('grade8')) return 'Grade 8';
  if (norm.includes('class 7') || norm.includes('class7') || norm.includes('grade 7') || norm.includes('grade7')) return 'Grade 7';
  if (norm.includes('class 6') || norm.includes('class6') || norm.includes('grade 6') || norm.includes('grade6')) return 'Grade 6';
  return 'Grade 8'; // Default fallback
}

// Map folder/file keywords to canonical Neev subjects
function detectSubject(filePath) {
  const norm = filePath.toLowerCase();
  if (norm.includes('math') || norm.includes('algebra') || norm.includes('geometry')) return 'Mathematics';
  if (norm.includes('science') || norm.includes('physics') || norm.includes('chemistry') || norm.includes('biology')) return 'Science / Physics';
  if (norm.includes('english') || norm.includes('literature') || norm.includes('grammar')) return 'English Language';
  if (norm.includes('social') || norm.includes('history') || norm.includes('geography') || norm.includes('civics')) return 'Social Studies';
  return 'Mathematics'; // Default fallback
}

// Recursively find all PDF files
function getPdfFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getPdfFiles(fullPath));
    } else if (file.toLowerCase().endsWith('.pdf')) {
      results.push(fullPath);
    }
  }
  return results;
}

async function main() {
  const args = parseArgs();
  console.log('='.repeat(78));
  console.log('Neev — Comprehensive Curriculum Zip Ingestion Pipeline');
  console.log('='.repeat(78));

  // 1. Locate zip or directory
  let zipPath = args.zip || args.file;
  let targetDir = args.dir;

  // Auto-detect common user download location if not provided
  if (!zipPath && !targetDir) {
    const defaultDownloadsZip = path.join(
      process.env.USERPROFILE || 'C:\\Users\\Bairy Adhithya',
      'Downloads',
      'Study Materials zip.zip'
    );
    if (fs.existsSync(defaultDownloadsZip)) {
      zipPath = defaultDownloadsZip;
      console.log(`[Auto-Detected] Found curriculum zip at: ${zipPath}`);
    }
  }

  // If zip provided, extract it
  if (zipPath) {
    if (!fs.existsSync(zipPath)) {
      console.error(`[ERROR] Zip file not found at: ${zipPath}`);
      process.exit(1);
    }

    targetDir = path.resolve('c:/Neev/data/syllabus_extracted');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Check if already extracted
    const existingPdfs = fs.existsSync(targetDir) ? getPdfFiles(targetDir) : [];
    if (existingPdfs.length === 0) {
      console.log(`\nExtracting '${path.basename(zipPath)}' to '${targetDir}'...`);
      try {
        const powershellCmd = `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${targetDir.replace(/'/g, "''")}' -Force`;
        execSync(`powershell -NoProfile -Command "${powershellCmd}"`, { stdio: 'inherit' });
        console.log(`[SUCCESS] Extracted curriculum package.`);
      } catch (err) {
        console.error(`[ERROR] Failed to extract zip: ${err.message}`);
        process.exit(1);
      }
    } else {
      console.log(`[INFO] Found existing extracted files in '${targetDir}' (${existingPdfs.length} PDFs).`);
    }
  }

  if (!targetDir || !fs.existsSync(targetDir)) {
    console.error(`[ERROR] Please specify --zip="<path_to_zip>" or --dir="<path_to_extracted_folder>"`);
    process.exit(1);
  }

  // 2. Discover PDFs
  let allPdfs = getPdfFiles(targetDir);
  console.log(`\nDiscovered ${allPdfs.length} curriculum PDF document(s).`);

  if (allPdfs.length === 0) {
    console.error(`[ERROR] No PDF files found in '${targetDir}'.`);
    process.exit(1);
  }

  // Optional sample limit
  const sampleLimit = args.sample ? parseInt(args.sample, 10) : null;
  if (sampleLimit && sampleLimit > 0) {
    console.log(`[Sample Mode] Limiting to first ${sampleLimit} document(s).`);
    allPdfs = allPdfs.slice(0, sampleLimit);
  }

  const isPreview = Boolean(args.preview || args['dry-run'] || args.dryRun);
  const ingestNow = Boolean(args['ingest-now'] || args.ingestNow);
  const teacherEmail = (args.email || 'neev123@gmail.com').trim().toLowerCase();

  // Print summary of files to be processed
  console.log('\nCurriculum File Mapping:');
  console.log('-'.repeat(78));
  let totalBytes = 0;
  allPdfs.forEach((p, idx) => {
    const stat = fs.statSync(p);
    totalBytes += stat.size;
    const grade = detectGrade(p);
    const subject = detectSubject(p);
    const sizeMB = (stat.size / (1024 * 1024)).toFixed(2);
    console.log(
      `[${String(idx + 1).padStart(2, '0')}/${allPdfs.length}] ${path.basename(p)} (${sizeMB} MB)`
    );
    console.log(`     Grade: ${grade.padEnd(10)} | Subject: ${subject}`);
  });
  console.log('-'.repeat(78));
  console.log(`Total Collection Size: ${(totalBytes / (1024 * 1024)).toFixed(2)} MB\n`);

  if (isPreview) {
    console.log('[DRY-RUN COMPLETE] Run without --preview to upload and ingest these files.');
    return;
  }

  // 3. Connect to Database
  await connectDB();

  let teacher = await Teacher.findOne({ email: teacherEmail });
  if (!teacher) {
    teacher = await Teacher.findOne();
  }
  if (!teacher) {
    console.error(`[ERROR] No teacher found in database with email '${teacherEmail}'.`);
    await disconnectDB();
    process.exit(1);
  }

  console.log(`Teacher Account: ${teacher.name || teacher.email} (${teacher._id})`);
  console.log(`Storage Bucket : ${process.env.FILEBASE_BUCKET_NAME || 'neev-syllabus-bucket'} (Filebase S3)`);
  console.log('='.repeat(78) + '\n');

  let uploadedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  const queuedJobIds = [];

  for (let i = 0; i < allPdfs.length; i++) {
    const filePath = allPdfs[i];
    const fileName = path.basename(filePath);
    const stat = fs.statSync(filePath);
    const grade = detectGrade(filePath);
    const subject = detectSubject(filePath);
    const title = path.basename(filePath, path.extname(filePath));

    console.log(`[${i + 1}/${allPdfs.length}] Processing: ${fileName} (${(stat.size / (1024 * 1024)).toFixed(2)} MB)...`);

    try {
      // Calculate checksum
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      for await (const chunk of stream) {
        hash.update(chunk);
      }
      const fileHash = hash.digest('hex');

      // Check for existing document
      const existing = await SyllabusDocument.findOne({ teacherId: teacher._id, fileHash });
      if (existing) {
        if (existing.status === 'completed') {
          console.log(`    ↳ Skipped: Already indexed (${existing.chunkCount || 0} chunks, Doc ID: ${existing._id})`);
          skippedCount++;
          continue;
        }
        // If uploaded or queued but job failed or missing, ensure job exists
        let existingJob = await IngestionJob.findOne({
          documentId: existing._id,
          status: { $in: ['queued', 'claimed', 'processing', 'completed'] },
        });
        if (!existingJob) {
          const jobId = `job_curriculum_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
          await IngestionJob.create({
            jobId,
            documentId: existing._id,
            teacherId: teacher._id,
            storageKey: existing.storageKey,
            storageProvider: existing.storageProvider || 'filebase',
            status: 'queued',
            attempts: 0,
            maxAttempts: 3,
          });
          console.log(`    ↳ Re-queued pending document (Doc ID: ${existing._id})`);
          uploadedCount++;
          continue;
        } else {
          console.log(`    ↳ Document already queued / processing (Doc ID: ${existing._id}, Status: ${existing.status})`);
          skippedCount++;
          continue;
        }
      }

      // Upload to Filebase S3
      const fileBuffer = fs.readFileSync(filePath);
      const saveResult = await storageService.saveFile({
        buffer: fileBuffer,
        originalName: fileName,
        mimeType: 'application/pdf',
        prefix: `syllabus/${grade.replace(/\s+/g, '')}/${subject.replace(/\s+/g, '')}`,
      });

      // Create SyllabusDocument
      const doc = await SyllabusDocument.create({
        teacherId: teacher._id,
        title,
        fileName,
        originalFileName: fileName,
        storageKey: saveResult.storageKey,
        storageProvider: saveResult.storageProvider,
        storageBucket: saveResult.bucket || process.env.FILEBASE_BUCKET_NAME || 'neev-syllabus-bucket',
        mimeType: 'application/pdf',
        fileSize: stat.size,
        fileHash,
        grade,
        subject,
        status: 'queued',
      });

      // Queue IngestionJob
      const jobId = `job_curriculum_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      await IngestionJob.create({
        jobId,
        documentId: doc._id,
        teacherId: teacher._id,
        storageKey: saveResult.storageKey,
        storageProvider: saveResult.storageProvider,
        status: 'queued',
        attempts: 0,
        maxAttempts: 3,
      });

      queuedJobIds.push(jobId);
      uploadedCount++;
      console.log(`    ↳ Uploaded to S3 & Queued in MongoDB Atlas! (Doc ID: ${doc._id})`);
    } catch (fileErr) {
      console.error(`    ↳ [FAILED] ${fileErr.message}`);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(78));
  console.log('Upload Batch Summary:');
  console.log(`  Successfully Uploaded & Queued : ${uploadedCount}`);
  console.log(`  Skipped (Already Exists)       : ${skippedCount}`);
  console.log(`  Failed                         : ${errorCount}`);
  console.log('='.repeat(78));

  // 4. Ingest immediately if requested
  if (ingestNow && uploadedCount > 0) {
    console.log(`\nStarting immediate chunking and Gemini vector embeddings for ${uploadedCount} documents...`);
    let completedJobs = 0;
    while (true) {
      const job = await claimNextJob(`cli_curriculum_${process.pid}`);
      if (!job) break;
      try {
        const result = await processJob(job, `cli_curriculum_${process.pid}`);
        completedJobs++;
        console.log(`[Ingested ${completedJobs}/${uploadedCount}] ${result?.document?.fileName || job.jobId}: ${result?.chunkCount || 0} chunks embedded (gemini-embedding-001, 768d).`);
      } catch (ingestErr) {
        console.error(`[Ingestion Error] Job ${job.jobId}:`, ingestErr.message);
      }
    }
    console.log(`\n[COMPLETE] Successfully indexed ${completedJobs} syllabus documents with Gemini embeddings!`);
  } else if (uploadedCount > 0) {
    console.log('\nAll documents are uploaded and queued in MongoDB Atlas.');
    console.log('To run background vector chunking & Gemini embeddings, run:');
    console.log('  npm --prefix backend run worker:ingest');
  }

  await disconnectDB();
}

main().catch(async (err) => {
  console.error('[FATAL ERROR]', err);
  await disconnectDB();
  process.exit(1);
});
