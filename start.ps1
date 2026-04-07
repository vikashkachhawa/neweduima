# Start Eduima Application

Write-Host "🚀 Starting Eduima - School Management System" -ForegroundColor Cyan
Write-Host ""

# Check if dependencies are installed
if (-Not (Test-Path "backend/node_modules")) {
    Write-Host "❌ Backend dependencies not installed. Run setup.ps1 first." -ForegroundColor Red
    exit 1
}

if (-Not (Test-Path "frontend/node_modules")) {
    Write-Host "❌ Frontend dependencies not installed. Run setup.ps1 first." -ForegroundColor Red
    exit 1
}

# Start backend in a new window
Write-Host "Starting backend server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; Write-Host 'Backend Server' -ForegroundColor Cyan; npm run dev"

# Wait a moment for backend to start
Start-Sleep -Seconds 3

# Start frontend in a new window
Write-Host "Starting frontend server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\frontend'; Write-Host 'Frontend Server' -ForegroundColor Cyan; npm run dev"

Write-Host ""
Write-Host "✅ Application started!" -ForegroundColor Green
Write-Host ""
Write-Host "Backend API: http://localhost:5000" -ForegroundColor White
Write-Host "Frontend: http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to stop all servers..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Stop all node processes (be careful with this in production)
Write-Host "Stopping servers..." -ForegroundColor Yellow
Stop-Process -Name node -Force -ErrorAction SilentlyContinue
Write-Host "Servers stopped." -ForegroundColor Green
