import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'غیرمجاز' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const sheetId = searchParams.get('sheetId');

    const { env } = await getCloudflareContext();
    const db = (env as any).testbaan_db;

    const query = `
      SELECT s.id, s.score_percentage, s.user_answers, s.version, s.completed_at, 
             a.correct_keys, a.title, a.start_question_number, a.total_questions, a.subjects_map
      FROM user_submissions s 
      JOIN answer_sheets a ON s.answer_sheet_id = a.id 
      WHERE a.id = ? AND s.user_id = ?
      ORDER BY s.version DESC
    `;
    const { results } = await db.prepare(query).bind(sheetId, user.id).all();

    if (!results || results.length === 0) return NextResponse.json({ error: 'کارنامه یافت نشد' }, { status: 404 });

    return NextResponse.json(results, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}