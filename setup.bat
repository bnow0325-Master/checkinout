@echo off
chcp 65001 >nul
REM ===== checkinout 최초 설정 (Windows) =====
cd /d "%~dp0"
echo [1/3] 패키지 설치 중...
call npm install || goto :error
echo [2/3] Prisma 클라이언트 생성 중...
call npx prisma generate || goto :error
echo [3/3] 환경설정(.env) 확인 중...
if not exist ".env" (
  copy ".env.example" ".env" >nul
  echo   .env 파일을 새로 만들었습니다.
  echo   메모장으로 .env 를 열어 DATABASE_URL 등 값을 채우세요.
) else (
  echo   .env 파일이 이미 있습니다.
)
echo.
echo ===== 설정 완료! 개발 서버 실행: dev.bat =====
pause
exit /b 0
:error
echo.
echo [오류] 위 메시지를 확인하세요. (Node.js가 설치되어 있어야 합니다)
pause
exit /b 1
