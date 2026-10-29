import 'dotenv/config';
import connectDB, { disconnectDB } from '../config/db.js';
import IngestionJob from '../models/IngestionJob.js';
import SyllabusDocument from '../models/SyllabusDocument.js';

async function main() {
  await connectDB();

  console.log('Resetting failed ingestion jobs and documents back to queued state...');

  const resetJobs = await IngestionJob.updateMany(
    { status: 'failed' },
    {
      $set: {
        status: 'queued',
        attempts: 0,
        errorDetails: null,
        claimedBy: null,
        claimedAt: null,
      },
    }
  );

  const resetDocs = await SyllabusDocument.updateMany(
    { status: 'failed' },
    {
      $set: {
        status: 'queued',
        errorDetails: null,
      },
    }
  );

  console.log(`Reset ${resetJobs.modifiedCount} ingestion jobs to 'queued'.`);
  console.log(`Reset ${resetDocs.modifiedCount} syllabus documents to 'queued'.`);

  await disconnectDB();
}

main().catch(async (err) => {
  console.error(err);
  await disconnectDB();
});

