// 동적 QR (TOTP 기반). 사무실 키오스크 화면에 표시되는 코드를 생성/검증한다.
// QR은 QR_STEP_SECONDS마다 바뀌므로 원격에서 캡처해 재사용할 수 없다.

import { createHash } from "crypto";
import { generateSync, verifySync } from "otplib";

const RAW = process.env.QR_TOTP_SECRET ?? "CHANGE_ME_TO_A_RANDOM_SECRET";
const STEP = parseInt(process.env.QR_STEP_SECONDS ?? "30", 10);

// otplib 13은 secret으로 원시 바이트(Uint8Array)를 받는다.
// 임의의 QR_TOTP_SECRET 문자열을 안정적인 바이트로 변환해 사용한다.
const SECRET = new Uint8Array(createHash("sha256").update(RAW).digest());

/** 현재 유효한 QR 토큰을 생성한다 (키오스크 화면용). */
export function currentQrToken(): string {
  return generateSync({ secret: SECRET, period: STEP });
}

/** 직원이 스캔해 제출한 토큰이 유효한지 검증한다. */
export function verifyQrToken(token: string): boolean {
  if (!token) return false;
  try {
    // counterTolerance: 앞뒤 1구간까지 허용(시계 오차 대응)
    const result: unknown = verifySync({
      secret: SECRET,
      token,
      period: STEP,
      counterTolerance: 1,
    });

    if (typeof result === "boolean") return result;
    if (result && typeof result === "object" && "valid" in result) {
      return Boolean((result as { valid?: unknown }).valid);
    }
    return false;
  } catch {
    return false;
  }
}

export function qrStepSeconds(): number {
  return STEP;
}
