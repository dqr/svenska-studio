/**
 * ui.js — DOM helpers, rendering, and tab management
 */

// ── Progress steps ──────────────────────────────────────────────────────────

export function setStep(id, state, text) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = 'step ' + state;
  const label = text || el.querySelector('span:last-child')?.textContent || '';
  if (state === 'active') {
    el.innerHTML = `<div class="spinner"></div><span>${label}</span>`;
  } else if (state === 'done') {
    el.innerHTML = `<span class="step-icon">✅</span><span>${label}</span>`;
  } else if (state === 'error') {
    el.innerHTML = `<span class="step-icon">❌</span><span>${label}</span>`;
  }
}

export function showError(message) {
  const el = document.getElementById('error-msg');
  if (!el) return;
  el.textContent = message;
  el.classList.add('active');
}

export function clearError() {
  document.getElementById('error-msg')?.classList.remove('active');
}

export function showSection(id) {
  document.getElementById(id)?.classList.add('active');
}

export function hideSection(id) {
  document.getElementById(id)?.classList.remove('active');
}

// ── Tab switching ───────────────────────────────────────────────────────────

const TAB_IDS = ['tab-synced', 'tab-bilingual', 'tab-vocab', 'tab-srt'];

export function showTab(id) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
  const idx = TAB_IDS.indexOf(id);
  if (idx >= 0) document.querySelectorAll('.tab')[idx]?.classList.add('active');
}

// ── Result rendering ────────────────────────────────────────────────────────

/**
 * Render all result panels from session data.
 *
 * @param {Array} segments       - Whisper segments
 * @param {Array<string>} translations - English translations
 * @param {Array} vocab          - Vocab items
 * @param {string} srtContent    - Pre-built SRT string
 * @param {function} seekToSeg   - Callback(startSeconds) for segment clicks
 */
export function renderResults(segments, translations, vocab, srtContent, seekToSeg) {
  renderSyncedTranscript(segments, translations, seekToSeg);
  renderBilingual(segments, translations);
  renderVocab(vocab);
  document.getElementById('result-srt').textContent = srtContent;
}

function renderSyncedTranscript(segments, translations, seekToSeg) {
  const container = document.getElementById('result-segments');
  container.innerHTML = '';
  segments.forEach((seg, i) => {
    const row = document.createElement('div');
    row.className = 'seg-row';
    row.dataset.idx = String(i);
    row.onclick = () => seekToSeg(seg.start);
    row.innerHTML = `
      <div class="seg-time">${fmtTimestamp(seg.start)}</div>
      <div class="seg-sv">${esc(seg.text.trim())}</div>
      <div class="seg-en">${esc(translations[i] || '')}</div>
    `;
    container.appendChild(row);
  });
}

function renderBilingual(segments, translations) {
  document.getElementById('result-sv').textContent =
    segments.map(s => s.text.trim()).join('\n');
  document.getElementById('result-en').textContent =
    translations.join('\n');
}

function renderVocab(vocab) {
  const container = document.getElementById('result-vocab');
  container.innerHTML = '';
  vocab.forEach(item => {
    const card = document.createElement('div');
    card.className = 'vocab-card';
    card.innerHTML = `
      <div class="vocab-sv">${esc(item.sv)}</div>
      <div class="vocab-pos">${esc(item.pos || '')}</div>
      <div class="vocab-en">${esc(item.en)}</div>
      ${item.example ? `<div class="vocab-example">${esc(item.example)}</div>` : ''}
    `;
    container.appendChild(card);
  });
}

// ── Upload UI ───────────────────────────────────────────────────────────────

export function showFilename(file) {
  document.getElementById('upload-filename').textContent =
    `📎 ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`;
}

export function updateProcessBtn(hasFile, hasKeys) {
  const btn = document.getElementById('process-btn');
  if (btn) btn.disabled = !(hasFile && hasKeys);
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtTimestamp(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return [h, m, sec].map(v => String(v).padStart(2, '0')).join(':');
}
