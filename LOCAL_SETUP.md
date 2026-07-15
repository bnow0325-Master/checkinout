# 로컬에서 관리하기 (Windows · `D:\project\checkinout`)

이 문서는 프로젝트를 내 PC 폴더 `D:\project\checkinout`에 내려받아 **Codex(또는 다른
도구)로 수정하고, 다시 GitHub·배포에 반영**하는 방법을 정리합니다. 명령어가 낯설어도
아래 순서만 따라 하면 됩니다.

## 0. 한 번만 설치할 것

1. **Git** — https://git-scm.com/download/win (기본값으로 설치)
2. **Node.js LTS(22.x)** — https://nodejs.org (LTS 버전 설치)
   - 설치 후 확인: `Win+R` → `cmd` → `node -v` 입력 시 `v22.x`가 보이면 OK

## 1. 프로젝트 내려받기 (최초 1회)

`Win+R` → `cmd` 실행 후, 아래를 한 줄씩 입력:

```cmd
d:
mkdir project
cd project
git clone https://github.com/bnow0325-Master/checkinout
```

→ `D:\project\checkinout` 폴더가 생깁니다.

## 2. 최초 설정

`D:\project\checkinout` 폴더를 열고 **`setup.bat`을 더블클릭**하세요.
- 필요한 패키지를 설치하고, `.env` 파일을 만들어 줍니다.
- `.env`를 메모장으로 열어 값을 채웁니다(로컬에서 직접 실행할 때만 필요):
  - `DATABASE_URL` — Neon 연결 문자열 (운영과 같은 값을 써도 됨)
  - `QR_TOTP_SECRET`, `ADMIN_PASSWORD`, `OFFICE_*` — Vercel에 넣은 값과 동일하게

> 실제 서비스(운영)의 환경변수는 **Vercel 대시보드**에 들어 있습니다. `.env`는 내
> PC에서 개발/테스트로 실행할 때만 쓰이며, 절대 GitHub에 올리지 않습니다(자동 제외됨).

## 3. 수정하기 (Codex 사용)

`D:\project\checkinout` 폴더를 Codex로 열어 원하는 변경을 요청하세요.
Codex는 이 저장소의 **`AGENTS.md`** 규칙을 읽고 작업하며, 커밋 전에
`npm run check`(타입검사+빌드)로 이상 여부를 확인하도록 안내돼 있습니다.

- 로컬에서 직접 확인하려면: **`dev.bat` 더블클릭** → 브라우저에서 `http://localhost:3000`

## 4. GitHub에 반영 & 자동 배포

수정이 끝나면 **`push.bat`을 더블클릭** → 커밋 메시지를 입력하면 GitHub에 올라갑니다.

- **Vercel 자동배포**: GitHub `main` 브랜치가 바뀌면 Vercel이 자동으로 다시 배포합니다.
  (설정: Vercel → 프로젝트 → Settings → Git → **Production Branch = `main`**)
- 즉, `push.bat` → 잠시 후 실제 사이트에 반영됩니다.

## 5. 다른 사람이/다음에 이어서 작업할 때

작업 시작 전 **`update.bat` 더블클릭**으로 GitHub 최신 내용을 먼저 받으세요.
(여러 곳에서 수정할 때 충돌을 줄여줍니다.)

---

## 도우미 스크립트 요약

| 파일 | 하는 일 | 언제 |
|------|---------|------|
| `setup.bat` | 패키지 설치 + .env 생성 | 최초 1회 |
| `update.bat` | GitHub 최신 받기 + 갱신 | 작업 시작 전 |
| `dev.bat` | 개발 서버 실행(localhost) | 로컬 확인할 때 |
| `push.bat` | 커밋 + GitHub 반영 | 수정 완료 후 |

## 문제 해결

- `node -v`가 안 나오면 Node.js 설치 후 cmd 창을 새로 여세요.
- `git push`에서 로그인 창이 뜨면 GitHub 계정(`bnow0325-Master`)으로 로그인하세요.
- 자세한 개발 규칙은 [`AGENTS.md`](./AGENTS.md), 배포는 [`DEPLOY.md`](./DEPLOY.md) 참고.
