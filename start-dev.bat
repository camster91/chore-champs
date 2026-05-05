@echo off
REM Kids Chore App Development Startup Script
REM This script starts the PostgreSQL database and the Next.js dev server

setlocal enabledelayedexpansion

echo ========================================
echo Kids Chore App - Development Startup
echo ========================================
echo.

REM Check for required commands
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: npm is not available.
    echo Please install Node.js and npm.
    pause
    exit /b 1
)

where docker >nul 2>&1
if %errorlevel% neq 0 (
    echo Warning: Docker not found. Database setup may fail.
    echo If you have PostgreSQL running on port 5432, continue.
    echo Otherwise, install Docker Desktop.
    echo.
    set HAS_DOCKER=0
) else (
    echo ✓ Docker found
    set HAS_DOCKER=1
)

REM Check if PostgreSQL is already running
echo Checking if PostgreSQL is running on port 5432...
netstat -ano | findstr :5432 >nul
if %errorlevel% equ 0 (
    echo ✓ PostgreSQL is already running
    set DB_RUNNING=1
) else (
    echo PostgreSQL is not running
    set DB_RUNNING=0
)

REM Start database if needed
if %DB_RUNNING% equ 0 (
    if %HAS_DOCKER% equ 1 (
        echo.
        echo Starting PostgreSQL with Docker Compose...
        docker-compose up -d
        
        REM Wait for database to be ready
        echo Waiting for database to be ready...
        timeout /t 10 /nobreak >nul
        
        REM Check if database started
        docker-compose ps | findstr "postgres" >nul
        if %errorlevel% equ 0 (
            echo ✓ PostgreSQL started successfully
        ) else (
            echo ✗ Failed to start PostgreSQL
            echo Please check Docker and try again.
            pause
            exit /b 1
        )
    ) else (
        echo.
        echo ERROR: No database running and Docker not available.
        echo Please either:
        echo 1. Install Docker Desktop and run this script again
        echo 2. Start PostgreSQL manually on port 5432
        echo 3. Update .env with your database connection string
        echo.
        pause
        exit /b 1
    )
)

echo.
echo Setting up database schema...

REM Generate Prisma Client (if not already generated)
echo Generating Prisma Client...
npx prisma generate

if %errorlevel% neq 0 (
    echo ✗ Failed to generate Prisma Client
    pause
    exit /b 1
)

echo ✓ Prisma Client generated

REM Push database schema
echo Pushing database schema...
npx prisma db push

if %errorlevel% neq 0 (
    echo ✗ Failed to push database schema
    echo Check database connection and try again.
    pause
    exit /b 1
)

echo ✓ Database schema created

REM Seed database with sample data
echo Seeding database with sample data...
npm run seed

if %errorlevel% neq 0 (
    echo ⚠ Seed script failed, continuing without seed data
)

echo.
echo ========================================
echo Starting Development Server
echo ========================================
echo.
echo The app will be available at: http://localhost:3000
echo.
echo Press Ctrl+C to stop the server.
echo.

REM Start the Next.js dev server
npm run dev