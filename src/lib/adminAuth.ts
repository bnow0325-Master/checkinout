import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

// 관리자 인증. ADMIN_PASSWORD 환경변수로 로그인하고, 서명된 세션 쿠키로 유지한다.
// 비밀번호를 바꾸면 기존 세션은 자동 무효화된다.

const PASSWORD = process.env.ADMIN_PASSWORD ?? "";
const COOKIE = "ck_admin";
const MAX_AGE = 60 * 60 * 12; // 12시간

function expectedToken(): string {
  // 세션 토큰 = HMAC(secret=ADMIN_PASSWORD, "checkinout-admin")
  return createHmac("sha256", PASSWORD || "unset")
    .update("checkinout-admin")
    .digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** 관리자 기능 사용 가능 여부(비밀번호가 설정돼 있는지). */
export function adminConfigured(): boolean {
  return PASSWORD.length > 0;
}

/** 로그인 비밀번호 검증. */
export function verifyPassword(input: string): boolean {
  if (!PASSWORD || !input) return false;
  return safeEqual(input, PASSWORD);
}

export const sessionCookieName = COOKIE;
export const sessionCookieValue = () => expectedToken();
export const sessionMaxAge = MAX_AGE;

/** 현재 요청이 인증된 관리자 세션인지 확인. */
export async function isAdmin(): Promise<boolean> {
  if (!PASSWORD) return false; // 비밀번호 미설정이면 접근 불가(안전한 기본값)
  const store = await cookies();
  const val = store.get(COOKIE)?.value;
  if (!val) return false;
  return safeEqual(val, expectedToken());
}
