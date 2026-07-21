"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Employee = {
  id: string;
  code: string;
  name: string;
  department: string | null;
};

type RecordRow = {
  date: string;
  day: number;
  checkIn: string | null;
  checkOut: string | null;
  workTime: string;
  open: boolean;
  status: string;
  source: "NAVER_WORKS" | "CHECKINOUT";
};

type RecordGroup = {
  employee: Employee;
  rows: RecordRow[];
  totalTime: string;
};

type RecordsResponse = {
  month: string;
  monthLabel: string;
  isManager: boolean;
  employees: Employee[];
  groups: RecordGroup[];
  error?: string;
};

function currentMonth() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(
    2,
    "0",
  )}`;
}

function monthLabel(month: string) {
  const [year, monthNumber] = month.split("-");
  return `${year}년 ${Number(monthNumber)}월`;
}

function weekday(date: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    weekday: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date(`${date}T00:00:00+09:00`));
}

export default function RecordsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [pin, setPin] = useState("");
  const [targetEmployeeId, setTargetEmployeeId] = useState("");
  const [month, setMonth] = useState(currentMonth);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<RecordsResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/employees")
      .then((res) => res.json())
      .then((data) => setEmployees(data.employees ?? []))
      .catch(() => setEmployees([]));
  }, []);

  const targetOptions = useMemo(() => {
    if (!records?.isManager) return [];
    return records.employees;
  }, [records]);

  async function loadRecords(
    nextTargetEmployeeId = targetEmployeeId,
    nextMonth = month,
  ) {
    setError("");
    setRecords(null);
    if (!employeeId) {
      setError("직원을 선택해 주세요.");
      return;
    }
    if (pin.trim().length < 4) {
      setError("PIN을 입력해 주세요.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          pin: pin.trim(),
          month: nextMonth,
          targetEmployeeId: nextTargetEmployeeId || undefined,
        }),
      });
      const data = (await res.json()) as RecordsResponse;
      if (!res.ok) {
        setError(data.error ?? "기록을 불러오지 못했습니다.");
        return;
      }
      setRecords(data);
      if (!nextTargetEmployeeId) {
        setTargetEmployeeId(data.isManager ? "ALL" : employeeId);
      }
    } catch {
      setError("기록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function changeTarget(value: string) {
    setTargetEmployeeId(value);
    void loadRecords(value);
  }

  function changeMonth(value: string) {
    setMonth(value);
    if (records) {
      void loadRecords(targetEmployeeId, value);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">출퇴근 기록부</h1>
          <p className="text-sm text-slate-500">
            본인 PIN 확인 후 월별 출퇴근 기록을 조회합니다.
          </p>
        </div>
        <Link href="/" className="text-sm text-slate-400 hover:text-slate-600">
          홈
        </Link>
      </div>

      <section className="mb-5 rounded-lg border border-slate-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-[1.5fr_1fr_auto]">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-600">직원</span>
            <select
              value={employeeId}
              onChange={(event) => {
                setEmployeeId(event.target.value);
                setRecords(null);
                setTargetEmployeeId("");
              }}
              className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-base"
            >
              <option value="">이름을 선택하세요</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} ({employee.code}
                  {employee.department ? ` · ${employee.department}` : ""})
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-600">PIN</span>
            <input
              value={pin}
              onChange={(event) =>
                setPin(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              type="password"
              inputMode="numeric"
              autoComplete="off"
              placeholder="본인 PIN"
              className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-base tracking-[0.35em]"
            />
          </label>

          <button
            onClick={() => loadRecords()}
            disabled={loading}
            className="self-end rounded-lg bg-brand px-5 py-3 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
          >
            {loading ? "조회 중…" : "기록 조회"}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowMonthPicker((value) => !value)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            월별보기
          </button>
          <span className="text-sm font-semibold text-slate-700">
            {monthLabel(month)}
          </span>
          {showMonthPicker && (
            <input
              type="month"
              value={month}
              onChange={(event) => changeMonth(event.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          )}
          {records?.isManager && (
            <select
              value={targetEmployeeId || "ALL"}
              onChange={(event) => changeTarget(event.target.value)}
              className="ml-auto rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="ALL">전체 직원</option>
              {targetOptions.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} ({employee.code})
                </option>
              ))}
            </select>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {error}
          </div>
        )}
      </section>

      {!records ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white py-16 text-center text-slate-400">
          직원과 PIN을 입력한 뒤 기록을 조회하세요.
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {records.groups.map((group) => (
            <section
              key={group.employee.id}
              className="overflow-hidden rounded-lg border border-slate-200 bg-white"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                  <h2 className="font-bold text-slate-800">
                    {group.employee.name}
                    <span className="ml-1 text-sm font-normal text-slate-400">
                      ({group.employee.code})
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    {group.employee.department ?? "부서 미지정"} ·{" "}
                    {records.monthLabel}
                  </p>
                </div>
                <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                  합산 {group.totalTime}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-sm">
                  <thead className="bg-white text-left text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">일자</th>
                      <th className="px-4 py-3 font-medium">출근</th>
                      <th className="px-4 py-3 font-medium">퇴근</th>
                      <th className="px-4 py-3 font-medium">근무시간</th>
                      <th className="px-4 py-3 font-medium">상태</th>
                      <th className="px-4 py-3 font-medium">출처</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {group.rows.map((row) => (
                      <tr key={row.date}>
                        <td className="px-4 py-3 font-medium text-slate-700">
                          {row.day}일
                          <span className="ml-1 text-xs text-slate-400">
                            {weekday(row.date)}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-700">
                          {row.checkIn ?? "-"}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-700">
                          {row.checkOut ?? "-"}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {row.workTime}
                        </td>
                        <td className="px-4 py-3">
                          {row.open ? (
                            <span className="text-amber-500">근무중</span>
                          ) : row.status ? (
                            <span className="text-slate-500">{row.status}</span>
                          ) : row.checkIn || row.checkOut ? (
                            <span className="text-slate-400">완료</span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {row.source === "NAVER_WORKS" ? "네이버웍스" : "직접"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-slate-200 bg-slate-50">
                    <tr>
                      <td className="px-4 py-3 font-bold" colSpan={3}>
                        월 합산
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-700">
                        {group.totalTime}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
