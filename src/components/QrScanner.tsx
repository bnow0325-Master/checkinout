"use client";

import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

// 폰 카메라로 QR을 스캔하는 컴포넌트.
// 스캔에 성공하면 onScan(디코딩된 문자열)을 호출하고 카메라를 멈춘다.
// getUserMedia는 보안 컨텍스트(HTTPS 또는 localhost)에서만 동작한다.
export default function QrScanner({
  onScan,
  onError,
}: {
  onScan: (text: string) => void;
  onError?: (message: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  // 중복 콜백 방지 및 최신 핸들러 참조
  const doneRef = useRef(false);
  const onScanRef = useRef(onScan);
  const onErrorRef = useRef(onError);
  onScanRef.current = onScan;
  onErrorRef.current = onError;

  useEffect(() => {
    const elementId = "qr-reader-region";
    let cancelled = false;

    const scanner = new Html5Qrcode(elementId, { verbose: false });
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          if (doneRef.current) return;
          doneRef.current = true;
          onScanRef.current(decodedText);
          scanner.stop().catch(() => {});
        },
        () => {
          // 프레임마다 발생하는 '못 찾음'은 무시한다.
        },
      )
      .catch((err) => {
        if (cancelled) return;
        const msg =
          err?.name === "NotAllowedError"
            ? "카메라 권한이 거부되었습니다. 브라우저 설정에서 카메라를 허용해 주세요."
            : "카메라를 시작할 수 없습니다. 코드 직접 입력을 이용해 주세요.";
        onErrorRef.current?.(msg);
      });

    return () => {
      cancelled = true;
      const s = scannerRef.current;
      if (s) {
        s.stop()
          .catch(() => {})
          .finally(() => {
            try {
              s.clear();
            } catch {
              // 이미 정리된 경우 무시
            }
          });
      }
    };
  }, []);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-300 bg-black">
      <div id="qr-reader-region" ref={containerRef} className="w-full" />
    </div>
  );
}
