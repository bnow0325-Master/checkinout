# checkinout — 직원 출퇴근 기록 시스템

직원의 회사 출퇴근을 기록하는 웹 애플리케이션입니다.
**원격 출퇴근(집·원격 데스크톱 등)을 막고 실제 사무실에 있어야만 출퇴근**할 수 있도록
**GPS 지오펜싱 + 동적 QR** 이중 인증을 사용합니다.

## 왜 이 방식인가 (원격 차단)

PC 브라우저 버튼 클릭은 원격 접속(RDP, 크롬 원격 데스크톱)을 안정적으로 막을 수
없습니다. 원격으로 회사 PC에 접속해 클릭하면 서버 입장에서 현장 클릭과 구분되지
않기 때문입니다. 그래서 이 앱은 **물리적으로 현장에 있어야만 만들 수 있는 신호**를
검증합니다.

| 신호 | 역할 |
|------|------|
| **GPS 지오펜싱** | 직원 폰이 사무실 좌표 반경(기본 150m) 안에 있어야 함 |
| **동적 QR (TOTP)** | 사무실 화면에 30초마다 바뀌는 QR을 폰으로 스캔해야 함. 캡처 재사용 불가 |

두 신호가 **모두** 통과해야 출퇴근 기록이 `verified` 처리됩니다. 원격 사용자는
사무실 반경 밖이라 GPS에서 막히고, 실시간으로 바뀌는 QR도 볼 수 없습니다.

## 기술 스택

- **Next.js 15 (App Router) + React 19 + TypeScript**
- **Prisma ORM** — 로컬은 SQLite, 프로덕션은 PostgreSQL로 전환 가능
- **Tailwind CSS**
- **otplib** (동적 QR TOTP), **qrcode** (QR 이미지 생성)

## 화면 구성

| 경로 | 설명 |
|------|------|
| `/` | 홈 (진입 메뉴) |
| `/check` | 직원용 출퇴근 화면 — 직원 선택 → 위치 확인 → QR 입력 → 출근/퇴근 |
| `/kiosk` | 사무실 태블릿/모니터용 QR 화면 (자동 갱신) |
| `/admin` | 관리자 — 오늘의 출퇴근 기록 목록 |

## 시작하기

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정
cp .env.example .env
#   - OFFICE_LATITUDE / OFFICE_LONGITUDE / OFFICE_RADIUS_METERS : 사무실 위치
#   - QR_TOTP_SECRET : 무작위 비밀키로 교체 (예: openssl rand -hex 32)

# 3. 데이터베이스 준비 (SQLite)
npm run db:push      # 스키마 반영
npm run db:seed      # 샘플 직원 3명 생성

# 4. 개발 서버 실행
npm run dev          # http://localhost:3000
```

키오스크 화면(`/kiosk`)을 사무실 모니터에 띄워두고, 직원은 폰으로 `/check`에
접속해 출퇴근합니다.

## 로드맵

- [x] **1단계 (MVP)** — 프로젝트 구조, 출퇴근 기록, 관리자 목록, GPS + 동적 QR 검증
- [ ] **2단계** — 폰 카메라로 QR 직접 스캔 (수동 입력 제거), 직원 로그인/인증
- [ ] **3단계** — 관리자 대시보드(근태 통계·월별 집계·CSV 내보내기), 사무실 WiFi(BSSID) 보조 검증
- [ ] **4단계** — 프로덕션 배포(Vercel + PostgreSQL), NFC 태깅 옵션

## 데이터 모델

- `Employee` — 직원(사번, 이름, 부서)
- `AttendanceRecord` — 출퇴근 기록(출근/퇴근, 시각, 방식, 위치, 현장확인 여부)

## 프로덕션 DB로 전환

`prisma/schema.prisma`의 `datasource db` provider를 `postgresql`로 바꾸고
`DATABASE_URL`을 PostgreSQL 접속 문자열로 설정한 뒤 `npm run db:push`를 실행합니다.
