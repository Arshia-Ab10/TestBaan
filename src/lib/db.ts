import path from 'path';
import fs from 'fs';

let localLibsqlClient: any = null;

async function getLocalLibsqlDatabase() {
  if (localLibsqlClient) return localLibsqlClient;

  // استفاده از require پویا برای جلوگیری از تداخل در ورکر کلودفلر
  const { createClient } = (eval('require'))('@libsql/client');
  const dbPath = path.join(process.cwd(), 'testbaan.db');
  const isNewDb = !fs.existsSync(dbPath);

  const client = createClient({
    url: `file:${dbPath}`
  });

  // اگر دیتابیس برای اولین بار ساخته می‌شود، schema.sql اجرا شود
  if (isNewDb) {
    const schemaPath = path.join(process.cwd(), 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      console.log('📦 در حال ساخت جداول اولیه دیتابیس SQLite...');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await client.executeMultiple(schemaSql);
      console.log('✅ دیتابیس testbaan.db با موفقیت ساخته و مقداردهی شد.');
    }
  }

  localLibsqlClient = client;
  return client;
}

// شبیه‌ساز ساختار Cloudflare D1 برای @libsql/client
function createD1Adapter(libsqlClient: any) {
  return {
    prepare(query: string) {
      const createStatementWrapper = (boundParams: any[] = []) => ({
        bind(...params: any[]) {
          return createStatementWrapper(params);
        },
        async all() {
          const res = await libsqlClient.execute({ sql: query, args: boundParams });
          return { results: res.rows };
        },
        async run() {
          const res = await libsqlClient.execute({ sql: query, args: boundParams });
          return {
            success: true,
            meta: {
              changes: res.rowsAffected,
              last_row_id: res.lastInsertRowid !== undefined ? Number(res.lastInsertRowid) : undefined
            }
          };
        },
        async first(col?: string) {
          const res = await libsqlClient.execute({ sql: query, args: boundParams });
          const row = res.rows[0];
          if (!row) return null;
          if (col) return (row as any)[col];
          return row;
        }
      });
      return createStatementWrapper();
    }
  };
}

export async function getEnv(): Promise<Record<string, any>> {
  try {
    if (typeof (globalThis as any).WebSocketPair !== 'undefined' || (process.env as any).CLOUDFLARE_WORKER) {
      const { getCloudflareContext } = await import('@opennextjs/cloudflare');
      const ctx = await getCloudflareContext();
      if (ctx && ctx.env) return ctx.env;
    }
  } catch {
    // در محیط Node.js نادیده گرفته شود
  }
  return process.env;
}

export async function getDb() {
  // ۱. اولویت با Cloudflare D1
  try {
    const env = await getEnv();
    if (env && env.testbaan_db) {
      return env.testbaan_db;
    }
  } catch {}

  // ۲. استفاده از SQLite محلی با درایور LibSQL
  const localClient = await getLocalLibsqlDatabase();
  return createD1Adapter(localClient);
}