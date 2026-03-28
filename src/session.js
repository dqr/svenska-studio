/**
 * session.js — Save and load .svenska session files
 *
 * A .svenska file is a JSON blob containing:
 *   - whisperSegments   (Whisper verbose_json segments)
 *   - segmentTranslations (parallel array of English strings)
 *   - vocabItems        (array of {sv, en, pos, example})
 *   - srtContent        (pre-built SRT string)
 *   - audioName/Mime/B64 (the original audio file embedded as base64)
 */

const SESSION_VERSION = 1;

/**
 * Save a session to a .svenska file download.
 *
 * @param {object} session - { whisperSegments, segmentTranslations, vocabItems, srtContent }
 * @param {File|null} audioFile - The original audio file to embed
 */
export async function saveSession(session, audioFile) {
  let audioB64 = null, audioMime = null, audioName = null;

  if (audioFile) {
    audioMime = audioFile.type || 'audio/ogg';
    audioName = audioFile.name;
    audioB64 = await fileToBase64(audioFile);
  }

  const payload = {
    version: SESSION_VERSION,
    savedAt: new Date().toISOString(),
    audioName,
    audioMime,
    audioB64,
    ...session,
  };

  const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
  const a = document.createElement('a');
  const stem = (audioName || 'session').replace(/\.[^.]+$/, '');
  a.href = URL.createObjectURL(blob);
  a.download = stem + '.svenska';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}

/**
 * Load a .svenska session file.
 *
 * @param {File} file - The .svenska file to load
 * @returns {Promise<{session: object, audioFile: File|null}>}
 */
export async function loadSession(file) {
  const text = await file.text();
  const payload = JSON.parse(text);

  if (!payload.whisperSegments) {
    throw new Error('Invalid .svenska file — missing whisperSegments');
  }

  const session = {
    whisperSegments: payload.whisperSegments,
    segmentTranslations: payload.segmentTranslations || [],
    vocabItems: payload.vocabItems || [],
    srtContent: payload.srtContent || '',
  };

  let audioFile = null;
  if (payload.audioB64) {
    const bytes = Uint8Array.from(atob(payload.audioB64), c => c.charCodeAt(0));
    audioFile = new File(
      [bytes],
      payload.audioName || 'audio.ogg',
      { type: payload.audioMime || 'audio/ogg' }
    );
  }

  return { session, audioFile };
}

/**
 * Build a bilingual SRT string from segments and translations.
 *
 * @param {Array} segments - Whisper segments
 * @param {Array<string>} translations - Parallel English translations
 * @returns {string}
 */
export function buildSrt(segments, translations) {
  const lines = [];
  segments.forEach((seg, i) => {
    lines.push(String(i + 1));
    lines.push(`${srtTime(seg.start)} --> ${srtTime(seg.end)}`);
    lines.push(seg.text.trim());
    if (translations[i]) lines.push(translations[i]);
    lines.push('');
  });
  return lines.join('\n');
}

/**
 * Download a string as a .srt file.
 *
 * @param {string} srtContent
 * @param {string} baseName - Filename without extension
 */
export function downloadSrt(srtContent, baseName) {
  const blob = new Blob([srtContent], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (baseName || 'lesson') + '.srt';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}

// ── Internal ────────────────────────────────────────────────────────────────

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function fmtTimestamp(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return [h, m, sec].map(v => String(v).padStart(2, '0')).join(':');
}

function srtTime(s) {
  const ms = Math.floor((s % 1) * 1000);
  return fmtTimestamp(s) + ',' + String(ms).padStart(3, '0');
}
