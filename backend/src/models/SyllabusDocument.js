import mongoose from 'mongoose';

const syllabusDocumentSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: [true, 'Teacher ID is required for syllabus ownership'],
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
      required: [true, 'File SHA-256 content hash is required for deduplication'],
      trim: true,
      index: true,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
    },
    storageKey: {
      type: String,
      required: true,
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
    status: {
      type: String,
      enum: {
        values: ['pending', 'processing', 'completed', 'failed'],
        message: 'Status must be one of: pending, processing, completed, failed',
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
syllabusDocumentSchema.index({ teacherId: 1, fileHash: 1 }, { unique: true });
syllabusDocumentSchema.index({ teacherId: 1, subject: 1, createdAt: -1 });

const SyllabusDocument =
  mongoose.models.SyllabusDocument ||
  mongoose.model('SyllabusDocument', syllabusDocumentSchema);

export default SyllabusDocument;

