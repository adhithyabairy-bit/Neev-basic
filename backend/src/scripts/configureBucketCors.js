import 'dotenv/config';
import { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } from '@aws-sdk/client-s3';

async function configureCors() {
  const client = new S3Client({
    endpoint: process.env.FILEBASE_ENDPOINT || 'https://s3.filebase.io',
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.FILEBASE_ACCESS_KEY_ID,
      secretAccessKey: process.env.FILEBASE_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
  });

  const bucket = process.env.FILEBASE_BUCKET_NAME || 'neev-project-123456789';
  console.log(`Setting CORS on bucket: ${bucket}...`);

  try {
    const corsParams = {
      Bucket: bucket,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ['*'],
            AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
            AllowedOrigins: ['*'],
            ExposeHeaders: ['ETag', 'x-amz-request-id'],
            MaxAgeSeconds: 3000,
          },
        ],
      },
    };

    await client.send(new PutBucketCorsCommand(corsParams));
    console.log('[SUCCESS] CORS policy applied successfully to Filebase bucket!');

    const res = await client.send(new GetBucketCorsCommand({ Bucket: bucket }));
    console.log('Active CORS rules:', JSON.stringify(res.CORSRules, null, 2));
  } catch (err) {
    console.warn('[NOTICE] Filebase PutBucketCors response:', err.message);
  }
}

configureCors();

