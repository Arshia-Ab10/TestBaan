const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');

async function importDump() {
  const dumpFile = path.join(__dirname, 'remote-dump.sql');
  const dbFile = path.join(__dirname, 'testbaan.db');

  if (!fs.existsSync(dumpFile)) {
    console.error('❌ فایل remote-dump.sql در پوشه پروژه یافت نشد! ابتدا آن را دانلود کرده و در پوشه پروژه قرار دهید.');
    process.exit(1);
  }

  // حذف دیتابیس قبلی برای جایگزینی تمیز
  if (fs.existsSync(dbFile)) {
    fs.unlinkSync(dbFile);
  }

  const client = createClient({
    url: `file:${dbFile}`
  });

  console.log('⏳ در حال ایمپورت داده‌های ورکر به دیتابیس محلی...');
  const sql = fs.readFileSync(dumpFile, 'utf8');
  await client.executeMultiple(sql);
  console.log('✅ تمام اطلاعات دیتابیس کلودفلر با موفقیت روی testbaan.db ویندوز لود شد!');
}

importDump().catch(console.error);