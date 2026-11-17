export type Person = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "teacher";
  position: string;
};
export type Group = {
  id: string;
  name: string;
  teacher_id: string | null;
  course: string;
  monthly_fee: string | null;
};
export type Student = {
  id: string;
  name: string;
  parent_name: string;
  phone: string;
  group_id: string | null;
  student_type: "regular" | "trial";
  notes: string;
  birth_date: string | null;
  address: string;
  parent_iin: string;
  parent_email: string;
  qr_token: string;
  group_name?: string;
};
export type Method = {
  id: string;
  title: string;
  content: string;
  file_name: string | null;
  file_type: string | null;
};
export type Lesson = {
  id: string;
  group_id: string;
  teacher_id: string;
  method_id: string | null;
  lesson_date: string;
  lesson_time: string;
  topic: string;
  room: string;
  status: "planned" | "completed";
  group_name: string;
  teacher_name: string;
  method_title: string | null;
};
export type Task = {
  id: string;
  title: string;
  employee_id: string;
  due_date: string;
  description: string;
  status: "todo" | "done";
  employee_name: string;
};
export type Attendance = {
  id: string;
  lesson_id: string;
  student_id: string;
  status: "present" | "absent";
  marked_at: string;
};
export type Charge = {
  id: string;
  student_id: string;
  period: string;
  amount: string;
  due_date: string;
  paid: string;
  balance: string;
  student_name: string;
  phone: string;
};
export type Payment = {
  id: string;
  charge_id: string;
  amount: string;
  paid_at: string;
  note: string;
  student_name: string;
};
export type Draft = {
  id: string;
  student_id: string;
  lesson_id: string | null;
  kind: "absence" | "payment";
  body: string;
  created_at: string;
  student_name: string;
  phone: string;
};
export type HistoricalAttendance = {
  id: string;
  student_id: string;
  group_id: string | null;
  group_name: string | null;
  attendance_date: string;
  status: "present" | "absent" | "unknown";
  note: string;
  source_batch: string;
};
export type CenterState = {
  account: Person;
  today: string;
  tomorrow: string;
  students: Student[];
  groups: Group[];
  accounts: Person[];
  methods: Method[];
  lessons: Lesson[];
  tasks: Task[];
  attendance: Attendance[];
  historicalAttendance: HistoricalAttendance[];
  charges: Charge[];
  payments: Payment[];
  drafts: Draft[];
  contracts: import("./contracts-template").SavedContract[];
  contractSettings: import("./contracts-template").ContractSettings | null;
};
