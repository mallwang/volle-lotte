// Plays full games against an in-process server and prints the socket traffic per event.
// Usage: npm run measure:socket -- --label baseline
import { spawnSync } from 'node:child_process';

const at = process.argv.indexOf('--label');
const label = at > 0 ? process.argv[at + 1] : undefined;
if (!label || !/^[\w.-]+$/.test(label)) {
  console.error('Usage: npm run measure:socket -- --label <name>');
  process.exit(2);
}
const run = spawnSync('npx', ['nx', 'run', 'backend:measure-socket'], {
  stdio: 'inherit',
  env: { ...process.env, MEASURE_LABEL: label },
});
process.exit(run.status ?? 1);
