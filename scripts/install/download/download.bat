@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%\..\..\..") do set "REPO_ROOT=%%~fI"
set "CONFIG_FILE=%REPO_ROOT%\install-config.env"

echo [info] Repo root: %REPO_ROOT%
echo [info] Config: %CONFIG_FILE%

if not exist "%CONFIG_FILE%" (
  echo [error] Config file not found: %CONFIG_FILE%
  echo Create it with lines like:
  echo   RELEASE_TAG=1.0.0
  echo   DEST_DIR=C:\path\to\Obsidian\.obsidian\plugins\daily-notes-sorter
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

set "RELEASE_DIR=%REPO_ROOT%\build\release\%RELEASE_TAG%"
if not exist "%RELEASE_DIR%" mkdir "%RELEASE_DIR%"

set "ASSET_NAME=daily-notes-sorter-%RELEASE_TAG%.zip"
set "RELEASE_PAGE_URL=https://github.com/Reifat/daily-notes-sorter/releases/tag/%RELEASE_TAG%"
set "DOWNLOAD_URL=https://github.com/Reifat/daily-notes-sorter/releases/download/%RELEASE_TAG%/%ASSET_NAME%"
set "ZIP_PATH=%RELEASE_DIR%\%ASSET_NAME%"
set "EXTRACT_DIR=%RELEASE_DIR%\extracted"

echo [info] Release page: %RELEASE_PAGE_URL%
echo [info] Downloading asset: %ASSET_NAME%
echo [info] From: %DOWNLOAD_URL%
echo [info] To: %ZIP_PATH%

rem If already extracted and not empty, reuse cache
if exist "%EXTRACT_DIR%" (
  dir /b "%EXTRACT_DIR%" >nul 2>&1
  if not errorlevel 1 (
    echo [info] Found existing extracted directory. Skipping download and extraction.
    echo [success] Using cached extraction at: %EXTRACT_DIR%
    exit /b 0
  )
)

rem If ZIP exists and has non-zero size, skip download
if exist "%ZIP_PATH%" (
  for %%A in ("%ZIP_PATH%") do set "ZIP_SIZE=%%~zA"
  if defined ZIP_SIZE if NOT "%ZIP_SIZE%"=="0" (
    echo [info] Found existing zip (%ZIP_SIZE% bytes). Skipping download.
    goto :DoExtract
  )
)

rem Prefer curl, fallback to certutil
where curl >nul 2>&1
if not errorlevel 1 (
  curl -fSLo "%ZIP_PATH%" "%DOWNLOAD_URL%"
) else (
  echo [info] curl not found, falling back to certutil...
  certutil -urlcache -split -f "%DOWNLOAD_URL%" "%ZIP_PATH%"
  if errorlevel 1 (
    echo [error] certutil download failed
    exit /b 1
  )
)

if not exist "%ZIP_PATH%" (
  echo [error] Downloaded file not found: %ZIP_PATH%
  exit /b 1
)

:DoExtract
if not exist "%EXTRACT_DIR%" mkdir "%EXTRACT_DIR%"

echo [info] Extracting archive...
rem Prefer built-in tar (bsdtar) to extract zip
where tar >nul 2>&1
if not errorlevel 1 (
  tar -xf "%ZIP_PATH%" -C "%EXTRACT_DIR%"
) else (
  if exist "%SystemRoot%\System32\tar.exe" (
    "%SystemRoot%\System32\tar.exe" -xf "%ZIP_PATH%" -C "%EXTRACT_DIR%"
  ) else (
    echo [error] Could not find a tool to extract zip (need tar). Install tar or extract manually.
    exit /b 1
  )
)

echo [success] Downloaded and extracted to: %EXTRACT_DIR%
exit /b 0


