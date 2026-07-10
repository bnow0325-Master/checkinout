"use client";

import { useEffect, useState } from "react";

// 사무실 태블릿/모니터에 띄우는 화면. 일정 주기로 QR이 자동 갱신된다.
// 직원은 이 QR을 폰으로 스캔해야만 출퇴근할 수 있다.
export default function KioskPage() {
  const [image, setImage] = useState<string | null>(null);
  const [token, setToken] = useState<string>("");
  const [step, setStep] = useState(30);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;

    async function refresh() {
      try {
        const res = await fetch("/api/qr", { cache: "no-store" });
        const data = await res.json();
        setImage(data.image);
        setToken(data.token);
        setStep(data.step ?? 30);
      } catch {
        // 네트워크 오류 시 다음 주기에 재시도
      }
    }

    refresh();
    timer = setInterval(refresh, 5000); // 5초마다 갱신 확인
    return () => clearInterval(timer);
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-900 px-6 text-center text-white">
      <h1 className="text-2xl font-semibold">출퇴근 QR</h1>
      <p className="text-slate-300">폰으로 이 QR을 스캔하세요</p>

      <div className="rounded-2xl bg-white p-6">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="출퇴근 QR" width={320} height={320} />
        ) : (
          <div className="flex h-[320px] w-[320px] items-center justify-center text-slate-400">
            QR 불러오는 중…
          </div>
        )}
      </div>

      <p className="text-4xl font-mono tracking-[0.3em] text-emerald-400">
        {token || "······"}
      </p>
      <p className="text-sm text-slate-400">
        {step}초마다 코드가 자동으로 바뀝니다 · 캡처 재사용 불가
      </p>
    </main>
  );
}
