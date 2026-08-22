import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getBaseUrl } from '@/lib/utils';

export async function GET(request: Request) {
  const cookieStore = await cookies();
  cookieStore.delete('user_session');
  
  const baseUrl = getBaseUrl(request);
  return NextResponse.redirect(new URL('/', baseUrl));
}