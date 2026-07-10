import Link from "next/link";
import { prisma } from "@/lib/prisma";

// 관리자 화면 — 오늘의 출퇴근 기록 목록 (서버 컴포넌트)
export const dynamic = "force-dynamic";

function fmtTime(d: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default async function AdminPage() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const records = await prisma.attendanceRecord.findMany({
    where: { timestamp: { gte: start, lte: end } },
    include: {
      employee: { select: { name: true, code: true, department: true } },
    },
    orderBy: { timestamp: "desc" },
    take: 200,
  });

  const todayLabel = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date());

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">출퇴근 기록</h1>
          <p className="text-sm text-slate-500">{todayLabel}</p>
        </div>
        <Link href="/" className="text-sm text-slate-400 hover:text-slate-600">
          홈
        </Link>
      </div>

      {records.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center text-slate-400">
          오늘 기록이 아직 없습니다.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">시간</th>
                <th className="px-4 py-3 font-medium">직원</th>
                <th className="px-4 py-3 font-medium">부서</th>
                <th className="px-4 py-3 font-medium">구분</th>
                <th className="px-4 py-3 font-medium">확인</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-mono text-slate-700">
                    {fmtTime(r.timestamp)}
                  </td>
                  <td className="px-4 py-3">
                    {r.employee.name}
                    <span className="ml-1 text-slate-400">
                      ({r.employee.code})
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {r.employee.department ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        r.type === "IN"
                          ? "bg-blue-50 text-blue-600"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {r.type === "IN" ? "출근" : "퇴근"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {r.verified ? (
                      <span className="text-emerald-600" title="GPS+QR 확인됨">
                        ✓ 현장확인
                      </span>
                    ) : (
                      <span className="text-amber-500">미확인</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-slate-400">
        총 {records.length}건 · 현장확인 = 사무실 GPS 반경 + 동적 QR 인증 통과
      </p>
    </main>
  );
}
