// Email helpers for password setup/reset via Resend
import { Resend } from 'resend'

let resendClient = null
function getResend() {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) return null
    resendClient = new Resend(apiKey)
  }
  return resendClient
}

export const runtime = 'nodejs'

export async function sendSetPasswordEmail({ to, link, appName = 'MIMS' }) {
  const resend = getResend()
  if (!resend) return
  const from = process.env.EMAIL_FROM || 'onboarding@resend.dev'
  const subject = `${appName} account setup`
  const html = `
    <div style="font-family:Arial,sans-serif;font-size:14px;color:#111">
      <p>Welcome to ${appName}.</p>
      <p>To finish setting up your account, please set your password by clicking the button below:</p>
      <p>
        <a href="${link}" style="display:inline-block;background:#2563EB;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none" target="_blank" rel="noopener">Set your password</a>
      </p>
      <p>If the button doesn’t work, copy and paste this link into your browser:</p>
      <p style="word-break:break-all"><a href="${link}">${link}</a></p>
      <p>This link expires in 15 minutes. If you didn’t expect this email, you can ignore it.</p>
    </div>
  `
  const { error } = await resend.emails.send({ from, to, subject, html })
  if (error) throw new Error(error.message || 'Failed to send set-password email')
}
