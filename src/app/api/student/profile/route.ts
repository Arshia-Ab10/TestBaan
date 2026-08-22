import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getDb, getEnv } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/hash';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'غیرمجاز' }, { status: 401 });

    const db = await getDb();
    const { results } = await db.prepare('SELECT id, email, first_name, last_name, password_hash FROM users WHERE id = ? LIMIT 1').bind(user.id).all();
    if (!results || results.length === 0) return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 404 });

    const userData = results[0] as any;
    
    return NextResponse.json({
      id: userData.id,
      email: userData.email,
      first_name: userData.first_name || '',
      last_name: userData.last_name || '',
      has_password: !!userData.password_hash
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'غیرمجاز' }, { status: 401 });

    const body = (await request.json()) as any;
    const { action } = body;

    const db = await getDb();
    const env = await getEnv();

    if (action === 'update_name') {
      const { firstName, lastName } = body;
      if (!firstName) return NextResponse.json({ error: 'نام الزامی است' }, { status: 400 });

      const nameRegex = /^[\u0600-\u06FF\s\u200Ca-zA-Z]+$/;
      if (!nameRegex.test(firstName) || (lastName && !nameRegex.test(lastName))) {
        return NextResponse.json({ error: 'نام و نام خانوادگی فقط باید شامل حروف فارسی یا انگلیسی باشد' }, { status: 400 });
      }

      await db.prepare('UPDATE users SET first_name = ?, last_name = ? WHERE id = ?').bind(firstName, lastName || '', user.id).run();
      return NextResponse.json({ success: true });
    }

    if (action === 'request_email_change') {
      const { newEmail } = body;
      if (!newEmail || !newEmail.includes('@')) return NextResponse.json({ error: 'ایمیل نامعتبر است' }, { status: 400 });
      const lowerNewEmail = newEmail.toLowerCase();

      if (lowerNewEmail === user.email) return NextResponse.json({ error: 'این ایمیل فعلی شماست' }, { status: 400 });

      const { results } = await db.prepare('SELECT id FROM users WHERE email = ? LIMIT 1').bind(lowerNewEmail).all();
      if (results && results.length > 0) return NextResponse.json({ error: 'این ایمیل توسط کاربر دیگری استفاده شده است' }, { status: 400 });

      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      await db.prepare('INSERT INTO otps (id, email, code, expires_at) VALUES (?, ?, ?, ?)').bind(crypto.randomUUID(), lowerNewEmail, otpCode, expiresAt).run();

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, refresh_token: env.GOOGLE_REFRESH_TOKEN, grant_type: "refresh_token" }),
      });
      const tokenData = (await tokenRes.json()) as any;

      const subject = "تایید ایمیل جدید تست‌بان";
      const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
      const htmlContent = `
        <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
          <div style="background-color: #2563eb; padding: 24px; text-align: center;"><h1 style="color: #ffffff; margin: 0; font-size: 24px;">تست‌بان</h1></div>
          <div style="padding: 32px; text-align: center;">
            <h2 style="color: #1e293b; font-size: 20px; margin-bottom: 16px;">تایید آدرس ایمیل جدید</h2>
            <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">کد تایید شما برای تغییر ایمیل حساب کاربری:</p>
            <div style="background-color: #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 24px;"><span style="font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 8px;">${otpCode}</span></div>
          </div>
        </div>
      `;
      const emailBody = [`From: TestBaan <testbaan10@gmail.com>`, `To: ${lowerNewEmail}`, `Subject: ${utf8Subject}`, `Content-Type: text/html; charset=utf-8`, ``, htmlContent].join('\r\n');

      await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: { "Authorization": `Bearer ${tokenData.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ raw: Buffer.from(emailBody, 'utf-8').toString('base64url') }),
      });

      return NextResponse.json({ success: true });
    }

    if (action === 'verify_email_change') {
      const { newEmail, code } = body;
      const lowerNewEmail = newEmail.toLowerCase();

      const { results: otpResults } = await db.prepare('SELECT * FROM otps WHERE email = ? ORDER BY expires_at DESC LIMIT 1').bind(lowerNewEmail).all();
      if (!otpResults || otpResults.length === 0) return NextResponse.json({ error: 'کدی یافت نشد' }, { status: 400 });

      const otpData = otpResults[0] as any;
      if (otpData.code !== code) return NextResponse.json({ error: 'کد اشتباه است' }, { status: 400 });
      if (new Date(otpData.expires_at) < new Date()) return NextResponse.json({ error: 'کد منقضی شده است' }, { status: 400 });

      await db.prepare('UPDATE users SET email = ? WHERE id = ?').bind(lowerNewEmail, user.id).run();
      await db.prepare('DELETE FROM otps WHERE email = ?').bind(lowerNewEmail).run();

      return NextResponse.json({ success: true });
    }

    if (action === 'change_password') {
      const { oldPassword, newPassword } = body;
      
      if (!newPassword || newPassword.length < 8 || !/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(newPassword)) {
        return NextResponse.json({ error: 'رمز عبور جدید باید حداقل ۸ کاراکتر و شامل حروف و اعداد باشد' }, { status: 400 });
      }

      const { results } = await db.prepare('SELECT password_hash FROM users WHERE id = ? LIMIT 1').bind(user.id).all();
      const currentHash = results[0]?.password_hash;

      if (currentHash) {
        if (!oldPassword) return NextResponse.json({ error: 'وارد کردن رمز عبور فعلی الزامی است' }, { status: 400 });
        const isValid = await verifyPassword(oldPassword, currentHash);
        if (!isValid) return NextResponse.json({ error: 'رمز عبور فعلی اشتباه است' }, { status: 400 });
      }

      const hashedNewPassword = await hashPassword(newPassword);
      await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(hashedNewPassword, user.id).run();

      return NextResponse.json({ success: true });
    }

    if (action === 'send_otp') {
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      await db.prepare('INSERT INTO otps (id, email, code, expires_at) VALUES (?, ?, ?, ?)').bind(crypto.randomUUID(), user.email, otpCode, expiresAt).run();

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, refresh_token: env.GOOGLE_REFRESH_TOKEN, grant_type: "refresh_token" }),
      });
      const tokenData = (await tokenRes.json()) as any;

      const subject = "تایید تغییر رمز عبور تست‌بان";
      const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
      const htmlContent = `
        <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
          <div style="background-color: #2563eb; padding: 24px; text-align: center;"><h1 style="color: #ffffff; margin: 0; font-size: 24px;">تست‌بان</h1></div>
          <div style="padding: 32px; text-align: center;">
            <h2 style="color: #1e293b; font-size: 20px; margin-bottom: 16px;">تغییر رمز عبور حساب کاربری</h2>
            <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">کد تایید زیر برای تنظیم رمز عبور جدید صادر شده است:</p>
            <div style="background-color: #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 24px;"><span style="font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 8px;">${otpCode}</span></div>
          </div>
        </div>
      `;
      const emailBody = [`From: TestBaan <testbaan10@gmail.com>`, `To: ${user.email}`, `Subject: ${utf8Subject}`, `Content-Type: text/html; charset=utf-8`, ``, htmlContent].join('\r\n');

      await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: { "Authorization": `Bearer ${tokenData.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ raw: Buffer.from(emailBody, 'utf-8').toString('base64url') }),
      });

      return NextResponse.json({ success: true });
    }

    if (action === 'verify_otp_and_change') {
      const { code, newPassword } = body;
      
      if (!newPassword || newPassword.length < 8 || !/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(newPassword)) {
        return NextResponse.json({ error: 'رمز عبور جدید باید حداقل ۸ کاراکتر و شامل حروف و اعداد باشد' }, { status: 400 });
      }

      const { results: otpResults } = await db.prepare('SELECT * FROM otps WHERE email = ? ORDER BY expires_at DESC LIMIT 1').bind(user.email).all();
      if (!otpResults || otpResults.length === 0) return NextResponse.json({ error: 'کدی یافت نشد' }, { status: 400 });

      const otpData = otpResults[0] as any;
      if (otpData.code !== code) return NextResponse.json({ error: 'کد اشتباه است' }, { status: 400 });
      if (new Date(otpData.expires_at) < new Date()) return NextResponse.json({ error: 'کد منقضی شده است' }, { status: 400 });

      const hashedNewPassword = await hashPassword(newPassword);
      await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(hashedNewPassword, user.id).run();
      await db.prepare('DELETE FROM otps WHERE email = ?').bind(user.email).run();

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'عملیات نامعتبر' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}