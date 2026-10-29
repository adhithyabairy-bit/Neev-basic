import mongoose from 'mongoose';

const syllabusChunkSchema = new mongoose.Schema(
  {
    chunkId: {
      type: String,
      unique: true,
      index: true,
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SyllabusDocument',
      required: true,
      index: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: true,
      index: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      default: null,
      index: true,
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
      index: true,
    },
    sourceFileName: {
      type: String,
      required: true,
      trim: true,
    },
    pageNumber: {
      type: Number,
      default: 1,
      min: 1,
    },
    pageRange: {
      type: String,
      default: '',
      trim: true,
    },
    chunkIndex: {
      type: Number,
      required: true,
      min: 0,
    },
    chunkText: {
      type: String,
      required: true,
      trim: true,
    },
    contentHash: {
      type: String,
      trim: true,
      index: true,
    },
    embedding: {
      type: [Number],
      default: [],
    },
    embeddingModel: {
      type: String,
      default: '',
    },
    embeddingVersion: {
      type: String,
      default: 'v1',
    },
    embeddingDimensions: {
      type: Number,
      default: 768,
    },
    status: {
      type: String,
      enum: ['indexed', 'pending', 'failed'],
      default: 'indexed',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for metadata filtering
syllabusChunkSchema.index({ teacherId: 1, subject: 1, grade: 1 });
syllabusChunkSchema.index({ documentId: 1, chunkIndex: 1 });

// Text index for keyword fallback / hybrid search
syllabusChunkSchema.index({
  chunkText: 'text',
  lessonName: 'text',
  subject: 'text',
});

const SyllabusChunk =
  mongoose.models.SyllabusChunk ||
  mongoose.model('SyllabusChunk', syllabusChunkSchema);

export default SyllabusChunk;
