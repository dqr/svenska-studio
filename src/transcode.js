/**
 * transcode.js — Audio transcoding via FFmpeg.wasm
 *
 * Converts OGG (and other formats) to M4A (AAC) for best compatibility
 * with Apple devices (Mac, iPad, iPhone).
 *
 * Loads @ffmpeg/ffmpeg from node_modules (same-origin), so the Worker
 * URL resolves to localhost and inherits cross-origin isolation — giving
 * the Worker SharedArrayBuffer access without any CDN/CORP gymnastics.
 *
 * Prerequisites:
 *   npm install @ffmpeg/ffmpeg@0.12 @ffmpeg/core@0.12
 */

let ffmpegInstance = null;

async function loadFFmpeg(onProgress) {
  if (ffmpegInstance) return ffmpegInstance;

  onProgress?.('Loading FFmpeg (first time only, ~30MB)…');

  // Import from node_modules served by localhost — same-origin, so the
  // library's own ./worker.js resolves to localhost too, inheriting
  // COOP/COEP headers and thus SharedArrayBuffer access.
  const { FFmpeg } = await import('/node_modules/@ffmpeg/ffmpeg/dist/esm/index.js');

  const ff = new FFmpeg();

  ff.on('log', ({ message }) => console.debug('[ffmpeg]', message));

  onProgress?.('Loading FFmpeg core (WASM)…');

  await ff.load({
    coreURL: '/node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.js',
    wasmURL: '/node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.wasm',
  });

  ffmpegInstance = { ff };
  return ffmpegInstance;
}

/**
 * Transcode an audio File to M4A format.
 *
 * @param {File} inputFile - Source audio file (ogg, mp3, flac, wav, etc.)
 * @param {function} onProgress - Optional status callback(message)
 * @returns {Promise<File>} M4A File object ready for Whisper or the audio player
 */
export async function transcodeToM4A(inputFile, onProgress) {
  console.log('[transcode] transcodeToM4A called', {
    name: inputFile.name,
    type: inputFile.type,
    size: inputFile.size,
  });

  if (inputFile.type === 'audio/mp4' || inputFile.name.endsWith('.m4a')) {
    console.log('[transcode] early return — already M4A');
    onProgress?.('Audio is already M4A — skipping transcode');
    return inputFile;
  }

  onProgress?.(`Transcoding ${inputFile.name} → M4A…`);

  const { ff } = await loadFFmpeg(onProgress);
  console.log('[transcode] FFmpeg loaded, starting exec');

  const inputName = 'input' + getExtension(inputFile.name);
  const outputName = 'output.m4a';

  await ff.writeFile(inputName, new Uint8Array(await inputFile.arrayBuffer()));
  await ff.exec(['-i', inputName, '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', outputName]);

  const data = await ff.readFile(outputName);
  const outFile = new File(
    [data.buffer],
    inputFile.name.replace(/\.[^.]+$/, '.m4a'),
    { type: 'audio/mp4' }
  );

  await ff.deleteFile(inputName);
  await ff.deleteFile(outputName);

  console.log('[transcode] done', { name: outFile.name, type: outFile.type, size: outFile.size });
  onProgress?.(`Transcoded to M4A (${(outFile.size / 1024 / 1024).toFixed(1)} MB)`);
  return outFile;
}

/** Transcoding needs SharedArrayBuffer (provided by COOP+COEP via server.py). */
export function isTranscodeSupported() {
  return typeof SharedArrayBuffer !== 'undefined';
}

function getExtension(filename) {
  const m = filename.match(/\.[^.]+$/);
  return m ? m[0] : '';
}
