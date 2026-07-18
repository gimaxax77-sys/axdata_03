@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 코어 시스템 컨트롤 판넬
node scripts\control-panel.mjs
pause
