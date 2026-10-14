/**
 * SubSyncKit - Web Studio Client Logic
 */

let currentOffsetMs = 1500;
let currentCues = [];
let lastRepairedContent = '';

const sampleSrt = `1
00:00:01,200 --> 00:00:04,500
سلام به همه! به دوره برنامه‌نویسی خوش آمدید.

2
00:00:05,100 --> 00:00:08,800
امروز می‌خواهیم یک ابزار همگام‌ساز زیرنویس طراحی کنیم.

3
00:00:09,300 --> 00:00:13,200
تمام تایم‌کدها به صورت میلی‌ثانیه‌ای و دقیق محاسبه می‌شوند.

4
00:00:14,000 --> 00:00:18,500
حتی اگر فونت زیرنویس خرچنگ‌قورباغه باشد، خودکار به UTF-8 تبدیل می‌شود!`;

document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadSample();
});

function setupEventListeners() {
  const sourceInput = document.getElementById('sourceSrtInput');
  const offsetRange = document.getElementById('offsetRange');
  const offsetNumberInput = document.getElementById('offsetNumberInput');
  const speedSelect = document.getElementById('speedSelect');

  const btnApplyShift = document.getElementById('btnApplyShift');
  const btnFixEncoding = document.getElementById('btnFixEncoding');
  const btnDownloadSrt = document.getElementById('btnDownloadSrt');
  const btnLoadSample = document.getElementById('btnLoadSample');

  const fileInput = document.getElementById('fileInput');
  const btnUploadFile = document.getElementById('btnUploadFile');

  const tabCode = document.getElementById('tabOutputCode');
  const tabCards = document.getElementById('tabOutputCards');
  const outputCodeWrapper = document.getElementById('outputCodeWrapper');
  const outputCardsWrapper = document.getElementById('outputCardsWrapper');

  // Slider <-> Offset Input sync
  offsetRange.addEventListener('input', () => {
    currentOffsetMs = parseInt(offsetRange.value, 10);
    offsetNumberInput.value = formatOffsetString(currentOffsetMs);
    applyShift();
  });

  offsetNumberInput.addEventListener('change', () => {
    try {
      const parsed = parseOffsetString(offsetNumberInput.value);
      currentOffsetMs = parsed;
      offsetRange.value = parsed;
      applyShift();
    } catch {
      offsetNumberInput.value = formatOffsetString(currentOffsetMs);
    }
  });

  // Quick step buttons
  document.querySelectorAll('.step-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const step = parseInt(btn.dataset.step, 10);
      currentOffsetMs += step;
      offsetRange.value = currentOffsetMs;
      offsetNumberInput.value = formatOffsetString(currentOffsetMs);
      applyShift();
    });
  });

  speedSelect.addEventListener('change', () => {
    applyShift();
  });

  btnApplyShift.addEventListener('click', applyShift);
  btnFixEncoding.addEventListener('click', handleFixEncoding);
  btnLoadSample.addEventListener('click', loadSample);
  btnDownloadSrt.addEventListener('click', downloadOutputSrt);

  // File upload
  btnUploadFile.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', handleFileUpload);

  // Drag and drop into textarea
  sourceInput.addEventListener('dragover', e => { e.preventDefault(); });
  sourceInput.addEventListener('drop', e => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      readFile(e.dataTransfer.files[0]);
    }
  });

  // Source input change debounced
  sourceInput.addEventListener('input', debounce(() => {
    analyzeSource();
    applyShift();
  }, 300));

  // Tab switching
  tabCode.addEventListener('click', () => {
    tabCode.classList.add('active');
    tabCards.classList.remove('active');
    outputCodeWrapper.classList.remove('hidden');
    outputCardsWrapper.classList.add('hidden');
  });

  tabCards.addEventListener('click', () => {
    tabCards.classList.add('active');
    tabCode.classList.remove('active');
    outputCardsWrapper.classList.remove('hidden');
    outputCodeWrapper.classList.add('hidden');
    renderCueCards();
  });
}

function loadSample() {
  document.getElementById('sourceSrtInput').value = sampleSrt;
  analyzeSource();
  applyShift();
}

async function analyzeSource() {
  const srt = document.getElementById('sourceSrtInput').value.trim();
  if (!srt) return;

  try {
    const res = await fetch('/api/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ srt })
    });
    const data = await res.json();
    if (!data.success) return;

    document.getElementById('statCues').textContent = data.info.totalCues;
    document.getElementById('statDuration').textContent = data.info.durationFormatted;

    const encEl = document.getElementById('statEncoding');
    if (data.wasCorrupted) {
      encEl.textContent = 'Windows-1256 (نیازمند اصلاح)';
      encEl.className = 'text-amber';
    } else {
      encEl.textContent = 'UTF-8 سالم';
      encEl.className = 'text-green';
    }
  } catch (err) {
    console.error('Failed to analyze SRT:', err);
  }
}

