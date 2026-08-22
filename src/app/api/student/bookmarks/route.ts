import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'غیرمجاز' }, { status: 401 });

    const { env } = await getCloudflareContext();
    const db = (env as any).testbaan_db;

    // ۱. دریافت تمام تگ‌های کاربر
    const { results: userTags } = await db.prepare("SELECT * FROM user_tags WHERE user_id = ?").bind(user.id).all();
    const tagsMap = new Map((userTags || []).map((t: any) => [t.id, t]));

    // ۲. دریافت تمام آزمون‌هایی که پیش‌نویس یا تگ دارند
    const query = `
      SELECT 
        p.answer_sheet_id, p.draft_answers, p.question_flags,
        a.title as sheet_title, a.total_questions, a.start_question_number, a.correct_keys,
        b.id as book_id, b.title as book_title
      FROM user_sheet_progress p
      JOIN answer_sheets a ON p.answer_sheet_id = a.id
      JOIN books b ON a.book_id = b.id
      WHERE p.user_id = ?
    `;

    const { results: progressList } = await db.prepare(query).bind(user.id).all();

    const taggedQuestions: any[] = [];

    for (const item of (progressList || [])) {
      const flags = item.question_flags ? JSON.parse(item.question_flags) : {};
      const answers = item.draft_answers ? JSON.parse(item.draft_answers) : {};
      const correctKeys = item.correct_keys ? JSON.parse(item.correct_keys) : {};

      for (const [qStr, tagIds] of Object.entries(flags)) {
        const qNum = parseInt(qStr);
        if (!Array.isArray(tagIds) || tagIds.length === 0) continue;

        const resolvedTags = tagIds.map(tid => tagsMap.get(tid)).filter(Boolean);
        if (resolvedTags.length === 0) continue;

        const userAns = answers[qNum];
        const correctAns = correctKeys[qNum];
        const hasKey = typeof correctAns === 'number' && correctAns >= 1 && correctAns <= 4;

        let status: 'correct' | 'wrong' | 'empty' | 'no_key' = 'empty';
        if (!hasKey) status = 'no_key';
        else if (!userAns) status = 'empty';
        else if (userAns === correctAns) status = 'correct';
        else status = 'wrong';

        taggedQuestions.push({
          bookId: item.book_id,
          bookTitle: item.book_title,
          sheetId: item.answer_sheet_id,
          sheetTitle: item.sheet_title,
          questionNumber: qNum,
          userAnswer: userAns || null,
          correctAnswer: hasKey ? correctAns : null,
          status,
          tags: resolvedTags
        });
      }
    }

    return NextResponse.json(taggedQuestions);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}