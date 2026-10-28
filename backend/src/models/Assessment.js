import mongoose from 'mongoose';

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
