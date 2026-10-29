import mongoose from 'mongoose';

const ingestionJobSchema = new mongoose.Schema(
  {
    jobId: {
      type: String,
      required: [true, 'Job ID is required'],
      unique: true,
      trim: true,
      index: true,
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SyllabusDocument',
      required: [true, 'Document ID is required'],
      index: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: [true, 'Teacher ID is required for tenant isolation'],
      index: true,
    },
    storageKey: {
      type: String,
      required: true,
      trim: true,
    },
    storageProvider: {
      type: String,
      enum: ['firebase', 'filebase', 'r2', 's3', 'local'],
      default: 'filebase',
    },
    status: {
      type: String,
      enum: {
        values: ['queued', 'claimed', 'processing', 'completed', 'failed'],
        message: 'Job status must be one of: queued, claimed, processing, completed, failed',
      },
      default: 'queued',
      index: true,
    },
    progress: {
      step: {
        type: String,
        enum: ['queued', 'downloading', 'extracting', 'chunking', 'embedding', 'indexing', 'completed', 'failed'],
        default: 'queued',
      },
      percentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      pagesTotal: {
        type: Number,
        default: 0,
        min: 0,
      },
      pagesProcessed: {
        type: Number,
        default: 0,
        min: 0,
      },
      chunksTotal: {
        type: Number,
        default: 0,
        min: 0,
      },
      chunksCreated: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxAttempts: {
      type: Number,
      default: 3,
      min: 1,
    },
    claimedAt: {
      type: Date,
      default: null,
    },
    claimedBy: {
      type: String,
      default: null,
      trim: true,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
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

// Compound indexes for high-throughput queue polling and duplicate job prevention
ingestionJobSchema.index({ status: 1, createdAt: 1 });
ingestionJobSchema.index({ documentId: 1, status: 1 });
ingestionJobSchema.index({ teacherId: 1, createdAt: -1 });

const IngestionJob =
  mongoose.models.IngestionJob ||
  mongoose.model('IngestionJob', ingestionJobSchema);

export default IngestionJob;

