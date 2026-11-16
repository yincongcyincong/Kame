const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { accessSync, constants, createReadStream, mkdirSync, writeFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const { dirname, join } = require('node:path');

function installed() {
  try {
    accessSync(require('electron'), constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function ensureElectron() {
  if (installed()) return;
  if (process.platform === 'darwin') {
    const manifest = require.resolve('electron/package.json');
    const fromElectron = createRequire(manifest);
    const { version } = fromElectron('./package.json');
    const checksums = fromElectron('./checksums.json');
    const arch = process.arch;
    const checksum = checksums[`electron-v${version}-darwin-${arch}.zip`];
    const archive = await fromElectron('@electron/get').downloadArtifact({
      version, artifactName: 'electron', platform: 'darwin', arch,
      cacheRoot: process.env.electron_config_cache, checksums,
    });
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(archive)) hash.update(chunk);
    if (hash.digest('hex') !== checksum) throw new Error('Electron 压缩包校验失败。');

    const directory = dirname(manifest);
    const dist = join(directory, 'dist');
    mkdirSync(dist, { recursive: true });
    execFileSync('/usr/bin/ditto', ['-x', '-k', archive, dist], { stdio: 'inherit' });
    writeFileSync(join(directory, 'path.txt'), 'Electron.app/Contents/MacOS/Electron');
  } else {
    execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm',
      ['rebuild', 'electron', '--foreground-scripts'], { stdio: 'inherit', shell: process.platform === 'win32' });
  }
  if (!installed()) throw new Error('Electron 可执行文件仍然缺失。');
}

ensureElectron().catch(error => {
  console.error('修复 Electron 失败：' + error.message);
  process.exitCode = 1;
});
