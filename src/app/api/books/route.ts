import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'لطفاً وارد شوید' }, { status: 401 });

    const db = await getDb();
    const { results } = await db.prepare('SELECT * FROM books ORDER BY created_at DESC').all();
    return NextResponse.json(results, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });

    const body = (await request.json()) as any;
    const { title, description } = body;
    if (!title) return NextResponse.json({ error: 'عنوان الزامی است' }, { status: 400 });

    const db = await getDb();
    const random10Digit = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    await db.prepare('INSERT INTO books (id, title, description) VALUES (?, ?, ?)')
      .bind(random10Digit, title, description || '').run();

    return NextResponse.json({ message: 'کتاب ساخته شد' }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });

    const body = (await request.json()) as any;
    const { id, title, description } = body;
    if (!id || !title) return NextResponse.json({ error: 'اطلاعات ناقص است' }, { status: 400 });

    const db = await getDb();
    await db.prepare('UPDATE books SET title = ?, description = ? WHERE id = ?')
      .bind(title, description || '', id).run();

    return NextResponse.json({ message: 'کتاب ویرایش شد' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const db = await getDb();

    await db.prepare('DELETE FROM books WHERE id = ?').bind(id).run();
    return NextResponse.json({ message: 'حذف شد' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}