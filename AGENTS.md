# BNOW CheckInOut 개발 지침 (Codex/에이전트용)

## 제품 목적

CheckInOut은 BNOW 임직원의 출퇴근을 정확·안전하게 기록하는 내부 시스템임.
**본인 PIN + GPS 지오펜싱 + 동적 QR** 3중 검증으로 원격·대리 출퇴근을 방지함.

## 기술 스택 (현재)

- Node.js 22 (`.nvmrc` 기준), Next.js 16 (App Router, Turbopack), React 19
- TypeScript strict (5.9.x — TS7 네이티브 포트는 Next 16 빌드와 미호환이라 사용 안 함)
- Tailwind CSS 4 (`@tailwindcss/postcss`, CSS `@theme` 기반, `src/app/globals.css`)
- Prisma 7 + PostgreSQL — **드라이버 어댑터(`@prisma/adapter-pg`)** 로 런타임 연결
  - 스키마(`prisma/schema.prisma`)의 datasource에는 `url`을 두지 않음
  - 연결 URL: 런타임=`src/lib/prisma.ts`의 어댑터, 마이그레이션=`prisma.config.ts`
- otplib 13 (동적 QR TOTP, `src/lib/qr.ts` — `generateSync`/`verifySync`, secret은 바이트)
- 배포: Vercel(빌드 시 `vercel-build`가 `prisma migrate deploy` 자동 실행) + Neon

## 작업 원칙

1. 작업 전 원격 기본 브랜치(`main`)의 최신 변경을 받음(`git pull`).
2. 기능 브랜치에서 변경 후 PR로 `main`에 병합함. 큰 리팩터링과 기능 변경을 한 PR에 섞지 않음.
3. 실제 직원 이름·사번·위치·출퇴근 기록을 테스트 코드나 문서에 넣지 않음.
4. `DATABASE_URL`, `QR_TOTP_SECRET`, `ADMIN_PASSWORD`, 토큰 등 비밀값을 커밋하지 않음(`.env`는 gitignore).
5. 클라이언트가 보낸 시간·위치·직원 식별값을 신뢰하지 않고 서버에서 검증함.
6. GPS 오차, 권한 거부, 카메라 미지원, QR 만료, 네트워크 실패 흐름을 함께 구현함.
7. 출퇴근/직원/PIN 변경 등 민감 작업은 관리자 인증(`/admin`, `ADMIN_PASSWORD`) 뒤에 둠.
8. DB 스키마 변경 시 `npm run db:migrate:dev -- --name <설명>`으로 마이그레이션을 만들고
   커밋함. PR에 롤백 방법을 기록함.

## 필수 명령

```bash
npm ci                 # 의존성 설치(락파일 기준)
npm run check          # 타입검사 + 프로덕션 빌드 (커밋/PR 전 반드시 통과)
npm run db:migrate     # 마이그레이션 적용(운영/배포)
npm run db:migrate:dev # 개발용 마이그레이션 생성+적용
npm run db:seed        # 데모 직원 시드
npm run dev            # 개발 서버
```

DB가 필요한 명령은 `.env`의 `DATABASE_URL`(PostgreSQL)이 있어야 함. 로컬에 Postgres가
없으면 Neon 개발용 연결 문자열을 그대로 사용해도 됨.

## 완료 기준

- `npm run check`(타입검사+빌드) 통과
- 출근·퇴근 정상/실패 흐름: PIN 오류→401, 사무실 밖→403, 무효 QR→403, 정상→200
- 관리자 인증 가드(미인증 401/리다이렉트)와 직원·PIN 관리 동작 확인
- QR 만료·재사용 차단, 위치 경계값·GPS 오차 처리 확인
- 모바일(HTTPS)에서 카메라·위치 권한 흐름 확인(배포 환경)
- 개인정보·위치정보 최소 수집·노출 확인
