@echo off
setlocal
cd /d "%~dp0"

echo Instalando dependencias...
call npm ci
if errorlevel 1 goto error

echo Compilando NavInside...
call npm run build
if errorlevel 1 goto error

echo Sincronizando la app Android...
call npx cap sync android
if errorlevel 1 goto error

echo Generando APK de depuracion...
pushd android
call gradlew.bat assembleDebug
if errorlevel 1 (
  popd
  goto error
)
popd

echo.
echo APK generado en:
echo %~dp0android\app\build\outputs\apk\debug\app-debug.apk
echo Copia ese archivo al telefono e instalalo.
pause
exit /b 0

:error
echo.
echo No se pudo completar. Revisa el error anterior, Node.js, Android SDK y Java.
pause
exit /b 1
