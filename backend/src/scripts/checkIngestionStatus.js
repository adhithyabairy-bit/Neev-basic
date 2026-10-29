import 'dotenv/config';
import connectDB, { disconnectDB } from '../config/db.js';
import IngestionJob from '../models/IngestionJob.js';
import SyllabusDocument from '../models/SyllabusDocument.js';
import SyllabusChunk from '../models/SyllabusChunk.js';

async function main() {
  await connectDB();

  const totalDocs = await SyllabusDocument.countDocuments();
  const completedDocs = await SyllabusDocument.countDocuments({ status: 'completed' });
  const queuedDocs = await SyllabusDocument.countDocuments({ status: 'queued' });
  const processingDocs = await SyllabusDocument.countDocuments({ status: 'processing' });
  const ocrRequiredDocs = await SyllabusDocument.countDocuments({ status: 'ocr_required' });
  const failedDocs = await SyllabusDocument.countDocuments({ status: 'failed' });

  const totalChunks = await SyllabusChunk.countDocuments();

  const queuedJobs = await IngestionJob.countDocuments({ status: 'queued' });
  const completedJobs = await IngestionJob.countDocuments({ status: 'completed' });
  const processingJobs = await IngestionJob.countDocuments({ status: 'processing' });
  const failedJobs = await IngestionJob.countDocuments({ status: 'failed' });

  console.log('='.repeat(70));
  console.log('Neev Ingestion Status:');
  console.log('='.repeat(70));
  console.log(`Syllabus Documents : ${totalDocs} total`);
  console.log(`  - Completed      : ${completedDocs}`);
  console.log(`  - Queued         : ${queuedDocs}`);
  console.log(`  - Processing     : ${processingDocs}`);
  console.log(`  - OCR Required   : ${ocrRequiredDocs}`);
  console.log(`  - Failed         : ${failedDocs}`);
  console.log(`Vector Chunks      : ${totalChunks} embedded chunks (gemini-embedding-001, 768d)`);
  console.log(`Ingestion Jobs     :`);
  console.log(`  - Queued         : ${queuedJobs}`);
  console.log(`  - Completed      : ${completedJobs}`);
  console.log(`  - In-Progress    : ${processingJobs}`);
  console.log(`  - Failed         : ${failedJobs}`);
  console.log('='.repeat(70));

  const failedSample = await IngestionJob.find({ status: 'failed' }).limit(5);
  if (failedSample.length > 0) {
    console.log('\nSample Failed Job Errors:');
    for (const j of failedSample) {
      const doc = await SyllabusDocument.findById(j.documentId);
      console.log(`- Job ${j.jobId} [${doc?.fileName || 'unknown'}]:`);
      console.log(`  Error: ${j.errorDetails}`);
      console.log(`  Attempts: ${j.attempts}/${j.maxAttempts}`);
    }
  }

  await disconnectDB();
}

main().catch(async (err) => {
  console.error(err);
  await disconnectDB();
});
