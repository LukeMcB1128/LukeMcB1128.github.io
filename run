#!/usr/bin/env node
const { spawnSync } = require('child_process');
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node run <script> [args]');
  process.exit(1);
}
const script = args[0];
const cmdArgs = args.slice(1);
const result = spawnSync('npm', ['run', script, ...cmdArgs], { stdio: 'inherit' });
process.exit(result.status);