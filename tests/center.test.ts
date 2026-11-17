import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
async function main() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "s7-crm-test-"));
  process.env.CENTER_DATA_DIR = dir;
  const { getDb, centerDate, verifyPassword, passwordHash } =
    await import("../lib/center/db");
  const { mutate, readState } = await import("../lib/center/service");
  const db = await getDb();
  const admin = {
    id: "admin",
    name: "Admin",
    email: "admin@s7.local",
    role: "admin" as const,
    position: "Admin",
  };
  const teacher = {
    id: "teacher",
    name: "Teacher",
    email: "teacher@s7.local",
    role: "teacher" as const,
    position: "Teacher",
  };
  let passed = 0;
  async function check(name: string, fn: () => Promise<void>) {
    await fn();
    passed++;
    console.log(`✓ ${name}`);
  }
  try {
    await check("PostgreSQL schema and hashed credentials", async () => {
      assert.equal((await readState(admin)).accounts.length, 2);
      const h = passwordHash("Test-password-123");
      assert(verifyPassword("Test-password-123", h));
      assert(!verifyPassword("wrong", h));
    });
    let studentId = "";
    await check("New student receives a unique opaque QR token", async () => {
      const r = await mutate(admin, {
        action: "student",
        name: "Тест Оқушы",
        parent_name: "Тест Ата-ана",
        phone: "+7 (701) 123-45-67",
        group_id: "demo-group",
      });
      studentId = r.studentId!;
      const s = (await readState(admin)).students.find(
        (s) => s.id === studentId,
      )!;
      assert.match(s.qr_token, /^[a-f0-9]{48}$/);
      assert.equal(s.phone, "77011234567");
    });
    await check("Editing student preserves QR identity", async () => {
      const before = (await readState(admin)).students.find(
        (s) => s.id === studentId,
      )!;
      await mutate(admin, {
        action: "student",
        id: studentId,
        name: "Тест Оқушы өзгерді",
        parent_name: before.parent_name,
        phone: before.phone,
        group_id: before.group_id,
      });
      const after = (await readState(admin)).students.find(
        (s) => s.id === studentId,
      )!;
      assert.equal(after.qr_token, before.qr_token);
      assert.equal(after.name, "Тест Оқушы өзгерді");
    });
    await check(
      "Foreign-key and input validation reject invalid student/group",
      async () => {
        await assert.rejects(
          mutate(admin, {
            action: "student",
            name: "",
            parent_name: "Parent",
            phone: "1",
            group_id: "unknown",
          }),
        );
      },
    );
    await check(
      "Printed QR image decodes to the student's exact token",
      async () => {
        const student = (await readState(admin)).students.find(
          (s) => s.id === studentId,
        )!;
        const { toDataURL } = await import("qrcode");
        const { PNG } = createRequire(path.join(process.cwd(), "package.json"))(
          "pngjs",
        ) as {
          PNG: {
            sync: {
              read: (buffer: Buffer) => {
                width: number;
                height: number;
                data: Buffer;
              };
            };
          };
        };
        const image = PNG.sync.read(
          Buffer.from(
            (await toDataURL(`s7:${student.qr_token}`)).split(",")[1],
            "base64",
          ),
        );
        const luminance = new Uint8ClampedArray(image.width * image.height);
        for (let i = 0; i < luminance.length; i++)
          luminance[i] = image.data[i * 4];
        const {
          QRCodeReader,
          BinaryBitmap,
          HybridBinarizer,
          RGBLuminanceSource,
        } = await import("@zxing/library");
        const result = new QRCodeReader().decode(
          new BinaryBitmap(
            new HybridBinarizer(
              new RGBLuminanceSource(luminance, image.width, image.height),
            ),
          ),
        );
        assert.equal(result.getText(), `s7:${student.qr_token}`);
      },
    );
    const today = (await readState(teacher)).lessons.find(
      (l) => l.lesson_date === centerDate(),
    )!;
    await check(
      "QR scan persists attendance and repeat scans are idempotent",
      async () => {
        const s = (await readState(admin)).students.find(
          (s) => s.id === studentId,
        )!;
        await mutate(teacher, {
          action: "scan",
          lesson_id: today.id,
          token: `s7:${s.qr_token}`,
        });
        await mutate(teacher, {
          action: "scan",
          lesson_id: today.id,
          token: s.qr_token,
        });
        const attendance = (await readState(teacher)).attendance.filter(
          (a) => a.lesson_id === today.id && a.student_id === studentId,
        );
        assert.equal(attendance.length, 1);
        assert.equal(attendance[0].status, "present");
      },
    );
    await check("Invalid QR and cross-group scans are rejected", async () => {
      await assert.rejects(
        mutate(teacher, {
          action: "scan",
          lesson_id: today.id,
          token: "wrong",
        }),
      );
      await mutate(admin, {
        action: "group",
        name: "Other group",
        teacher_id: "teacher",
        course: "Robotics",
        monthly_fee: 100,
      });
      const group = (await readState(admin)).groups.find(
        (g) => g.name === "Other group",
      )!;
      const r = await mutate(admin, {
        action: "student",
        name: "Other student",
        parent_name: "Other parent",
        phone: "77010000000",
        group_id: group.id,
      });
      const s = (await readState(admin)).students.find(
        (s) => s.id === r.studentId,
      )!;
      await assert.rejects(
        mutate(teacher, {
          action: "scan",
          lesson_id: today.id,
          token: s.qr_token,
        }),
      );
    });
    let absentId = "";
    await check(
      "Closing lesson records only unmarked students as absent",
      async () => {
        const r = await mutate(admin, {
          action: "student",
          name: "Absent student",
          parent_name: "Parent",
          phone: "77010000001",
          group_id: "demo-group",
        });
        absentId = r.studentId!;
        await mutate(teacher, { action: "closeLesson", lesson_id: today.id });
        const state = await readState(teacher);
        assert.equal(
          state.attendance.find((a) => a.student_id === absentId)?.status,
          "absent",
        );
        assert.equal(
          state.attendance.find((a) => a.student_id === studentId)?.status,
          "present",
        );
        await assert.rejects(
          mutate(teacher, {
            action: "scan",
            lesson_id: today.id,
            token: state.students[0].qr_token,
          }),
        );
      },
    );
    await check(
      "Absence draft requires a recorded absence and has parent text",
      async () => {
        const r = await mutate(teacher, {
          action: "draft",
          kind: "absence",
          student_id: absentId,
          lesson_id: today.id,
        });
        assert(r.draft?.body.includes("сабағына келмеді"));
        assert.equal(r.draft?.phone, "77010000001");
        await assert.rejects(
          mutate(teacher, {
            action: "draft",
            kind: "absence",
            student_id: studentId,
            lesson_id: today.id,
          }),
        );
      },
    );
    await check(
      "Tomorrow lesson includes its assigned methodology",
      async () => {
        const s = await readState(teacher);
        const tomorrow = s.lessons.find((l) => l.lesson_date === s.tomorrow)!;
        assert(tomorrow.method_id);
        assert(s.methods.some((m) => m.id === tomorrow.method_id));
      },
    );
    let outsiderId = "";
    await check("Employee account and task assignment work", async () => {
      await mutate(admin, {
        action: "employee",
        name: "Test employee",
        email: "employee@s7.local",
        password: "Test-password-123",
        position: "Mentor",
        role: "teacher",
      });
      outsiderId = (await readState(admin)).accounts.find(
        (a) => a.email === "employee@s7.local",
      )!.id;
      await mutate(admin, {
        action: "task",
        title: "Prepare kits",
        employee_id: outsiderId,
        due_date: centerDate(1),
        description: "Check batteries",
      });
      const other = { ...teacher, id: outsiderId };
      const s = await readState(other);
      assert.equal(s.tasks.length, 1);
      assert.equal(s.lessons.length, 0);
      assert.equal(s.students.length, 0);
      assert.equal(s.methods.length, 0);
      assert.equal(s.payments.length, 0);
      await mutate(other, {
        action: "taskStatus",
        id: s.tasks[0].id,
        status: "done",
      });
      assert.equal((await readState(other)).tasks[0].status, "done");
      await assert.rejects(
        mutate(teacher, {
          action: "taskStatus",
          id: s.tasks[0].id,
          status: "done",
        }),
      );
    });
    await check(
      "Teacher cannot create accounts, charges or change another lesson",
      async () => {
        await assert.rejects(mutate(teacher, { action: "employee" }));
        await assert.rejects(mutate(teacher, { action: "charge" }));
        await assert.rejects(
          mutate(
            { ...teacher, id: outsiderId },
            { action: "closeLesson", lesson_id: today.id },
          ),
        );
      },
    );
    let chargeId = "";
    await check(
      "Charges and partial payments calculate the remaining balance",
      async () => {
        await mutate(admin, {
          action: "charge",
          student_id: studentId,
          period: "2026-11",
          amount: 25000,
          due_date: centerDate(),
        });
        chargeId = (await readState(admin)).charges[0].id;
        await mutate(admin, {
          action: "payment",
          charge_id: chargeId,
          amount: 10000,
          paid_at: centerDate(),
          note: "Cash",
        });
        assert.equal(
          Number((await readState(admin)).charges[0].balance),
          15000,
        );
        await assert.rejects(
          mutate(admin, {
            action: "payment",
            charge_id: chargeId,
            amount: 15000.01,
            paid_at: centerDate(),
            note: "",
          }),
        );
      },
    );
    await check(
      "Payment draft contains exact debt and rejects paid-off charge",
      async () => {
        const r = await mutate(admin, {
          action: "draft",
          kind: "payment",
          student_id: studentId,
          charge_id: chargeId,
        });
        assert(r.draft?.body.includes("15"));
        await mutate(admin, {
          action: "payment",
          charge_id: chargeId,
          amount: 15000,
          paid_at: centerDate(),
          note: "",
        });
        assert.equal(Number((await readState(admin)).charges[0].balance), 0);
        await assert.rejects(
          mutate(admin, {
            action: "draft",
            kind: "payment",
            student_id: studentId,
            charge_id: chargeId,
          }),
        );
      },
    );
    await check(
      "Duplicate charge and negative payment are rejected",
      async () => {
        await assert.rejects(
          mutate(admin, {
            action: "charge",
            student_id: studentId,
            period: "2026-11",
            amount: 25000,
            due_date: centerDate(),
          }),
        );
        await assert.rejects(
          mutate(admin, {
            action: "payment",
            charge_id: chargeId,
            amount: -1,
            paid_at: centerDate(),
            note: "",
          }),
        );
      },
    );
    await check("Methodology upload and assignment are persisted", async () => {
      await mutate(admin, {
        action: "method",
        title: "Uploaded guide",
        content: "Lesson plan",
        file_name: "lesson.txt",
        file_type: "text/plain",
        file_data: "data:text/plain;base64,TGVzc29uIHBsYW4=",
      });
      const m = (await readState(admin)).methods.find(
        (m) => m.title === "Uploaded guide",
      )!;
      await mutate(admin, {
        action: "assignMethod",
        lesson_id: today.id,
        method_id: m.id,
      });
      assert((await readState(teacher)).methods.some((x) => x.id === m.id));
    });
    await check(
      "Original logo bytes persist without changing the image",
      async () => {
        const { toDataURL } = await import("qrcode");
        const { saveLogo, readLogo, parseLogo } =
          await import("../lib/center/branding");
        const original = await toDataURL("logo-round-trip");
        await saveLogo(original);
        const saved = await readLogo();
        assert(saved);
        assert.equal(saved.mime, "image/png");
        assert(
          saved.data.equals(Buffer.from(original.split(",")[1], "base64")),
        );
        assert.throws(() => parseLogo("data:image/svg+xml;base64,PHN2Zz4="));
        assert.throws(() => parseLogo("data:image/png;base64,PGh0bWw+"));
      },
    );
    await check(
      "Closing a completed lesson does not add newly enrolled students",
      async () => {
        const created = await mutate(admin, {
          action: "student",
          name: "New after closure",
          parent_name: "Parent",
          phone: "77010000009",
          group_id: "demo-group",
        });
        await mutate(teacher, { action: "closeLesson", lesson_id: today.id });
        assert(
          !(await readState(admin)).attendance.some(
            (a) =>
              a.lesson_id === today.id && a.student_id === created.studentId,
          ),
        );
      },
    );
    await check(
      "Transferred students keep their historical attendance",
      async () => {
        await mutate(admin, {
          action: "group",
          name: "Transfer group",
          teacher_id: outsiderId,
          course: "Robotics",
          monthly_fee: 25000,
        });
        const before = (await readState(admin)).students.find(
          (s) => s.id === studentId,
        )!;
        const group = (await readState(admin)).groups.find(
          (g) => g.name === "Transfer group",
        )!;
        await mutate(admin, {
          action: "student",
          id: studentId,
          name: before.name,
          parent_name: before.parent_name,
          phone: before.phone,
          group_id: group.id,
        });
        const historical = await readState(teacher);
        assert(historical.students.some((s) => s.id === studentId));
        assert(
          historical.attendance.some(
            (a) => a.lesson_id === today.id && a.student_id === studentId,
          ),
        );
        await mutate(teacher, {
          action: "attendanceStatus",
          lesson_id: today.id,
          student_id: studentId,
          status: "present",
        });
      },
    );
    await check(
      "Admins can rename employees without changing credentials",
      async () => {
        const before = (
          await db.query<{ password_hash: string; email: string }>(
            "SELECT password_hash,email FROM accounts WHERE id=$1",
            [outsiderId],
          )
        ).rows[0];
        await mutate(admin, {
          action: "employeeProfile",
          id: outsiderId,
          name: "Named mentor",
          position: "Ментор",
        });
        const after = (
          await db.query<{
            password_hash: string;
            email: string;
            name: string;
          }>("SELECT password_hash,email,name FROM accounts WHERE id=$1", [
            outsiderId,
          ])
        ).rows[0];
        assert.equal(after.password_hash, before.password_hash);
        assert.equal(after.email, before.email);
        assert.equal(after.name, "Named mentor");
        await assert.rejects(
          mutate(teacher, {
            action: "employeeProfile",
            id: outsiderId,
            name: "Unauthorized",
            position: "Admin",
          }),
        );
      },
    );
    await check(
      "Admins assign groups to mentors; other mentors cannot access them",
      async () => {
        await mutate(admin, {
          action: "group",
          name: "Assignment group",
          teacher_id: outsiderId,
          course: "Robotics",
          monthly_fee: 25000,
        });
        const group = (await readState(admin)).groups.find(
          (g) => g.name === "Assignment group",
        )!;
        const other = { ...teacher, id: outsiderId };
        assert((await readState(other)).groups.some((g) => g.id === group.id));
        assert(
          !(await readState(teacher)).groups.some((g) => g.id === group.id),
        );
        await assert.rejects(
          mutate(teacher, {
            action: "group",
            id: group.id,
            name: group.name,
            teacher_id: teacher.id,
            course: group.course,
            monthly_fee: 25000,
          }),
        );
        await assert.rejects(
          mutate(admin, {
            action: "group",
            name: "Invalid admin group",
            teacher_id: "admin",
            course: "Robotics",
            monthly_fee: 0,
          }),
        );
      },
    );
    await check(
      "Admins edit schedules and preserve recorded lesson history",
      async () => {
        const group = (await readState(admin)).groups.find(
          (g) => g.name === "Assignment group",
        )!;
        const input = {
          action: "lesson",
          group_id: group.id,
          teacher_id: outsiderId,
          method_id: "",
          lesson_date: centerDate(1),
          lesson_time: "17:30",
          topic: "Scheduling test",
          room: "A",
        };
        await mutate(admin, input);
        const lesson = (await readState(admin)).lessons.find(
          (l) => l.topic === "Scheduling test",
        )!;
        await mutate(admin, {
          ...input,
          id: lesson.id,
          lesson_time: "18:00",
          topic: "Updated topic",
        });
        const updated = (
          await readState({ ...teacher, id: outsiderId })
        ).lessons.find((l) => l.id === lesson.id)!;
        assert.equal(updated.lesson_time.slice(0, 5), "18:00");
        assert.equal(updated.topic, "Updated topic");
        await assert.rejects(mutate(teacher, { ...input, id: lesson.id }));
        await assert.rejects(mutate(admin, { ...input, teacher_id: "admin" }));
        const created = await mutate(admin, {
          action: "student",
          name: "Schedule student",
          parent_name: "Parent",
          phone: "77010000008",
          group_id: group.id,
        });
        await mutate(admin, {
          action: "attendanceStatus",
          lesson_id: lesson.id,
          student_id: created.studentId,
          status: "present",
        });
        await assert.rejects(
          mutate(admin, {
            ...input,
            id: lesson.id,
            lesson_date: centerDate(2),
          }),
        );
      },
    );
    const importPayload = {
      action: "importAttendance",
      source_batch: "test-list-2026-11-15",
      attendance_date: "2026-11-15",
      rows: [
        {
          name: "Imported Present",
          group_name: "Import B1",
          status: "present",
        },
        { name: "Imported Absent", group_name: "Import B1", status: "absent" },
        {
          name: "Trial Unknown",
          group_name: "Import A",
          status: "unknown",
          student_type: "trial",
          note: "Пробник маленький",
        },
      ],
    };
    let importedId = "";
    await check(
      "Historical list import preserves unknown contacts and creates QR identities",
      async () => {
        const result = await mutate(admin, importPayload);
        assert.equal(result.created, 3);
        assert.equal(result.recorded, 3);
        const state = await readState(admin);
        const imported = state.students.find(
          (s) => s.name === "Imported Present",
        )!;
        importedId = imported.id;
        assert.equal(imported.parent_name, "");
        assert.equal(imported.phone, "");
        assert.match(imported.qr_token, /^[a-f0-9]{48}$/);
        const group = state.groups.find((g) => g.name === "Import B1")!;
        assert.equal(group.teacher_id, null);
        assert.equal(group.monthly_fee, null);
        assert.equal(
          state.students.find((s) => s.name === "Trial Unknown")?.student_type,
          "trial",
        );
        assert.equal(
          state.historicalAttendance.filter(
            (h) => h.source_batch === importPayload.source_batch,
          ).length,
          3,
        );
      },
    );
    await check(
      "Repeated imports do not duplicate or overwrite attendance",
      async () => {
        const result = await mutate(admin, importPayload);
        assert.equal(result.created, 0);
        assert.equal(result.recorded, 0);
        await assert.rejects(
          mutate(admin, {
            ...importPayload,
            rows: [{ ...importPayload.rows[0], status: "absent" }],
          }),
        );
        await assert.rejects(mutate(teacher, importPayload));
        const record = (await readState(admin)).historicalAttendance.find(
          (h) => h.student_id === importedId,
        )!;
        assert.equal(record.status, "present");
      },
    );
    await check(
      "Individual reports combine historical and live records and filter by date",
      async () => {
        const { studentAttendanceReport, attendanceCsv } =
          await import("../lib/center/reports");
        let state = await readState(admin);
        const student = state.students.find((s) => s.id === importedId)!;
        await mutate(admin, {
          action: "lesson",
          group_id: student.group_id,
          teacher_id: "teacher",
          method_id: "",
          lesson_date: "2026-11-16",
          lesson_time: "10:00",
          topic: "Report lesson",
          room: "",
        });
        const lesson = (await readState(admin)).lessons.find(
          (l) => l.topic === "Report lesson",
        )!;
        await mutate(admin, {
          action: "attendanceStatus",
          lesson_id: lesson.id,
          student_id: student.id,
          status: "absent",
        });
        state = await readState(admin);
        const report = studentAttendanceReport(state, student.id);
        assert.equal(report.total, 2);
        assert.equal(report.present, 1);
        assert.equal(report.absent, 1);
        assert.equal(report.rate, 50);
        assert.equal(
          report.rows.find((r) => r.date === "2026-11-15")?.time,
          "",
        );
        const filtered = studentAttendanceReport(
          state,
          student.id,
          "2026-11-15",
          "2026-11-15",
        );
        assert.equal(filtered.total, 1);
        assert.equal(filtered.rate, 100);
        assert.equal(
          studentAttendanceReport(state, student.id, "2026-12-01").total,
          0,
        );
        const unknown = state.students.find((s) => s.name === "Trial Unknown")!;
        assert.equal(studentAttendanceReport(state, unknown.id).rate, null);
        const csv = attendanceCsv(report.rows, "=SUM(1,2)");
        assert(csv.startsWith("\uFEFF"));
        assert(csv.includes("2026-11-15"));
        assert(csv.includes("'=SUM(1,2)"));
      },
    );
    await check(
      "Missing phone blocks WhatsApp drafts instead of inventing a recipient",
      async () => {
        await mutate(admin, {
          action: "charge",
          student_id: importedId,
          period: "2026-12",
          amount: 10000,
          due_date: "2026-12-01",
        });
        const charge = (await readState(admin)).charges.find(
          (c) => c.student_id === importedId,
        )!;
        await assert.rejects(
          mutate(admin, {
            action: "draft",
            kind: "payment",
            student_id: importedId,
            charge_id: charge.id,
          }),
        );
      },
    );
    let contractStudentId = "";
    await check(
      "Full student card editing preserves QR and existing history",
      async () => {
        const created = await mutate(admin, {
          action: "student",
          name: "Contract Student",
          parent_name: "Parent Name",
          phone: "77010000007",
          group_id: "demo-group",
          birth_date: "2016-04-05",
          address: "Test address",
          parent_iin: "000000000000",
          parent_email: "parent@example.test",
          student_type: "regular",
          notes: "Card note",
        });
        contractStudentId = created.studentId!;
        const before = (await readState(admin)).students.find(
          (s) => s.id === contractStudentId,
        )!;
        await mutate(admin, {
          action: "student",
          id: contractStudentId,
          name: before.name,
          parent_name: before.parent_name,
          phone: before.phone,
          group_id: before.group_id,
          notes: "Updated note",
        });
        const after = (await readState(admin)).students.find(
          (s) => s.id === contractStudentId,
        )!;
        assert.equal(after.qr_token, before.qr_token);
        assert.equal(after.birth_date, "2016-04-05");
        assert.equal(after.parent_email, "parent@example.test");
        assert.equal(after.notes, "Updated note");
        await assert.rejects(
          mutate(admin, {
            action: "student",
            id: contractStudentId,
            name: before.name,
            parent_name: before.parent_name,
            phone: before.phone,
            group_id: before.group_id,
            parent_iin: "123",
          }),
        );
        await assert.rejects(
          mutate(teacher, {
            action: "student",
            id: contractStudentId,
            name: "No",
            group_id: "demo-group",
          }),
        );
      },
    );
    const { defaultContractTemplate } =
      await import("../lib/center/contracts-template");
    const contractInput = {
      action: "createContract",
      student_id: "",
      contract_date: "2026-11-17",
      start_date: "2026-11-18",
      end_date: "2027-05-31",
      schedule: "Суббота 10:00",
      amount: 25000,
      billing_period: "месяц",
      payment_due: "До 5 числа",
      terms: "Индивидуальные условия, введённые администратором.",
      settings: {
        provider_name: "Test Provider",
        representative: "Test Representative",
        city: "Test City",
        provider_details: "Test details",
        template: defaultContractTemplate,
      },
    };
    let savedContractId = "";
    await check(
      "Contracts automatically fill and save the student card snapshot",
      async () => {
        const created = await mutate(admin, {
          ...contractInput,
          student_id: contractStudentId,
        });
        savedContractId = created.contractId!;
        assert(savedContractId);
        const contract = (await readState(admin)).contracts.find(
          (c) => c.id === savedContractId,
        )!;
        assert.match(contract.number, /^S7-2026-\d{5}$/);
        assert.equal(contract.status, "draft");
        assert(contract.body.includes("Contract Student"));
        assert(contract.body.includes("Parent Name"));
        assert(contract.body.includes("05.04.2016"));
        assert(contract.body.includes(contractInput.terms));
        assert(contract.body.includes("\n"));
        assert(!contract.body.includes("{{"));
        assert(!contract.body.includes("\\n"));
        assert.equal(
          (await readState(admin)).contractSettings?.provider_name,
          "Test Provider",
        );
        const second = await mutate(admin, {
          ...contractInput,
          student_id: contractStudentId,
        });
        assert.notEqual(second.contractId, savedContractId);
        const numbers = (await readState(admin)).contracts.map((c) => c.number);
        assert.equal(new Set(numbers).size, numbers.length);
      },
    );
    await check(
      "Saved contracts do not change when a student card is updated",
      async () => {
        const before = (await readState(admin)).contracts.find(
          (c) => c.id === savedContractId,
        )!;
        const student = (await readState(admin)).students.find(
          (s) => s.id === contractStudentId,
        )!;
        await mutate(admin, {
          action: "student",
          id: student.id,
          name: "Renamed Student",
          parent_name: "New Parent",
          phone: student.phone,
          group_id: student.group_id,
        });
        const after = (await readState(admin)).contracts.find(
          (c) => c.id === savedContractId,
        )!;
        assert.equal(after.body, before.body);
        assert.equal(after.student_name, "Contract Student");
      },
    );
    await check(
      "Contract generation rejects missing parent, invalid dates and unknown template tokens",
      async () => {
        const noParent = await mutate(admin, {
          action: "student",
          name: "No Parent",
          group_id: "demo-group",
        });
        await assert.rejects(
          mutate(admin, { ...contractInput, student_id: noParent.studentId }),
        );
        await assert.rejects(
          mutate(admin, {
            ...contractInput,
            student_id: contractStudentId,
            end_date: "2020-01-01",
          }),
        );
        await assert.rejects(
          mutate(admin, {
            ...contractInput,
            student_id: contractStudentId,
            amount: "",
          }),
        );
        await assert.rejects(
          mutate(admin, {
            action: "contractSettings",
            settings: {
              ...contractInput.settings,
              template: "Unknown field: {{unknown_token}}",
            },
          }),
        );
      },
    );
    await check(
      "Mentors cannot generate contracts or access parent identity data",
      async () => {
        await assert.rejects(
          mutate(teacher, { ...contractInput, student_id: contractStudentId }),
        );
        const state = await readState(teacher);
        assert.equal(state.contracts.length, 0);
        assert.equal(state.contractSettings, null);
        const student = state.students.find((s) => s.id === contractStudentId)!;
        assert(student);
        assert.equal(student.parent_iin, "");
        assert.equal(student.address, "");
        assert.equal(student.parent_email, "");
      },
    );
    await check("Database survives a close/reopen", async () => {
      await db.close();
      const { PGlite } = await import("@electric-sql/pglite");
      const reopened = new PGlite(path.join(dir, "postgres"));
      assert.equal(
        (
          await reopened.query("SELECT id FROM students WHERE id=$1", [
            studentId,
          ])
        ).rows.length,
        1,
      );
      await reopened.close();
    });
    console.log(`${passed} integration checks passed`);
  } finally {
    if (!db.closed) await db.close();
    await rm(dir, { recursive: true, force: true });
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
