/*
  Bob — a frontend-only talking AI assistant powered by Pollinations.AI
  - Speech-to-Text: POST https://text.pollinations.ai/transcriptions with FormData(file, model='openai-audio')
  - Text Generation: GET https://text.pollinations.ai/{prompt}
  - Text-to-Speech: GET https://text.pollinations.ai/{text}?model=openai-audio&voice={voice}

  Notes:
  - Requires https (or localhost) for microphone access.
  - MediaRecorder generates webm/ogg blobs depending on browser.
  - No API keys required.
*/

const els = {
  recordBtn: document.getElementById('recordBtn'),
  status: document.getElementById('status'),
  transcript: document.getElementById('transcript'),
  response: document.getElementById('response'),
  log: document.getElementById('log'),
  voice: document.getElementById('voice'),
  systemPrompt: document.getElementById('systemPrompt'),
};

let mediaRecorder;
let chunks = [];
let recording = false;
let audioPlayer;

/* Utility */
function log(...args) {
  console.log(...args);
  els.log.textContent += args.map(a => typeof a === 'string' ? a : JSON.stringify(a, null, 2)).join(' ') + '\n';
}
function setStatus(msg) {
  els.status.textContent = msg;
}

async function startRecording() {
  if (recording) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunks = [];
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    mediaRecorder.onstop = onRecordingStop;
    mediaRecorder.start();
    recording = true;
    els.recordBtn.textContent = 'Stop Recording';
    els.recordBtn.classList.add('recording');
    setStatus('Recording…');
  } catch (e) {
    log('Mic error:', e);
    alert('Microphone permission is required.');
  }
}

function stopRecording() {
  if (!recording || !mediaRecorder) return;
  mediaRecorder.stop();
  // stop tracks
  mediaRecorder.stream.getTracks().forEach(t => t.stop());
  recording = false;
  els.recordBtn.textContent = 'Start Recording';
  els.recordBtn.classList.remove('recording');
  setStatus('Processing audio…');
}

async function onRecordingStop() {
  try {
    const blob = new Blob(chunks, { type: chunks[0]?.type || 'audio/webm' });
    await handleTranscriptionAndResponse(blob);
  } catch (e) {
    log('onRecordingStop error:', e);
    setStatus('Failed to process audio');
  }
}

els.recordBtn.addEventListener('click', () => {
  if (!recording) startRecording();
  else stopRecording();
});

/* Core flow */
async function handleTranscriptionAndResponse(audioBlob) {
  // 1) Transcribe speech
  const userText = await transcribeAudio(audioBlob);
  if (!userText) {
    setStatus('Transcription failed');
    return;
  }
  els.transcript.textContent = userText;
  setStatus('Thinking…');

  // 2) Generate response text
  const system = (els.systemPrompt.value || 'You are Bob, a friendly helpful assistant. Keep answers concise and speak clearly.').trim();
  const prompt = buildPrompt(system, userText);
  const reply = await generateText(prompt);
  if (!reply) {
    setStatus('Text generation failed');
    return;
  }
  els.response.textContent = reply;
  setStatus('Speaking…');

  // 3) Speak via TTS
  await speak(reply, els.voice.value || 'alloy');
  setStatus('Ready');
}

/* Pollinations APIs */
async function transcribeAudio(blob) {
  try {
    const formData = new FormData();
    const file = new File([blob], 'audio.webm', { type: blob.type || 'audio/webm' });
    formData.append('file', file);
    formData.append('model', 'openai-audio');

    const res = await fetch('https://text.pollinations.ai/transcriptions', {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      log('Transcription HTTP error', res.status, await safeText(res));
      return null;
    }
    const data = await res.json();
    log('Transcription:', data);
    return data.text || '';
  } catch (e) {
    log('Transcription error:', e);
    return null;
  }
}

function buildPrompt(system, userText) {
  // Use a simple instruction-style prompt for Pollinations text endpoint
  // Since we’re calling GET with text, keep it short but structured.
  const prompt = `${system}\n\nUser: ${userText}\nAssistant:`;
  return prompt;
}

async function generateText(prompt) {
  try {
    // Pollinations text endpoint returns a plain text completion for the prompt
    const url = 'https://text.pollinations.ai/' + encodeURIComponent(prompt);
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) {
      log('Text gen HTTP error', res.status, await safeText(res));
      return null;
    }
    const text = await res.text();
    log('Generated text:', text);
    // Sometimes completions include extra newlines; trim
    return text.trim();
  } catch (e) {
    log('Text generation error:', e);
    return null;
  }
}

async function speak(text, voice) {
  try {
    const ttsUrl = `https://text.pollinations.ai/${encodeURIComponent(text)}?model=openai-audio&voice=${encodeURIComponent(voice)}`;
    const res = await fetch(ttsUrl);
    if (!res.ok) {
      log('TTS HTTP error', res.status, await safeText(res));
      return;
    }
    const audioBlob = await res.blob();

    // Stop any current playback
    if (audioPlayer && !audioPlayer.paused) {
      audioPlayer.pause();
    }
    const audioUrl = URL.createObjectURL(audioBlob);
    audioPlayer = new Audio(audioUrl);
    await audioPlayer.play();
    audioPlayer.onended = () => {
      URL.revokeObjectURL(audioUrl);
    };
  } catch (e) {
    log('TTS error:', e);
  }
}

/* Helpers */
async function safeText(res) {
  try { return await res.text(); } catch { return ''; }
}
