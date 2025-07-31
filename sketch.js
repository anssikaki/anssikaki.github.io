const apiURL = 'https://anssi-openai-gateway.azurewebsites.net/api/http_trigger';
const apiKey = 'qQGNldzEhrEKBq8v4HRBRs2eKRgVu27h';

// System prompt (was originally in the HTML input)
const systemPrompt = 'You are a helpful assistant in a future mill.';

// Departments for status updates
const DEPARTMENTS = ['Innovations', 'R&D', 'Production', 'Maintenance', 'Logistics'];

// Utility: append a message to the chat
function addMessage(text) {
  const div = document.createElement('div');
  div.className = 'message';
  div.textContent = text;
  const msgs = document.getElementById('messages');
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

// Core OpenAI call
async function openAIChat(prompt) {
  const body = { system_prompt: systemPrompt, user_input: prompt };
  const res = await fetch(apiURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey
    },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  // assume gateway returns { response: "..." }
  return data.response?.trim() || JSON.stringify(data);
}

// Handle user “Send”
document.getElementById('send-button').addEventListener('click', async () => {
  const inputEl = document.getElementById('user-input');
  const text = inputEl.value.trim();
  if (!text) return;
  addMessage('You: ' + text);
  inputEl.value = '';

  // Check for a “detail” request for one of the departments
  const lower = text.toLowerCase();
  const dept = DEPARTMENTS.find(d => lower.includes(d.toLowerCase()));
  let reply;
  if (dept && lower.includes('detail')) {
    reply = await openAIChat(`Please provide detailed operational status for the ${dept} department.`);
  } else {
    reply = await openAIChat(text);
  }

  addMessage('Assistant: ' + reply);
});

// === Mill Status Log (every 30 s) ===
const statusHistory = [];
async function updateStatusLog() {
  const recent = statusHistory.slice(-3).join('\n');
  let prompt;
  if (recent) {
    prompt = `Previously you reported:\n${recent}\nProvide the next coherent one-sentence status for each of these departments: ${DEPARTMENTS.join(', ')}.`;
  } else {
    prompt = `For each of these mill departments—${DEPARTMENTS.join(', ')}—give me a one-sentence status update.`;
  }

  const text = await openAIChat(prompt);
  statusHistory.push(text);

  const ul = document.getElementById('status-log');
  ul.innerHTML = '';
  text.split('\n').forEach(line => {
    if (line.trim()) {
      const li = document.createElement('li');
      li.textContent = line.replace(/^\d+\.\s*/, '');
      ul.appendChild(li);
    }
  });
}
updateStatusLog();
setInterval(updateStatusLog, 30_000);

// === Live Measurements (every 1 s) ===
function updateMetrics() {
  document.getElementById('metric-temp').textContent     = (20 + Math.random()*15).toFixed(1);
  document.getElementById('metric-pressure').textContent = (1 + Math.random()*2).toFixed(2);
  document.getElementById('metric-flow').textContent     = (50 + Math.random()*100).toFixed(0);
}
updateMetrics();
setInterval(updateMetrics, 1_000);
