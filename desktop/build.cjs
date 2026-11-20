const { execFileSync } = require('node:child_process');
const { copyFileSync, cpSync, mkdirSync, existsSync, statSync } = require('node:fs');
const { resolve } = require('node:path');

const target = process.argv[2];
if (!target || target === 'frontend') {
  require('esbuild').buildSync({
    entryPoints: ['ui/app.jsx'], bundle: true, outfile: 'dist/app.js',
    jsx: 'automatic', minify: true, external: ['/art/*'],
  });
  copyFileSync('ui/index.html', 'dist/index.html');
  cpSync('ui/art', 'dist/art', { recursive: true });
}
if (!target || target === 'backend') {
  const executable = process.platform === 'win32' ? 'learning-server.exe' : 'learning-server';
  const output = resolve('.build', executable);
  execFileSync('go', ['build', '-o', output, '.'], { cwd: 'backend', stdio: 'inherit' });
}

if ((!target || target === 'backend') && process.platform === 'darwin') {
  const directory = resolve('.build/LearningSpeech.app/Contents');
  const binary = resolve(directory, 'MacOS/learning-speech');
  mkdirSync(resolve(directory, 'MacOS'), { recursive: true });
  copyFileSync('desktop/speech/Info.plist', resolve(directory, 'Info.plist'));
  const source = resolve('desktop/speech/main.swift');
  if (!existsSync(binary) || statSync(source).mtimeMs > statSync(binary).mtimeMs || statSync('desktop/speech/Info.plist').mtimeMs > statSync(binary).mtimeMs) {
    execFileSync('swiftc', [source, '-o', binary, '-framework', 'Speech', '-framework', 'AVFoundation', '-Xlinker', '-sectcreate', '-Xlinker', '__TEXT', '-Xlinker', '__info_plist', '-Xlinker', resolve(directory, 'Info.plist'), '-module-cache-path', resolve('.build/swift-cache')], { stdio: 'inherit' });
    execFileSync('codesign', ['--force', '--sign', '-', resolve('.build/LearningSpeech.app')], { stdio: 'inherit' });
  }
}
