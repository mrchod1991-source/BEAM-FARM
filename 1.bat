@echo off
chcp 65001 >nul
title 🌾 Beam Farm (B.P.) - Netlify Build Script

echo ========================================================
echo      🌾 กำลังเตรียมระบบและบิลด์เกม BEAM FARM 🌾
echo ========================================================
echo.

:: นำทางเข้าสู่โฟลเดอร์โปรเจกต์เสมอ
cd /d "%~dp0"

:: 1. เคลียร์โฟลเดอร์ dist เก่าทิ้งเพื่อความสดใหม่
if exist "dist" (
    echo [*] กำลังล้างไฟล์เวอร์ชันเก่าในโฟลเดอร์ dist...
    rd /s /q "dist"
)

:: 2. รันคำสั่งคอมไพล์โค้ด
echo.
echo [1/3] กำลังคอมไพล์โค้ดเกม (npm run build)...
call npm run build

:: ตรวจสอบสถานะการบิลด์
if %errorlevel% neq 0 (
    echo.
    echo ========================================================
    echo   ❌ [ERROR] บิลด์ไม่สำเร็จ! มีข้อผิดพลาดในโค้ด (TypeScript / Syntax)
    echo   โปรดดูข้อความ Error สีแดงด้านบนแล้วแก้ไขก่อนลองใหม่อีกครั้ง
    echo ========================================================
    echo.
    pause
    exit /b %errorlevel%
)

:: 3. สร้างไฟล์ _redirects ป้องกันหน้าจอขาว / 404 Error บน Netlify
echo.
echo [2/3] กำลังสร้างไฟล์ _redirects...
echo /*    /index.html   200 > "dist\_redirects"

:: 4. เปิด Netlify Drop และเปิดโฟลเดอร์ dist ทันที
echo.
echo [3/3] บิลด์สำเร็จเรียบร้อย! กำลังเปิดหน้าต่าง...
start https://app.netlify.com/drop
start "" explorer "dist"

echo.
echo ========================================================
echo   ✅ [เสร็จสมบูรณ์ 100%%]
echo   1. หน้าเว็บ Netlify Drop และโฟลเดอร์ dist เปิดขึ้นมาแล้ว
echo   2. ให้ลากโฟลเดอร์ "dist" ไปหย่อนลงในหน้าเว็บได้ทันที!
echo ========================================================
echo.
pause