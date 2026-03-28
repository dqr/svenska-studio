/**
 * transcode.js — Audio transcoding via FFmpeg.wasm
 *
 * Converts OGG (and other formats) to M4A (AAC) for best compatibility
 * with Apple devices (Mac, iPad, iPhone).
 *
 * Requires the server to send COOP/COEP headers (server.py handles this).
 * FFmpeg.wasm is loaded from CDN on first use and cached by the browser.
 *
 * TODO: Implement ffmpeg.wasm integration.
 *       The stub below shows the intended API surface.
 */

let ffmpegInstance = null;

/**
 * Load FFmpeg.wasm (once, cached after first load).
 * @param {function} onProgress - Optional callback(message)
 */
async function loadFFmpeg(onProgress) {
  if (ffmpegInstance) return ffmpegInstance;

  onProgress?.('Loading FFmpeg (first time only, ~30MB)…');

  // TODO: replace with actual ffmpeg.wasm import once CDN/package is chosen.
  // Options:
  //   A) ESM from CDN:  import { FFmpeg } from 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12/+esm'
  //   B) npm package:   npm install @ffmpeg/ffmpeg @ffmpeg/util
  //
  // Example implementation (option A):
  //
  // const { FFmpeg } = await import('https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12/+esm');
  // const { fetchFile, toBlobURL } = await import('https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12/+esm');
  // const ff = new FFmpeg();
  // await ff.load({
  //   coreURL: await toBlobURL('https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12/dist/esm/ffmpeg-core.js', 'text/javascript'),
  //   wasmURL: await toBlobURL('https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12/dist/esm/ffmpeg-core.wasm', 'application/wasm'),
  // });
  // ffmpegInstance = { ff, fetchFile };
  // return ffmpegInstance;

  throw new Error('FFmpeg.wasm not yet implemented — see transcode.js TODO');
}

/**
 * Transcode an audio File to M4A format.
 *
 * @param {File} inputFile - Source audio file (ogg, mp3, flac, wav, etc.)
 * @param {function} onProgress - Optional status callback(message)
 * @returns {Promise<File>} M4A File object ready for Whisper or the audio player
 */
export async function transcodeToM4A(inputFile, onProgress) {
  // If it's already M4A/AAC, return as-is
  if (inputFile.type === 'audio/mp4' || inputFile.name.endsWith('.m4a')) {
    onProgress?.('Audio is already M4A — skipping transcode');
    return inputFile;
  }

  onProgress?.(`Transcoding ${inputFile.name} → M4A…`);

  const { ff, fetchFile } = await loadFFmpeg(onProgress);

  const inputName = 'input' + getExtension(inputFile.name);
  const outputName = 'output.m4a';

  await ff.writeFile(inputName, await fetchFile(inputFile));
  await ff.exec([
    '-i', inputName,
    '-c:a', 'aac',
    '-b:a', '128k',
    '-movflags', '+faststart', // optimise for streaming/playback
    outputName,
  ]);

  const data = await ff.readFile(outputName);
  const outFile = new File(
    [data.buffer],
    inputFile.name.replace(/\.[^.]+$/, '.m4a'),
    { type: 'audio/mp4' }
  );

  // Clean up wasm virtual FS
  await ff.deleteFile(inputName);
  await ff.deleteFile(outputName);

  onProgress?.(`Transcoded to M4A (${(outFile.size / 1024 / 1024).toFixed(1)} MB)`);
  return outFile;
}

/** Returns whether the current environment supports FFmpeg.wasm (needs COOP/COEP). */
export function isTranscodeSupported() {
  return typeof SharedArrayBuffer !== 'undefined';
}

function getExtension(filename) {
  const m = filename.match(/\.[^.]+$/);
  return m ? m[0] : '';
}
