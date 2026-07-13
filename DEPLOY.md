# 배포 가이드 — Vercel + Neon (무료)

폰에서 실제로 출퇴근(카메라 QR 스캔 + GPS)을 쓰려면 **HTTPS 주소**가 필요합니다.
아래 순서대로 하면 무료로 배포할 수 있습니다. (약 10~15분)

> 왜 Postgres인가: Vercel은 서버리스라 파일(SQLite)을 저장할 수 없습니다. 그래서
> 클라우드 DB인 **Neon(PostgreSQL)** 을 씁니다. 코드는 이미 Postgres용으로 준비돼
> 있습니다.

---

## 1) Neon에서 무료 데이터베이스 만들기

1. https://neon.tech 접속 → **GitHub로 로그인**
2. **Create project** → 이름 `checkinout`, Region은 `Asia (Singapore)` 등 가까운 곳
3. 생성되면 **Connection string**이 보입니다. `postgresql://...` 전체를 복사해 두세요.
   - `?sslmode=require`가 붙은 형태면 그대로 사용합니다.

## 2) Vercel에 배포하기

1. https://vercel.com 접속 → **GitHub로 로그인**
2. **Add New → Project** → `bnow0325-Master/checkinout` 레포 **Import**
3. Framework는 **Next.js**로 자동 인식됩니다. **Environment Variables**에 아래 5개 추가:

   | Name | Value |
   |------|-------|
   | `DATABASE_URL` | (1)에서 복사한 Neon 연결 문자열 |
   | `QR_TOTP_SECRET` | 무작위 문자열 (아래 명령으로 생성) |
   | `ADMIN_PASSWORD` | 관리자 로그인 비밀번호 (강력하게) |
   | `OFFICE_LATITUDE` | `37.5636` (실제 사무실 좌표로 보정 권장) |
   | `OFFICE_LONGITUDE` | `126.9868` |
   | `OFFICE_RADIUS_METERS` | `150` |

   `QR_TOTP_SECRET` 생성 예시(터미널):
   ```bash
   openssl rand -hex 32
   ```
4. **Deploy** 클릭.
   - 빌드 시 `vercel-build` 스크립트가 **DB 마이그레이션(`prisma migrate deploy`)을 자동 적용**한 뒤 앱을 빌드합니다. 별도 작업 필요 없음.

## 3) 직원 등록 (관리자 화면에서)

배포된 주소에서 `/admin` 으로 접속 → `ADMIN_PASSWORD`로 로그인 → **직원 관리**에서
사번·이름·부서·PIN을 입력해 직원을 추가합니다. (별도 명령·seed 불필요)

> 여러 명을 한 번에 넣고 싶다면 내 컴퓨터에서 `prisma/seed.ts` 목록을 수정한 뒤
> `DATABASE_URL`을 Neon 문자열로 설정하고 `npm run db:seed` 를 실행해도 됩니다.

## 4) 사용하기

- 배포된 주소(예: `https://checkinout.vercel.app`)를 폰에서 엽니다.
- **키오스크**: 사무실 태블릿/모니터에서 `/kiosk` 를 띄워둡니다 (QR 자동 갱신).
- **직원**: 폰에서 접속 → 이름 선택 → PIN 입력 → 위치 확인 → QR 스캔 → 출근/퇴근.
- **관리자**: `/admin` 에서 오늘/주간/월간/연간 집계 및 CSV 내려받기.

> HTTPS 주소이므로 카메라·위치 권한이 정상 동작합니다. (localhost 외 http에서는 차단됨)

---

## 참고

- **좌표 보정**: 배포 후 실제 사무실 6층/입구에서 폰 지도앱으로 위도·경도를 확인해
  `OFFICE_LATITUDE/LONGITUDE`를 업데이트하면 정확도가 올라갑니다. 반경(150m)은 오차
  흡수용이니 필요시 조정하세요.
- **스키마 변경 시**: 로컬에서 `npx prisma migrate dev --name <설명>` 으로 마이그레이션을
  만들어 커밋하면, 다음 배포에서 자동 적용됩니다.
- **비용**: Neon·Vercel 모두 개인/소규모는 무료 티어로 충분합니다.
