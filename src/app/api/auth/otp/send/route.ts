import { NextResponse } from 'next/server';
import { getEnv, getDb } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as any;
    const email = body.email;
    
    if (!email || !email.includes('@')) return NextResponse.json({ error: 'ایمیل نامعتبر است' }, { status: 400 });
    const lowerEmail = email.toLowerCase();

    const db = await getDb();
    const env = await getEnv();
    
    const { results: userCheck } = await db.prepare('SELECT id FROM users WHERE email = ? LIMIT 1').bind(lowerEmail).all();
    if (!userCheck || userCheck.length === 0) {
      return NextResponse.json({ error: 'حسابی با این ایمیل یافت نشد. لطفاً ابتدا ثبت‌نام کنید.' }, { status: 400 });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    await db.prepare('INSERT INTO otps (id, email, code, expires_at) VALUES (?, ?, ?, ?)').bind(crypto.randomUUID(), lowerEmail, code, expiresAt).run();

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, refresh_token: env.GOOGLE_REFRESH_TOKEN, grant_type: "refresh_token" }),
    });
    const tokenData = (await tokenRes.json()) as any;

    const subject = "کد ورود به تست‌بان";
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    
    const htmlContent = `
      <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <div style="background-color: #2563eb; padding: 24px; text-align: center;"><h1 style="color: #ffffff; margin: 0; font-size: 24px;">تست‌بان</h1></div>
        <div style="padding: 32px; text-align: center;">
          <h2 style="color: #1e293b; font-size: 20px; margin-bottom: 16px;">ورود به سامانه</h2>
          <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">کد تایید یک‌بار مصرف شما برای ورود به سامانه تست‌بان:</p>
          <div style="background-color: #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 24px;"><span style="font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 8px;">${code}</span></div>
          <p style="color: #64748b; font-size: 13px;">این کد تا ۵ دقیقه دیگر اعتبار دارد.</p>
        </div>
      </div>
    `;

    const emailBody = [`From: TestBaan <testbaan10@gmail.com>`, `To: ${lowerEmail}`, `Subject: ${utf8Subject}`, `Content-Type: text/html; charset=utf-8`, ``, htmlContent].join('\r\n');

    await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: { "Authorization": `Bearer ${tokenData.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw: Buffer.from(emailBody, 'utf-8').toString('base64url') }),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}