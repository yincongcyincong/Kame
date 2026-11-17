const { execFileSync } = require('node:child_process');
const { copyFileSync, cpSync } = require('node:fs');
const { resolve } = require('node:path');

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
  const output = resolve('.build', executable);
  execFileSync('go', ['build', '-o', output, '.'], { cwd: 'backend', stdio: 'inherit' });
}
