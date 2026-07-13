import { NextResponse } from "next/server";
import {
  adminConfigured,
  verifyPassword,
  sessionCookieName,
  sessionCookieValue,
  sessionMaxAge,
} from "@/lib/adminAuth";

export async function POST(req: Request) {
  if (!adminConfigured()) {
    return NextResponse.json(
      { error: "관리자 비밀번호(ADMIN_PASSWORD)가 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  let password = "";
  try {
    ({ password } = await req.json());
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (!verifyPassword(password)) {
    return NextResponse.json(
      { error: "비밀번호가 올바르지 않습니다." },
      { status: 401 },
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookieName, sessionCookieValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionMaxAge,
  });
  return res;
}
