-- خاموش کردن موقت کلیدهای خارجی
PRAGMA foreign_keys = OFF;

-- پاک کردن جداول قدیمی
DROP TABLE IF EXISTS user_permissions;
DROP TABLE IF EXISTS user_submissions;
DROP TABLE IF EXISTS user_sheet_progress;
DROP TABLE IF EXISTS answer_sheets;
DROP TABLE IF EXISTS books;
DROP TABLE IF EXISTS otps;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS user_tags;

CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    session_token TEXT,
    password_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE books (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE answer_sheets (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'practice',
    duration_minutes INTEGER,
    start_question_number INTEGER NOT NULL DEFAULT 1,
    total_questions INTEGER NOT NULL,
    correct_keys TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    subjects_map TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE TABLE user_permissions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    answer_sheet_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (answer_sheet_id) REFERENCES answer_sheets(id) ON DELETE CASCADE,
    UNIQUE(user_id, answer_sheet_id)
);

CREATE TABLE user_submissions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    answer_sheet_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'in_progress',
    score_percentage REAL,
    version INTEGER DEFAULT 1,
    user_answers TEXT,
    completed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (answer_sheet_id) REFERENCES answer_sheets(id) ON DELETE CASCADE
);

CREATE TABLE user_sheet_progress (
    user_id TEXT NOT NULL,
    answer_sheet_id TEXT NOT NULL,
    draft_answers TEXT,
    question_flags TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, answer_sheet_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (answer_sheet_id) REFERENCES answer_sheets(id) ON DELETE CASCADE
);

CREATE TABLE otps (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS user_tags (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- روشن کردن مجدد کلیدهای خارجی
PRAGMA foreign_keys = ON;