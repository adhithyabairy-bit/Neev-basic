import 'dotenv/config';
import storageService from '../services/storage/storageService.js';

async function testStorage() {
  console.log(`Testing active storage provider: ${storageService.getProviderName()}...`);

  const connection = await storageService.verifyConnection();
  console.log('Connection verification result:', connection);

  if (!connection.connected) {
    console.error('[FAILED] Could not connect to storage provider:', connection.reason);
    process.exit(1);
  }

  console.log('Writing test file via storageService.saveFile()...');
  const testBuffer = Buffer.from('Neev cloud storage integration verified successfully!');
  const saveResult = await storageService.saveFile({
    buffer: testBuffer,
    originalName: 'storage-healthcheck.txt',
    mimeType: 'text/plain',
    prefix: 'healthchecks',
  });
  console.log('Save result:', saveResult);

  console.log('Reading test file via storageService.getFileBuffer()...');
  const readBuffer = await storageService.getFileBuffer(saveResult.storageKey);
  console.log('Read content:', readBuffer.toString('utf-8'));

  if (readBuffer.toString('utf-8') !== testBuffer.toString('utf-8')) {
    throw new Error('Retrieved content does not match uploaded content!');
  }

  console.log('Generating presigned download URL...');
  const presignedUrl = await storageService.getPresignedDownloadUrl(saveResult.storageKey, 300);
  console.log('Presigned download URL (truncated):', presignedUrl.substring(0, 80) + '...');

  console.log('Verifying uploaded object via storageService.verifyUploadedObject()...');
  const verified = await storageService.verifyUploadedObject(saveResult.storageKey);
  console.log('Verification result:', verified);
  if (!verified.exists || verified.size !== testBuffer.length) {
    throw new Error(`verifyUploadedObject failed! Expected size ${testBuffer.length}, got ${verified.size}`);
  }

  console.log('Generating presigned upload URL via storageService.getPresignedUploadUrl()...');
  const directKey = storageService.generateKey('direct-upload-test.pdf', 'healthchecks');
  const presignedUpload = await storageService.getPresignedUploadUrl({
    storageKey: directKey,
    mimeType: 'application/pdf',
    expiresIn: 300,
  });
  console.log('Presigned upload URL result:', {
    method: presignedUpload.method,
    storageKey: presignedUpload.storageKey,
    urlTruncated: presignedUpload.uploadUrl.substring(0, 80) + '...',
  });

  console.log('Deleting test file via storageService.deleteFile()...');
  const deleted = await storageService.deleteFile(saveResult.storageKey);
  console.log('Delete result:', deleted);

  console.log('\n[SUCCESS] Cloud storage provider is fully operational via storageService!');
}

testStorage().catch((err) => {
  console.error('[ERROR] Storage test failed:', err);
  process.exit(1);
});

