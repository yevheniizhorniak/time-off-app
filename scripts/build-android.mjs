import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const isWindows = process.platform === 'win32';
const result = spawnSync(
  isWindows ? 'cmd.exe' : 'sh',
  isWindows
    ? ['/d', '/s', '/c', 'gradlew.bat', 'assembleDebug', '--console=plain']
    : ['./gradlew', 'assembleDebug', '--console=plain'],
  {
    cwd: fileURLToPath(new URL('../android/', import.meta.url)),
    stdio: 'inherit',
  },
);

if (result.error) {
  process.stderr.write(`Unable to start the Android build: ${result.error.message}\n`);
}

process.exit(result.status ?? 1);
