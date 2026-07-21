import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-8 px-6 py-12">
      <div className="text-center">
        <h1 className="text-3xl font-bold">checkinout</h1>
        <p className="mt-2 text-slate-500">직원 출퇴근 기록 시스템</p>
      </div>

      <div className="flex flex-col gap-3">
        <Link
          href="/check"
          className="rounded-xl bg-brand px-6 py-4 text-center text-lg font-semibold text-white shadow-sm transition hover:bg-brand-dark"
        >
          출퇴근 하기
        </Link>
        <Link
          href="/kiosk"
          className="rounded-xl border border-slate-300 bg-white px-6 py-4 text-center text-lg font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          키오스크 (QR 화면)
        </Link>
        <Link
          href="/records"
          className="rounded-xl border border-slate-300 bg-white px-6 py-4 text-center text-lg font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          출퇴근 기록부
        </Link>
        <Link
          href="/admin"
          className="rounded-xl border border-slate-300 bg-white px-6 py-4 text-center text-lg font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          관리자 — 기록 보기
        </Link>
      </div>

      <p className="text-center text-xs text-slate-400">
        원격 출퇴근 방지: 사무실 GPS 반경 + 30초마다 바뀌는 QR 인증
      </p>
    </main>
  );
}
