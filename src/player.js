/**
 * player.js — Audio player and transcript sync
 *
 * Manages the custom audio player UI, seek bar, playback speed,
 * and real-time highlighting of the active transcript segment.
 */

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
let speedIdx = 2;
let audioObjectURL = null;
let lastActiveIdx = -1;

// Exposed so other modules can read current segments
export let whisperSegments = [];

export function setSegments(segs) {
  whisperSegments = segs;
  lastActiveIdx = -1;
}

/** Mount a File object into the audio element and update the player UI. */
export function mountAudio(file) {
  const audioEl = document.getElementById('audio-el');
  if (audioObjectURL) URL.revokeObjectURL(audioObjectURL);
  audioObjectURL = URL.createObjectURL(file);
  audioEl.src = audioObjectURL;
  audioEl.load();
  document.getElementById('player-filename').textContent = file.name;
  document.getElementById('play-btn').textContent = '▶';
}

export function initPlayer() {
  const audioEl = document.getElementById('audio-el');

  audioEl.addEventListener('timeupdate', () => {
    updateSeekBar(audioEl);
    highlightActiveSeg(audioEl.currentTime);
  });

  audioEl.addEventListener('durationchange', () => updateSeekBar(audioEl));

  audioEl.addEventListener('ended', () => {
    document.getElementById('play-btn').textContent = '▶';
  });

  document.getElementById('seek-bar').addEventListener('click', (e) => {
    const bar = document.getElementById('seek-bar');
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (audioEl.duration) audioEl.currentTime = pct * audioEl.duration;
  });
}

export function togglePlay() {
  const audioEl = document.getElementById('audio-el');
  const btn = document.getElementById('play-btn');
  if (audioEl.paused) {
    audioEl.play();
    btn.textContent = '⏸';
  } else {
    audioEl.pause();
    btn.textContent = '▶';
  }
}

export function cycleSpeed() {
  speedIdx = (speedIdx + 1) % SPEEDS.length;
  document.getElementById('audio-el').playbackRate = SPEEDS[speedIdx];
  document.getElementById('speed-btn').textContent = SPEEDS[speedIdx] + '×';
}

export function seekToSeg(start) {
  const audioEl = document.getElementById('audio-el');
  audioEl.currentTime = start;
  if (audioEl.paused) {
    audioEl.play();
    document.getElementById('play-btn').textContent = '⏸';
  }
}

// ── Internal helpers ────────────────────────────────────────────────────────

function updateSeekBar(audioEl) {
  const dur = audioEl.duration || 0;
  const cur = audioEl.currentTime || 0;
  const pct = dur ? (cur / dur) * 100 : 0;
  document.getElementById('seek-fill').style.width = pct + '%';
  document.getElementById('seek-thumb').style.left = pct + '%';
  document.getElementById('player-time').textContent =
    `${fmtTime(cur)} / ${fmtTime(dur)}`;
}

function highlightActiveSeg(currentTime) {
  let idx = -1;
  for (let i = 0; i < whisperSegments.length; i++) {
    if (currentTime >= whisperSegments[i].start && currentTime < whisperSegments[i].end) {
      idx = i; break;
    }
  }
  if (idx === lastActiveIdx) return;
  lastActiveIdx = idx;
  document.querySelectorAll('.seg-row').forEach((el, i) => {
    el.classList.toggle('active-seg', i === idx);
  });
  if (idx >= 0) {
    const el = document.querySelectorAll('.seg-row')[idx];
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

export function fmtTime(s) {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export function fmtTimestamp(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return [h, m, sec].map(v => String(v).padStart(2, '0')).join(':');
}

export function srtTime(s) {
  const ms = Math.floor((s % 1) * 1000);
  return fmtTimestamp(s) + ',' + String(ms).padStart(3, '0');
}
