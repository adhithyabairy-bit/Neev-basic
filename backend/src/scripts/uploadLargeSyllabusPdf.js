import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
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

async function main() {
  const args = parseArgs();
  const filePath = args.file || args.path;

  console.log('='.repeat(78));
  console.log('Neev — Direct 200MB Large Syllabus PDF Upload & Ingestion CLI');
  console.log('='.repeat(78));

  if (!filePath) {
    console.log('\nUsage:');
    console.log('  node src/scripts/uploadLargeSyllabusPdf.js --file="C:/path/to/syllabus.pdf" [options]');
    console.log('\nOptions:');
    console.log('  --file="<path>"       Path to the 200MB PDF document (Required)');
    console.log('  --email="<email>"     Teacher email (default: neev123@gmail.com)');
    console.log('  --subject="<subject>" Curriculum subject (default: Mathematics)');
    console.log('  --grade="<grade>"     Curriculum grade level (default: Grade 8)');
    console.log('  --title="<title>"     Optional custom title (default: file name)');
    console.log('  --ingest-now          Process chunking & Gemini embeddings immediately\n');
    process.exit(1);
  }

  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`[ERROR] File not found at: ${resolvedPath}`);
    process.exit(1);
  }

  const stat = fs.statSync(resolvedPath);
  const fileSizeMB = (stat.size / (1024 * 1024)).toFixed(2);
  console.log(`\nFile: ${path.basename(resolvedPath)}`);
  console.log(`Size: ${fileSizeMB} MB (${stat.size} bytes)`);

  const teacherEmail = (args.email || 'neev123@gmail.com').trim().toLowerCase();
  const subject = args.subject || 'Mathematics';
  const grade = args.grade || 'Grade 8';
  const title = args.title || path.basename(resolvedPath, path.extname(resolvedPath));
  const ingestNow = Boolean(args['ingest-now'] || args.ingestNow);

  // Connect MongoDB
  await connectDB();

  let teacher = await Teacher.findOne({ email: teacherEmail });
  if (!teacher) {
    teacher = await Teacher.findOne();
  }
  if (!teacher) {
    console.error(`[ERROR] No teacher found in database. Please register first.`);
    await disconnectDB();
    process.exit(1);
  }

  console.log(`Teacher: ${teacher.name || teacher.email} (${teacher._id})`);
  console.log(`Subject: ${subject} | Grade: ${grade}`);

  // Compute SHA-256 hash
  console.log('\nCalculating file checksum (SHA-256)...');
  const hash = crypto.createHash('sha256');
  const readStreamForHash = fs.createReadStream(resolvedPath);
  for await (const chunk of readStreamForHash) {
    hash.update(chunk);
  }
  const fileHash = hash.digest('hex');
  console.log(`SHA-256: ${fileHash}`);

  // Check for deduplication
  const existing = await SyllabusDocument.findOne({ teacherId: teacher._id, fileHash });
  if (existing && existing.status === 'completed') {
    console.log(`\n[INFO] Document already exists in vector knowledge base (ID: ${existing._id}, Chunks: ${existing.chunkCount}).`);
    await disconnectDB();
    process.exit(0);
  }

  // Upload to Filebase S3
  console.log(`\nUploading directly to Filebase S3 (${process.env.FILEBASE_BUCKET_NAME || 'neev-syllabus-bucket'})...`);
  const safeName = sanitizeFileName(path.basename(resolvedPath));
  const storageKey = storageService.generateKey(safeName, 'syllabus');

  // Read buffer or stream
  const fileBuffer = fs.readFileSync(resolvedPath);
  const saveResult = await storageService.saveFile({
    buffer: fileBuffer,
    originalName: path.basename(resolvedPath),
    mimeType: 'application/pdf',
    prefix: 'syllabus',
  });

  console.log(`[SUCCESS] Stored in cloud storage with key: ${saveResult.storageKey}`);

  // Create SyllabusDocument record
  const doc = await SyllabusDocument.create({
    teacherId: teacher._id,
    title,
    fileName: path.basename(resolvedPath),
    originalFileName: path.basename(resolvedPath),
    storageKey: saveResult.storageKey,
    storageProvider: saveResult.storageProvider,
    mimeType: 'application/pdf',
    fileSize: stat.size,
    fileHash,
    grade,
    subject,
    status: 'queued',
  });

  console.log(`Created SyllabusDocument in MongoDB: ${doc._id}`);

  // Queue ingestion job
  const jobId = `job_cli_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const job = await IngestionJob.create({
    jobId,
    documentId: doc._id,
    teacherId: teacher._id,
    storageKey: saveResult.storageKey,
    storageProvider: saveResult.storageProvider,
    status: 'queued',
    attempts: 0,
    maxAttempts: 3,
  });

  console.log(`Queued IngestionJob: ${job.jobId}`);

  if (ingestNow) {
    console.log('\nProcessing chunking & Gemini embeddings immediately...');
    const claimed = await claimNextJob(`cli_worker_${process.pid}`);
    if (claimed) {
      const result = await processJob(claimed, `cli_worker_${process.pid}`);
      console.log(`\n[COMPLETE] Successfully indexed ${result?.chunkCount || 0} vector chunks using gemini-embedding-001 (768d)!`);
    } else {
      console.log(`Could not claim job. Check if already claimed.`);
    }
  } else {
    console.log('\nDocument is queued. Run the background worker to embed chunks:');
    console.log('  npm --prefix backend run worker:ingest');
  }

  await disconnectDB();
  console.log('\n' + '='.repeat(78));
}

main().catch(async (err) => {
  console.error('[ERROR]', err);
  await disconnectDB();
  process.exit(1);
});
