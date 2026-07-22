import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/adminAuth";
import ImportForm from "./ImportForm";

export default async function NaverWorksImportPage() {
  if (!(await isAdmin())) {
    redirect("/admin/login");
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">네이버웍스 기록 가져오기</h1>
          <p className="mt-1 text-sm text-slate-500">
            근태 현황에서 다운로드한 commuteList.xlsx를 업로드합니다.
          </p>
        </div>
        <Link href="/admin" className="text-sm text-slate-400 hover:text-slate-600">
          관리자
        </Link>
      </div>

      <ImportForm />

      <p className="mt-4 text-xs text-slate-400">
        이름이 기존 직원과 정확히 일치하면 네이버웍스 로그인 ID가 자동 매핑됩니다.
        이후부터는 로그인 ID 기준으로 중복 없이 갱신됩니다.
      </p>
    </main>
  );
}
