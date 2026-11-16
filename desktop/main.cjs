const { app, BrowserWindow, dialog } = require('electron');
const { spawn } = require('node:child_process');
const { createInterface } = require('node:readline');
const path = require('node:path');

let server;
app.whenReady().then(async () => {
  const root = path.join(__dirname, '..');
  const executable = process.platform === 'win32' ? 'learning-server.exe' : 'learning-server';
  server = spawn(path.join(root, '.build', executable), [
    '-listen', '127.0.0.1:0',
    '-db', path.join(app.getPath('userData'), 'learning.db'),
    '-assets', path.join(root, 'dist'),
  ], { stdio: ['ignore', 'pipe', 'inherit'] });
  const url = await new Promise((resolve, reject) => {
    const output = createInterface({ input: server.stdout });
    output.once('line', resolve);
    server.once('error', reject);
    server.once('exit', code => reject(new Error('后端已退出，退出码 ' + code)));
  });
  const window = new BrowserWindow({
    width: 1220, height: 850, minWidth: 720, minHeight: 640,
    backgroundColor: '#f8f7ff',
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  await window.loadURL(url);
}).catch(error => {
  dialog.showErrorBox('星星学园启动失败', error.message);
  app.quit();
});
app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => server?.kill());
