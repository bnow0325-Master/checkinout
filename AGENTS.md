# BNOW CheckInOut 개발 지침

## 제품 목적

CheckInOut은 BNOW 임직원의 출퇴근 기록을 정확하고 안전하게 관리하는 내부 시스템임. 동적 QR과 GPS 지오펜싱을 함께 사용하여 원격·대리 출퇴근을 방지함.

## 작업 원칙

1. 작업 전에 원격 기본 브랜치의 최신 변경사항을 확인함.
2. `agent/<작업명>` 기능 브랜치에서 변경하고 PR로 병합함.
3. 실제 직원 이름, 사번, 위치기록, 출퇴근기록을 테스트 코드나 문서에 추가하지 않음.
4. `QR_TOTP_SECRET`, 데이터베이스 URL, 인증 토큰을 커밋하지 않음.
5. 클라이언트가 보낸 시간·위치·직원 식별값을 신뢰하지 않고 서버에서 검증함.
6. GPS 오차, 권한 거부, 카메라 미지원, QR 만료, 네트워크 실패 흐름을 함께 구현함.
7. 출퇴근 기록 변경·삭제 기능에는 관리자 권한과 감사로그를 적용함.
8. DB 스키마를 변경하면 마이그레이션·백업·롤백 방법을 PR에 기록함.
9. 큰 리팩터링과 기능 변경을 한 PR에 섞지 않음.
10. 변경 후 `npm ci`와 `npm run check`를 실행함.

## 기술 기준

- Node.js: `.nvmrc` 기준
- Framework: Next.js 15 App Router
- Language: TypeScript strict mode
- Database: Prisma + SQLite(개발), PostgreSQL(운영 전환 예정)
- Mobile APIs: Geolocation, getUserMedia는 HTTPS 환경에서 검증

## 완료 기준

- 타입검사와 프로덕션 빌드 통과
- 출근·퇴근 중복 요청 방지 확인
- QR 만료 및 재사용 차단 확인
- 위치 경계값과 GPS 오차 처리 확인
- 모바일 Safari·Chrome 핵심 흐름 확인
- 개인정보와 위치정보의 최소 수집·노출 확인
