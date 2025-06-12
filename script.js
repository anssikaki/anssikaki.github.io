const form       = document.getElementById('upload-form');
const input      = document.getElementById('file-input');
const preview    = document.getElementById('preview');
const pdfInfo    = document.getElementById('pdf-info');
const downloadBtn= document.getElementById('download-btn');
let fileDataUrl  = '';

input.addEventListener('change', () => {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    fileDataUrl = reader.result;

    if (file.type === 'application/pdf') {
      preview.classList.add('hidden');
      pdfInfo.textContent = `Selected PDF: ${file.name}`;
      pdfInfo.classList.remove('hidden');
    } else {
      preview.src = fileDataUrl;
      preview.classList.remove('hidden');
      pdfInfo.classList.add('hidden');
    }
  };
  reader.readAsDataURL(file);
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const loading    = document.getElementById('loading');
  const responseEl = document.getElementById('response');

  loading.style.display = 'block';
  responseEl.textContent = '';

  downloadBtn.classList.add('hidden');

  try {
    const res = await fetch('https://anssi-openai-gateway.azurewebsites.net/api/http_trigger', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key':    'qQGNldzEhrEKBq8v4HRBRs2eKRgVu27h'
      },
      body: JSON.stringify({
        system_prompt: 'You are a helpful assistant that extracts form fields and their values from the provided document. Return the result as JSON.',
        user_input:    'Extract all form fields and their values from this document.',
        image_url:     fileDataUrl
      })
    });

    if (!res.ok) {
      // grab the raw text (could be "Unauthorized", CORS error page, etc.)
      const errText = await res.text();
      throw new Error(`Server returned ${res.status}: ${errText}`);
    }

    const data = await res.json();
    let output = data.openai_response ?? 'No response';
    let csv    = '';

    try {
      const obj = JSON.parse(output);
      output = JSON.stringify(obj, null, 2);
      const rows = Object.entries(obj).map(([k, v]) => `${k},${v}`);
      csv = ['Field,Value', ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      downloadBtn.href = URL.createObjectURL(blob);
      downloadBtn.download = 'form-data.csv';
      downloadBtn.classList.remove('hidden');
    } catch { /* not JSON, skip CSV generation */ }

    responseEl.textContent = output;
  } catch (err) {
    responseEl.textContent = `❌ ${err.message}`;
    console.error(err);
  } finally {
    loading.style.display = 'none';
  }
});
