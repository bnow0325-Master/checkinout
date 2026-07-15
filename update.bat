@echo off
chcp 65001 >nul
REM ===== GitHub 최신 내용 받기 + 의존성 갱신 =====
cd /d "%~dp0"
echo [1/3] GitHub에서 최신 코드 받는 중...
call git pull || goto :error
echo [2/3] 패키지 설치 중...
call npm install || goto :error
echo [3/3] Prisma 클라이언트 생성 중...
call npx prisma generate || goto :error
echo.
echo ===== 최신 상태로 업데이트 완료! =====
pause
exit /b 0
:error
echo.
echo [오류] 위 메시지를 확인하세요.
pause
exit /b 1
