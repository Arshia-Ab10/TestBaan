import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';

export async function getAuthUser() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('user_session')?.value;

    if (!sessionToken) return null;

    const db = await getDb();
    if (!db) return null;

    const { results } = await db
      .prepare('SELECT id, email, first_name, last_name, role FROM users WHERE session_token = ? LIMIT 1')
      .bind(sessionToken)
      .all();

    if (results && results.length > 0) {
      return results[0] as any;
    }

    return null;
  } catch (error) {
    return null;
  }
}