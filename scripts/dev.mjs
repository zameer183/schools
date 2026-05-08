import { rm } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';

const root = process.cwd();
const nextDir = path.join(root, '.next');
const nextBin = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next');
const devPort = Number(process.env.PORT ?? '5000');
const shouldClearCache =
  process.env.CLEAR_NEXT_CACHE === '1' ||
  (process.env.CLEAR_NEXT_CACHE !== '0' && process.env.REUSE_NEXT_CACHE !== '1');
const isWindows = process.platform === 'win32';
const useTurbo =
  process.env.FORCE_TURBOPACK === '1' ||
  (!isWindows && process.env.DISABLE_TURBOPACK !== '1');

async function isPortAvailable(port) {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '0.0.0.0');
  });
}

function killPortListenerWindows(port) {
  const script = `
$conn = Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($null -eq $conn) { Write-Output "free"; exit 0 }
$ownerPid = $conn.OwningProcess
$proc = Get-CimInstance Win32_Process -Filter "ProcessId=$ownerPid" -ErrorAction SilentlyContinue
$parentPid = if ($null -ne $proc -and $proc.ParentProcessId -gt 0) { $proc.ParentProcessId } else { $ownerPid }
taskkill /PID $parentPid /T /F | Out-Null
Write-Output "killed:\${ownerPid}:\${parentPid}"
`.trim();

  const result = spawnSync('powershell', ['-NoProfile', '-Command', script], {
    cwd: root,
    encoding: 'utf8'
  });

  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
  return output || `unknown:${result.status ?? 'n/a'}`;
}

function killPortListenerUnix(port) {
  const find = spawnSync('bash', ['-lc', `lsof -ti tcp:${port}`], {
    cwd: root,
    encoding: 'utf8'
  });
  const pids = (find.stdout ?? '')
    .split(/\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (pids.length === 0) return 'free';
  spawnSync('bash', ['-lc', `kill -9 ${pids.join(' ')}`], { cwd: root });
  return `killed:${pids.join(',')}`;
}

async function freeDevPort(port) {
  if (await isPortAvailable(port)) return;

  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = isWindows ? killPortListenerWindows(port) : killPortListenerUnix(port);
    console.log(`[dev] Port ${port} busy. Cleanup attempt ${attempt}/${maxAttempts}: ${result}`);
    if (await isPortAvailable(port)) return;
  }

  console.warn(`[dev] Could not free port ${port}. You can set PORT to another value.`);
}

if (shouldClearCache) {
  try {
    await rm(nextDir, { recursive: true, force: true });
    console.log('[dev] Cleared .next cache (set REUSE_NEXT_CACHE=1 to skip)');
  } catch (error) {
    console.warn('[dev] Could not fully clear .next cache:', error);
  }
} else {
  console.log('[dev] Reusing .next cache');
}

await freeDevPort(devPort);

const devArgs = [nextBin, 'dev', '-p', String(devPort), '-H', '0.0.0.0'];
if (useTurbo) devArgs.push('--turbopack');

console.log(`[dev] Bundler: ${useTurbo ? 'Turbopack' : 'Webpack (stable mode)'}`);

const child = spawn(process.execPath, devArgs, {
  stdio: 'inherit',
  cwd: root,
  env: process.env
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
