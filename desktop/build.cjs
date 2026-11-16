const { execFileSync } = require('node:child_process');
const { copyFileSync, cpSync } = require('node:fs');
const { join } = require('node:path');

const target = process.argv[2];
if (!target || target === 'frontend') {
  require('esbuild').buildSync({
    entryPoints: ['ui/app.jsx'], bundle: true, outfile: 'dist/app.js',
    jsx: 'automatic', minify: true,
  });
  copyFileSync('ui/index.html', 'dist/index.html');
  cpSync('ui/art', 'dist/art', { recursive: true });
}
if (!target || target === 'backend') {
  const executable = process.platform === 'win32' ? 'learning-server.exe' : 'learning-server';
  execFileSync('go', ['build', '-o', join('.build', executable), '.'], { stdio: 'inherit' });
}
