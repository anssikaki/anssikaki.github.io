document.getElementById('news-form').addEventListener('submit', async (e) => {
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
                user_input: `Summarize the latest tech news focusing on AI in a ${voice} voice.`
            })
        });
        const data = await res.json();
        responseEl.textContent = data.openai_response || 'No response';
    } catch (err) {
        responseEl.textContent = 'Error fetching news.';
        console.error(err);
    } finally {
        loading.style.display = 'none';
    }
});
