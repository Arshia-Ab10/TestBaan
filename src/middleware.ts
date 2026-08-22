import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // اگر کسی خواست آدرس مستقیم APIهای ادمین یا صفحات ادمین را باز کند
  if (path.startsWith('/admin') || path.startsWith('/api/admin')) {
    const sessionCookie = request.cookies.get('user_session');
    
    if (!sessionCookie) {
      if (path.startsWith('/api/')) {
        return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/', request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};