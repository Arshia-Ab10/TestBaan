import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const db = await getDb();
    if (!db) return NextResponse.json({ error: 'دیتابیس متصل نیست' }, { status: 500 });

    const { results } = await db.prepare("SELECT id, first_name, last_name, email, role FROM users ORDER BY id DESC").all();
    return NextResponse.json(results || [], { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}