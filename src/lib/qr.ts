// 동적 QR (TOTP 기반). 사무실 키오스크 화면에 표시되는 코드를 생성/검증한다.
// QR은 QR_STEP_SECONDS마다 바뀌므로 원격에서 캡처해 재사용할 수 없다.

import { createHash, createHmac } from "crypto";

const RAW = process.env.QR_TOTP_SECRET ?? "CHANGE_ME_TO_A_RANDOM_SECRET";
const STEP = parseInt(process.env.QR_STEP_SECONDS ?? "30", 10);

// 임의의 QR_TOTP_SECRET 문자열을 안정적인 바이트로 변환해 사용한다.
const SECRET = createHash("sha256").update(RAW).digest();

function normalizedStep() {
  return Number.isFinite(STEP) && STEP > 0 ? STEP : 30;
}

function counterAt(date = Date.now()) {
  return Math.floor(date / 1000 / normalizedStep());
}

function hotp(counter: number): string {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const hmac = createHmac("sha1", SECRET).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(binary % 1_000_000).padStart(6, "0");
}

function normalizeToken(token: string) {
  return token.trim().replace(/\D/g, "");
}

/** 현재 유효한 QR 토큰을 생성한다 (키오스크 화면용). */
export function currentQrToken(): string {
  return hotp(counterAt());
}

/** 직원이 스캔해 제출한 토큰이 유효한지 검증한다. */
export function verifyQrToken(token: string): boolean {
  const normalized = normalizeToken(token);
  if (!/^\d{6}$/.test(normalized)) return false;

  const currentCounter = counterAt();
  // 앞뒤 1구간까지 허용(시계 오차 및 화면 갱신 타이밍 대응)
  for (let offset = -1; offset <= 1; offset += 1) {
    if (hotp(currentCounter + offset) === normalized) return true;
  }
  return false;
}

export function qrStepSeconds(): number {
  return normalizedStep();
}