async function applyShift() {
  const srt = document.getElementById('sourceSrtInput').value.trim();
  if (!srt) {
    document.getElementById('syncedSrtOutput').value = '';
    return;
  }

  const speedRatio = parseFloat(document.getElementById('speedSelect').value) || 1.0;

  try {
    const res = await fetch('/api/shift', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        srt,
        offset: currentOffsetMs,
        speedRatio
      })
    });

    const data = await res.json();
    if (!data.success) {
      alert(`خطا در همگام‌سازی: ${data.error}`);
      return;
    }

    document.getElementById('syncedSrtOutput').value = data.outputSrt;
    currentCues = data.cues || [];

    const shiftSign = data.appliedOffsetMs > 0 ? '+' : '';
    document.getElementById('statShift').textContent = `${shiftSign}${data.appliedOffsetMs}ms`;

    const tabCards = document.getElementById('tabOutputCards');
    if (tabCards.classList.contains('active')) {
      renderCueCards();
    }
  } catch (err) {
    console.error('Failed to shift SRT:', err);
  }
}

async function handleFixEncoding() {
  const srt = document.getElementById('sourceSrtInput').value;
  if (!srt) return;

  try {
    const res = await fetch('/api/fix-encoding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ srt })
    });
    const data = await res.json();
    if (!data.success) return;

    document.getElementById('sourceSrtInput').value = data.fixedSrt;
    analyzeSource();
    applyShift();
    alert('انکودینگ زیرنویس به UTF-8 استاندارد تبدیل شد.');
  } catch (err) {
    console.error('Failed to fix encoding:', err);
  }
}

function handleFileUpload(e) {
  const file = e.target.files && e.target.files[0];
  if (file) readFile(file);
}

function readFile(file) {
  const reader = new FileReader();
  reader.onload = evt => {
    document.getElementById('sourceSrtInput').value = evt.target.result;
    analyzeSource();
    applyShift();
  };
  reader.readAsText(file);
}

function renderCueCards() {
  const container = document.getElementById('outputCardsWrapper');
  container.innerHTML = '';

  if (!currentCues || currentCues.length === 0) {
    container.innerHTML = '<div style="color:var(--text-dim); text-align:center; padding:40px;">هیچ زیرنویسی برای نمایش وجود ندارد.</div>';
    return;
  }

  currentCues.forEach(cue => {
    const card = document.createElement('div');
    card.className = 'cue-card';

    const header = document.createElement('div');
    header.className = 'cue-card-header';

    const idSpan = document.createElement('span');
    idSpan.className = 'cue-id';
    idSpan.textContent = `#${cue.id}`;

    const tcSpan = document.createElement('span');
    tcSpan.className = 'cue-timecode';
    tcSpan.textContent = `${cue.startTimecode}  -->  ${cue.endTimecode}`;

    header.appendChild(idSpan);
    header.appendChild(tcSpan);

    const textDiv = document.createElement('div');
    textDiv.className = 'cue-text';
    textDiv.textContent = cue.text;

    card.appendChild(header);
    card.appendChild(textDiv);
    container.appendChild(card);
  });
}

function downloadOutputSrt() {
  const content = document.getElementById('syncedSrtOutput').value;
  if (!content) {
    alert('زیرنویسی برای دانلود وجود ندارد.');
    return;
  }

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `synced_subtitle_${currentOffsetMs > 0 ? '+' : ''}${currentOffsetMs}ms.srt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatOffsetString(ms) {
  const sign = ms > 0 ? '+' : (ms < 0 ? '-' : '');
  const abs = Math.abs(ms);
  if (abs >= 1000 && abs % 100 === 0) {
    return `${sign}${(abs / 1000).toFixed(1)}s`;
  }
  return `${sign}${abs}ms`;
}

function parseOffsetString(str) {
  const match = str.trim().match(/^([+-]?\d+(?:\.\d+)?)\s*(ms|s)?$/i);
  if (!match) throw new Error('Invalid format');
  const val = parseFloat(match[1]);
  const unit = (match[2] || 'ms').toLowerCase();
  return unit === 's' ? Math.round(val * 1000) : Math.round(val);
}

function debounce(fn, ms) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}
