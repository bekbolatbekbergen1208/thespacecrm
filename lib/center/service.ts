import {
  contractAction,
  readContractSettings,
  type SavedContract,
} from "./contracts";
import type { Transaction } from "@electric-sql/pglite";
import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { getDb, passwordHash, centerDate } from "./db";
import type { Account } from "./session";
import type {
  Attendance,
  HistoricalAttendance,
  CenterState,
  Charge,
  Draft,
  Group,
  Lesson,
  Method,
  Payment,
  Person,
  Student,
  Task,
} from "./types";
export class CenterError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
const text = z.string().trim().min(1, "Міндетті өрісті толтырыңыз").max(300);
const uuid = z.string().min(1).max(100);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
    "Күн қате",
  );
const money = z.coerce
  .number()
  .positive()
  .max(100000000)
  .refine(
    (v) => Math.abs(v * 100 - Math.round(v * 100)) < 0.000001,
    "Ең көбі екі ондық таңба",
  );
const phone = z
  .string()
  .transform((v) => v.replace(/\D/g, ""))
  .refine(
    (v) => /^\d{10,15}$/.test(v),
    "Телефонды ел кодымен енгізіңіз: 77011234567",
  );
function admin(account: Account) {
  if (account.role !== "admin")
    throw new CenterError("Бұл әрекет тек әкімшіге қолжетімді", 403);
}
async function ownLesson(
  account: Account,
  id: string,
  tx?: Pick<Transaction, "query">,
) {
  const client = tx ?? (await getDb());
  const row = (
    await client.query<Lesson>(
      `SELECT *,lesson_date::text,lesson_time::text FROM lessons WHERE id=$1${tx ? " FOR UPDATE" : ""}`,
      [id],
    )
  ).rows[0];
  if (!row) throw new CenterError("Сабақ табылмады", 404);
  if (account.role !== "admin" && row.teacher_id !== account.id)
    throw new CenterError("Бұл сіздің сабағыңыз емес", 403);
  return row;
}
async function requireMentor(id: string) {
  if (
    !(
      await (
        await getDb()
      ).query("SELECT id FROM accounts WHERE id=$1 AND role='teacher'", [id])
    ).rows.length
  )
    throw new CenterError("Топқа немесе сабаққа менторды таңдаңыз");
}
export async function readState(account: Account): Promise<CenterState> {
  const db = await getDb(),
    isAdmin = account.role === "admin",
    p = isAdmin ? [] : [account.id];
  const students = (
    await db.query<Student>(
      `SELECT s.*,s.birth_date::text,g.name AS group_name FROM students s LEFT JOIN groups g ON g.id=s.group_id ${isAdmin ? "" : "WHERE s.group_id IN (SELECT group_id FROM lessons WHERE teacher_id=$1) OR g.teacher_id=$1 OR s.id IN (SELECT at.student_id FROM attendance at JOIN lessons l ON l.id=at.lesson_id WHERE l.teacher_id=$1) OR s.id IN (SELECT h.student_id FROM historical_attendance h JOIN groups hg ON hg.id=h.group_id WHERE hg.teacher_id=$1)"} ORDER BY s.created_at DESC`,
      p,
    )
  ).rows;
  const groups = (
    await db.query<Group>(
      `SELECT * FROM groups ${isAdmin ? "" : "WHERE teacher_id=$1 OR id IN (SELECT group_id FROM lessons WHERE teacher_id=$1)"} ORDER BY name`,
      p,
    )
  ).rows;
  const lessons = (
    await db.query<Lesson>(
      `SELECT l.*,l.lesson_date::text,l.lesson_time::text,g.name AS group_name,a.name AS teacher_name,m.title AS method_title FROM lessons l JOIN groups g ON g.id=l.group_id JOIN accounts a ON a.id=l.teacher_id LEFT JOIN methods m ON m.id=l.method_id ${isAdmin ? "" : "WHERE l.teacher_id=$1"} ORDER BY l.lesson_date,l.lesson_time`,
      p,
    )
  ).rows;
  const methods = (
    await db.query<Method>(
      `SELECT id,title,content,file_name,file_type FROM methods ${isAdmin ? "" : "WHERE id IN (SELECT method_id FROM lessons WHERE teacher_id=$1)"} ORDER BY created_at DESC`,
      p,
    )
  ).rows;
  const tasks = (
    await db.query<Task>(
      `SELECT t.*,t.due_date::text,a.name AS employee_name FROM tasks t JOIN accounts a ON a.id=t.employee_id ${isAdmin ? "" : "WHERE employee_id=$1"} ORDER BY t.due_date`,
      p,
    )
  ).rows;
  const attendance = (
    await db.query<Attendance>(
      `SELECT a.* FROM attendance a ${isAdmin ? "" : "JOIN lessons l ON l.id=a.lesson_id WHERE l.teacher_id=$1"}`,
      p,
    )
  ).rows;
  const historicalAttendance = (
    await db.query<HistoricalAttendance>(
      `SELECT h.*,h.attendance_date::text,g.name AS group_name FROM historical_attendance h LEFT JOIN groups g ON g.id=h.group_id ${isAdmin ? "" : "WHERE h.group_id IN (SELECT id FROM groups WHERE teacher_id=$1)"} ORDER BY h.attendance_date DESC`,
      p,
    )
  ).rows;
  const accounts = (
    await db.query<Person>(
      `SELECT id,name,email,role,position FROM accounts ${isAdmin ? "" : "WHERE id=$1"} ORDER BY name`,
      p,
    )
  ).rows;
  const charges = isAdmin
    ? (
        await db.query<Charge>(
          `SELECT c.*,c.due_date::text,s.name AS student_name,s.phone,COALESCE(sum(p.amount),0)::text AS paid,(c.amount-COALESCE(sum(p.amount),0))::text AS balance FROM charges c JOIN students s ON s.id=c.student_id LEFT JOIN payments p ON p.charge_id=c.id GROUP BY c.id,s.name,s.phone ORDER BY c.due_date DESC`,
        )
      ).rows
    : [];
  const payments = isAdmin
    ? (
        await db.query<Payment>(
          "SELECT p.*,p.paid_at::text,s.name AS student_name FROM payments p JOIN charges c ON c.id=p.charge_id JOIN students s ON s.id=c.student_id ORDER BY p.created_at DESC",
        )
      ).rows
    : [];
  const drafts = (
    await db.query<Draft>(
      `SELECT d.*,s.name AS student_name,s.phone FROM message_drafts d JOIN students s ON s.id=d.student_id ${isAdmin ? "" : "JOIN lessons l ON l.id=d.lesson_id WHERE l.teacher_id=$1"} ORDER BY d.created_at DESC`,
      p,
    )
  ).rows;
  return {
    account,
    today: centerDate(),
    tomorrow: centerDate(1),
    students: isAdmin
      ? students
      : students.map((s) => ({
          ...s,
          parent_iin: "",
          address: "",
          parent_email: "",
        })),
    groups,
    lessons,
    methods,
    tasks,
    attendance,
    historicalAttendance,
    accounts,
    charges,
    payments,
    drafts,
    contracts: isAdmin
      ? (
          await db.query<SavedContract>(
            "SELECT c.id,c.number,c.student_id,c.contract_date::text,c.body,c.status,c.created_at,c.snapshot->'values'->>'student_name' AS student_name FROM student_contracts c JOIN students s ON s.id=c.student_id ORDER BY c.created_at DESC",
          )
        ).rows
      : [],
    contractSettings: isAdmin ? await readContractSettings() : null,
  };
}
export async function mutate(
  account: Account,
  input: Record<string, unknown>,
): Promise<{
  message: string;
  studentId?: string;
  created?: number;
  recorded?: number;
  contractId?: string;
  draft?: { id: string; body: string; phone: string };
}> {
  const db = await getDb(),
    id = randomUUID();
  switch (input.action) {
    case "createContract":
    case "contractSettings": {
      admin(account);
      try {
        return await contractAction(account, input);
      } catch (error) {
        if (error instanceof z.ZodError) throw error;
        throw new CenterError((error as Error).message);
      }
    }
    case "student": {
      admin(account);
      const v = z
        .object({
          id: uuid.optional(),
          name: text,
          parent_name: z.string().trim().max(300).default(""),
          phone: z.union([z.literal(""), phone]).default(""),
          group_id: uuid,
          birth_date: z.union([z.literal(""), date]).optional(),
          address: z.string().trim().max(2000).optional(),
          parent_iin: z
            .union([
              z.literal(""),
              z.string().regex(/^\d{12}$/, "ИИН 12 саннан тұруы керек"),
            ])
            .optional(),
          parent_email: z.union([z.literal(""), z.string().email()]).optional(),
          student_type: z.enum(["regular", "trial"]).optional(),
          notes: z.string().trim().max(5000).optional(),
        })
        .parse(input);
      if (v.birth_date && v.birth_date > centerDate())
        throw new CenterError("Туған күн болашақта болмауы керек");
      if (v.id) {
        if (
          !(
            await db.query(
              "UPDATE students SET name=$1,parent_name=$2,phone=$3,group_id=$4,birth_date=CASE WHEN $6::text IS NULL THEN birth_date ELSE NULLIF($6,'')::date END,address=COALESCE($7,address),parent_iin=COALESCE($8,parent_iin),parent_email=COALESCE($9,parent_email),student_type=COALESCE($10,student_type),notes=COALESCE($11,notes) WHERE id=$5 RETURNING id",
              [
                v.name,
                v.parent_name,
                v.phone,
                v.group_id,
                v.id,
                v.birth_date ?? null,
                v.address ?? null,
                v.parent_iin ?? null,
                v.parent_email ?? null,
                v.student_type ?? null,
                v.notes ?? null,
              ],
            )
          ).rows.length
        )
          throw new CenterError("Оқушы табылмады", 404);
        return {
          message: "Оқушы ақпараты жаңартылды. QR коды сақталды.",
          studentId: v.id,
        };
      }
      await db.query(
        "INSERT INTO students(id,name,parent_name,phone,group_id,qr_token,birth_date,address,parent_iin,parent_email,student_type,notes) VALUES($1,$2,$3,$4,$5,$6,NULLIF($7,'')::date,$8,$9,$10,$11,$12)",
        [
          id,
          v.name,
          v.parent_name,
          v.phone,
          v.group_id,
          randomBytes(24).toString("hex"),
          v.birth_date ?? "",
          v.address ?? "",
          v.parent_iin ?? "",
          v.parent_email ?? "",
          v.student_type ?? "regular",
          v.notes ?? "",
        ],
      );
      return { message: "Оқушы қосылды. Жеке QR бейдж дайын.", studentId: id };
    }
    case "importAttendance": {
      admin(account);
      const v = z
        .object({
          source_batch: text,
          attendance_date: date,
          rows: z
            .array(
              z.object({
                name: text,
                group_name: text,
                status: z.enum(["present", "absent", "unknown"]),
                student_type: z.enum(["regular", "trial"]).default("regular"),
                note: z.string().max(2000).default(""),
              }),
            )
            .min(1)
            .max(500),
        })
        .parse(input);
      return db.transaction(async (tx) => {
        let created = 0,
          recorded = 0;
        const seen = new Set<string>();
        for (const row of v.rows) {
          const key = `${row.group_name.toLocaleLowerCase()}|${row.name.toLocaleLowerCase()}`;
          if (seen.has(key))
            throw new CenterError(`Тізімде оқушы қайталанған: ${row.name}`);
          seen.add(key);
          let group = (
            await tx.query<{ id: string }>(
              "SELECT id FROM groups WHERE name=$1",
              [row.group_name],
            )
          ).rows[0];
          if (!group) {
            group = { id: randomUUID() };
            await tx.query(
              "INSERT INTO groups(id,name,teacher_id,course,monthly_fee) VALUES($1,$2,NULL,'Робототехника',NULL)",
              [group.id, row.group_name],
            );
          }
          const matches = (
            await tx.query<Student>(
              "SELECT * FROM students WHERE lower(trim(name))=lower($1) AND group_id=$2",
              [row.name, group.id],
            )
          ).rows;
          if (matches.length > 1)
            throw new CenterError(
              `Бір топта аты бірдей бірнеше оқушы бар: ${row.name}. Жеке нақтылау қажет.`,
            );
          let student = matches[0];
          if (!student) {
            const studentId = randomUUID();
            await tx.query(
              "INSERT INTO students(id,name,parent_name,phone,group_id,qr_token,student_type,notes) VALUES($1,$2,'','',$3,$4,$5,$6)",
              [
                studentId,
                row.name,
                group.id,
                randomBytes(24).toString("hex"),
                row.student_type,
                row.note,
              ],
            );
            student = (
              await tx.query<Student>("SELECT * FROM students WHERE id=$1", [
                studentId,
              ])
            ).rows[0];
            created++;
          }
          const prior = (
            await tx.query<{
              attendance_date: string;
              status: string;
              group_id: string;
            }>(
              "SELECT attendance_date::text,status,group_id FROM historical_attendance WHERE source_batch=$1 AND student_id=$2",
              [v.source_batch, student.id],
            )
          ).rows[0];
          if (prior) {
            if (
              prior.attendance_date !== v.attendance_date ||
              prior.status !== row.status ||
              prior.group_id !== group.id
            )
              throw new CenterError(
                `Бұл импортта басқа дерек бар: ${row.name}. Қолмен нақтылау қажет.`,
              );
            continue;
          }
          await tx.query(
            "INSERT INTO historical_attendance(id,student_id,group_id,attendance_date,status,note,source_batch) VALUES($1,$2,$3,$4,$5,$6,$7)",
            [
              randomUUID(),
              student.id,
              group.id,
              v.attendance_date,
              row.status,
              row.note,
              v.source_batch,
            ],
          );
          recorded++;
        }
        return {
          message: `${created} оқушы қосылды, ${recorded} қатысу жазбасы сақталды.`,
          created,
          recorded,
        };
      });
    }
    case "employee": {
      admin(account);
      const v = z
        .object({
          name: text,
          email: z
            .string()
            .email()
            .max(200)
            .transform((v) => v.toLowerCase()),
          password: z.string().min(10, "Құпиясөз кемінде 10 таңба").max(128),
          position: text,
          role: z.enum(["admin", "teacher"]),
        })
        .parse(input);
      await db.query(
        "INSERT INTO accounts(id,name,email,password_hash,position,role) VALUES($1,$2,$3,$4,$5,$6)",
        [id, v.name, v.email, passwordHash(v.password), v.position, v.role],
      );
      return { message: "Қызметкер аккаунты құрылды" };
    }
    case "employeeProfile": {
      admin(account);
      const v = z.object({ id: uuid, name: text, position: text }).parse(input);
      if (
        !(
          await db.query(
            "UPDATE accounts SET name=$1,position=$2 WHERE id=$3 RETURNING id",
            [v.name, v.position, v.id],
          )
        ).rows.length
      )
        throw new CenterError("Қызметкер табылмады", 404);
      return { message: "Қызметкердің аты-жөні жаңартылды" };
    }
    case "group": {
      admin(account);
      const v = z
        .object({
          id: uuid.optional(),
          name: text,
          teacher_id: uuid,
          course: text,
          monthly_fee: z.preprocess(
            (v) => (v === "" ? null : v),
            z.coerce.number().min(0).max(100000000).nullable(),
          ),
        })
        .parse(input);
      await requireMentor(v.teacher_id);
      if (v.id) {
        if (
          !(
            await db.query(
              "UPDATE groups SET name=$1,teacher_id=$2,course=$3,monthly_fee=$4 WHERE id=$5 RETURNING id",
              [v.name, v.teacher_id, v.course, v.monthly_fee, v.id],
            )
          ).rows.length
        )
          throw new CenterError("Топ табылмады", 404);
        return { message: "Топ ақпараты жаңартылды" };
      }
      await db.query(
        "INSERT INTO groups(id,name,teacher_id,course,monthly_fee) VALUES($1,$2,$3,$4,$5)",
        [id, v.name, v.teacher_id, v.course, v.monthly_fee],
      );
      return { message: "Топ қосылды" };
    }
    case "method": {
      admin(account);
      const v = z
        .object({
          id: uuid.optional(),
          title: text,
          content: z.string().trim().min(1).max(50000),
          file_name: z.string().max(200).optional(),
          file_type: z
            .enum(["application/pdf", "text/plain", "image/png", "image/jpeg"])
            .optional(),
          file_data: z.string().max(2800000).optional(),
        })
        .parse(input);
      if (
        v.file_data &&
        (!v.file_name ||
          !v.file_type ||
          !/^data:(application\/pdf|text\/plain|image\/png|image\/jpeg);base64,[A-Za-z0-9+/=\r\n]+$/.test(
            v.file_data,
          ))
      )
        throw new CenterError("Файл пішімі қате");
      if (v.id) {
        if (
          !(
            await db.query(
              "UPDATE methods SET title=$1,content=$2,file_name=COALESCE($3,file_name),file_type=COALESCE($4,file_type),file_data=COALESCE($5,file_data) WHERE id=$6 RETURNING id",
              [
                v.title,
                v.content,
                v.file_name ?? null,
                v.file_type ?? null,
                v.file_data ?? null,
                v.id,
              ],
            )
          ).rows.length
        )
          throw new CenterError("Әдістеме табылмады", 404);
        return { message: "Әдістеме жаңартылды" };
      }
      await db.query(
        "INSERT INTO methods(id,title,content,file_name,file_type,file_data) VALUES($1,$2,$3,$4,$5,$6)",
        [
          id,
          v.title,
          v.content,
          v.file_name ?? null,
          v.file_type ?? null,
          v.file_data ?? null,
        ],
      );
      return { message: "Әдістеме кітапханаға жүктелді" };
    }
    case "lesson": {
      admin(account);
      const v = z
        .object({
          id: uuid.optional(),
          group_id: uuid,
          teacher_id: uuid,
          method_id: z.string().max(100),
          lesson_date: date,
          lesson_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
          topic: text,
          room: z.string().max(100),
        })
        .parse(input);
      await requireMentor(v.teacher_id);
      if (v.id) {
        await db.transaction(async (tx) => {
          const existing = await ownLesson(account, v.id!, tx);
          const recorded =
            (
              await tx.query(
                "SELECT id FROM attendance WHERE lesson_id=$1 LIMIT 1",
                [v.id],
              )
            ).rows.length > 0;
          if (
            recorded &&
            (existing.group_id !== v.group_id ||
              existing.teacher_id !== v.teacher_id ||
              existing.lesson_date !== v.lesson_date)
          )
            throw new CenterError(
              "Қатысу белгіленген сабақтың тобын, күнін немесе менторын өзгертуге болмайды",
            );
          await tx.query(
            "UPDATE lessons SET group_id=$1,teacher_id=$2,method_id=$3,lesson_date=$4,lesson_time=$5,topic=$6,room=$7 WHERE id=$8",
            [
              v.group_id,
              v.teacher_id,
              v.method_id || null,
              v.lesson_date,
              v.lesson_time,
              v.topic,
              v.room,
              v.id,
            ],
          );
        });
        return { message: "Сабақ кестесі жаңартылды" };
      }
      await db.query(
        "INSERT INTO lessons(id,group_id,teacher_id,method_id,lesson_date,lesson_time,topic,room) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
        [
          id,
          v.group_id,
          v.teacher_id,
          v.method_id || null,
          v.lesson_date,
          v.lesson_time,
          v.topic,
          v.room,
        ],
      );
      return {
        message: "Сабақ бекітілді. Әдістеме мұғалім кабинетінде көрсетіледі.",
      };
    }
    case "assignMethod": {
      admin(account);
      const v = z.object({ lesson_id: uuid, method_id: uuid }).parse(input);
      if (
        !(
          await db.query(
            "UPDATE lessons SET method_id=$1 WHERE id=$2 RETURNING id",
            [v.method_id, v.lesson_id],
          )
        ).rows.length
      )
        throw new CenterError("Сабақ табылмады", 404);
      return { message: "Әдістеме сабаққа бекітілді" };
    }
    case "task": {
      admin(account);
      const v = z
        .object({
          title: text,
          employee_id: uuid,
          due_date: date,
          description: z.string().max(5000),
        })
        .parse(input);
      await db.query(
        "INSERT INTO tasks(id,title,employee_id,due_date,description) VALUES($1,$2,$3,$4,$5)",
        [id, v.title, v.employee_id, v.due_date, v.description],
      );
      return { message: "Тапсырма қызметкерге берілді" };
    }
    case "taskStatus": {
      const v = z
        .object({ id: uuid, status: z.enum(["todo", "done"]) })
        .parse(input);
      const changed = await db.query(
        `UPDATE tasks SET status=$1 WHERE id=$2 ${account.role === "admin" ? "" : "AND employee_id=$3"} RETURNING id`,
        account.role === "admin"
          ? [v.status, v.id]
          : [v.status, v.id, account.id],
      );
      if (!changed.rows.length)
        throw new CenterError("Тапсырма табылмады немесе қолжетімсіз", 403);
      return { message: "Тапсырма жаңартылды" };
    }
    case "scan": {
      const v = z
        .object({ lesson_id: uuid, token: z.string().trim().min(1).max(500) })
        .parse(input);
      return db.transaction(async (tx) => {
        const lesson = await ownLesson(account, v.lesson_id, tx);
        if (lesson.status === "completed")
          throw new CenterError(
            "Сабақ жабылған. Қатысуды түзету батырмасын қолданыңыз.",
          );
        if (account.role === "teacher" && lesson.lesson_date !== centerDate())
          throw new CenterError("QR қатысу тек бүгінгі сабаққа қабылданады");
        const student = (
          await tx.query<Student>("SELECT * FROM students WHERE qr_token=$1", [
            v.token.replace(/^s7:/, ""),
          ])
        ).rows[0];
        if (!student)
          throw new CenterError(
            "QR танылмады. Оқушының S7 бейджін қолданыңыз.",
          );
        if (student.group_id !== lesson.group_id)
          throw new CenterError("Бұл оқушы басқа топта");
        await tx.query(
          "INSERT INTO attendance(id,lesson_id,student_id,status) VALUES($1,$2,$3,'present') ON CONFLICT(lesson_id,student_id) DO UPDATE SET status='present',marked_at=now()",
          [id, lesson.id, student.id],
        );
        return { message: `${student.name} — сабаққа келді` };
      });
    }
    case "attendanceStatus": {
      const v = z
        .object({
          lesson_id: uuid,
          student_id: uuid,
          status: z.enum(["present", "absent"]),
        })
        .parse(input);
      return db.transaction(async (tx) => {
        const lesson = await ownLesson(account, v.lesson_id, tx);
        if (account.role === "teacher" && lesson.lesson_date !== centerDate())
          throw new CenterError("Қатысу тек бүгінгі сабақта түзетіледі");
        const student = (
          await tx.query<Student>(
            "SELECT * FROM students WHERE id=$1 AND (group_id=$2 OR id IN (SELECT student_id FROM attendance WHERE lesson_id=$3))",
            [v.student_id, lesson.group_id, lesson.id],
          )
        ).rows[0];
        if (!student) throw new CenterError("Оқушы бұл топта жоқ");
        await tx.query(
          "INSERT INTO attendance(id,lesson_id,student_id,status) VALUES($1,$2,$3,$4) ON CONFLICT(lesson_id,student_id) DO UPDATE SET status=$4,marked_at=now()",
          [id, lesson.id, student.id, v.status],
        );
        return { message: "Қатысу түзетілді" };
      });
    }
    case "closeLesson": {
      const v = z.object({ lesson_id: uuid }).parse(input);
      return db.transaction(async (tx) => {
        const lesson = await ownLesson(account, v.lesson_id, tx);
        if (account.role === "teacher" && lesson.lesson_date !== centerDate())
          throw new CenterError("Тек бүгінгі сабақты жабуға болады");
        if (lesson.status === "completed")
          return { message: "Сабақ бұрын аяқталған. Қатысу өзгерген жоқ." };
        const students = (
          await tx.query<Student>("SELECT id FROM students WHERE group_id=$1", [
            lesson.group_id,
          ])
        ).rows;
        for (const student of students)
          await tx.query(
            "INSERT INTO attendance(id,lesson_id,student_id,status) VALUES($1,$2,$3,'absent') ON CONFLICT(lesson_id,student_id) DO NOTHING",
            [randomUUID(), lesson.id, student.id],
          );
        await tx.query("UPDATE lessons SET status='completed' WHERE id=$1", [
          lesson.id,
        ]);
        return {
          message:
            "Сабақ жабылды. Белгіленбеген оқушылар «келмеді» деп белгіленді.",
        };
      });
    }
    case "charge": {
      admin(account);
      const v = z
        .object({
          student_id: uuid,
          period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
          amount: money,
          due_date: date,
        })
        .parse(input);
      await db.query(
        "INSERT INTO charges(id,student_id,period,amount,due_date) VALUES($1,$2,$3,$4,$5)",
        [id, v.student_id, v.period, v.amount, v.due_date],
      );
      return { message: "Төлем шоты құрылды" };
    }
    case "payment": {
      admin(account);
      const v = z
        .object({
          charge_id: uuid,
          amount: money,
          paid_at: date,
          note: z.string().max(1000),
        })
        .parse(input);
      await db.transaction(async (tx) => {
        const charge = (
          await tx.query<{ amount: string }>(
            "SELECT amount FROM charges WHERE id=$1 FOR UPDATE",
            [v.charge_id],
          )
        ).rows[0];
        if (!charge) throw new CenterError("Төлем шоты табылмады");
        const paid = (
          await tx.query<{ paid: string }>(
            "SELECT COALESCE(sum(amount),0) AS paid FROM payments WHERE charge_id=$1",
            [v.charge_id],
          )
        ).rows[0];
        if (
          Math.round(v.amount * 100) >
          Math.round((Number(charge.amount) - Number(paid.paid)) * 100)
        )
          throw new CenterError("Төлем қалдық қарыздан артық");
        await tx.query(
          "INSERT INTO payments(id,charge_id,amount,paid_at,note) VALUES($1,$2,$3,$4,$5)",
          [id, v.charge_id, v.amount, v.paid_at, v.note],
        );
      });
      return { message: "Төлем тіркелді" };
    }
    case "draft": {
      const v = z
        .object({
          kind: z.enum(["absence", "payment"]),
          student_id: uuid,
          lesson_id: z.string().optional(),
          charge_id: z.string().optional(),
          body: z.string().trim().min(1).max(4000).optional(),
        })
        .parse(input);
      const student = (
        await db.query<Student>("SELECT * FROM students WHERE id=$1", [
          v.student_id,
        ])
      ).rows[0];
      if (!student) throw new CenterError("Оқушы табылмады");
      if (!student.phone)
        throw new CenterError(
          "Ата-анасының WhatsApp нөмірі көрсетілмеген. Оқушы карточкасына қосыңыз.",
        );
      let body = "";
      if (v.kind === "absence") {
        if (!v.lesson_id) throw new CenterError("Сабақты таңдаңыз");
        const lesson = await ownLesson(account, v.lesson_id);
        const marked = (
          await db.query(
            "SELECT id FROM attendance WHERE lesson_id=$1 AND student_id=$2 AND status='absent'",
            [lesson.id, student.id],
          )
        ).rows;
        if (!marked.length)
          throw new CenterError("Оқушы «келмеді» деп белгіленбеген");
        body = `Сәлеметсіз бе, ${student.parent_name}! ${student.name} ${String(lesson.lesson_date).slice(0, 10)} күні ${String(lesson.lesson_time).slice(0, 5)} уақытындағы S7 Robotics сабағына келмеді. Себебін хабарлауыңызды сұраймыз. Рақмет!`;
      } else {
        admin(account);
        if (!v.charge_id) throw new CenterError("Төлем шотын таңдаңыз");
        const charge = (
          await db.query<{ period: string; balance: string }>(
            "SELECT c.period,c.amount-COALESCE(sum(p.amount),0) AS balance FROM charges c LEFT JOIN payments p ON p.charge_id=c.id WHERE c.id=$1 AND c.student_id=$2 GROUP BY c.id",
            [v.charge_id, student.id],
          )
        ).rows[0];
        if (!charge || Number(charge.balance) <= 0)
          throw new CenterError("Төленбеген қарыз жоқ");
        body = `Сәлеметсіз бе, ${student.parent_name}! S7 Robotics: ${student.name} оқушысының ${charge.period} айына төлем қалдығы — ${Number(charge.balance).toLocaleString("ru-RU")} ₸. Төлем жасауды сұраймыз. Төлем деректемелерін әкімшіден ала аласыз. Рақмет!`;
      }
      body = v.body || body;
      await db.query(
        "INSERT INTO message_drafts(id,student_id,lesson_id,kind,body) VALUES($1,$2,$3,$4,$5)",
        [
          id,
          student.id,
          v.kind === "absence" ? v.lesson_id : null,
          v.kind,
          body,
        ],
      );
      return {
        message: "Хабарлама мәтіні дайын. WhatsApp-та жіберуді растаңыз.",
        draft: { id, body, phone: student.phone },
      };
    }
    case "password": {
      admin(account);
      const v = z
        .object({ id: uuid, password: z.string().min(10).max(128) })
        .parse(input);
      if (
        !(
          await db.query(
            "UPDATE accounts SET password_hash=$1,session_version=session_version+1 WHERE id=$2 RETURNING id",
            [passwordHash(v.password), v.id],
          )
        ).rows.length
      )
        throw new CenterError("Аккаунт табылмады");
      return { message: "Құпиясөз жаңартылды" };
    }
    default:
      throw new CenterError("Белгісіз әрекет");
  }
}
