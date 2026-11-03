import mongoose from 'mongoose';

const contactInquirySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    school: {
      type: String,
      default: '',
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    ipAddress: {
      type: String,
      default: '',
      trim: true,
    },
    emailNotificationStatus: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'skipped'],
      default: 'pending',
    },
    emailError: {
      type: String,
      default: null,
    },
    emailMessageId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

contactInquirySchema.index({ createdAt: -1 });
contactInquirySchema.index({ email: 1 });

const ContactInquiry =
  mongoose.models.ContactInquiry ||
  mongoose.model('ContactInquiry', contactInquirySchema);

export default ContactInquiry;

