# Bob – Talking AI Assistant (Pollinations.AI)

This is a minimal, frontend-only assistant named **Bob**. It:
- Records your voice in the browser
- Sends audio to Pollinations.AI for transcription (Speech-to-Text)
- Generates a textual reply using Pollinations text endpoint
- Speaks the reply using Pollinations Text-to-Speech

No API keys required.

## Live Demo (Local)

1) Serve the `bob` folder over HTTPS or `http://localhost` (microphone requires secure context).
- Easiest: use VS Code Live Server or Python.

Python:
```bash
cd bob
python3 -m http.server 8000
# open http://localhost:8000
```

2) Click “Start Recording”, speak, then stop. You’ll see your transcription, Bob’s response, and hear the TTS.

Notes:
- On first use, the browser will prompt for microphone permission.
- Some browsers export WebM or Ogg audio via MediaRecorder; Pollinations accepts the upload via multipart form data.

## Project Structure

```
bob/
  index.html    # UI and layout
  style.css     # basic styles
  script.js     # client-side logic: record -> transcribe -> generate -> TTS
```

## Pollinations.AI Endpoints Used

- Text-to-Speech:
  ```
  GET https://text.pollinations.ai/{TEXT}?model=openai-audio&voice={VOICE}
  ```
- Speech-to-Text (Transcriptions):
  ```
  POST https://text.pollinations.ai/transcriptions
  body: FormData(file, model='openai-audio')
  ```
- Text Generation:
  ```
  GET https://text.pollinations.ai/{PROMPT}
  ```

## Create a new repository called "bob"

Since this code currently lives inside another repository, here are two simple options:

Option A: Create a brand-new repo and copy the folder
1. On GitHub, create a new repository named `bob` (no template needed).
2. Locally:
   ```bash
   git clone YOUR_EXISTING_REPO_URL digi
   cd digi
   cd bob
   git init
   git add .
   git commit -m "Initial commit: Bob talking assistant"
   git branch -M main
   git remote add origin YOUR_NEW_BOB_REPO_URL
   git push -u origin main
   ```
3. Enable GitHub Pages (optional) to host `bob/` as a static site.

Option B: Export only the bob folder from this repo
1. Download the `bob` folder as a ZIP and upload into a new GitHub repo named `bob`.
2. Or, from the command line:
   ```bash
   mkdir /tmp/bob-new
   cp -R bob/* /tmp/bob-new
   cd /tmp/bob-new
   git init
   git add .
   git commit -m "Initial commit: Bob talking assistant"
   git branch -M main
   git remote add origin YOUR_NEW_BOB_REPO_URL
   git push -u origin main
   ```

## Customization

- Change the TTS voice using the dropdown (e.g., `alloy`, `verse`, `aria`, `ballad`).
- Edit the system prompt in the UI for Bob’s tone/behavior.
- Modify `buildPrompt` in `script.js` to control how user input is sent to the text generator.

## Troubleshooting

- Microphone blocked: Ensure site is served via HTTPS or `http://localhost` and grant mic permissions.
- CORS/network issues: Check browser console and network tab. Pollinations endpoints are public but may rate-limit.
- No audio playback: Some browsers require user interaction before playing audio; clicking the page first often helps.

---
This app strictly follows the example Pollinations code snippets:
- TTS via `GET /{TEXT}?model=openai-audio&voice=...`
- STT via `POST /transcriptions` with FormData and `model='openai-audio'`
