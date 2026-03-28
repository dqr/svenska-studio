/**
 * transcribe.js — OpenAI Whisper transcription
 *
 * Sends an audio file to Whisper and returns verbose JSON
 * with per-segment timestamps.
 */

/**
 * @param {File} file - Audio file to transcribe
 * @param {string} apiKey - OpenAI API key
 * @param {function} onProgress - Optional callback(message) for status updates
 * @returns {Promise<Array>} Array of Whisper segment objects {start, end, text}
 */
export async function transcribe(file, apiKey, onProgress) {
  onProgress?.('Sending audio to Whisper…');

  const formData = new FormData();
  formData.append('file', file);
  formData.append('model', 'whisper-1');
  formData.append('language', 'sv');
  formData.append('response_format', 'verbose_json');
  formData.append('timestamp_granularities[]', 'segment');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Whisper API error ${res.status}`);
  }

  const data = await res.json();
  const segments = data.segments || [];
  onProgress?.(`Transcribed ${segments.length} segments`);
  return segments;
}
