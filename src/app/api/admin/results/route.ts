import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const { env } = await getCloudflareContext();
    const db = (env as any).testbaan_db;

    if (!db) return NextResponse.json({ error: 'دیتابیس متصل نیست' }, { status: 500 });

    const query = `
      SELECT 
        s.id, s.score_percentage, s.version, s.completed_at,
        u.id as user_id, u.first_name, u.last_name, u.email,
        a.id as sheet_id, a.title as exam_title, a.total_questions
      FROM user_submissions s
      JOIN users u ON s.user_id = u.id
      JOIN answer_sheets a ON s.answer_sheet_id = a.id
      ORDER BY s.completed_at DESC
      LIMIT 100
    `;
    
    const { results } = await db.prepare(query).all();
    return NextResponse.json(results || [], { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}