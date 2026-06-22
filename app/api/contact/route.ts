import { Resend } from 'resend'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Email service not configured' }, { status: 503 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  let body: Record<string, string>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { name, email, category, message } = body
  if (!name || !email || !message) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }

  try {
    await resend.emails.send({
      // NOTE: sandbox sender — update RESEND_FROM_EMAIL once a custom domain is verified in Resend.
      from: process.env.RESEND_FROM_EMAIL || 'Contact Form <onboarding@resend.dev>',
      to: process.env.CONTACT_EMAIL_TO || 'anshulgupta1512@gmail.com',
      replyTo: email,
      subject: `[anshul.ai] ${category || 'Contact'}: ${name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6366f1;">New message from anshul.ai</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666; width: 100px;"><strong>From:</strong></td>
              <td style="padding: 8px 0;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Email:</strong></td>
              <td style="padding: 8px 0;"><a href="mailto:${email}">${email}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Category:</strong></td>
              <td style="padding: 8px 0;">${category || 'General'}</td>
            </tr>
          </table>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; white-space: pre-wrap;">${message}</div>
          <p style="color: #999; font-size: 12px; margin-top: 20px;">Sent via anshul.ai contact form</p>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to send email:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
