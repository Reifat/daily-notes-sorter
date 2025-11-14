@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%\..\..") do set "REPO_ROOT=%%~fI"
set "CONFIG_FILE=%REPO_ROOT%\install-config.env"

rem If called without parameters: run download script, then use extracted dir as source
if "%~1"=="" (
  set "TARGET=%REPO_ROOT%\scripts\install\download\download.bat"
  if not exist "%TARGET%" (
    echo [error] Download script not found: %TARGET%
    exit /b 1
  )
  rem Read RELEASE_TAG from config to compute extraction dir
  if not exist "%CONFIG_FILE%" (
    echo [error] Config file not found: %CONFIG_FILE%
    exit /b 1
  )
  set "RELEASE_TAG="
  for /f "usebackq eol=# tokens=1,* delims==" %%K in ("%CONFIG_FILE%") do (
    if /I "%%K"=="RELEASE_TAG" (
      set "RELEASE_TAG=%%L"
      if defined RELEASE_TAG (
        if "!RELEASE_TAG:~0,1!"=="^"" if "!RELEASE_TAG:~-1!"=="^"" set "RELEASE_TAG=!RELEASE_TAG:~1,-1!"
      )
    )
  )
  if not defined RELEASE_TAG (
    echo [error] RELEASE_TAG is not set in %CONFIG_FILE%
    exit /b 1
  )
  set "EXTRACT_DIR=%REPO_ROOT%\build\release\%RELEASE_TAG%\extracted"
  call "%TARGET%"
  if errorlevel 1 (
    echo [error] Download script failed
    exit /b 1
  )
  if not exist "%EXTRACT_DIR%" (
    echo [error] Extracted directory not found: %EXTRACT_DIR%
    exit /b 1
  )
  set "SOURCE_DIR=%EXTRACT_DIR%"
  set "MODE=Downloaded"
) else (
  set "MODE=%~1"
  if /I "%MODE%"=="Dev" (
    set "SOURCE_DIR=%REPO_ROOT%\build\dev"
  ) else (
    set "SOURCE_DIR=%REPO_ROOT%\build\release"
  )
)

echo [info] Repo root: %REPO_ROOT%
echo [info] Config: %CONFIG_FILE%
echo [info] Mode: %MODE%
echo [info] Source dir: %SOURCE_DIR%

if not exist "%CONFIG_FILE%" (
  echo [error] Config file not found: %CONFIG_FILE%
  echo Create it with a line like: DEST_DIR=C:\path\to\target
  exit /b 1
)

rem Parse .env style file, look for DEST_DIR=<value>
set "DEST_DIR="
for /f "usebackq eol=# tokens=1,* delims==" %%K in ("%CONFIG_FILE%") do (
  if /I "%%K"=="DEST_DIR" (
    set "DEST_DIR=%%L"
    if defined DEST_DIR (
      if "!DEST_DIR:~0,1!"=="^"" if "!DEST_DIR:~-1!"=="^"" set "DEST_DIR=!DEST_DIR:~1,-1!"
    )
  )
)

if not defined DEST_DIR (
  echo [error] DEST_DIR is not set in %CONFIG_FILE%
  exit /b 1
)

echo [info] Destination: %DEST_DIR%
if not exist "%DEST_DIR%" (
  mkdir "%DEST_DIR%" 2>nul
  if errorlevel 1 (
    echo [error] Failed to create destination directory: %DEST_DIR%
    exit /b 1
  )
)

rem Prefer robocopy if available (Windows Vista+)
if exist "%SystemRoot%\System32\robocopy.exe" (
  echo [info] Copying files with robocopy...
  robocopy "%SOURCE_DIR%" "%DEST_DIR%" /E /NFL /NDL /NJH /NJS
  set "RC=%ERRORLEVEL%"
  if %RC% GEQ 8 (
    echo [error] robocopy failed with code %RC%
    exit /b %RC%
  )
) else (
  echo [info] robocopy not found, falling back to xcopy...
  xcopy "%SOURCE_DIR%\*" "%DEST_DIR%\" /E /I /Y
  if errorlevel 1 (
    echo [error] xcopy failed
    exit /b 1
  )
)

echo [success] Files copied to %DEST_DIR%
exit /b 0


