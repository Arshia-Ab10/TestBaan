import { NextResponse } from 'next/server';
import { getEnv } from '@/lib/db';

export async function GET(request: Request) {
  const env = await getEnv();
  const clientId = env.GOOGLE_CLIENT_ID || '686114748186-7mds5gulof8vgpsqj3haf5i4fj21ve5l.apps.googleusercontent.com';
  
  const url = new URL(request.url);
  const protocol = url.hostname === 'localhost' ? 'http' : 'https';
  const redirectUri = `${protocol}://${url.host}/api/auth/callback/google`;

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=openid%20email%20profile&` +
    `prompt=select_account`;

  return NextResponse.redirect(googleAuthUrl);
}