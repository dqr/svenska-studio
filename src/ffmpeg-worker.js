/**
 * ffmpeg-worker.js — Same-origin proxy for the @ffmpeg/ffmpeg worker.
 *
 * This file is served from localhost (with COOP/COEP headers applied),
 * so the Worker it runs in is cross-origin isolated and has access to
 * SharedArrayBuffer. The actual FFmpeg worker logic is imported from CDN.
 *
 * Without this proxy, @ffmpeg/ffmpeg would create its Worker from the CDN
 * URL directly — that worker doesn't inherit COOP/COEP and Safari denies
 * SharedArrayBuffer inside it.
 */
import 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12/dist/esm/worker.js';
