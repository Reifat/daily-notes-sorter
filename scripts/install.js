import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

function normalizeMode(input) {
  if (!input) return 'Release';
  const v = String(input).toLowerCase();
  if (v === 'dev') return 'Dev';
  if (v === 'release') return 'Release';
  return 'Release';
}

function ensureFileExists(p, label) {
  if (!fs.existsSync(p)) {
    console.error(`[error] ${label} not found: ${p}`);
    process.exit(1);
  }
}

async function run() {
  const platform = process.platform; // 'win32' | 'darwin' | 'linux' | ...
  const mode = normalizeMode(process.argv[2]);

  const unixScript = path.join(repoRoot, 'scripts', 'install', 'install.sh');
  const winScript = path.join(repoRoot, 'scripts', 'install', 'install.bat');

  let spawnCmd;
  let spawnArgs = [];
  let spawnOpts = { stdio: 'inherit' };

  if (platform === 'win32') {
    ensureFileExists(winScript, 'Windows installer');
    spawnCmd = `"${winScript}" "${mode}"`;
    spawnOpts = { stdio: 'inherit', shell: true };
  } else {
    ensureFileExists(unixScript, 'Unix installer');
    spawnCmd = 'bash';
    spawnArgs = [unixScript, mode];
  }

  console.log(`[info] Launching platform installer for ${platform} (${mode})...`);
  const child = spawn(spawnCmd, spawnArgs, spawnOpts);

  child.on('error', (err) => {
    console.error('[error] Failed to start installer:', err);
    process.exit(1);
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      console.error(`[error] Installer terminated by signal: ${signal}`);
      process.exit(1);
    }
    process.exit(code ?? 0);
  });
}

run();
