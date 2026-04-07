# Eduima Setup Script for Windows

Write-Host "🚀 Setting up Eduima - School Management System" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js is installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed. Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check if MySQL is running
Write-Host "Checking MySQL..." -ForegroundColor Yellow
$mysqlRunning = Get-Process mysqld -ErrorAction SilentlyContinue
if ($mysqlRunning) {
    Write-Host "✅ MySQL is running" -ForegroundColor Green
} else {
    Write-Host "⚠️  MySQL might not be running. Please start MySQL server (XAMPP Control Panel)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Step 1: Installing Backend Dependencies" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

Set-Location backend

if (Test-Path "node_modules") {
    Write-Host "Backend dependencies already installed" -ForegroundColor Yellow
} else {
    Write-Host "Installing backend packages..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Backend installation failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Backend dependencies installed" -ForegroundColor Green
}

# Create .env file if it doesn't exist
if (-Not (Test-Path ".env")) {
    Write-Host "Creating backend .env file..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✅ .env file created. Please update it with your database credentials." -ForegroundColor Green
}

Set-Location ..

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Step 2: Installing Frontend Dependencies" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

Set-Location frontend

if (Test-Path "node_modules") {
    Write-Host "Frontend dependencies already installed" -ForegroundColor Yellow
} else {
    Write-Host "Installing frontend packages..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Frontend installation failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Frontend dependencies installed" -ForegroundColor Green
}

# Create .env file if it doesn't exist
if (-Not (Test-Path ".env")) {
    Write-Host "Creating frontend .env file..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✅ .env file created" -ForegroundColor Green
}

Set-Location ..

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Step 3: Database Setup" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "⚠️  IMPORTANT: Database Setup Required" -ForegroundColor Yellow
Write-Host "Please complete the following steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Open phpMyAdmin (http://localhost/phpmyadmin)" -ForegroundColor White
Write-Host "2. Create a new database named: eduima_db" -ForegroundColor White
Write-Host "3. Import the SQL file: backend/database/schema.sql" -ForegroundColor White
Write-Host ""
Write-Host "OR use MySQL command line:" -ForegroundColor White
Write-Host "  mysql -u root -p -e 'CREATE DATABASE eduima_db;'" -ForegroundColor Gray
Write-Host "  mysql -u root -p eduima_db < backend/database/schema.sql" -ForegroundColor Gray
Write-Host ""

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Configure backend/.env with your database credentials" -ForegroundColor White
Write-Host "2. Set up the database (see above instructions)" -ForegroundColor White
Write-Host "3. Run: .\start.ps1" -ForegroundColor White
Write-Host ""
Write-Host "Default Super Admin Credentials:" -ForegroundColor Yellow
Write-Host "  Email: superadmin@eduima.com" -ForegroundColor White
Write-Host "  Password: SuperAdmin@123" -ForegroundColor White
Write-Host ""
