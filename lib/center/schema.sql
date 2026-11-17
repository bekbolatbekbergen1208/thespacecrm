CREATE TABLE IF NOT EXISTS accounts (id text PRIMARY KEY, name text NOT NULL, email text UNIQUE NOT NULL, password_hash text NOT NULL, role text NOT NULL CHECK(role IN ('admin','teacher')), position text NOT NULL DEFAULT 'Мұғалім', created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS groups (id text PRIMARY KEY, name text NOT NULL UNIQUE, teacher_id text REFERENCES accounts(id), course text NOT NULL DEFAULT 'Робототехника', monthly_fee numeric(12,2) NOT NULL DEFAULT 0 CHECK(monthly_fee>=0));
CREATE TABLE IF NOT EXISTS students (id text PRIMARY KEY, name text NOT NULL, parent_name text NOT NULL, phone text NOT NULL, group_id text REFERENCES groups(id), qr_token text UNIQUE NOT NULL, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS methods (id text PRIMARY KEY, title text NOT NULL, content text NOT NULL, file_name text, file_type text, file_data text, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS lessons (id text PRIMARY KEY, group_id text NOT NULL REFERENCES groups(id), teacher_id text NOT NULL REFERENCES accounts(id), method_id text REFERENCES methods(id), lesson_date date NOT NULL, lesson_time time NOT NULL, topic text NOT NULL, room text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'planned' CHECK(status IN ('planned','completed')), UNIQUE(group_id,lesson_date,lesson_time));
CREATE TABLE IF NOT EXISTS tasks (id text PRIMARY KEY, title text NOT NULL, employee_id text NOT NULL REFERENCES accounts(id), due_date date NOT NULL, description text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'todo' CHECK(status IN ('todo','done')));
CREATE TABLE IF NOT EXISTS attendance (id text PRIMARY KEY, lesson_id text NOT NULL REFERENCES lessons(id), student_id text NOT NULL REFERENCES students(id), status text NOT NULL CHECK(status IN ('present','absent')), marked_at timestamptz DEFAULT now(), UNIQUE(lesson_id,student_id));
CREATE TABLE IF NOT EXISTS charges (id text PRIMARY KEY, student_id text NOT NULL REFERENCES students(id), period text NOT NULL CHECK(period ~ '^\d{4}-(0[1-9]|1[0-2])$'), amount numeric(12,2) NOT NULL CHECK(amount>0), due_date date NOT NULL, UNIQUE(student_id,period));
CREATE TABLE IF NOT EXISTS payments (id text PRIMARY KEY, charge_id text NOT NULL REFERENCES charges(id), amount numeric(12,2) NOT NULL CHECK(amount>0), paid_at date NOT NULL, note text NOT NULL DEFAULT '', created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS message_drafts (id text PRIMARY KEY, student_id text NOT NULL REFERENCES students(id), lesson_id text REFERENCES lessons(id), kind text NOT NULL CHECK(kind IN ('absence','payment')), body text NOT NULL, created_at timestamptz DEFAULT now());
CREATE INDEX IF NOT EXISTS lessons_date_idx ON lessons(lesson_date,teacher_id);
CREATE INDEX IF NOT EXISTS attendance_lesson_idx ON attendance(lesson_id);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 1;
ALTER TABLE students ADD COLUMN IF NOT EXISTS student_type text NOT NULL DEFAULT 'regular' CHECK(student_type IN ('regular','trial'));
ALTER TABLE students ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '';
CREATE TABLE IF NOT EXISTS historical_attendance (
 id text PRIMARY KEY, student_id text NOT NULL REFERENCES students(id), group_id text REFERENCES groups(id),
 attendance_date date NOT NULL, status text NOT NULL CHECK(status IN ('present','absent','unknown')),
 note text NOT NULL DEFAULT '', source_batch text NOT NULL, created_at timestamptz DEFAULT now(),
 UNIQUE(source_batch,student_id)
);
CREATE INDEX IF NOT EXISTS historical_attendance_student_date_idx ON historical_attendance(student_id,attendance_date);
ALTER TABLE groups ALTER COLUMN monthly_fee DROP NOT NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS birth_date date;
ALTER TABLE students ADD COLUMN IF NOT EXISTS address text NOT NULL DEFAULT '';
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_iin text NOT NULL DEFAULT '';
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_email text NOT NULL DEFAULT '';
CREATE SEQUENCE IF NOT EXISTS contract_number_seq;
CREATE TABLE IF NOT EXISTS contract_settings (
 id text PRIMARY KEY CHECK(id='main'), provider_name text NOT NULL, representative text NOT NULL DEFAULT '',
 city text NOT NULL DEFAULT '', provider_details text NOT NULL DEFAULT '', template text NOT NULL, updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS student_contracts (
 id text PRIMARY KEY, number text UNIQUE NOT NULL, student_id text NOT NULL REFERENCES students(id),
 contract_date date NOT NULL, body text NOT NULL, snapshot jsonb NOT NULL, created_by text NOT NULL REFERENCES accounts(id),
 status text NOT NULL DEFAULT 'draft' CHECK(status='draft'), created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS student_contracts_student_idx ON student_contracts(student_id,created_at);
