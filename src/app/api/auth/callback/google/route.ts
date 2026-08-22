import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getEnv, getDb } from '@/lib/db';
import { getBaseUrl } from '@/lib/utils';

export async function GET(request: Request) {
  const baseUrl = getBaseUrl(request);
  const redirectUri = `${baseUrl}/api/auth/callback/google`;

  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    if (!code) return NextResponse.redirect(`${baseUrl}/?error=no_code`);

    const env = await getEnv();
    const clientId = env.GOOGLE_CLIENT_ID || '686114748186-7mds5gulof8vgpsqj3haf5i4fj21ve5l.apps.googleusercontent.com';
    const clientSecret = env.GOOGLE_CLIENT_SECRET;

    if (!clientSecret) return NextResponse.redirect(`${baseUrl}/?error=secret_not_found`);

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code',
      }),
    });

    const tokenData = (await tokenResponse.json()) as any;
    if (!tokenData.access_token) return NextResponse.redirect(`${baseUrl}/?error=token_failed`);

    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const googleUser = (await userResponse.json()) as any;
    const { email, given_name, family_name } = googleUser;

    if (!email) return NextResponse.redirect(`${baseUrl}/?error=no_email`);

    const db = await getDb();
    let userId = "";
    let firstName = given_name || "";
    let lastName = family_name || "";
    const sessionToken = crypto.randomUUID() + '-' + Math.floor(1000000000 + Math.random() * 9000000000).toString();

    if (db) {
      const { results } = await db.prepare('SELECT * FROM users WHERE email = ? LIMIT 1').bind(email).all();
      
      if (results && results.length > 0) {
        const existingUser = results[0] as any;
        userId = existingUser.id;
        firstName = existingUser.first_name || firstName;
        lastName = existingUser.last_name || lastName;
        
        await db.prepare('UPDATE users SET session_token = ?, first_name = ?, last_name = ? WHERE id = ?')
          .bind(sessionToken, firstName, lastName, userId).run();
      } else {
        userId = Math.floor(1000000000 + Math.random() * 9000000000).toString();
        await db.prepare('INSERT INTO users (id, email, first_name, last_name, role, session_token) VALUES (?, ?, ?, ?, ?, ?)')
          .bind(userId, email, firstName, lastName, 'user', sessionToken).run();
      }
    }

    const cookieStore = await cookies();
    cookieStore.set('user_session', sessionToken, {
      httpOnly: true, secure: true, path: '/', maxAge: 60 * 60 * 24 * 7,
    });

    return NextResponse.redirect(`${baseUrl}/dashboard`);
  } catch (error: any) {
    return NextResponse.redirect(`${baseUrl}/?error=${encodeURIComponent(error.message)}`);
  }
}