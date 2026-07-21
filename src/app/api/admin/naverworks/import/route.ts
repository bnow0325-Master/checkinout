import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/adminAuth";
import { parseNaverWorksCommuteWorkbook } from "@/lib/naverworksCommute";

export const runtime = "nodejs";

type ImportSummary = {
  parsedRows: number;
  importedRows: number;
  matchedEmployees: number;
  updatedEmployeeMappings: number;
  unmatchedRows: number;
  dateMin: string | null;
  dateMax: string | null;
  unmatchedSamples: Array<{
    rowNumber: number;
    name: string;
    loginId: string;
  }>;
};

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "업로드 요청이 올바르지 않습니다." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "엑셀 파일을 선택해 주세요." }, { status: 400 });
  }

  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return NextResponse.json({ error: "commuteList.xlsx 파일만 업로드할 수 있습니다." }, { status: 400 });
  }

  let rows;
  try {
    rows = parseNaverWorksCommuteWorkbook(Buffer.from(await file.arrayBuffer()));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "엑셀 파일을 읽지 못했습니다.",
      },
      { status: 400 },
    );
  }

  const employees = await prisma.employee.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      department: true,
      externalLoginId: true,
    },
  });

  const byLogin = new Map(
    employees
      .filter((employee) => employee.externalLoginId)
      .map((employee) => [employee.externalLoginId?.toLowerCase(), employee]),
  );
  const nameCounts = new Map<string, number>();
  for (const employee of employees) {
    nameCounts.set(employee.name, (nameCounts.get(employee.name) ?? 0) + 1);
  }
  const byUniqueName = new Map(
    employees
      .filter((employee) => nameCounts.get(employee.name) === 1)
      .map((employee) => [employee.name, employee]),
  );

  const unmatched = [];
  const matchedEmployeeIds = new Set<string>();
  let importedRows = 0;
  let updatedEmployeeMappings = 0;
  let dateMin: string | null = null;
  let dateMax: string | null = null;

  for (const row of rows) {
    const matched =
      (row.loginId ? byLogin.get(row.loginId) : null) ??
      byUniqueName.get(row.name) ??
      null;

    if (!matched) {
      unmatched.push({
        rowNumber: row.rowNumber,
        name: row.name,
        loginId: row.loginId,
      });
      continue;
    }

    matchedEmployeeIds.add(matched.id);
    if (!dateMin || row.baseDateKey < dateMin) dateMin = row.baseDateKey;
    if (!dateMax || row.baseDateKey > dateMax) dateMax = row.baseDateKey;

    if (row.loginId && matched.externalLoginId?.toLowerCase() !== row.loginId) {
      await prisma.employee.update({
        where: { id: matched.id },
        data: {
          externalLoginId: row.loginId,
          department: matched.department || row.department || null,
        },
      });
      matched.externalLoginId = row.loginId;
      byLogin.set(row.loginId, matched);
      updatedEmployeeMappings += 1;
    }

    await prisma.naverWorksDailyRecord.upsert({
      where: {
        employeeId_baseDate: {
          employeeId: matched.id,
          baseDate: row.baseDate,
        },
      },
      create: {
        employeeId: matched.id,
        baseDate: row.baseDate,
        workStyle: row.workStyle || null,
        workType: row.workType || null,
        schedule: row.schedule || null,
        checkInAt: row.checkInAt,
        checkOutAt: row.checkOutAt,
        checkInRaw: row.checkInRaw || null,
        checkOutRaw: row.checkOutRaw || null,
        workLocation: row.workLocation || null,
        breakMinutes: row.breakMinutes,
        offsiteMinutes: row.offsiteMinutes,
        absenceMinutes: row.absenceMinutes,
        late: row.late,
        earlyLeave: row.earlyLeave,
        requiredWorkCompliant: row.requiredWorkCompliant || null,
        scheduleCompliant: row.scheduleCompliant || null,
        scheduleVariance: row.scheduleVariance || null,
        sourceLoginId: row.loginId || matched.externalLoginId || row.name,
        sourceRow: row.rowNumber,
      },
      update: {
        workStyle: row.workStyle || null,
        workType: row.workType || null,
        schedule: row.schedule || null,
        checkInAt: row.checkInAt,
        checkOutAt: row.checkOutAt,
        checkInRaw: row.checkInRaw || null,
        checkOutRaw: row.checkOutRaw || null,
        workLocation: row.workLocation || null,
        breakMinutes: row.breakMinutes,
        offsiteMinutes: row.offsiteMinutes,
        absenceMinutes: row.absenceMinutes,
        late: row.late,
        earlyLeave: row.earlyLeave,
        requiredWorkCompliant: row.requiredWorkCompliant || null,
        scheduleCompliant: row.scheduleCompliant || null,
        scheduleVariance: row.scheduleVariance || null,
        sourceLoginId: row.loginId || matched.externalLoginId || row.name,
        sourceRow: row.rowNumber,
      },
    });
    importedRows += 1;
  }

  const summary: ImportSummary = {
    parsedRows: rows.length,
    importedRows,
    matchedEmployees: matchedEmployeeIds.size,
    updatedEmployeeMappings,
    unmatchedRows: unmatched.length,
    dateMin,
    dateMax,
    unmatchedSamples: unmatched.slice(0, 20),
  };

  return NextResponse.json({ ok: true, summary });
}
