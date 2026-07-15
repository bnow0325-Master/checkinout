@echo off
chcp 65001 >nul
REM ===== 개발 서버 실행 =====
cd /d "%~dp0"
echo 개발 서버를 시작합니다...
echo 브라우저에서 http://localhost:3000 을 여세요. (종료: 이 창에서 Ctrl+C)
call npm run dev
pause
