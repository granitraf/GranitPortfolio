import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

function sanitize(input: string): string {
	return input.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim();
}

export async function POST(req: NextRequest) {
	try {
		const { name, email, message } = await req.json();
		if (!name || !email || !message) {
			return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 });
		}

		const safeName = sanitize(String(name)).slice(0, 200);
		const safeEmail = sanitize(String(email)).slice(0, 320);
		const safeMessage = sanitize(String(message)).slice(0, 5000);

		const subject = `New Contact Form Submission from ${safeName}`;
		const html = `
		  <div style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height: 1.5;">
		    <p><strong>Name:</strong> ${safeName}</p>
		    <p><strong>Email:</strong> ${safeEmail}</p>
		    <p><strong>Message:</strong></p>
		    <div style="white-space: pre-wrap;">${safeMessage}</div>
		  </div>
		`;
		const text = `Name: ${safeName}\nEmail: ${safeEmail}\n\n${safeMessage}`;

		await resend.emails.send({
			from: 'onboarding@resend.dev',
			to: ['tellgranit@gmail.com'],
			subject,
			html,
			text,
			replyTo: safeEmail,
		});

		return NextResponse.json({ ok: true });
	} catch (err: any) {
		return NextResponse.json({ ok: false, error: err?.message ?? 'Failed to send' }, { status: 500 });
	}
}
