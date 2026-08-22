import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  return NextResponse.json({ error: 'درخواست غیرمجاز (فقط POST پذیرفته می‌شود)' }, { status: 405 });
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'غیرمجاز' }, { status: 401 });

    const body = (await request.json()) as any;
    const { action, sheetId, userAnswers, questionFlags, qNum } = body;

    const db = await getDb();
    if (!db) return NextResponse.json({ error: 'دیتابیس متصل نیست' }, { status: 500 });

    if (action === 'fetch') {
      const permCheck = await db.prepare("SELECT id FROM user_permissions WHERE user_id = ? AND answer_sheet_id = ?").bind(user.id, sheetId).all();
      if (!permCheck.results || permCheck.results.length === 0) {
        return NextResponse.json({ error: 'شما به این آزمون دسترسی ندارید' }, { status: 403 });
      }

      const { results: sheetRes } = await db.prepare("SELECT * FROM answer_sheets WHERE id = ?").bind(sheetId).all();
      const { results: progRes } = await db.prepare("SELECT draft_answers, question_flags FROM user_sheet_progress WHERE user_id = ? AND answer_sheet_id = ?").bind(user.id, sheetId).all();

      return NextResponse.json({ 
        exam: sheetRes[0], 
        progress: progRes.length ? progRes[0] : null 
      }, { status: 200 });
    }

    if (action === 'save_cloud') {
      const ansJson = JSON.stringify(userAnswers || {});
      const flagsJson = JSON.stringify(questionFlags || {});
      await db.prepare(`INSERT INTO user_sheet_progress (user_id, answer_sheet_id, draft_answers, question_flags) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, answer_sheet_id) DO UPDATE SET draft_answers = excluded.draft_answers, question_flags = excluded.question_flags, updated_at = CURRENT_TIMESTAMP`).bind(user.id, sheetId, ansJson, flagsJson).run();
      return NextResponse.json({ success: true });
    }

    if (action === 'instant_check') {
      const { results } = await db.prepare("SELECT correct_keys FROM answer_sheets WHERE id = ?").bind(sheetId).all();
      const keys = JSON.parse(results[0].correct_keys || '{}');
      const correctOpt = keys[qNum];
      const hasKey = typeof correctOpt === 'number' && correctOpt >= 1 && correctOpt <= 4;
      
      return NextResponse.json({ 
        hasKey,
        isCorrect: hasKey ? (keys[qNum] === userAnswers[qNum]) : false, 
        correctOpt: hasKey ? keys[qNum] : 0 
      });
    }

    if (action === 'submit') {
      const { results: sheetRes } = await db.prepare("SELECT * FROM answer_sheets WHERE id = ?").bind(sheetId).all();
      const sheet = sheetRes[0] as any;
      
      const maxVersions = Math.ceil(sheet.total_questions / 10) * 2;
      const { results: subRes } = await db.prepare("SELECT COUNT(*) as count, MAX(version) as last_v FROM user_submissions WHERE user_id = ? AND answer_sheet_id = ?").bind(user.id, sheetId).all();
      const currentCount = subRes[0].count;
      const nextVersion = (subRes[0].last_v || 0) + 1;

      if (currentCount >= maxVersions) {
        return NextResponse.json({ error: `شما به حداکثر دفعات مجاز (${maxVersions} بار) رسیده‌اید.` }, { status: 403 });
      }

      const correctKeys = JSON.parse(sheet.correct_keys || '{}');
      let correct = 0, wrong = 0;
      let validQuestionsCount = 0;
      const startNum = sheet.start_question_number || 1;
      const total = sheet.total_questions || 0;

      for (let i = startNum; i < startNum + total; i++) {
        const key = correctKeys[i];
        const isKeyValid = typeof key === 'number' && key >= 1 && key <= 4;
        
        if (isKeyValid) {
          validQuestionsCount++;
          if (userAnswers && userAnswers[i]) {
            if (userAnswers[i] === key) correct++;
            else wrong++;
          }
        }
      }

      let score = validQuestionsCount > 0 ? ((correct * 3) - wrong) / (validQuestionsCount * 3) * 100 : 0;
      score = parseFloat(score.toFixed(2));

      const submissionId = Math.floor(1000000000 + Math.random() * 9000000000).toString();
      const answersJson = JSON.stringify(userAnswers || {});

      await db.prepare(
        "INSERT INTO user_submissions (id, user_id, answer_sheet_id, status, user_answers, score_percentage, version, completed_at) VALUES (?, ?, ?, 'completed', ?, ?, ?, CURRENT_TIMESTAMP)"
      ).bind(submissionId, user.id, sheetId, answersJson, score, nextVersion).run();

      const flagsJson = JSON.stringify(questionFlags || {});
      await db.prepare(`INSERT INTO user_sheet_progress (user_id, answer_sheet_id, draft_answers, question_flags) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, answer_sheet_id) DO UPDATE SET draft_answers = excluded.draft_answers, question_flags = excluded.question_flags`).bind(user.id, sheetId, answersJson, flagsJson).run();

      return NextResponse.json({ success: true, submissionId });
    }

    return NextResponse.json({ error: 'اکشن نامعتبر' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}