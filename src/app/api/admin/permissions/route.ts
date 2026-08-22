import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const { env } = await getCloudflareContext();
  const db = (env as any).testbaan_db;
  
  const { results } = await db.prepare("SELECT answer_sheet_id FROM user_permissions WHERE user_id = ?").bind(userId).all();
  return NextResponse.json(results.map((r: any) => r.answer_sheet_id));
}

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
  }

  const { userId, sheetIds } = (await request.json()) as any;
  const { env } = await getCloudflareContext();
  const db = (env as any).testbaan_db;
  
  await db.prepare("DELETE FROM user_permissions WHERE user_id = ?").bind(userId).run();
  
  for (const sheetId of sheetIds) {
    const id = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    await db.prepare("INSERT INTO user_permissions (id, user_id, answer_sheet_id) VALUES (?, ?, ?)").bind(id, userId, sheetId).run();
  }
  return NextResponse.json({ success: true });
}