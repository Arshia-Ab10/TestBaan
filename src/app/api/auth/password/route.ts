import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb, getEnv } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/hash';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as any;
    const { action, email, password, code, firstName, lastName } = body;
    
    if (!email) return NextResponse.json({ error: 'ایمیل الزامی است' }, { status: 400 });
    const lowerEmail = email.toLowerCase();

    const db = await getDb();
    const env = await getEnv();

    // 1️⃣ درخواست ثبت‌نام
    if (action === 'register') {
      if (!firstName) return NextResponse.json({ error: 'نام الزامی است' }, { status: 400 });
      
      const nameRegex = /^[\u0600-\u06FF\s\u200Ca-zA-Z]+$/;
      if (!nameRegex.test(firstName) || (lastName && !nameRegex.test(lastName))) {
        return NextResponse.json({ error: 'نام و نام خانوادگی فقط باید شامل حروف فارسی یا انگلیسی باشد' }, { status: 400 });
      }

      if (!password || password.length < 8 || !/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) {
        return NextResponse.json({ error: 'رمز عبور باید حداقل ۸ کاراکتر و شامل حداقل یک حرف و یک عدد باشد' }, { status: 400 });
      }
      
      const { results } = await db.prepare('SELECT id FROM users WHERE email = ? LIMIT 1').bind(lowerEmail).all();
      if (results && results.length > 0) return NextResponse.json({ error: 'این ایمیل قبلاً ثبت شده است' }, { status: 400 });

      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      await db.prepare('INSERT INTO otps (id, email, code, expires_at) VALUES (?, ?, ?, ?)').bind(crypto.randomUUID(), lowerEmail, otpCode, expiresAt).run();

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, refresh_token: env.GOOGLE_REFRESH_TOKEN, grant_type: "refresh_token" }),
      });
      const tokenData = (await tokenRes.json()) as any;

      const subject = "تایید ایمیل ثبت‌نام تست‌بان";
      const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
      const htmlContent = `
        <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
          <div style="background-color: #2563eb; padding: 24px; text-align: center;"><h1 style="color: #ffffff; margin: 0; font-size: 24px;">تست‌بان</h1></div>
          <div style="padding: 32px; text-align: center;">
            <h2 style="color: #1e293b; font-size: 20px; margin-bottom: 16px;">تایید آدرس ایمیل</h2>
            <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">کد تایید شما برای تکمیل ثبت‌نام:</p>
            <div style="background-color: #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 24px;"><span style="font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 8px;">${otpCode}</span></div>
          </div>
        </div>
      `;
      const emailBody = [`From: TestBaan <testbaan10@gmail.com>`, `To: ${lowerEmail}`, `Subject: ${utf8Subject}`, `Content-Type: text/html; charset=utf-8`, ``, htmlContent].join('\r\n');

      await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: { "Authorization": `Bearer ${tokenData.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ raw: Buffer.from(emailBody, 'utf-8').toString('base64url') }),
      });

      return NextResponse.json({ success: true, message: 'otp_sent' });
    }

    // 2️⃣ تایید کد و تکمیل ثبت‌نام
    if (action === 'register_verify') {
      if (!code || !firstName || !password) return NextResponse.json({ error: 'اطلاعات ناقص است' }, { status: 400 });

      const { results: otpResults } = await db.prepare('SELECT * FROM otps WHERE email = ? ORDER BY expires_at DESC LIMIT 1').bind(lowerEmail).all();
      if (!otpResults || otpResults.length === 0) return NextResponse.json({ error: 'کدی یافت نشد' }, { status: 400 });

      const otpData = otpResults[0] as any;
      if (otpData.code !== code) return NextResponse.json({ error: 'کد اشتباه است' }, { status: 400 });
      if (new Date(otpData.expires_at) < new Date()) return NextResponse.json({ error: 'کد منقضی شده است' }, { status: 400 });

      const hashedPassword = await hashPassword(password);
      const userId = Math.floor(1000000000 + Math.random() * 9000000000).toString();
      const sessionToken = crypto.randomUUID() + '-' + Date.now().toString();

      await db.prepare('INSERT INTO users (id, email, first_name, last_name, role, session_token, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(userId, lowerEmail, firstName, lastName || '', 'user', sessionToken, hashedPassword).run();
      
      await db.prepare('DELETE FROM otps WHERE email = ?').bind(lowerEmail).run();

      const cookieStore = await cookies();
      cookieStore.set('user_session', sessionToken, { httpOnly: true, secure: true, path: '/', maxAge: 60 * 60 * 24 * 7 });
      return NextResponse.json({ success: true });
    }

    // 3️⃣ ورود با رمز عبور
    if (action === 'login') {
      if (!password) return NextResponse.json({ error: 'رمز عبور الزامی است' }, { status: 400 });
      const { results } = await db.prepare('SELECT id, password_hash FROM users WHERE email = ? LIMIT 1').bind(lowerEmail).all();
      if (!results || results.length === 0) return NextResponse.json({ error: 'کاربری با این ایمیل یافت نشد' }, { status: 400 });

      const user = results[0] as any;
      if (!user.password_hash) return NextResponse.json({ error: 'شما قبلاً با گوگل یا OTP وارد شده‌اید. لطفاً از همان روش استفاده کنید یا رمز عبور جدید تنظیم کنید.' }, { status: 400 });

      const isValid = await verifyPassword(password, user.password_hash);
      if (!isValid) return NextResponse.json({ error: 'رمز عبور اشتباه است' }, { status: 400 });

      const sessionToken = crypto.randomUUID() + '-' + Date.now().toString();
      await db.prepare('UPDATE users SET session_token = ? WHERE id = ?').bind(sessionToken, user.id).run();

      const cookieStore = await cookies();
      cookieStore.set('user_session', sessionToken, { httpOnly: true, secure: true, path: '/', maxAge: 60 * 60 * 24 * 7 });
      return NextResponse.json({ success: true });
    }

    // 4️⃣ فراموشی رمز عبور
    if (action === 'forgot') {
      const { results } = await db.prepare('SELECT id, first_name FROM users WHERE email = ? LIMIT 1').bind(lowerEmail).all();
      if (!results || results.length === 0) return NextResponse.json({ error: 'کاربری با این ایمیل یافت نشد' }, { status: 400 });
      
      const userName = results[0].first_name || 'کاربر';
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      await db.prepare('INSERT INTO otps (id, email, code, expires_at) VALUES (?, ?, ?, ?)').bind(crypto.randomUUID(), lowerEmail, otpCode, expiresAt).run();

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, refresh_token: env.GOOGLE_REFRESH_TOKEN, grant_type: "refresh_token" }),
      });
      const tokenData = (await tokenRes.json()) as any;

      const subject = "بازیابی رمز عبور تست‌بان";
      const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
      const htmlContent = `
        <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
          <div style="background-color: #2563eb; padding: 24px; text-align: center;"><h1 style="color: #ffffff; margin: 0; font-size: 24px;">تست‌بان</h1></div>
          <div style="padding: 32px; text-align: center;">
            <h2 style="color: #1e293b; font-size: 20px; margin-bottom: 16px;">درخواست بازیابی رمز عبور</h2>
            <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">${userName} عزیز، کد زیر برای تغییر رمز عبور شماست:</p>
            <div style="background-color: #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 24px;"><span style="font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 8px;">${otpCode}</span></div>
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
    }

    // 5️⃣ بررسی صحت کد
    if (action === 'verify_reset_code') {
      if (!code) return NextResponse.json({ error: 'کد الزامی است' }, { status: 400 });
      const { results: otpResults } = await db.prepare('SELECT * FROM otps WHERE email = ? ORDER BY expires_at DESC LIMIT 1').bind(lowerEmail).all();
      if (!otpResults || otpResults.length === 0) return NextResponse.json({ error: 'کدی یافت نشد' }, { status: 400 });
      
      const otpData = otpResults[0] as any;
      if (otpData.code !== code) return NextResponse.json({ error: 'کد اشتباه است' }, { status: 400 });
      if (new Date(otpData.expires_at) < new Date()) return NextResponse.json({ error: 'کد منقضی شده است' }, { status: 400 });
      
      return NextResponse.json({ success: true });
    }

    // 6️⃣ ثبت رمز جدید
    if (action === 'reset') {
      if (!code || !password || password.length < 8 || !/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) {
        return NextResponse.json({ error: 'رمز عبور باید حداقل ۸ کاراکتر و شامل حروف و اعداد باشد' }, { status: 400 });
      }

      const { results: otpResults } = await db.prepare('SELECT * FROM otps WHERE email = ? ORDER BY expires_at DESC LIMIT 1').bind(lowerEmail).all();
      if (!otpResults || otpResults.length === 0) return NextResponse.json({ error: 'کدی یافت نشد' }, { status: 400 });

      const otpData = otpResults[0] as any;
      if (otpData.code !== code) return NextResponse.json({ error: 'کد اشتباه است' }, { status: 400 });
      if (new Date(otpData.expires_at) < new Date()) return NextResponse.json({ error: 'کد منقضی شده است' }, { status: 400 });

      const hashedPassword = await hashPassword(password);
      await db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').bind(hashedPassword, lowerEmail).run();
      await db.prepare('DELETE FROM otps WHERE email = ?').bind(lowerEmail).run();

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'عملیات نامعتبر' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}