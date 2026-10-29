import mongoose from 'mongoose';

const lessonItemSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Lesson name is required'],
      trim: true,
      maxlength: [200, 'Lesson name cannot exceed 200 characters'],
    },
    grade: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    isFoundational: {
      type: Boolean,
      default: false,
    },
    prerequisites: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const rubricItemSchema = new mongoose.Schema(
  {
    questionNumber: {
      type: String,
      required: [true, 'Question number is required in rubric (e.g. Q1)'],
      trim: true,
    },
    prompt: {
      type: String,
      trim: true,
      default: '',
    },
    maximumMarks: {
      type: Number,
      required: [true, 'Question maximum marks is required'],
      min: [0.5, 'Question maximum marks must be at least 0.5'],
      validate: {
        validator: Number.isFinite,
        message: 'Question maximum marks must be a finite number',
      },
    },
    referenceAnswer: {
      type: String,
      trim: true,
      default: '',
    },
    keyPoints: {
      type: [String],
      default: [],
    },
    lessonId: {
      type: String,
      trim: true,
      default: '',
    },
    lessonName: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: true }
);

const assessmentSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: [true, 'Teacher ID reference is required'],
      index: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class ID reference is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Assessment title is required'],
      trim: true,
      maxlength: [200, 'Assessment title cannot exceed 200 characters'],
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
      maxlength: [100, 'Subject cannot exceed 100 characters'],
    },
    maximumMarks: {
      type: Number,
      required: [true, 'Maximum marks is required'],
      min: [1, 'Maximum marks must be greater than zero'],
      validate: {
        validator: Number.isFinite,
        message: 'Maximum marks must be a valid finite number',
      },
    },
    examDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: ['draft', 'processing', 'completed', 'failed'],
        message: 'Status must be one of: draft, processing, completed, failed',
      },
      default: 'draft',
      index: true,
    },
    lessons: {
      type: [lessonItemSchema],
      default: [],
    },
    rubric: {
      type: [rubricItemSchema],
      default: [],
      validate: {
        validator: function (items) {
          if (!items || items.length === 0) return true;
          const sum = items.reduce((acc, curr) => acc + (Number(curr.maximumMarks) || 0), 0);
          return sum <= this.maximumMarks;
        },
        message: function (props) {
          return `Total rubric question marks exceed the assessment's maximumMarks limit.`;
        },
      },
    },
    syllabusDocumentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SyllabusDocument',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Compound index for querying teacher assessments ordered by date
assessmentSchema.index({ teacherId: 1, createdAt: -1 });
assessmentSchema.index({ classId: 1, createdAt: -1 });

const Assessment = mongoose.models.Assessment || mongoose.model('Assessment', assessmentSchema);

export default Assessment;
