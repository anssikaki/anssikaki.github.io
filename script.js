const videoInput   = document.getElementById('video-input');
const uploadLabel  = document.getElementById('upload-label');
const videoPlayer  = document.getElementById('video-player');
const statusEl     = document.getElementById('status');
const summaryCard  = document.getElementById('summary-card');
const summaryText  = document.getElementById('summary-text');
const resetBtn     = document.getElementById('reset-btn');

const ENDPOINT = 'https://anssi-openai-gateway.azurewebsites.net/api/http_trigger';
const HEADERS = {
  'Content-Type': 'application/json',
  'x-api-key': 'qQGNldzEhrEKBq8v4HRBRs2eKRgVu27h'
};

videoInput.addEventListener('change', async () => {
  const file = videoInput.files[0];
  if (!file) return;

  statusEl.textContent = 'Loading video...';
  statusEl.classList.remove('hidden');
  statusEl.classList.remove('error');

  const url = URL.createObjectURL(file);
  videoPlayer.src = url;
  videoPlayer.load();
  await new Promise(resolve => {
    videoPlayer.onloadedmetadata = resolve;
  });

  try {
    await processVideo();
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Error processing video.';
    statusEl.classList.add('error');
  }
});

async function processVideo() {
  const duration = Math.min(videoPlayer.duration, 30);
  const frameCount = Math.floor(duration);
  const canvas = document.createElement('canvas');
  canvas.width = videoPlayer.videoWidth;
  canvas.height = videoPlayer.videoHeight;
  const ctx = canvas.getContext('2d');
  const descriptions = [];

  statusEl.classList.remove('hidden');

  for (let t = 0; t < frameCount; t++) {
    statusEl.textContent = `Analyzing frame ${t + 1} of ${frameCount}...`;
    await seek(t);
    ctx.drawImage(videoPlayer, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');
    try {
      const desc = await analyzeFrame(dataUrl);
      descriptions.push(desc);
    } catch (err) {
      console.error(err);
      statusEl.textContent = 'Error analyzing frame.';
      statusEl.classList.add('error');
      throw err;
    }
  }

  statusEl.textContent = 'Generating summary...';
  try {
    const summary = await summarize(descriptions);
    summaryText.textContent = summary;
    summaryCard.classList.remove('hidden');
    summaryCard.classList.add('fade-in');
    statusEl.classList.add('hidden');
    uploadLabel.classList.add('hidden');
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Error generating summary.';
    statusEl.classList.add('error');
    throw err;
  }
}

function seek(time) {
  return new Promise(resolve => {
    const handler = () => {
      videoPlayer.removeEventListener('seeked', handler);
      resolve();
    };
    videoPlayer.addEventListener('seeked', handler);
    videoPlayer.currentTime = time;
  });
}

async function analyzeFrame(dataUrl) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      system_prompt: 'You are a helpful assistant.',
      user_input: 'Describe what is happening in this app screen in one sentence.',
      image_url: dataUrl
    })
  });
  const data = await res.json();
  return data.openai_response || '';
}

async function summarize(descriptions) {
  const list = descriptions.map((d, i) => `${i + 1}. ${d}`).join('\n');
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      system_prompt: 'You are a helpful assistant.',
      user_input: `Summarize the user\u2019s actions across these screen descriptions in a clear, step-by-step story:\n${list}`,
      image_url: null
    })
  });
  const data = await res.json();
  return data.openai_response || '';
}

resetBtn.addEventListener('click', () => {
  videoInput.value = '';
  summaryCard.classList.add('hidden');
  uploadLabel.classList.remove('hidden');
  summaryText.textContent = '';
});
