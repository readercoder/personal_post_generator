// electron/preload.js
// ─────────────────────────────────────────────────────────────────────────────
// Secure context bridge — exposes exactly 3 safe APIs to the renderer.
// nodeIntegration is OFF; this is the only way to talk to main process.
// ─────────────────────────────────────────────────────────────────────────────

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  /** Trigger the LinkedIn pipeline */
  runPipeline: () => ipcRenderer.send('run-pipeline'),

  /** Receive a streamed log line from the pipeline's stdout */
  onLog: (callback) => {
    ipcRenderer.on('log-line', (_event, text) => callback(text));
  },

  /** Receive the final result (success/failure) when the pipeline exits */
  onDone: (callback) => {
    ipcRenderer.on('pipeline-done', (_event, result) => callback(result));
  },

  /** Remove all listeners (cleanup on re-run) */
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners('log-line');
    ipcRenderer.removeAllListeners('pipeline-done');
  },
});
