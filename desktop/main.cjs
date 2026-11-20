const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { spawn } = require('node:child_process');
const { createInterface } = require('node:readline');
const path = require('node:path');

let server;
let speech;
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
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  ipcMain.handle('game-speech-command', (event, command) => {
    if (event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame || !['start', 'stop'].includes(command)) throw new Error('语音调用来源无效');
    if (process.platform !== 'darwin') throw new Error('此功能目前需要 macOS 客户端');
    if (!speech && command === 'start') {
      const child = spawn(path.join(root, '.build/LearningSpeech.app/Contents/MacOS/learning-speech'), [], { stdio: ['pipe', 'pipe', 'pipe'] });
      speech = child;
      const output = createInterface({ input: child.stdout });
      output.on('line', line => {
        try { if (!window.isDestroyed()) window.webContents.send('game-speech-event', JSON.parse(line)); } catch {}
      });
      child.stderr.on('data', () => {});
      child.stdin.on('error', () => {});
      child.on('error', () => { if (!window.isDestroyed()) window.webContents.send('game-speech-event', { type: 'error', message: '语音组件启动失败，请执行 make build 重新构建。' }); });
      child.on('exit', () => {
        if (speech === child) speech = null;
        if (!window.isDestroyed()) window.webContents.send('game-speech-event', { type: 'ended' });
      });
    }
    speech?.stdin.write(JSON.stringify({ type: command }) + '\n');
  });
  window.on('closed', () => { speech?.kill(); speech = null; });
  await window.loadURL(url);
}).catch(error => {
  dialog.showErrorBox('星星学园启动失败', error.message);
  app.quit();
});
app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => { server?.kill(); speech?.kill(); });
