import { Resend } from "resend";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "Email service not configured" },
      { status: 503 },
    );
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  let body: Record<string, string>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { name, email, category, message } = body;
  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof message !== "string" ||
    !name.trim() ||
    !message.trim() ||
    name.length > 120 ||
    email.length > 254 ||
    message.length > 10000 ||
    (category !== undefined &&
      (typeof category !== "string" || category.length > 100))
  ) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json(
      { error: "Invalid email address" },
      { status: 400 },
    );
  }

  try {
    const delivery = await resend.emails.send({
      // NOTE: sandbox sender; update RESEND_FROM_EMAIL once a custom domain is verified in Resend.
      from:
        process.env.RESEND_FROM_EMAIL || "Contact Form <onboarding@resend.dev>",
      to: process.env.CONTACT_EMAIL_TO || "anshulgupta1512@gmail.com",
      replyTo: email,
      subject: `[anshul.ai] ${category || "Contact"}: ${name}`,
      text: `From: ${name}\nEmail: ${email}\nCategory: ${category || "General"}\n\n${message}`,
    });

    if (delivery.error)
      return NextResponse.json(
        { error: "Message could not be delivered" },
        { status: 502 },
      );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to send email:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 },
    );
  }
}
