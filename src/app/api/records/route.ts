import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPin } from "@/lib/pin";

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

type RecordsBody = {
  employeeId?: string;
  pin?: string;
  month?: string;
  targetEmployeeId?: string;
};

type EmployeeLite = {
  id: string;
  code: string;
  name: string;
  department: string | null;
};

type RecordLite = {
  type: string;
  timestamp: Date;
};

function isRecordsAdmin(employee: EmployeeLite) {
  return employee.code === "001" && employee.name === "추동현";
}

function parseMonth(month: string | undefined) {
  const match = /^(\d{4})-(\d{2})$/.exec(month ?? "");
  if (!match) return null;

  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(monthNumber) ||
    year < 2000 ||
    year > 2100 ||
    monthNumber < 1 ||
    monthNumber > 12
  ) {
    return null;
  }

  return { year, monthIndex: monthNumber - 1 };
}

function kstMonthRange(year: number, monthIndex: number) {
  const start = new Date(Date.UTC(year, monthIndex, 1) - KST_OFFSET_MS);
  const end = new Date(Date.UTC(year, monthIndex + 1, 1) - KST_OFFSET_MS);
  const days = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return { start, end, days };
}

function kstDateKey(date: Date) {
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  return `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(
    2,
    "0",
  )}-${String(kst.getUTCDate()).padStart(2, "0")}`;
}

function kstTime(date: Date | null) {
  if (!date) return null;
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

function summarizeDay(records: RecordLite[]) {
  const sorted = [...records].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
  );
  let firstIn: Date | null = null;
  let lastOut: Date | null = null;
  let pendingIn: Date | null = null;
  let totalMinutes = 0;
  let open = false;

  for (const record of sorted) {
    if (record.type === "IN") {
      if (!firstIn) firstIn = record.timestamp;
      pendingIn = record.timestamp;
      open = true;
    }
    if (record.type === "OUT") {
      lastOut = record.timestamp;
      if (pendingIn) {
        const minutes = Math.round(
          (record.timestamp.getTime() - pendingIn.getTime()) / 60000,
        );
        if (minutes > 0) totalMinutes += minutes;
        pendingIn = null;
        open = false;
      }
    }
  }

  return { firstIn, lastOut, totalMinutes, open };
}

export async function POST(req: Request) {
  let body: RecordsBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const month = parseMonth(body.month);
  if (!month) {
    return NextResponse.json(
      { error: "조회할 월을 선택해 주세요." },
      { status: 400 },
    );
  }

  if (!body.employeeId || !body.pin) {
    return NextResponse.json(
      { error: "직원과 PIN을 입력해 주세요." },
      { status: 400 },
    );
  }

  const requester = await prisma.employee.findUnique({
    where: { id: body.employeeId },
    select: {
      id: true,
      code: true,
      name: true,
      department: true,
      active: true,
      pinHash: true,
    },
  });

  if (!requester || !requester.active || !verifyPin(body.pin, requester.pinHash)) {
    return NextResponse.json(
      { error: "직원 또는 PIN이 올바르지 않습니다." },
      { status: 401 },
    );
  }

  const isManager = isRecordsAdmin(requester);
  const targetEmployeeId = isManager
    ? body.targetEmployeeId || "ALL"
    : requester.id;

  if (!isManager && body.targetEmployeeId && body.targetEmployeeId !== requester.id) {
    return NextResponse.json(
      { error: "본인 기록만 조회할 수 있습니다." },
      { status: 403 },
    );
  }

  const activeEmployees = await prisma.employee.findMany({
    where: { active: true },
    select: { id: true, code: true, name: true, department: true },
    orderBy: { code: "asc" },
  });

  const employees =
    targetEmployeeId && targetEmployeeId !== "ALL"
      ? activeEmployees.filter((employee) => employee.id === targetEmployeeId)
      : activeEmployees;

  if (employees.length === 0) {
    return NextResponse.json(
      { error: "조회할 직원을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const { start, end, days } = kstMonthRange(month.year, month.monthIndex);
  const employeeIds = employees.map((employee) => employee.id);
  const records = await prisma.attendanceRecord.findMany({
    where: {
      employeeId: { in: employeeIds },
      timestamp: { gte: start, lt: end },
    },
    select: { employeeId: true, type: true, timestamp: true },
    orderBy: [{ employeeId: "asc" }, { timestamp: "asc" }],
  });

  const recordsByEmployeeDay = new Map<string, RecordLite[]>();
  for (const record of records) {
    const key = `${record.employeeId}:${kstDateKey(record.timestamp)}`;
    const list = recordsByEmployeeDay.get(key) ?? [];
    list.push(record);
    recordsByEmployeeDay.set(key, list);
  }

  const monthPrefix = `${month.year}-${String(month.monthIndex + 1).padStart(
    2,
    "0",
  )}`;

  const groups = employees.map((employee) => {
    let monthlyMinutes = 0;
    const rows = Array.from({ length: days }, (_, index) => {
      const day = index + 1;
      const date = `${monthPrefix}-${String(day).padStart(2, "0")}`;
      const summary = summarizeDay(
        recordsByEmployeeDay.get(`${employee.id}:${date}`) ?? [],
      );
      monthlyMinutes += summary.totalMinutes;
      return {
        date,
        day,
        checkIn: kstTime(summary.firstIn),
        checkOut: kstTime(summary.lastOut),
        workMinutes: summary.totalMinutes,
        workTime: summary.totalMinutes ? formatMinutes(summary.totalMinutes) : "-",
        open: summary.open,
      };
    });

    return {
      employee,
      rows,
      totalMinutes: monthlyMinutes,
      totalTime: formatMinutes(monthlyMinutes),
    };
  });

  return NextResponse.json({
    month: `${month.year}-${String(month.monthIndex + 1).padStart(2, "0")}`,
    monthLabel: `${month.year}년 ${month.monthIndex + 1}월`,
    isManager,
    employees: isManager ? activeEmployees : [employees[0]],
    groups,
  });
}
