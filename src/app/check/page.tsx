"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

// 카메라 스캐너는 브라우저 전용 API(getUserMedia)를 쓰므로 SSR을 끈다.
const QrScanner = dynamic(() => import("@/components/QrScanner"), {
  ssr: false,
  loading: () => (
    <div className="rounded-xl border border-slate-300 bg-slate-100 py-10 text-center text-slate-400">
      카메라 준비 중…
    </div>
  ),
});

type Employee = {
  id: string;
  code: string;
  name: string;
  department: string | null;
};

type GeoState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; lat: number; lng: number; accuracy: number | null }
  | { status: "error"; message: string };

export default function CheckPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [pin, setPin] = useState("");
  const [qrToken, setQrToken] = useState("");
  const [scanning, setScanning] = useState(false);
  const [manualMode, setManualMode] = useState(false);
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
          accuracy: pos.coords.accuracy,
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

  function handleScan(text: string) {
    setQrToken(text.trim());
    setScanning(false);
    setResult(null);
  }

  async function submit(type: "IN" | "OUT") {
    setResult(null);
    if (!employeeId) {
      setResult({ ok: false, message: "직원을 선택해 주세요." });
      return;
    }
    if (pin.trim().length < 4) {
      setResult({ ok: false, message: "4자리 PIN을 입력해 주세요." });
      return;
    }
    if (geo.status !== "ready") {
      setResult({ ok: false, message: "먼저 위치 확인 버튼을 눌러 주세요." });
      return;
    }
    if (!qrToken.trim()) {
      setResult({ ok: false, message: "사무실 화면의 QR을 스캔해 주세요." });
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
          pin: pin.trim(),
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
        setPin("");
      } else {
        setResult({ ok: false, message: data.error ?? "처리에 실패했습니다." });
        // QR이 만료됐을 수 있으니 초기화
        if (res.status === 403) setQrToken("");
      }
    } catch {
      setResult({ ok: false, message: "네트워크 오류가 발생했습니다." });
    } finally {
      setSubmitting(false);
    }
  }

  const scanned = qrToken.trim().length > 0;
  const currentLocation =
    geo.status === "ready"
      ? {
          lat: geo.lat.toFixed(6),
          lng: geo.lng.toFixed(6),
          accuracy:
            typeof geo.accuracy === "number"
              ? `${Math.round(geo.accuracy).toLocaleString("ko-KR")}m`
              : null,
          mapUrl: `https://maps.google.com/?q=${geo.lat},${geo.lng}`,
        }
      : null;

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

      {/* 2. PIN 입력 (본인 확인) */}
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-600">
          2. 본인 확인 (PIN)
        </span>
        <input
          value={pin}
          onChange={(e) =>
            setPin(e.target.value.replace(/\D/g, "").slice(0, 6))
          }
          type="password"
          inputMode="numeric"
          autoComplete="off"
          placeholder="본인 PIN 입력"
          className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-base tracking-[0.4em]"
        />
      </label>

      {/* 3. 위치 확인 */}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-600">3. 위치 확인</span>
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
        {currentLocation && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-slate-700">
            <div className="font-medium text-emerald-700">현재 위치</div>
            <div className="mt-1 grid grid-cols-[4rem_1fr] gap-y-1">
              <span className="text-slate-500">위도</span>
              <span className="font-mono">{currentLocation.lat}</span>
              <span className="text-slate-500">경도</span>
              <span className="font-mono">{currentLocation.lng}</span>
              {currentLocation.accuracy && (
                <>
                  <span className="text-slate-500">정확도</span>
                  <span>약 {currentLocation.accuracy}</span>
                </>
              )}
            </div>
            <a
              href={currentLocation.mapUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-xs font-medium text-emerald-700 underline"
            >
              지도에서 보기
            </a>
          </div>
        )}
      </div>

      {/* 3. QR 스캔 */}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-600">
          4. 사무실 QR 스캔
        </span>

        {scanned ? (
          <div className="flex items-center justify-between rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3">
            <span className="text-emerald-700">✓ QR 스캔 완료</span>
            <button
              onClick={() => {
                setQrToken("");
                setScanning(true);
              }}
              className="text-sm text-slate-500 underline"
            >
              다시 스캔
            </button>
          </div>
        ) : scanning ? (
          <div className="flex flex-col gap-2">
            <QrScanner
              onScan={handleScan}
              onError={(msg) => {
                setScanning(false);
                setResult({ ok: false, message: msg });
                setManualMode(true);
              }}
            />
            <button
              onClick={() => setScanning(false)}
              className="text-sm text-slate-500 underline"
            >
              취소
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setResult(null);
              setScanning(true);
            }}
            className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-left"
          >
            📷 QR 스캔하기
          </button>
        )}

        {/* 카메라가 안 될 때를 위한 수동 입력 폴백 */}
        {!scanned &&
          (manualMode ? (
            <input
              value={qrToken}
              onChange={(e) => setQrToken(e.target.value)}
              inputMode="numeric"
              placeholder="키오스크 화면의 숫자 코드 입력"
              className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-base tracking-widest"
            />
          ) : (
            <button
              onClick={() => setManualMode(true)}
              className="self-start text-xs text-slate-400 underline"
            >
              카메라가 안 되나요? 코드 직접 입력
            </button>
          ))}
      </div>

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
