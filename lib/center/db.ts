import { PGlite } from "@electric-sql/pglite";
import {
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { mkdir, readFile, writeFile, chmod } from "node:fs/promises";
import path from "node:path";
export const dataDir =
  process.env.CENTER_DATA_DIR || path.join(process.cwd(), ".local-data");
export function passwordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function verifyPassword(password: string, hash: string) {
  const [salt, key] = hash.split(":");
  const actual = scryptSync(password, salt, 64),
    expected = Buffer.from(key || "", "hex");
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}
export function centerDate(offset = 0) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Aqtau",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(Date.now() + offset * 86400000));
}
const globalDb = globalThis as unknown as { centerDb?: Promise<PGlite> };
export function getDb() {
  if (!globalDb.centerDb)
    globalDb.centerDb = initialize().catch((error) => {
      globalDb.centerDb = undefined;
      throw error;
    });
  return globalDb.centerDb;
}
async function initialize() {
  await mkdir(dataDir, { recursive: true, mode: 0o700 });
  const db = new PGlite(path.join(dataDir, "postgres"));
  await db.waitReady;
  await db.exec(
    await readFile(path.join(process.cwd(), "lib/center/schema.sql"), "utf8"),
  );
  if (!(await db.query("SELECT id FROM accounts LIMIT 1")).rows.length) {
    const adminPassword = `S7-${randomBytes(8).toString("hex")}`,
      teacherPassword = `S7-${randomBytes(8).toString("hex")}`;
    await db.transaction(async (tx) => {
      for (const [id, name, email, password, role, position] of [
        [
          "admin",
          "S7 әкімшісі",
          "admin@s7.local",
          adminPassword,
          "admin",
          "Әкімші",
        ],
        [
          "teacher",
          "Демо мұғалім",
          "teacher@s7.local",
          teacherPassword,
          "teacher",
          "Робототехника мұғалімі",
        ],
      ])
        await tx.query(
          "INSERT INTO accounts(id,name,email,password_hash,role,position) VALUES($1,$2,$3,$4,$5,$6)",
          [id, name, email, passwordHash(password), role, position],
        );
      await tx.query(
        "INSERT INTO groups(id,name,teacher_id,course,monthly_fee) VALUES('demo-group','Демо • LEGO бастауыш','teacher','LEGO Robotics',25000)",
      );
      const methodId = randomUUID();
      await tx.query("INSERT INTO methods(id,title,content) VALUES($1,$2,$3)", [
        methodId,
        "Демо • Қозғалыс және сенсорлар",
        "Мақсат: оқушы қозғалтқыш пен қашықтық сенсорын қолданады.\n1. Қайталау — 5 минут.\n2. Роботты құрастыру — 20 минут.\n3. Алгоритм: кедергіні байқағанда тоқтау — 15 минут.\n4. Жұптық сынақ — 10 минут.\n5. Қорытынды және жұмыс орнын жинау — 10 минут.",
      ]);
      for (const date of [centerDate(), centerDate(1)])
        await tx.query(
          "INSERT INTO lessons(id,group_id,teacher_id,method_id,lesson_date,lesson_time,topic,room) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
          [
            randomUUID(),
            "demo-group",
            "teacher",
            methodId,
            date,
            "16:00",
            "Демо • Ақылды робот",
            "1-кабинет",
          ],
        );
    });
    await writeFile(
      path.join(dataDir, "accounts.txt"),
      `S7 Robotics — ЖЕРГІЛІКТІ аккаунттар\n\nӘкімші: admin@s7.local\nҚұпиясөз: ${adminPassword}\n\nМұғалім: teacher@s7.local\nҚұпиясөз: ${teacherPassword}\n\nhttp://localhost:3000/workspace/login\n`,
      { mode: 0o600 },
    );
  }
  await chmod(dataDir, 0o700);
  return db;
}
