"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

export default function ImportForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState("");

  async function upload() {
    setError("");
    setSummary(null);
    if (!file) {
      setError("네이버웍스에서 다운로드한 commuteList.xlsx 파일을 선택해 주세요.");
      return;
    }

    const form = new FormData();
    form.append("file", file);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/naverworks/import", {
        method: "POST",
        body: form,
      });
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "가져오기에 실패했습니다.");
        return;
      }
      setSummary(data.summary);
    } catch {
      setError("가져오기에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-slate-600">엑셀 파일</span>
        <input
          type="file"
          accept=".xlsx"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm"
        />
      </label>

      <button
        onClick={upload}
        disabled={loading}
        className="mt-4 rounded-lg bg-brand px-5 py-3 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
      >
        {loading ? "가져오는 중…" : "가져오기"}
      </button>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {error}
        </div>
      )}

      {summary && (
        <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-slate-700">
          <div className="text-base font-bold text-emerald-700">
            가져오기가 완료되었습니다.
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-2">
            <dt className="text-slate-500">분석 행</dt>
            <dd className="font-semibold">
              {summary.parsedRows.toLocaleString()}건
            </dd>
            <dt className="text-slate-500">가져온 행</dt>
            <dd className="font-semibold">
              {summary.importedRows.toLocaleString()}건
            </dd>
            <dt className="text-slate-500">매칭 직원</dt>
            <dd className="font-semibold">
              {summary.matchedEmployees.toLocaleString()}명
            </dd>
            <dt className="text-slate-500">기간</dt>
            <dd className="font-semibold">
              {summary.dateMin ?? "-"} ~ {summary.dateMax ?? "-"}
            </dd>
            <dt className="text-slate-500">신규 매핑</dt>
            <dd className="font-semibold">
              {summary.updatedEmployeeMappings.toLocaleString()}명
            </dd>
            <dt className="text-slate-500">미매칭 행</dt>
            <dd className="font-semibold">
              {summary.unmatchedRows.toLocaleString()}건
            </dd>
          </dl>

          {summary.unmatchedSamples.length > 0 && (
            <div className="mt-4">
              <div className="font-medium text-slate-700">미매칭 샘플</div>
              <ul className="mt-2 list-inside list-disc text-xs text-slate-500">
                {summary.unmatchedSamples.map((item) => (
                  <li key={`${item.rowNumber}-${item.loginId}`}>
                    {item.rowNumber}행 · {item.name} · {item.loginId}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
