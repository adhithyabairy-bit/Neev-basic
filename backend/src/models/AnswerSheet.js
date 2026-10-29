import mongoose from 'mongoose';

const answerItemSchema = new mongoose.Schema(
  {
    questionNumber: {
      type: String,
      required: [true, 'Question number or label is required (e.g. Q1)'],
      trim: true,
      default: 'Q1',
    },
    prompt: {
      type: String,
      trim: true,
      default: '',
    },
    rawExtractedText: {
      type: String,
      default: '',
      // Immutable raw OCR extraction output — preserves original recognition
    },
    correctedText: {
      type: String,
      default: '',
      // Teacher-edited answer text
    },
    pageNumber: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    maxMarks: {
      type: Number,
      min: [0.5, 'Maximum marks for a question must be at least 0.5'],
      default: 5,
    },
    awardedMarks: {
      type: Number,
      min: [0, 'Awarded marks cannot be negative'],
      default: 0,
    },
    status: {
      type: String,
      enum: {
        values: ['Needs Review', 'Verified'],
        message: "Status must be 'Needs Review' or 'Verified'",
      },
      default: 'Needs Review',
    },
    uncertainParts: {
      type: [String],
      default: [],
    },
  },
  {
    _id: true,
    timestamps: true,
  }
);

const answerSheetSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: [true, 'Teacher ID reference is required'],
      index: true,
    },
    assessmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assessment',
      required: [true, 'Assessment ID reference is required'],
      index: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class ID reference is required'],
      index: true,
    },
    studentName: {
      type: String,
      required: [true, 'Student full name is required'],
      trim: true,
      maxlength: [100, 'Student name cannot exceed 100 characters'],
    },
    rollNumber: {
      type: String,
      trim: true,
      default: '',
      maxlength: [50, 'Roll number cannot exceed 50 characters'],
    },
    originalFileName: {
      type: String,
      required: [true, 'Original file name is required'],
      trim: true,
      maxlength: [255, 'Filename cannot exceed 255 characters'],
    },
    storageKey: {
      type: String,
      required: [true, 'Storage key reference is required'],
      trim: true,
    },
    storageProvider: {
      type: String,
      default: 'local',
      trim: true,
    },
    mimeType: {
      type: String,
      required: [true, 'File MIME type is required'],
      trim: true,
    },
    fileSize: {
      type: Number,
      required: [true, 'File size is required'],
      min: [1, 'File size must be greater than 0'],
    },
    pageCount: {
      type: Number,
      default: 1,
      min: 1,
    },
    status: {
      type: String,
      enum: {
        values: ['uploaded', 'processing', 'review_required', 'verified', 'processing_failed'],
        message: 'Status must be one of: uploaded, processing, review_required, verified, processing_failed',
      },
      default: 'uploaded',
      index: true,
    },
    ocrStatus: {
      method: {
        type: String,
        default: null, // e.g. 'pdf-text-extract', 'tesseract-ocr'
      },
      processedAt: {
        type: Date,
        default: null,
      },
      errorDetails: {
        type: String,
        default: null,
      },
      confidence: {
        type: Number,
        default: null,
      },
    },
    verificationStatus: {
      isVerified: {
        type: Boolean,
        default: false,
      },
      verifiedAt: {
        type: Date,
        default: null,
      },
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
        default: null,
      },
    },
    answers: [answerItemSchema],
    rawOcrText: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for fast querying of teacher's answer sheets per assessment
answerSheetSchema.index({ teacherId: 1, assessmentId: 1, createdAt: -1 });
answerSheetSchema.index({ assessmentId: 1, studentName: 1 });

const AnswerSheet = mongoose.models.AnswerSheet || mongoose.model('AnswerSheet', answerSheetSchema);

export default AnswerSheet;

