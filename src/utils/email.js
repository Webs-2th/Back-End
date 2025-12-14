import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail({ to, subject, html }) {
  if (!to) throw new Error('Recipient email missing');
  const from = process.env.EMAIL_FROM || 'noreply@example.com';
  await transporter.sendMail({ from, to, subject, html });
}

export function buildVerificationEmail({ token }) {
  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:4000';
  const verifyUrl = baseUrl.replace(/\/$/, '') + '/verify-email?token=' + token;
  return {
    subject: 'Verify your email',
    html: '<p>Click <a href="' + verifyUrl + '">here</a> to verify your email.</p>'
  };
}
