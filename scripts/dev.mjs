import { rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const nextDir = path.join(root, '.next');
const nextBin = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next');

try {
  await rm(nextDir, { recursive: true, force: true });
  console.log('[dev] Cleared .next cache');
} catch (error) {
  console.warn('[dev] Could not fully clear .next cache:', error);
}

const child = spawn(process.execPath, [nextBin, 'dev', '--turbopack'], {
  stdio: 'inherit',
  cwd: root,
  env: {
    ...process.env,
    NEXT_DISABLE_WEBPACK_CACHE: '1'
  }
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
