"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Employee = {
  id: string;
  code: string;
  name: string;
  department: string | null;
};

type GeoState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; lat: number; lng: number }
  | { status: "error"; message: string };

export default function CheckPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [qrToken, setQrToken] = useState("");
  const [geo, setGeo] = useState<GeoState>({ status: "idle" });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(
    null,
  );

  useEffect(() => {
    fetch("/api/employees")
      .then((r) => r.json())
      .then((d) => setEmployees(d.employees ?? []))
      .catch(() => setEmployees([]));
  }, []);

  function requestLocation() {
    if (!("geolocation" in navigator)) {
      setGeo({ status: "error", message: "이 기기는 위치를 지원하지 않습니다." });
      return;
    }
    setGeo({ status: "loading" });
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setGeo({
          status: "ready",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      (err) =>
        setGeo({
          status: "error",
          message:
            err.code === err.PERMISSION_DENIED
              ? "위치 권한이 거부되었습니다. 출퇴근하려면 위치를 허용해 주세요."
              : "위치를 가져오지 못했습니다.",
        }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  async function submit(type: "IN" | "OUT") {
    setResult(null);
    if (!employeeId) {
      setResult({ ok: false, message: "직원을 선택해 주세요." });
      return;
    }
    if (geo.status !== "ready") {
      setResult({ ok: false, message: "먼저 위치 확인 버튼을 눌러 주세요." });
      return;
    }
    if (!qrToken.trim()) {
      setResult({ ok: false, message: "사무실 화면의 QR 코드를 입력/스캔해 주세요." });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          type,
          qrToken: qrToken.trim(),
          latitude: geo.lat,
          longitude: geo.lng,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({
          ok: true,
          message: `${type === "IN" ? "출근" : "퇴근"} 완료! (${new Date(
            data.record.timestamp,
          ).toLocaleTimeString("ko-KR")})`,
        });
        setQrToken("");
      } else {
        setResult({ ok: false, message: data.error ?? "처리에 실패했습니다." });
      }
    } catch {
      setResult({ ok: false, message: "네트워크 오류가 발생했습니다." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-5 px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">출퇴근 하기</h1>
        <Link href="/" className="text-sm text-slate-400 hover:text-slate-600">
          홈
        </Link>
      </div>

      {/* 1. 직원 선택 */}
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-600">1. 직원 선택</span>
        <select
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-base"
        >
          <option value="">— 이름을 선택하세요 —</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} ({e.code}
              {e.department ? ` · ${e.department}` : ""})
            </option>
          ))}
        </select>
      </label>

      {/* 2. 위치 확인 */}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-600">2. 위치 확인</span>
        <button
          onClick={requestLocation}
          className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-left"
        >
          {geo.status === "ready" && (
            <span className="text-emerald-600">✓ 위치 확인됨</span>
          )}
          {geo.status === "loading" && "위치 확인 중…"}
          {geo.status === "idle" && "📍 위치 확인하기"}
          {geo.status === "error" && (
            <span className="text-red-500">{geo.message} (다시 시도)</span>
          )}
        </button>
      </div>

      {/* 3. QR 입력 */}
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-600">
          3. 사무실 QR 코드
        </span>
        <input
          value={qrToken}
          onChange={(e) => setQrToken(e.target.value)}
          inputMode="numeric"
          placeholder="사무실 화면의 QR을 스캔하거나 코드 입력"
          className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-base tracking-widest"
        />
        <span className="text-xs text-slate-400">
          * 카메라 스캔은 다음 단계에서 추가됩니다. 지금은 키오스크 화면의 숫자
          코드를 입력하세요.
        </span>
      </label>

      {/* 출근 / 퇴근 버튼 */}
      <div className="mt-2 grid grid-cols-2 gap-3">
        <button
          disabled={submitting}
          onClick={() => submit("IN")}
          className="rounded-xl bg-brand px-6 py-5 text-lg font-bold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-50"
        >
          출근
        </button>
        <button
          disabled={submitting}
          onClick={() => submit("OUT")}
          className="rounded-xl bg-slate-700 px-6 py-5 text-lg font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
        >
          퇴근
        </button>
      </div>

      {result && (
        <div
          className={`rounded-lg px-4 py-3 text-center text-sm font-medium ${
            result.ok
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-600"
          }`}
        >
          {result.message}
        </div>
      )}
    </main>
  );
}
