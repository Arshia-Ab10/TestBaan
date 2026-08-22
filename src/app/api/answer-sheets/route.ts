import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const book_id = searchParams.get('book_id');

    const db = await getDb();
    if (!db) return NextResponse.json({ error: 'دیتابیس متصل نیست' }, { status: 500 });

    let query = 'SELECT * FROM answer_sheets';
    let params: any[] = [];

    if (book_id) {
      query += ' WHERE book_id = ?';
      params.push(book_id);
    }
    query += ' ORDER BY COALESCE(sort_order, 0) DESC, created_at DESC';

    const { results } = await db.prepare(query).bind(...params).all();

    const parsedResults = results.map((item: any) => ({
      ...item,
      correct_keys: item.correct_keys ? JSON.parse(item.correct_keys) : {}
    }));

    return NextResponse.json(parsedResults, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'غیرمجاز' }, { status: 403 });

    const body = (await request.json()) as any;
    const { book_id, title, type, duration_minutes, start_question_number, total_questions, correct_keys, subjects_map } = body;

    if (!book_id || !title || !total_questions || !correct_keys) {
      return NextResponse.json({ error: 'اطلاعات ناقص است' }, { status: 400 });
    }

    const db = await getDb();
    const random10Digit = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const keysJson = JSON.stringify(correct_keys);

    await db.prepare(
      `INSERT INTO answer_sheets (id, book_id, title, type, duration_minutes, start_question_number, total_questions, correct_keys, subjects_map) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(random10Digit, book_id, title, type || 'practice', duration_minutes || null, start_question_number || 1, total_questions, keysJson, subjects_map || '').run();

    return NextResponse.json({ message: 'پاسخ‌برگ ساخته شد' }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'غیرمجاز' }, { status: 403 });

    const body = (await request.json()) as any;
    const { id, title, type, duration_minutes, start_question_number, total_questions, correct_keys, subjects_map } = body;

    if (!id || !title || !total_questions || !correct_keys) {
      return NextResponse.json({ error: 'اطلاعات ناقص است' }, { status: 400 });
    }

    const db = await getDb();
    const keysJson = JSON.stringify(correct_keys);

    await db.prepare(
      `UPDATE answer_sheets SET title = ?, type = ?, duration_minutes = ?, start_question_number = ?, total_questions = ?, correct_keys = ?, subjects_map = ? WHERE id = ?`
    ).bind(title, type || 'practice', duration_minutes || null, start_question_number || 1, total_questions, keysJson, subjects_map || '', id).run();

    return NextResponse.json({ message: 'پاسخ‌برگ ویرایش شد' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'غیرمجاز' }, { status: 403 });

    const { orderedIds } = (await request.json()) as any;
    const db = await getDb();

    for (let i = 0; i < orderedIds.length; i++) {
      const sortOrder = orderedIds.length - i;
      await db.prepare('UPDATE answer_sheets SET sort_order = ? WHERE id = ?').bind(sortOrder, orderedIds[i]).run();
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'غیرمجاز' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const db = await getDb();

    await db.prepare('DELETE FROM answer_sheets WHERE id = ?').bind(id).run();
    return NextResponse.json({ message: 'پاسخ‌برگ حذف شد' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}