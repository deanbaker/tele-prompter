import './style.css';

/* -------------------------------------------------------------------------- */
/* Types & persistence                                                         */
/* -------------------------------------------------------------------------- */

type Settings = {
  speed: number;
  fontSize: number;
  eyeLine: number;
  mirror: boolean;
  dim: boolean;
  scriptText: string;
};

type SavedScript = {
  id: string;
  name: string;
  text: string;
  createdAt: number;
};

const SETTINGS_KEY = 'tp.settings.v1';
const SCRIPTS_KEY = 'tp.scripts.v1';

const defaultSettings: Settings = {
  speed: 60,
  fontSize: 42,
  eyeLine: 35,
  mirror: false,
  dim: true,
  scriptText:
    'Welcome to your teleprompter.\n\nTap the gear in the top-right to edit this script, or paste in your own.\n\nUse the play button to practice without recording, or the red button to record. Adjust speed and font size from settings until it feels right.\n\nThe red horizontal line is your eye-line — try to keep your gaze near it so you stay locked on the lens.',
};

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...defaultSettings };
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return { ...defaultSettings };
  }
}

function saveSettings(s: Settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

function loadScripts(): SavedScript[] {
  try {
    const raw = localStorage.getItem(SCRIPTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedScript[];
  } catch {
    return [];
  }
}

function saveScripts(scripts: SavedScript[]) {
  localStorage.setItem(SCRIPTS_KEY, JSON.stringify(scripts));
}

/* -------------------------------------------------------------------------- */
/* DOM lookup                                                                  */
/* -------------------------------------------------------------------------- */

const $ = <T extends HTMLElement>(sel: string): T => {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error(`Missing element: ${sel}`);
  return el;
};

const els = {
  preview: $<HTMLVideoElement>('#preview'),
  prompter: $<HTMLDivElement>('#prompter'),
  promptTrack: $<HTMLDivElement>('#prompter-track'),
  promptText: $<HTMLDivElement>('#prompter-text'),
  eyeLine: $<HTMLDivElement>('#prompter-eye-line'),

  settingsToggle: $<HTMLButtonElement>('#settings-toggle'),
  settingsClose: $<HTMLButtonElement>('#settings-close'),
  settingsPanel: $<HTMLElement>('#settings-panel'),

  scriptInput: $<HTMLTextAreaElement>('#script-input'),
  saveScript: $<HTMLButtonElement>('#save-script'),
  scriptLibrary: $<HTMLSelectElement>('#script-library'),
  deleteScript: $<HTMLButtonElement>('#delete-script'),

  speed: $<HTMLInputElement>('#speed'),
  speedVal: $<HTMLOutputElement>('#speed-val'),
  fontSize: $<HTMLInputElement>('#font-size'),
  fontVal: $<HTMLOutputElement>('#font-val'),
  eyeLineInput: $<HTMLInputElement>('#eye-line'),
  eyeVal: $<HTMLOutputElement>('#eye-val'),
  mirror: $<HTMLInputElement>('#mirror-toggle'),
  contrast: $<HTMLInputElement>('#contrast-toggle'),

  playToggle: $<HTMLButtonElement>('#play-toggle'),
  recordToggle: $<HTMLButtonElement>('#record-toggle'),
  flipCamera: $<HTMLButtonElement>('#flip-camera'),

  recIndicator: $<HTMLDivElement>('#rec-indicator'),
  recTime: $<HTMLSpanElement>('#rec-time'),

  postRecord: $<HTMLElement>('#post-record'),
  postClose: $<HTMLButtonElement>('#post-close'),
  playback: $<HTMLVideoElement>('#playback'),
  downloadLink: $<HTMLAnchorElement>('#download-link'),
  shareBtn: $<HTMLButtonElement>('#share-btn'),
  discardBtn: $<HTMLButtonElement>('#discard-btn'),
};

/* -------------------------------------------------------------------------- */
/* Settings application                                                        */
/* -------------------------------------------------------------------------- */

const settings = loadSettings();

function applySettingsToUI() {
  els.scriptInput.value = settings.scriptText;
  els.speed.value = String(settings.speed);
  els.speedVal.value = String(settings.speed);
  els.fontSize.value = String(settings.fontSize);
  els.fontVal.value = String(settings.fontSize);
  els.eyeLineInput.value = String(settings.eyeLine);
  els.eyeVal.value = String(settings.eyeLine);
  els.mirror.checked = settings.mirror;
  els.contrast.checked = settings.dim;

  applySettingsToStage();
}

function applySettingsToStage() {
  els.promptText.textContent = settings.scriptText;
  els.promptText.style.fontSize = `${settings.fontSize}px`;
  els.eyeLine.style.top = `${settings.eyeLine}%`;
  els.prompter.classList.toggle('mirror', settings.mirror);
  els.prompter.classList.toggle('dim', settings.dim);
}

function persist() {
  saveSettings(settings);
}

/* -------------------------------------------------------------------------- */
/* Script library                                                              */
/* -------------------------------------------------------------------------- */

function refreshLibrary() {
  const scripts = loadScripts();
  const select = els.scriptLibrary;
  select.innerHTML = '<option value="">— saved scripts —</option>';
  for (const s of scripts) {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.name;
    select.appendChild(opt);
  }
}

els.saveScript.addEventListener('click', () => {
  const text = els.scriptInput.value.trim();
  if (!text) return;
  const firstLine = text.split('\n', 1)[0].slice(0, 60) || 'Untitled';
  const name = prompt('Save script as:', firstLine);
  if (!name) return;
  const scripts = loadScripts();
  scripts.unshift({ id: crypto.randomUUID(), name, text, createdAt: Date.now() });
  saveScripts(scripts);
  refreshLibrary();
});

els.scriptLibrary.addEventListener('change', () => {
  const id = els.scriptLibrary.value;
  if (!id) return;
  const script = loadScripts().find((s) => s.id === id);
  if (!script) return;
  els.scriptInput.value = script.text;
  settings.scriptText = script.text;
  applySettingsToStage();
  persist();
});

els.deleteScript.addEventListener('click', () => {
  const id = els.scriptLibrary.value;
  if (!id) return;
  if (!confirm('Delete this saved script?')) return;
  saveScripts(loadScripts().filter((s) => s.id !== id));
  refreshLibrary();
});

/* -------------------------------------------------------------------------- */
/* Settings input wiring                                                       */
/* -------------------------------------------------------------------------- */

els.scriptInput.addEventListener('input', () => {
  settings.scriptText = els.scriptInput.value;
  applySettingsToStage();
  resetPrompter();
  persist();
});

els.speed.addEventListener('input', () => {
  settings.speed = Number(els.speed.value);
  els.speedVal.value = String(settings.speed);
  persist();
});

els.fontSize.addEventListener('input', () => {
  settings.fontSize = Number(els.fontSize.value);
  els.fontVal.value = String(settings.fontSize);
  els.promptText.style.fontSize = `${settings.fontSize}px`;
  persist();
});

els.eyeLineInput.addEventListener('input', () => {
  settings.eyeLine = Number(els.eyeLineInput.value);
  els.eyeVal.value = String(settings.eyeLine);
  els.eyeLine.style.top = `${settings.eyeLine}%`;
  persist();
});

els.mirror.addEventListener('change', () => {
  settings.mirror = els.mirror.checked;
  els.prompter.classList.toggle('mirror', settings.mirror);
  persist();
});

els.contrast.addEventListener('change', () => {
  settings.dim = els.contrast.checked;
  els.prompter.classList.toggle('dim', settings.dim);
  persist();
});

/* -------------------------------------------------------------------------- */
/* Settings panel open/close                                                   */
/* -------------------------------------------------------------------------- */

els.settingsToggle.addEventListener('click', () => {
  els.settingsPanel.hidden = false;
});
els.settingsClose.addEventListener('click', () => {
  els.settingsPanel.hidden = true;
});

/* -------------------------------------------------------------------------- */
/* Camera                                                                      */
/* -------------------------------------------------------------------------- */

let currentStream: MediaStream | null = null;
let facing: 'user' | 'environment' = 'user';

async function startCamera() {
  stopCamera();

  if (!navigator.mediaDevices?.getUserMedia) {
    const isSecure = window.isSecureContext;
    alert(
      isSecure
        ? "This browser doesn't support camera access."
        : `Camera APIs are disabled on insecure origins.\n\nYou're on: ${location.protocol}//${location.host}\n\nOpen the site over https:// (or via localhost) and reload.`,
    );
    return;
  }

  try {
    currentStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: facing,
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: true,
    });
    els.preview.srcObject = currentStream;
    els.preview.classList.toggle('rear', facing === 'environment');
  } catch (err) {
    console.error('Camera error', err);
    alert(
      `Couldn't access the camera: ${(err as Error).message}\n\nMake sure you've granted camera + mic permission in the browser settings.`,
    );
  }
}

