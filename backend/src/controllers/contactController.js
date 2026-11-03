import mongoose from 'mongoose';
import ContactInquiry from '../models/ContactInquiry.js';
import { sendContactNotification } from '../services/email/resendEmailService.js';
import { connectDB } from '../config/db.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Handles public contact form inquiries.
 *
 * Requirements:
 * 1. Validates and sanitizes input fields.
 * 2. Checks honeypot spam traps.
 * 3. Persists inquiry to MongoDB before attempting email delivery.
 * 4. Dispatches email notification via Resend.
 * 5. Updates notification status without losing the inquiry.
 */
export async function submitContactInquiry(req, res) {
  try {
    const { name, email, school, message, hp_field, website } = req.body || {};

    // 1. Spam Honeypot Protection: Bots populate hidden inputs; drop silently
    if (hp_field || website) {
      console.warn('[Contact Controller] Honeypot triggered. Silently dropping bot submission.');
      return res.status(200).json({
        success: true,
        message: 'Your inquiry has been received.',
      });
    }

    // 2. Input Validation
    const trimmedName = typeof name === 'string' ? name.trim() : '';
    const trimmedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const trimmedSchool = typeof school === 'string' ? school.trim() : '';
    const trimmedMessage = typeof message === 'string' ? message.trim() : '';

    if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 120) {
      return res.status(400).json({
        success: false,
        error: 'Please enter your full name (2 to 120 characters).',
        code: 'INVALID_NAME',
      });
    }

    if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail) || trimmedEmail.length > 254) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid email address.',
        code: 'INVALID_EMAIL',
      });
    }

    if (trimmedSchool.length > 200) {
      return res.status(400).json({
        success: false,
        error: 'School or institution name cannot exceed 200 characters.',
        code: 'INVALID_SCHOOL',
      });
    }

    if (!trimmedMessage || trimmedMessage.length < 5 || trimmedMessage.length > 5000) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a message between 5 and 5,000 characters.',
        code: 'INVALID_MESSAGE',
      });
    }

    // Connect to database on serverless cold starts if not connected
    if (mongoose.connection.readyState !== 1 && process.env.MONGODB_URI) {
      try {
        await connectDB();
      } catch (connErr) {
        console.warn('[Contact Controller] MongoDB on-demand connection notice:', connErr.message);
      }
    }

    const ipAddress =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      '';

    // 3. Persist inquiry to MongoDB first (so inquiry is NEVER lost)
    const inquiry = new ContactInquiry({
      name: trimmedName,
      email: trimmedEmail,
      school: trimmedSchool,
      message: trimmedMessage,
      ipAddress,
      emailNotificationStatus: 'pending',
    });

    await inquiry.save();
    console.log(`[Contact Controller] Saved ContactInquiry ${inquiry._id} to MongoDB.`);

    // 4. Asynchronously attempt email delivery via Resend
    let emailResult = { success: false, skipped: true };
    try {
      emailResult = await sendContactNotification({
        name: trimmedName,
        email: trimmedEmail,
        school: trimmedSchool,
        message: trimmedMessage,
        submittedAt: inquiry.createdAt,
      });

      if (emailResult.success) {
        inquiry.emailNotificationStatus = 'sent';
        inquiry.emailMessageId = emailResult.id || null;
      } else if (emailResult.skipped) {
        inquiry.emailNotificationStatus = 'skipped';
        inquiry.emailError = emailResult.error || 'RESEND_API_KEY_NOT_CONFIGURED';
      } else {
        inquiry.emailNotificationStatus = 'failed';
        inquiry.emailError = emailResult.error || 'EMAIL_DELIVERY_FAILED';
      }
      await inquiry.save();
    } catch (emailErr) {
      console.error('[Contact Controller] Email dispatch failed:', emailErr.message);
      inquiry.emailNotificationStatus = 'failed';
      inquiry.emailError = emailErr.message;
      await inquiry.save().catch(() => {});
    }

    return res.status(201).json({
      success: true,
      message: 'Thank you! Your message has been received. Our academic team will respond soon.',
      inquiryId: inquiry._id,
      emailSent: emailResult.success,
    });
  } catch (err) {
    console.error('[Contact Controller] Submission error:', err);
    return res.status(500).json({
      success: false,
      error: 'An unexpected server error occurred while processing your message. Please try again later.',
      code: 'SERVER_ERROR',
    });
  }
}

