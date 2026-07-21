import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getClientIp,
  hasOfficeIpAllowlist,
  isOfficeIpAllowed,
} from "@/lib/officeNetwork";

type CheckBody = {
  employeeId?: string;
  type?: "IN" | "OUT";
};

// 출퇴근 기록 생성.
// 직원 앱에서는 서버가 요청 IP를 보고 명동 사무실 네트워크인지 검증한다.
export async function POST(req: Request) {
  let body: CheckBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { employeeId, type } = body;

  if (!employeeId || (type !== "IN" && type !== "OUT")) {
    return NextResponse.json(
      { error: "직원과 출근/퇴근 구분이 필요합니다." },
      { status: 400 },
    );
  }

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
  });
  if (!employee || !employee.active) {
    return NextResponse.json(
      { error: "직원을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  if (!hasOfficeIpAllowlist()) {
    return NextResponse.json(
      {
        error:
          "명동 사무실 IP 허용 목록이 설정되지 않았습니다. 관리자에게 문의해 주세요.",
      },
      { status: 500 },
    );
  }

  const clientIp = getClientIp(req.headers);
  if (!isOfficeIpAllowed(clientIp)) {
    return NextResponse.json(
      {
        error: "명동 사무실 PC에서만 출퇴근할 수 있습니다.",
      },
      { status: 403 },
    );
  }

  const record = await prisma.attendanceRecord.create({
    data: {
      employeeId,
      type,
      method: "OFFICE_IP",
      verified: true,
    },
  });

  return NextResponse.json({
    ok: true,
    record: { id: record.id, type: record.type, timestamp: record.timestamp },
  });
}

// 기록 조회 (관리자/디버그용). ?date=YYYY-MM-DD, ?employeeId=
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const employeeId = searchParams.get("employeeId");

  const where: Record<string, unknown> = {};
  if (employeeId) where.employeeId = employeeId;
  if (date) {
    const start = new Date(`${date}T00:00:00`);
    const end = new Date(`${date}T23:59:59.999`);
    where.timestamp = { gte: start, lte: end };
  }

  const records = await prisma.attendanceRecord.findMany({
    where,
    include: { employee: { select: { name: true, code: true, department: true } } },
    orderBy: { timestamp: "desc" },
    take: 200,
  });

  return NextResponse.json({ records });
}
