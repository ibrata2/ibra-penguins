// Electron main process for IBRA PENGUINS
const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let win;
const userLevels = () => path.join(app.getPath('userData'), 'levels');
const packDirs = () => [
  path.join(path.dirname(app.getPath('exe')), 'levels'),   // next to the installed exe
  path.join(__dirname, 'levels'),                          // dev / unpacked
  userLevels(),                                            // %APPDATA%/IBRA PENGUINS/levels
];
const myLevelsFile = () => path.join(app.getPath('userData'), 'my-levels.json');

function createWindow() {
  win = new BrowserWindow({
    width: 1600, height: 900, minWidth: 960, minHeight: 540,
    backgroundColor: '#05080f', title: 'IBRA PENGUINS', show: false,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false },
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, 'index.html'));
  win.once('ready-to-show', () => { win.maximize(); win.show(); });
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
}

ipcMain.handle('packs:load', () => {
  const out = [], seen = new Set();
  try { fs.mkdirSync(userLevels(), { recursive: true }); } catch {}
  for (const dir of packDirs()) {
    let files = [];
    try { files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.json')); } catch { continue; }
    for (const f of files) {
      if (seen.has(f)) continue;
      try { out.push({ file: f, data: JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) }); seen.add(f); } catch (e) { console.warn('bad level pack', f, e.message); }
    }
  }
  return out;
});
ipcMain.handle('mine:load', () => { try { return JSON.parse(fs.readFileSync(myLevelsFile(), 'utf8')); } catch { return null; } });
ipcMain.handle('mine:save', (_e, list) => { fs.writeFileSync(myLevelsFile(), JSON.stringify(list, null, 1)); return true; });
ipcMain.handle('folder:open', () => { fs.mkdirSync(userLevels(), { recursive: true }); shell.openPath(userLevels()); });
ipcMain.on('fullscreen', (_e, on) => win && win.setFullScreen(!!on));
ipcMain.on('quit', () => app.quit());
ipcMain.handle('app:version', () => app.getVersion());
ipcMain.handle('update:check', async (_e, url) => {
  const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 8000);
  try { const r = await fetch(url + '?t=' + Date.now(), { signal: ctl.signal, cache: 'no-store' }); if (!r.ok) throw new Error(r.status); return await r.json(); }
  finally { clearTimeout(tm); }
});
ipcMain.on('open-url', (_e, url) => { if (/^https?:\/\//.test(url)) shell.openExternal(url); });

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
