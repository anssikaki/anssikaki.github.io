const form = document.getElementById('image-form');
const input = document.getElementById('image-input');
const preview = document.getElementById('preview');
let imageData = '';
let imageMime = '';

input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;
    imageMime = file.type;
    const reader = new FileReader();
    reader.onload = () => {
        const result = reader.result;
        const commaIdx = result.indexOf(',');
        imageData = result.slice(commaIdx + 1);
        preview.src = result;
        preview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const voice = document.getElementById('voice-select').value;
    const loading = document.getElementById('loading');
    const responseEl = document.getElementById('response');

    loading.style.display = 'block';
    responseEl.textContent = '';

    try {
        const res = await fetch('https://anssi-openai-gateway.azurewebsites.net/api/http_trigger', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': 'qQGNldzEhrEKBq8v4HRBRs2eKRgVu27h'
            },
            body: JSON.stringify({
                system_prompt: 'You are a helpful assistant.',
                user_input: `Describe this image in a ${voice} voice.`,
                image_data: imageData,
                image_mime: imageMime
            })
        });
        const data = await res.json();
        responseEl.textContent = data.openai_response || 'No response';
    } catch (err) {
        responseEl.textContent = 'Error fetching description.';
        console.error(err);
    } finally {
        loading.style.display = 'none';
    }
});
