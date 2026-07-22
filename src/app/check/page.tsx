"use client";

import { useEffect, useState } from "react";

type Employee = {
  id: string;
  code: string;
  name: string;
  department: string | null;
};

type SubmitResult =
  | { ok: true; type: "IN" | "OUT"; time: string }
  | { ok: false; message: string };

export default function CheckPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [submittingType, setSubmittingType] = useState<"IN" | "OUT" | null>(
    null,
  );
  const [result, setResult] = useState<SubmitResult | null>(null);

  useEffect(() => {
    fetch("/api/employees")
      .then((response) => response.json())
      .then((data) => setEmployees(data.employees ?? []))
      .catch(() => setEmployees([]));
  }, []);

  async function submit(type: "IN" | "OUT") {
    setResult(null);
    if (!employeeId) {
      setResult({ ok: false, message: "이름을 선택해 주세요." });
      return;
    }

    setSubmittingType(type);
    try {
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          type,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setResult({ ok: false, message: data.error ?? "처리에 실패했습니다." });
        return;
      }

      setResult({
        ok: true,
        type,
        time: new Date(data.record.timestamp).toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
    } catch (error) {
      setResult({
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "네트워크 오류가 발생했습니다.",
      });
    } finally {
      setSubmittingType(null);
    }
  }

  const submitting = submittingType !== null;
  const canSubmit = !!employeeId && !submitting;

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-7 px-6 py-10">
      <div>
        <h1 className="text-3xl font-bold">출퇴근</h1>
        <p className="mt-2 text-sm text-slate-500">
          명동 사무실 PC에서 이름을 선택하고 출근 또는 퇴근을 누르세요.
        </p>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-slate-600">1. 이름 선택</span>
        <select
          value={employeeId}
          onChange={(event) => {
            setEmployeeId(event.target.value);
            setResult(null);
          }}
          className="rounded-xl border border-slate-300 bg-white px-4 py-4 text-lg shadow-sm"
        >
          <option value="">이름을 선택하세요</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.name}
              {employee.department ? ` · ${employee.department}` : ""}
            </option>
          ))}
        </select>
      </label>

      <section className="flex flex-col gap-3">
        <div className="text-sm font-semibold text-slate-600">2. 출근 / 퇴근</div>
        <div className="grid grid-cols-2 gap-3">
          <button
            disabled={!canSubmit}
            onClick={() => submit("IN")}
            className="h-24 rounded-2xl bg-brand px-6 text-2xl font-bold text-white shadow-sm transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
          >
            {submittingType === "IN" ? "처리 중" : "출근"}
          </button>
          <button
            disabled={!canSubmit}
            onClick={() => submit("OUT")}
            className="h-24 rounded-2xl bg-slate-700 px-6 text-2xl font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
          >
            {submittingType === "OUT" ? "처리 중" : "퇴근"}
          </button>
        </div>
      </section>

      {result &&
        (result.ok ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-6 text-center shadow-sm">
            <div className="text-2xl font-bold text-emerald-700">
              {result.type === "IN"
                ? "출근등록이 되었습니다."
                : "퇴근등록이 되었습니다."}
            </div>
            <div className="mt-3 text-4xl font-bold text-slate-900">
              {result.time}
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-red-50 px-4 py-4 text-center text-sm font-semibold text-red-600">
            {result.message}
          </div>
        ))}
    </main>
  );
}
