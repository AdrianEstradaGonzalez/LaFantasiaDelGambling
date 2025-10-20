@echo off
echo ========================================
echo Verificando estado del Backend Local
echo ========================================
echo.

REM Verificar si el puerto 3000 está en uso
echo [1/3] Verificando puerto 3000...
netstat -ano | findstr ":3000" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo    ✓ Puerto 3000 en uso - Backend probablemente corriendo
) else (
    echo    ✗ Puerto 3000 libre - Backend NO está corriendo
    echo.
    echo    Para iniciar el backend:
    echo    cd backend
    echo    npm run dev
    goto :END
)

echo.
echo [2/3] Probando endpoint /health...
curl -s http://localhost:3000/health >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo    ✓ Endpoint /health responde correctamente
) else (
    echo    ✗ No se puede conectar a http://localhost:3000/health
)

echo.
echo [3/3] Verificando rutas de player-stats...
echo    Nota: Necesitas un token válido para probar estas rutas
echo    Las rutas están en: /player-stats/:playerId/jornada/:jornada
echo.

echo ========================================
echo Estado: Backend en puerto 3000
echo ========================================
echo.
echo Para iniciar el backend si no está corriendo:
echo   cd C:\Projects\LaFantasiaDelGambling\backend
echo   npm run dev
echo.
echo Para verificar manualmente:
echo   Abre http://localhost:3000/health en tu navegador
echo.

:END
pause
