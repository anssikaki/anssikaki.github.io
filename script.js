const chatContainer = document.getElementById('chat-container');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const voiceSelect = document.getElementById('voice-select');

function addMessage(text, className) {
    const message = document.createElement('div');
    message.className = `message ${className}`;
    message.textContent = text;
    chatContainer.appendChild(message);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function addLoading() {
    const loading = document.createElement('div');
    loading.className = 'message assistant loading';
    loading.textContent = 'thinking...';
    chatContainer.appendChild(loading);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return loading;
}

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = userInput.value.trim();
    if (!text) return;
    const voice = voiceSelect.value;
    let systemPrompt = 'You are a friendly assistant. Help customers track their delivery and provide updates.';
    if (voice === 'logistics') {
        systemPrompt = 'You are a boring logistics expert speaking in a monotone, providing factual delivery status updates. If you lack real data, offer generic guidance.';
    } else if (voice === 'crazy') {
        systemPrompt = 'You are an over-the-top, crazy-sounding assistant who uses humorous and exaggerated language when explaining delivery status.';
    }
    addMessage(text, 'user');
    userInput.value = '';

    const loading = addLoading();

    try {
        const response = await fetch('https://anssi-openai-gateway.azurewebsites.net/api/http_trigger', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': 'qQGNldzEhrEKBq8v4HRBRs2eKRgVu27h'
            },
            body: JSON.stringify({
                system_prompt: systemPrompt,
                user_input: text
            })
        });
        const data = await response.json();
        loading.remove();
        addMessage(data.openai_response, 'assistant');
    } catch (err) {
        loading.remove();
        addMessage('Sorry, something went wrong.', 'assistant');
    }
});
