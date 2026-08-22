export function toFaNum(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  const faDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.replace(/[0-9]/g, (w) => faDigits[parseInt(w, 10)]);
}

export function toEnNum(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  const faDigits = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
  let result = str;
  for (let i = 0; i < 10; i++) {
    result = result.replace(faDigits[i], String(i));
  }
  return result;
}

// تابع تشخیص دقیق دامنه اصلی سایت
export function getBaseUrl(request?: Request): string {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, '');
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }

  if (request) {
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const proto = request.headers.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'http');
    if (host) {
      return `${proto}://${host}`;
    }
    try {
      const url = new URL(request.url);
      return `${url.protocol}//${url.host}`;
    } catch {}
  }

  return 'http://localhost:3000';
}