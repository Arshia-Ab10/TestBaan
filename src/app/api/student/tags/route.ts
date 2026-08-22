import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { DEFAULT_TAGS } from '@/lib/tags';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'غیرمجاز' }, { status: 401 });

    const { env } = await getCloudflareContext();
    const db = (env as any).testbaan_db;

    const { results } = await db.prepare("SELECT * FROM user_tags WHERE user_id = ? ORDER BY created_at ASC").bind(user.id).all();

    // اگر کاربر تگی نداشت، تگ‌های پیش‌فرض را برایش بساز
    if (!results || results.length === 0) {
      const createdTags = [];
      for (const dt of DEFAULT_TAGS) {
        const id = Math.floor(1000000000 + Math.random() * 9000000000).toString();
        await db.prepare("INSERT INTO user_tags (id, user_id, name, color) VALUES (?, ?, ?, ?)").bind(id, user.id, dt.name, dt.color).run();
        createdTags.push({ id, user_id: user.id, name: dt.name, color: dt.color });
      }
      return NextResponse.json(createdTags);
    }

    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'غیرمجاز' }, { status: 401 });

    const { name, color } = (await request.json()) as any;
    if (!name || !color) return NextResponse.json({ error: 'اطلاعات ناقص است' }, { status: 400 });

    const { env } = await getCloudflareContext();
    const db = (env as any).testbaan_db;

    const id = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    await db.prepare("INSERT INTO user_tags (id, user_id, name, color) VALUES (?, ?, ?, ?)").bind(id, user.id, name.trim(), color).run();

    return NextResponse.json({ id, name: name.trim(), color }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'غیرمجاز' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const tagId = searchParams.get('id');
    if (!tagId) return NextResponse.json({ error: 'شناسه تگ الزامی است' }, { status: 400 });

    const { env } = await getCloudflareContext();
    const db = (env as any).testbaan_db;

    await db.prepare("DELETE FROM user_tags WHERE id = ? AND user_id = ?").bind(tagId, user.id).run();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}