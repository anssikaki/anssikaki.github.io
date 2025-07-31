const apiURL = 'https://anssi-openai-gateway.azurewebsites.net/api/http_trigger';
const apiKey = 'qQGNldzEhrEKBq8v4HRBRs2eKRgVu27h';
let imageURL = null;

const fileInput = document.getElementById('file-input');
const preview = document.getElementById('preview');
if (fileInput && preview) {
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      imageURL = URL.createObjectURL(file);
      preview.src = imageURL;
      preview.style.display = 'block';
    }
  });
}

document.getElementById('send-button').addEventListener('click', async () => {
  const sysPromptEl = document.getElementById('system-prompt');
  const sysPrompt = sysPromptEl ? sysPromptEl.value : 'You are a helpful assistant in a future mill.';
  const userInput = document.getElementById('user-input').value;
  const body = { system_prompt: sysPrompt, user_input: userInput };
  if (imageURL) body.image_url = imageURL;

  addMessage('You: ' + userInput);
  document.getElementById('user-input').value = '';

  try {
    const res = await fetch(apiURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    addMessage('Assistant: ' + (data.response || JSON.stringify(data)));
    imageURL = null;
    if (preview) preview.style.display = 'none';
  } catch (err) {
    addMessage('Assistant: error retrieving response');
  }
});

function addMessage(text) {
  const div = document.createElement('div');
  div.textContent = text;
  document.getElementById('messages').appendChild(div);
  const messagesDiv = document.getElementById('messages');
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}
