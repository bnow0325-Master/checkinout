import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { currentQrToken, qrStepSeconds } from "@/lib/qr";

// 키오스크 화면에 표시할 현재 QR. QR_STEP_SECONDS마다 값이 바뀐다.
// 캐시 금지 — 항상 최신 토큰을 내려준다.
export async function GET() {
  const token = currentQrToken();
  const dataUrl = await QRCode.toDataURL(token, {
    width: 320,
    margin: 2,
  });
  return NextResponse.json(
    { token, image: dataUrl, step: qrStepSeconds() },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
