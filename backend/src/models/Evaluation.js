import mongoose from 'mongoose';

const syllabusEvidenceItemSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SyllabusDocument',
    },
    sourceFileName: {
      type: String,
      default: '',
    },
    pageNumber: {
      type: Number,
      default: 1,
    },
    excerpt: {
      type: String,
      required: true,
    },
    score: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const evaluationSchema = new mongoose.Schema(
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
    answerSheetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AnswerSheet',
      required: [true, 'Answer sheet ID reference is required'],
      index: true,
    },
    answerItemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Answer item ID reference is required'],
    },
    questionNumber: {
      type: String,
      required: [true, 'Question number is required (e.g. Q1)'],
      trim: true,
    },
    prompt: {
      type: String,
      trim: true,
      default: '',
    },
    studentAnswer: {
      type: String,
      default: '',
    },
    expectedAnswer: {
      type: String,
      default: '',
    },
    maxMarks: {
      type: Number,
      required: true,
      min: 0.5,
    },
    suggestedMarks: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: function (val) {
          return val <= this.maxMarks;
        },
        message: 'Suggested marks cannot exceed maximum marks.',
      },
    },
    approvedMarks: {
      type: Number,
      default: null,
      validate: {
        validator: function (val) {
          if (val === null || val === undefined) return true;
          return val >= 0 && val <= this.maxMarks;
        },
        message: 'Approved marks must be between 0 and maximum marks.',
      },
    },
    isTeacherApproved: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'processing', 'review_required', 'approved', 'rejected', 'failed', 'stale'],
        message: 'Status must be one of: pending, processing, review_required, approved, rejected, failed, stale',
      },
      default: 'review_required',
      index: true,
    },
    explanation: {
      type: String,
      default: '',
    },
    observedErrors: {
      type: String,
      default: 'None',
    },
    misconceptionHypothesis: {
      type: String,
      default: 'None identified.',
    },
    affectedLessonId: {
      type: String,
      trim: true,
      default: '',
    },
    affectedLessonName: {
      type: String,
      trim: true,
      default: '',
    },
    confidence: {
      type: String,
      default: 'Moderate',
    },
    isEvidenceSufficient: {
      type: Boolean,
      default: true,
    },
    syllabusEvidence: [syllabusEvidenceItemSchema],
    modelUsed: {
      type: String,
      default: '',
    },
    evaluationVersion: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index to guarantee idempotency on retries
evaluationSchema.index({ answerSheetId: 1, answerItemId: 1 }, { unique: true });
evaluationSchema.index({ assessmentId: 1, teacherId: 1, createdAt: -1 });

const Evaluation = mongoose.models.Evaluation || mongoose.model('Evaluation', evaluationSchema);

export default Evaluation;

