const fileInput     = document.getElementById('file-input');
const fileLabel     = document.getElementById('file-label');
const previewCard   = document.getElementById('preview-card');
const previewImg    = document.getElementById('preview-img');
const loadingEl     = document.getElementById('loading');
const responseEl    = document.getElementById('response');
const actions       = document.getElementById('result-actions');
const downloadBtn   = document.getElementById('download-btn');
const emailBtn      = document.getElementById('email-btn');
const nextBtn       = document.getElementById('next-btn');

let fileDataUrl = '';

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    fileDataUrl = reader.result;
    previewImg.src = fileDataUrl;
    previewCard.classList.remove('hidden');
    previewCard.classList.add('fade-in');
    processImage();
  };
  reader.readAsDataURL(file);
});

async function processImage() {
  loadingEl.classList.remove('hidden');
  responseEl.classList.add('hidden');
  actions.classList.add('hidden');

  try {
    const res = await fetch('https://anssi-openai-gateway.azurewebsites.net/api/http_trigger', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'qQGNldzEhrEKBq8v4HRBRs2eKRgVu27h'
      },
      body: JSON.stringify({
        system_prompt: 'You are a helpful assistant that extracts form fields and their values from the provided document. Return the result as JSON.',
        user_input: 'Extract all form fields and their values from this document. Translate everything to english. Aim to extract as much as possible, even if you are unsure.',
        image_url: fileDataUrl
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Server returned ${res.status}: ${errText}`);
    }

    const data = await res.json();
    let output = data.openai_response ?? 'No response';
    let csv = '';

    try {
      const obj = JSON.parse(output);
      output = JSON.stringify(obj, null, 2);
      const rows = Object.entries(obj).map(([k,v]) => `${k},${v}`);
      csv = ['Field,Value', ...rows].join('\n');
      const blob = new Blob([csv], {type: 'text/csv'});
      downloadBtn.href = URL.createObjectURL(blob);
      downloadBtn.download = 'form-data.csv';
      downloadBtn.classList.remove('hidden');
    } catch {
      downloadBtn.classList.add('hidden');
    }

    responseEl.textContent = output;
    responseEl.classList.remove('hidden');
    responseEl.classList.add('fade-in');
    actions.classList.remove('hidden');
    actions.classList.add('fade-in');
  } catch (err) {
    responseEl.textContent = `❌ ${err.message}`;
    responseEl.classList.remove('hidden');
    responseEl.classList.add('fade-in');
    actions.classList.remove('hidden');
    actions.classList.add('fade-in');
  } finally {
    loadingEl.classList.add('hidden');
  }
}

emailBtn.addEventListener('click', () => {
  const body = encodeURIComponent(responseEl.textContent);
  window.location.href = `mailto:?subject=Form Data&body=${body}`;
});

nextBtn.addEventListener('click', () => {
  fileInput.value = '';
  previewCard.classList.add('hidden');
  previewCard.classList.remove('fade-in');
  responseEl.classList.add('hidden');
  responseEl.classList.remove('fade-in');
  actions.classList.add('hidden');
  actions.classList.remove('fade-in');
});
