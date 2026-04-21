// electron/renderer/app.js
// ─────────────────────────────────────────────────────────────────────────────
// Renderer-side logic: handles button click, streams logs, animates step dots.
// Communicates with main process exclusively via window.api (contextBridge).
// ─────────────────────────────────────────────────────────────────────────────

/* ── DOM refs ──────────────────────────────────────────────────────────────── */
const publishBtn   = document.getElementById('publish-btn');
const clearBtn     = document.getElementById('clear-btn');
const statusText   = document.getElementById('status-text');
const logPanel     = document.getElementById('log-panel');
const logEmpty     = document.getElementById('log-empty');
const logDot       = document.getElementById('log-dot');
const resultBanner = document.getElementById('result-banner');
const headerBadge  = document.getElementById('header-badge');

const TOTAL_STEPS  = 7;
const stepDots     = Array.from({ length: TOTAL_STEPS }, (_, i) => document.getElementById(`step-dot-${i}`));
const stepItems    = Array.from({ length: TOTAL_STEPS }, (_, i) => document.getElementById(`step-item-${i}`));
const stepConns    = Array.from({ length: TOTAL_STEPS - 1 }, (_, i) => document.getElementById(`step-conn-${i}`));

/* ── State ─────────────────────────────────────────────────────────────────── */
let running = false;

/* ── Step detection patterns ───────────────────────────────────────────────── */
// Match pino-pretty output: "STEP N ▶" or "STEP N â–¶" (various encodings)
const STEP_PATTERNS = [
  /STEP\s+1\s*[▶â–¶>]/,
  /STEP\s+2\s*[▶â–¶>]/,
  /STEP\s+3\s*[▶â–¶>]/,
  /STEP\s+4\s*[▶â–¶>]/,
  /STEP\s+5\s*[▶â–¶>]/,
  /STEP\s+6\s*[▶â–¶>]/,
  /STEP\s+7\s*[▶â–¶>]/,
];

/* ── Log line classifier ───────────────────────────────────────────────────── */
function classifyLine(line) {
  if (!line.trim()) return null;
  if (/ERROR/.test(line) || /❌|ΓòÉ/.test(line))               return 'log-error';
  if (/WARN/.test(line)  || /🟡/.test(line))                   return 'log-warn';
  if (/✅|🎉|COMPLETE|SUCCESS/.test(line))                      return 'log-success';
  if (/━━━|STEP\s+\d/.test(line))                              return 'log-step';
  if (/╔|╚|║|╗|╝/.test(line))                                  return 'log-box';
  if (/INFO/.test(line))                                        return 'log-info';
  return 'log-info';
}

/* ── Step activation ───────────────────────────────────────────────────────── */
function activateStep(idx) {
  stepDots.forEach((dot, i) => {
    dot.classList.remove('active', 'done');
    stepItems[i].classList.remove('active', 'done');
    if (i < idx) {
      dot.classList.add('done');
      stepItems[i].classList.add('done');
      if (stepConns[i]) stepConns[i].classList.add('done');
    } else if (i === idx) {
      dot.classList.add('active');
      stepItems[i].classList.add('active');
    }
  });
}

function completeAllSteps() {
  stepDots.forEach((dot, i) => {
    dot.classList.remove('active');
    dot.classList.add('done');
    stepItems[i].classList.add('done');
    if (stepConns[i]) stepConns[i].classList.add('done');
  });
}

function resetSteps() {
  stepDots.forEach((dot, i) => {
    dot.classList.remove('active', 'done');
    stepItems[i].classList.remove('active', 'done');
    if (stepConns[i]) stepConns[i].classList.remove('done');
  });
}

/* ── Log appender ──────────────────────────────────────────────────────────── */
function appendLog(raw) {
  const lines = raw.split('\n');

  lines.forEach(line => {
    if (!line.trim()) return;

    // Hide the empty placeholder on first real line
    if (logEmpty && logEmpty.parentNode) logEmpty.remove();

    const cls  = classifyLine(line);
    const div  = document.createElement('div');
    div.className = `log-line ${cls || 'log-info'}`;
    div.textContent = line;
    logPanel.appendChild(div);

    // Step detection
    STEP_PATTERNS.forEach((pattern, idx) => {
      if (pattern.test(line)) activateStep(idx);
    });
  });

  // Auto-scroll to bottom
  logPanel.scrollTop = logPanel.scrollHeight;
}

/* ── Button click ──────────────────────────────────────────────────────────── */
publishBtn.addEventListener('click', () => {
  if (running) return;
  running = true;

  // Reset UI
  logPanel.innerHTML = '';
  const emptyPlaceholder = document.createElement('div');
  emptyPlaceholder.id = 'log-empty';
  emptyPlaceholder.className = 'log-empty';
  emptyPlaceholder.textContent = 'Starting pipeline…';
  logPanel.appendChild(emptyPlaceholder);

  resultBanner.className = 'result-banner';
  resultBanner.innerHTML = '';
  resetSteps();

  publishBtn.disabled = true;
  publishBtn.classList.add('loading');
  publishBtn.querySelector('.btn-icon').textContent = '⏳';
  statusText.textContent = 'Pipeline running…';
  headerBadge.textContent = 'Running';
  logDot.classList.add('live');

  // Re-register IPC listeners fresh each run
  window.api.removeAllListeners();

  window.api.onLog((text) => {
    appendLog(text);
  });

  window.api.onDone((result) => {
    running = false;

    publishBtn.disabled = false;
    publishBtn.classList.remove('loading');
    publishBtn.querySelector('.btn-icon').textContent = '🚀';
    logDot.classList.remove('live');

    if (result.success) {
      statusText.textContent = 'Done! Post published successfully.';
      headerBadge.textContent = 'Success';
      completeAllSteps();

      resultBanner.className = 'result-banner success';
      resultBanner.innerHTML = '✅ &nbsp;Post published to LinkedIn successfully!';
    } else {
      statusText.textContent = 'Pipeline failed — see log for details.';
      headerBadge.textContent = 'Failed';

      resultBanner.className = 'result-banner error';
      resultBanner.innerHTML = '❌ &nbsp;Pipeline failed. Check the log above for the error.';
    }
  });

  window.api.runPipeline();
});

/* ── Clear button ──────────────────────────────────────────────────────────── */
clearBtn.addEventListener('click', () => {
  if (running) return; // Don't clear while running
  logPanel.innerHTML = '';
  const empty = document.createElement('div');
  empty.id = 'log-empty';
  empty.className = 'log-empty';
  empty.textContent = 'Log cleared. Click "Publish Next Post" to run again.';
  logPanel.appendChild(empty);
  resultBanner.className = 'result-banner';
  resultBanner.innerHTML = '';
  resetSteps();
  statusText.textContent = 'Click to fetch the next post from Google Sheets and publish it.';
  headerBadge.textContent = 'Ready';
});
