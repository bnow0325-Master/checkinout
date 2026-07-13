import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isWithinOffice } from "@/lib/location";
import { verifyQrToken } from "@/lib/qr";
import { verifyPin } from "@/lib/pin";

type CheckBody = {
  employeeId?: string;
  type?: "IN" | "OUT";
  pin?: string;
  qrToken?: string;
  latitude?: number;
  longitude?: number;
};

// 출퇴근 기록 생성.
// 검증 순서: 본인 PIN → 사무실 GPS 반경 → 동적 QR. 셋 다 통과해야 기록된다.
export async function POST(req: Request) {
  let body: CheckBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { employeeId, type, pin, qrToken, latitude, longitude } = body;

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

  // 0) 본인 PIN 검증
  if (!pin) {
    return NextResponse.json(
      { error: "PIN을 입력해 주세요." },
      { status: 401 },
    );
  }
  if (!verifyPin(pin, employee.pinHash)) {
    return NextResponse.json(
      { error: "PIN이 올바르지 않습니다." },
      { status: 401 },
    );
  }

  // 1) GPS 검증
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return NextResponse.json(
      { error: "위치 정보가 필요합니다. 위치 권한을 허용해 주세요." },
      { status: 422 },
    );
  }
  const geo = isWithinOffice(latitude, longitude);
  if (!geo.ok) {
    return NextResponse.json(
      {
        error: `사무실에서 ${geo.distance}m 떨어져 있습니다. 사무실 안에서만 출퇴근할 수 있습니다.`,
      },
      { status: 403 },
    );
  }

  // 2) 동적 QR 검증
  if (!verifyQrToken(qrToken ?? "")) {
    return NextResponse.json(
      { error: "QR 코드가 유효하지 않습니다. 사무실 화면의 QR을 다시 스캔해 주세요." },
      { status: 403 },
    );
  }

  const record = await prisma.attendanceRecord.create({
    data: {
      employeeId,
      type,
      method: "QR",
      verified: true,
      latitude,
      longitude,
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
