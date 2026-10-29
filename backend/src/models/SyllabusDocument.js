import mongoose from 'mongoose';

const syllabusDocumentSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: [true, 'Teacher ID is required for syllabus ownership'],
      index: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      default: null,
      index: true,
    },
    fileName: {
      type: String,
      required: [true, 'Filename is required'],
      trim: true,
    },
    fileSize: {
      type: Number,
      required: [true, 'File size is required'],
      min: 1,
    },
    fileHash: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
    },
    storageProvider: {
      type: String,
      enum: ['firebase', 'filebase', 'r2', 's3', 'local'],
      default: 'firebase',
      index: true,
    },
    storageKey: {
      type: String,
      required: true,
      trim: true,
    },
    storageBucket: {
      type: String,
      default: '',
      trim: true,
    },
    grade: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    subject: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    lessonName: {
      type: String,
      trim: true,
      default: '',
    },
    chunkCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    embeddingModel: {
      type: String,
      default: '',
    },
    embeddingDimensions: {
      type: Number,
      default: 768,
    },
    pageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    activeJobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'IngestionJob',
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'uploaded', 'queued', 'processing', 'completed', 'failed', 'ocr_required'],
        message: 'Status must be one of: pending, uploaded, queued, processing, completed, failed, ocr_required',
      },
      default: 'pending',
      index: true,
    },
    errorDetails: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to guarantee per-teacher document deduplication
syllabusDocumentSchema.index(
  { teacherId: 1, fileHash: 1 },
  { unique: true, partialFilterExpression: { fileHash: { $type: 'string', $gt: '' } } }
);
syllabusDocumentSchema.index({ teacherId: 1, subject: 1, createdAt: -1 });

const SyllabusDocument =
  mongoose.models.SyllabusDocument ||
  mongoose.model('SyllabusDocument', syllabusDocumentSchema);

export default SyllabusDocument;
