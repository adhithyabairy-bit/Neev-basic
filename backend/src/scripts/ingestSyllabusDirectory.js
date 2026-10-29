/**
 * Resumable Syllabus Directory Ingestion CLI Script
 *
 * Ingests a local directory of syllabus PDFs / TXT files into MongoDB Atlas with persistent embeddings.
 * Supports large collections (~200MB) safely by processing files one-by-one in bounded streams.
 * Tracks SHA-256 hashes to prevent re-processing previously indexed documents.
 *
 * Usage:
 *   node src/scripts/ingestSyllabusDirectory.js --dir=./syllabus --subject=Mathematics --grade="Grade 8"
 */

import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import connectDB, { disconnectDB } from '../config/db.js';
import Teacher from '../models/Teacher.js';
import { ingestSyllabusFile } from '../services/rag/ingestionService.js';

// Parse CLI flags
function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach((arg) => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      args[key] = value || true;
    }
  });
  return args;
}

async function run() {
  const args = parseArgs();
  const dirPath = args.dir || process.env.SYLLABUS_COLLECTION_DIR || './syllabus';
  const subject = args.subject || 'Mathematics';
  const grade = args.grade || 'Grade 8';

  console.log('='.repeat(70));
  console.log('Neev — Resumable Syllabus Collection Ingestion Pipeline');
  console.log(`Target Directory : ${path.resolve(dirPath)}`);
  console.log(`Subject          : ${subject}`);
  console.log(`Grade Level      : ${grade}`);
  console.log('='.repeat(70));

  // Connect to DB
  await connectDB();

  // Find or identify default teacher
  let teacher = null;
  if (args.teacherEmail) {
    teacher = await Teacher.findOne({ email: args.teacherEmail });
  }
  if (!teacher) {
    teacher = await Teacher.findOne();
  }

  if (!teacher) {
    console.error('[Error] No teacher profile found in MongoDB. Please create a teacher account first.');
    await disconnectDB();
    process.exit(1);
  }

  console.log(`Indexing syllabus under teacher: ${teacher.name || teacher.email} (${teacher._id})\n`);

  if (!fs.existsSync(dirPath)) {
    console.log(`Notice: Directory '${dirPath}' does not exist. Creating directory for future syllabus PDFs.`);
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Place your syllabus PDFs into '${path.resolve(dirPath)}' and re-run this script.`);
    await disconnectDB();
    return;
  }

  // Scan directory for PDF and TXT files
  const files = fs.readdirSync(dirPath).filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return ext === '.pdf' || ext === '.txt';
  });

  if (files.length === 0) {
    console.log(`No PDF or TXT files found in '${path.resolve(dirPath)}'.`);
    await disconnectDB();
    return;
  }

  console.log(`Discovered ${files.length} document(s) in collection directory.`);

  let processedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  let totalChunksStored = 0;
  const failureDetails = [];

  for (let i = 0; i < files.length; i++) {
    const fileName = files[i];
    const fullPath = path.join(dirPath, fileName);
    const mimeType = fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'text/plain';

    console.log(`[${i + 1}/${files.length}] Checking '${fileName}'...`);

    try {
      // Read file in memory only for the current document (preserves RAM)
      const buffer = fs.readFileSync(fullPath);

      const result = await ingestSyllabusFile({
        teacherId: teacher._id,
        buffer,
        originalName: fileName,
        mimeType,
        grade,
        subject,
      });

      if (result.alreadyExisted) {
        skippedCount++;
        console.log(`  -> Already indexed (${result.document.chunkCount} chunks). Skipped.`);
        totalChunksStored += result.document.chunkCount;
      } else {
        processedCount++;
        const chunks = result.document.chunkCount;
        totalChunksStored += chunks;
        console.log(`  -> Successfully indexed (${chunks} chunks embedded).`);
      }
    } catch (err) {
      failedCount++;
      failureDetails.push({ file: fileName, error: err.message });
      console.error(`  -> Failed: ${err.message}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('INGESTION SUMMARY REPORT');
  console.log('='.repeat(70));
  console.log(`Total Documents Scanned  : ${files.length}`);
  console.log(`Newly Ingested & Embedded: ${processedCount}`);
  console.log(`Skipped (Already Indexed): ${skippedCount}`);
  console.log(`Failures                 : ${failedCount}`);
  console.log(`Total Persistent Chunks  : ${totalChunksStored}`);

  if (failureDetails.length > 0) {
    console.log('\nFailure Details:');
    failureDetails.forEach((f) => console.log(` - ${f.file}: ${f.error}`));
  }
  console.log('='.repeat(70));

  await disconnectDB();
}

run().catch((err) => {
  console.error('[Fatal Error]', err);
  process.exit(1);
});

