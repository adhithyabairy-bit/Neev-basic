import { Resend } from 'resend';

/**
 * Escapes unsafe HTML characters to prevent email HTML injection attacks.
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sends a contact inquiry notification email to the platform administrator via Resend.
 *
 * @param {Object} options
 * @param {string} options.name - Visitor name
 * @param {string} options.email - Visitor email
 * @param {string} options.school - School / institution name
 * @param {string} options.message - Inquiry message
 * @param {Date|string} [options.submittedAt] - Timestamp
 * @returns {Promise<{ success: boolean, id?: string, error?: string, skipped?: boolean }>}
 */
export async function sendContactNotification({
  name,
  email,
  school,
  message,
  submittedAt = new Date(),
}) {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  const receiverEmail = (
    process.env.CONTACT_RECEIVER_EMAIL || 'adhithyabairy@gmail.com'
  ).trim();
  const senderEmail = (
    process.env.CONTACT_SENDER_EMAIL || 'Neev Inquiries <onboarding@resend.dev>'
  ).trim();

  if (!apiKey) {
    console.warn(
      '[Resend Email] Notice: RESEND_API_KEY is not defined in backend environment. Email notification skipped.'
    );
    return {
      success: false,
      skipped: true,
      error: 'RESEND_API_KEY_NOT_CONFIGURED',
    };
  }

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeSchool = escapeHtml(school || 'Not specified');
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br />');
  const formattedDate = new Date(submittedAt).toUTCString();

  const subject = `New Contact Inquiry – NEEV from ${name}`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Contact Inquiry – NEEV</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 24px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <div style="background: #0f172a; padding: 24px 32px; border-bottom: 3px solid #ff7a18;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">
        NEEV <span style="font-size: 14px; font-weight: 400; color: #94a3b8;">— Diagnostic Learning Gap Platform</span>
      </h1>
      <p style="color: #cbd5e1; margin: 6px 0 0 0; font-size: 14px;">
        New Contact Inquiry Received
      </p>
    </div>
    <div style="padding: 32px;">
      <div style="margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #f1f5f9;">
        <span style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b;">Visitor Details</span>
        <table style="width: 100%; margin-top: 8px; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 0; color: #64748b; font-size: 14px; width: 140px;"><strong>Name:</strong></td>
            <td style="padding: 4px 0; color: #0f172a; font-size: 14px;">${safeName}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b; font-size: 14px;"><strong>Email:</strong></td>
            <td style="padding: 4px 0; color: #0f172a; font-size: 14px;"><a href="mailto:${safeEmail}" style="color: #ff7a18; text-decoration: none;">${safeEmail}</a></td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b; font-size: 14px;"><strong>School / Org:</strong></td>
            <td style="padding: 4px 0; color: #0f172a; font-size: 14px;">${safeSchool}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b; font-size: 14px;"><strong>Submitted At:</strong></td>
            <td style="padding: 4px 0; color: #0f172a; font-size: 14px;">${formattedDate}</td>
          </tr>
        </table>
      </div>

      <div style="margin-bottom: 24px;">
        <span style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b;">Message</span>
        <div style="margin-top: 8px; padding: 16px; background-color: #f8fafc; border-left: 4px solid #ff7a18; border-radius: 6px; font-size: 14.5px; color: #1e293b; white-space: pre-wrap; word-break: break-word;">${safeMessage}</div>
      </div>

      <div style="text-align: center; margin-top: 24px;">
        <a href="mailto:${safeEmail}?subject=Re:%20NEEV%20Inquiry" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 10px 22px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">Reply to ${safeName}</a>
      </div>
    </div>
    <div style="background: #f8fafc; padding: 16px 32px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
      This email was dispatched by the NEEV Public Contact Gateway to ${receiverEmail}.
    </div>
  </div>
</body>
</html>
  `;

  const textContent = `
New Contact Inquiry – NEEV
----------------------------------------
Name: ${name}
Email: ${email}
School: ${school || 'Not specified'}
Submitted At: ${formattedDate}

Message:
${message}
----------------------------------------
Reply-To: ${email}
  `.trim();

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: senderEmail,
      to: [receiverEmail],
      replyTo: email,
      subject: subject,
      html: htmlContent,
      text: textContent,
    });

    if (error) {
      console.error('[Resend Email] Provider error:', error);
      return {
        success: false,
        error: error.message || 'Resend API returned an error',
      };
    }

    console.log(`[Resend Email] Notification sent successfully. Message ID: ${data?.id}`);
    return {
      success: true,
      id: data?.id,
    };
  } catch (err) {
    console.error('[Resend Email] Dispatch exception:', err.message);
    return {
      success: false,
      error: err.message,
    };
  }
}
