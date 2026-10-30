import mongoose from 'mongoose';

const classSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: [true, 'Teacher ID reference is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Class name is required (e.g. Class 8-A)'],
      trim: true,
      maxlength: [100, 'Class name cannot exceed 100 characters'],
    },
    grade: {
      type: String,
      required: [true, 'Grade level is required (e.g. Grade 8)'],
      trim: true,
      maxlength: [50, 'Grade cannot exceed 50 characters'],
    },
    subject: {
      type: String,
      required: [true, 'Subject is required (e.g. Mathematics)'],
      trim: true,
      maxlength: [100, 'Subject cannot exceed 100 characters'],
    },
    section: {
      type: String,
      trim: true,
      default: 'Section A',
      maxlength: [50, 'Section cannot exceed 50 characters'],
    },
    board: {
      type: String,
      trim: true,
      default: '',
      maxlength: [50, 'Board cannot exceed 50 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to quickly query a teacher's classes by name or grade
classSchema.index({ teacherId: 1, name: 1 });

const Class = mongoose.models.Class || mongoose.model('Class', classSchema);

export default Class;
