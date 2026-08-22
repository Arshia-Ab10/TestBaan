import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as any;
    const email = body.email;
    const code = body.code;
    
    if (!email || !code) return NextResponse.json({ error: 'اطلاعات ناقص است' }, { status: 400 });

    const db = await getDb();
    const lowerEmail = email.toLowerCase();

    const { results: otpResults } = await db.prepare('SELECT * FROM otps WHERE email = ? ORDER BY expires_at DESC LIMIT 1').bind(lowerEmail).all();
    if (!otpResults || otpResults.length === 0) return NextResponse.json({ error: 'کدی برای این ایمیل یافت نشد' }, { status: 400 });

    const otpData = otpResults[0] as any;
    if (otpData.code !== code) return NextResponse.json({ error: 'کد وارد شده اشتباه است' }, { status: 400 });
    if (new Date(otpData.expires_at) < new Date()) return NextResponse.json({ error: 'کد منقضی شده است' }, { status: 400 });

    const { results: userResults } = await db.prepare('SELECT id FROM users WHERE email = ? LIMIT 1').bind(lowerEmail).all();
    if (!userResults || userResults.length === 0) {
      return NextResponse.json({ error: 'کاربر یافت نشد. لطفاً ثبت‌نام کنید.' }, { status: 400 });
    }

    const sessionToken = crypto.randomUUID() + '-' + Date.now().toString();
    await db.prepare('UPDATE users SET session_token = ? WHERE id = ?').bind(sessionToken, userResults[0].id).run();
    await db.prepare('DELETE FROM otps WHERE email = ?').bind(lowerEmail).run();

    const cookieStore = await cookies();
    cookieStore.set('user_session', sessionToken, { httpOnly: true, secure: true, path: '/', maxAge: 60 * 60 * 24 * 7 });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}