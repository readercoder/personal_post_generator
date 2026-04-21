// electron/main.js
// ─────────────────────────────────────────────────────────────────────────────
// Electron main process.
// Manages the BrowserWindow and spawns the Node.js pipeline as a child process,
// streaming stdout back to the renderer via IPC.
// ─────────────────────────────────────────────────────────────────────────────

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const { spawn }  = require('child_process');
const path       = require('path');
const fs         = require('fs');

// Project root is one level above the electron/ folder
const ROOT = path.join(__dirname, '..');

// ── Window creation ──────────────────────────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width:           980,
    height:          700,
    minWidth:        800,
    minHeight:       560,
    backgroundColor: '#0a0e1a',
    title:           'LinkedIn Post Automation',
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
      devTools:         process.argv.includes('--dev'),
    },
    show: false, // wait for ready-to-show to avoid white flash
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  win.once('ready-to-show', () => win.show());

  if (process.argv.includes('--dev')) {
    win.webContents.openDevTools({ mode: 'undocked' });
  }

  return win;
}

// ── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  const win = createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── Pipeline runner ──────────────────────────────────────────────────────────
let pipelineProcess = null; // guard against double-runs

ipcMain.on('run-pipeline', (event) => {
  if (pipelineProcess) {
    event.sender.send('log-line', 'WARN  Pipeline is already running — please wait.\n');
    return;
  }

  // Load .env file from project root so env vars reach the child process
  const envPath = path.join(ROOT, '.env');
  const childEnv = { ...process.env };

  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      childEnv[key] = val;
    }
  }

  event.sender.send('log-line', `INFO  Launching pipeline from: ${ROOT}\n`);

  pipelineProcess = spawn('node', ['src/pipeline.mjs'], {
    cwd:   ROOT,
    env:   childEnv,
    shell: false,
  });

  // Stream stdout (pino-pretty formatted lines)
  pipelineProcess.stdout.on('data', (chunk) => {
    event.sender.send('log-line', chunk.toString());
  });

  // Stream stderr (rare — node errors, not pino)
  pipelineProcess.stderr.on('data', (chunk) => {
    event.sender.send('log-line', chunk.toString());
  });

  // Done
  pipelineProcess.on('close', (code) => {
    pipelineProcess = null;
    const success = code === 0;
    event.sender.send('pipeline-done', { success, code });
  });

  pipelineProcess.on('error', (err) => {
    pipelineProcess = null;
    event.sender.send('log-line', `ERROR  Failed to start pipeline: ${err.message}\n`);
    event.sender.send('pipeline-done', { success: false, code: -1 });
  });
});

// Open external links in the system browser (e.g. LinkedIn post URL)
app.on('web-contents-created', (_e, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
});