function stopCamera() {
  if (!currentStream) return;
  for (const track of currentStream.getTracks()) track.stop();
  currentStream = null;
}

els.flipCamera.addEventListener('click', async () => {
  facing = facing === 'user' ? 'environment' : 'user';
  await startCamera();
});

/* -------------------------------------------------------------------------- */
/* Prompter scroll loop                                                        */
/* -------------------------------------------------------------------------- */

let scrolling = false;
let scrollPos = 0; // negative as it scrolls up
let lastTs = 0;

function resetPrompter() {
  scrollPos = 0;
  els.promptText.style.transform = 'translateY(0px)';
}

function startPrompter() {
  if (scrolling) return;
  scrolling = true;
  els.playToggle.classList.add('active');
  els.playToggle.textContent = '❚❚';
  lastTs = performance.now();
  requestAnimationFrame(tick);
}

function pausePrompter() {
  scrolling = false;
  els.playToggle.classList.remove('active');
  els.playToggle.textContent = '▶︎';
}

function tick(ts: number) {
  if (!scrolling) return;
  const dt = (ts - lastTs) / 1000;
  lastTs = ts;
  scrollPos -= settings.speed * dt;

  // Stop when the bottom of the text has scrolled past the top of the track.
  const textHeight = els.promptText.getBoundingClientRect().height;
  const trackHeight = els.promptTrack.getBoundingClientRect().height;
  const limit = -(textHeight + trackHeight * 0.5);
  if (scrollPos < limit) {
    pausePrompter();
    return;
  }

  els.promptText.style.transform = `translateY(${scrollPos}px)`;
  requestAnimationFrame(tick);
}

