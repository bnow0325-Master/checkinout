// 동적 QR (TOTP 기반). 사무실 키오스크 화면에 표시되는 코드를 생성/검증한다.
// QR은 QR_STEP_SECONDS마다 바뀌므로 원격에서 캡처해 재사용할 수 없다.

import { authenticator } from "otplib";

const SECRET = process.env.QR_TOTP_SECRET ?? "CHANGE_ME_TO_A_RANDOM_SECRET";
const STEP = parseInt(process.env.QR_STEP_SECONDS ?? "30", 10);

authenticator.options = { step: STEP, window: 1 };

/** 현재 유효한 QR 토큰을 생성한다 (키오스크 화면용). */
export function currentQrToken(): string {
  return authenticator.generate(SECRET);
}

/** 직원이 스캔해 제출한 토큰이 유효한지 검증한다. */
export function verifyQrToken(token: string): boolean {
  if (!token) return false;
  try {
    return authenticator.check(token, SECRET);
  } catch {
    return false;
  }
}

export function qrStepSeconds(): number {
  return STEP;
}