els.playToggle.addEventListener('click', () => {
  if (scrolling) pausePrompter();
  else startPrompter();
});

// Tap on the camera area to pause/resume the prompter (but not on controls).
els.prompter.addEventListener('click', () => {
  // pointer-events: none on #prompter, so this never fires — handled via stage instead.
});
$<HTMLElement>('#stage').addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  if (target.closest('button, a, #settings-panel, #post-record')) return;
  if (scrolling) pausePrompter();
  else startPrompter();
});

/* -------------------------------------------------------------------------- */
/* Recording                                                                   */
/* -------------------------------------------------------------------------- */

let recorder: MediaRecorder | null = null;
let recordedChunks: Blob[] = [];
let recordedMimeType = '';
let recStartTs = 0;
let recTimerId: number | null = null;

function pickMimeType(): string {
  const candidates = [
    'video/mp4;codecs=avc1,mp4a',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c)) return c;
  }
  return '';
}

async function startRecording() {
  if (!currentStream) {
    alert('Camera not ready yet.');
    return;
  }
  const mimeType = pickMimeType();
  try {
    recorder = mimeType
      ? new MediaRecorder(currentStream, { mimeType })
      : new MediaRecorder(currentStream);
  } catch (err) {
    alert(`Couldn't start recorder: ${(err as Error).message}`);
    return;
  }
  recordedMimeType = recorder.mimeType || mimeType || 'video/mp4';
  recordedChunks = [];

  recorder.addEventListener('dataavailable', (e) => {
    if (e.data && e.data.size > 0) recordedChunks.push(e.data);
  });
  recorder.addEventListener('stop', onRecorderStop);

  recorder.start(1000);
  recStartTs = performance.now();
  els.recIndicator.hidden = false;
  els.recordToggle.classList.add('active');
  recTimerId = window.setInterval(updateRecTime, 250);
  acquireWakeLock();
  startPrompter();
}

function updateRecTime() {
  const secs = Math.floor((performance.now() - recStartTs) / 1000);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  els.recTime.textContent = `${m}:${String(s).padStart(2, '0')}`;
}

function stopRecording() {
  if (!recorder) return;
  recorder.stop();
  els.recIndicator.hidden = true;
  els.recordToggle.classList.remove('active');
  if (recTimerId !== null) {
    clearInterval(recTimerId);
    recTimerId = null;
  }
  releaseWakeLock();
  pausePrompter();
}

function onRecorderStop() {
  const blob = new Blob(recordedChunks, { type: recordedMimeType });
  const url = URL.createObjectURL(blob);
  els.playback.src = url;

  const ext = recordedMimeType.includes('webm') ? 'webm' : 'mp4';
  const filename = `prompter-${new Date().toISOString().replace(/[:.]/g, '-')}.${ext}`;
  els.downloadLink.href = url;
  els.downloadLink.download = filename;

  // Web Share with files (iOS Safari supports this for mp4)
  const file = new File([blob], filename, { type: recordedMimeType });
  const canShareFiles =
    typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
  els.shareBtn.hidden = !canShareFiles;
  els.shareBtn.onclick = canShareFiles
    ? () => navigator.share({ files: [file], title: 'Prompter recording' }).catch(() => {})
    : null;

  els.discardBtn.onclick = () => {
    URL.revokeObjectURL(url);
    els.playback.removeAttribute('src');
    els.playback.load();
    els.postRecord.hidden = true;
  };

  els.postRecord.hidden = false;
}

els.recordToggle.addEventListener('click', () => {
  if (recorder && recorder.state === 'recording') stopRecording();
  else startRecording();
});

els.postClose.addEventListener('click', () => {
  els.postRecord.hidden = true;
});

/* -------------------------------------------------------------------------- */
/* Wake Lock                                                                   */
/* -------------------------------------------------------------------------- */

let wakeLock: WakeLockSentinel | null = null;

async function acquireWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
    }
  } catch (err) {
    console.warn('Wake lock failed', err);
  }
}

async function releaseWakeLock() {
  try {
    await wakeLock?.release();
  } catch {
    /* ignore */
  }
  wakeLock = null;
}

document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible' && recorder?.state === 'recording') {
    await acquireWakeLock();
  }
});

/* -------------------------------------------------------------------------- */
/* Boot                                                                        */
/* -------------------------------------------------------------------------- */

async function boot() {
  applySettingsToUI();
  refreshLibrary();

  // iOS requires a user gesture to start camera/mic. If permissions were already granted,
  // this will resolve quickly. Otherwise, we surface the settings panel so the user can tap.
  try {
    await startCamera();
  } catch {
    /* handled in startCamera */
  }
}

boot();
