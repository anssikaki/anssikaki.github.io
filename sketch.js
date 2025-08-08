const apiURL = 'https://anssi-openai-gateway.azurewebsites.net/api/http_trigger';
const apiKey = 'qQGNldzEhrEKBq8v4HRBRs2eKRgVu27h';

// System prompt
const systemPrompt = "You are Millie, a confident and direct AI assisting operators in a futuristic pulp mill control room. Provide clear, concise answers and avoid speculation.";

// Departments for status updates
const DEPARTMENTS = ['Wood Handling', 'Pulping', 'Bleaching', 'Recovery'];

// Visual data for charts
let energyData = [40, 35, 25];
let gradeData  = [50, 30, 20];
let overallSeverity = 'ok';

let imageURL = null;
const imageInput = document.getElementById('image-input');
const previewArea = document.getElementById('preview-area');
imageInput.addEventListener('change', () => {
  const file = imageInput.files[0];
  if (imageURL) {
    URL.revokeObjectURL(imageURL);
    imageURL = null;
  }
  if (file) {
    imageURL = URL.createObjectURL(file);
    previewArea.innerHTML = `<img src="${imageURL}" alt="preview">`;
  } else {
    previewArea.innerHTML = '';
  }
});

// Utility: append a message to the chat
function addMessage(text, role = 'assistant') {
  const div = document.createElement('div');
  div.className = 'message ' + role;
  div.textContent = text;
  const msgs = document.getElementById('messages');
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

// Core OpenAI call
async function openAIChat(prompt, imageURL) {
  const body = { system_prompt: systemPrompt, user_input: prompt };
  if (imageURL) body.image_url = imageURL;
  const res = await fetch(apiURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey
    },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  // gateway may return {openai_response:"..."} or {response:"..."}
  return (
    data.openai_response?.trim() ||
    data.response?.trim() ||
    JSON.stringify(data)
  );
}

// Handle user “Send”
const sendBtn = document.getElementById('send-button');
sendBtn.addEventListener('click', async () => {
  const inputEl = document.getElementById('user-input');
  const text = inputEl.value.trim();
  if (!text) return;
  addMessage('You: ' + text, 'user');
  inputEl.value = '';

  const lower = text.toLowerCase();
  const dept = DEPARTMENTS.find(d => lower.includes(d.toLowerCase()));
  let reply;
  sendBtn.disabled = true;
  addMessage('Millie is thinking...', 'assistant');
  const thinkingMsg = document.getElementById('messages').lastChild;
  if (dept && lower.includes('detail')) {
    reply = await openAIChat(`Please provide detailed operational status for the ${dept} department.`, imageURL);
  } else {
    reply = await openAIChat(text, imageURL);
  }
  thinkingMsg.textContent = 'Millie: ' + reply;
  sendBtn.disabled = false;
  imageInput.value = '';
  if (imageURL) {
    URL.revokeObjectURL(imageURL);
    imageURL = null;
    previewArea.innerHTML = '';
  }
});

const clearBtn = document.getElementById('clear-button');
clearBtn.addEventListener('click', () => {
  document.getElementById('messages').innerHTML = '';
});

addMessage("Millie: Millie here—ask your question.", 'assistant');

// === Mill Status Log (every 30 s) ===
const statusHistory = [];

function getSeverity(str) {
  const s = str.toLowerCase();
  if (/(fail|critical|error|shutdown|alarm|offline|bad)/.test(s)) return 'bad';
  if (/(warn|slow|issue|caution|monitor|irregular|so-so)/.test(s)) return 'warn';
  return 'ok';
}

async function updateStatusLog() {
  const recent = statusHistory
    .slice(-2)
    .flatMap(entry => entry.lines.map(l => `${l.dept}: ${l.msg}`))
    .join('\n');
  let prompt;
  if (recent) {
    prompt = `Previously you reported:\n${recent}\nProvide the next coherent one-sentence status for each of these departments: ${DEPARTMENTS.join(', ')}.`;
  } else {
    prompt = `For each of these mill departments—${DEPARTMENTS.join(', ')}—give me a one-sentence status update.`;
  }

  const text = await openAIChat(prompt);
  const timestamp = new Date().toLocaleString();
  const entry = { timestamp, lines: [] };
  text.split('\n').forEach(line => {
    const clean = line.replace(/^\d+\.\s*/, '').trim();
    if (!clean) return;
    const match = clean.match(/\*\*(.+?)\*\*:\s*(.+)/);
    let dept, msg;
    if (match) {
      dept = match[1];
      msg = match[2];
    } else {
      const parts = clean.split(':');
      if (parts.length >= 2) {
        dept = parts[0].trim();
        msg = parts.slice(1).join(':').trim();
      }
    }
    if (dept && msg) {
      entry.lines.push({ dept, msg, severity: getSeverity(msg) });
    }
  });
  statusHistory.push(entry);
  if (statusHistory.length > 3) statusHistory.shift();

  // Update overall severity
  overallSeverity = 'ok';
  entry.lines.forEach(l => {
    if (l.severity === 'bad') overallSeverity = 'bad';
    else if (l.severity === 'warn' && overallSeverity !== 'bad') overallSeverity = 'warn';
  });

  const ul = document.getElementById('status-log');
  ul.innerHTML = '';
  statusHistory.forEach(e => {
    e.lines.forEach(l => {
      const li = document.createElement('li');
      li.className = `status-${l.severity}`;
      const spanTime = document.createElement('span');
      spanTime.className = 'timestamp';
      spanTime.textContent = `[${e.timestamp}]`;
      const strong = document.createElement('strong');
      strong.textContent = `${l.dept}:`;
      li.appendChild(spanTime);
      li.appendChild(strong);
      li.appendChild(document.createTextNode(' ' + l.msg));
      ul.appendChild(li);
    });
  });
}
updateStatusLog();
setInterval(updateStatusLog, 30_000);

// === Live Measurements (every 1 s) ===
function updateMetrics() {
  document.getElementById('metric-chip').textContent     = (60 + Math.random()*40).toFixed(0);
  document.getElementById('metric-digester').textContent = (150 + Math.random()*20).toFixed(1);
  document.getElementById('metric-steam').textContent    = (8 + Math.random()*4).toFixed(1);
  document.getElementById('metric-ph').textContent       = (11 + Math.random()*2).toFixed(2);
  document.getElementById('metric-energy').textContent   = (30 + Math.random()*10).toFixed(1);
  document.getElementById('metric-liquor').textContent   = (200 + Math.random()*100).toFixed(0);

  energyData = [30 + Math.random()*20, 40 + Math.random()*20, 10 + Math.random()*20];
  gradeData  = [50 + Math.random()*20, 30 + Math.random()*10, 20 + Math.random()*10];
}
updateMetrics();
setInterval(updateMetrics, 1_000);

// === p5.js visuals ===
function setup() {
  const canvas = createCanvas(400, 300);
  canvas.parent('canvas-holder');
  angleMode(DEGREES);
  textAlign(LEFT, CENTER);
  textFont('Courier New');
}

function draw() {
  background(13, 17, 23);
  drawPieChart(100, height/2, 80, energyData, ['#00aaff','#ffaa00','#ff0066'], ['Steam','Electric','Chemical']);
  drawPieChart(300, height/2, 80, gradeData, ['#27ae60','#f39c12','#8e44ad'], ['Soft','Hard','Recycled']);
  noStroke();
  const color = overallSeverity === 'bad' ? '#da3633' : (overallSeverity === 'warn' ? '#f9c513' : '#238636');
  fill(color);
  circle(width - 20, 20, 20);
}

function drawPieChart(x, y, r, data, colors, labels) {
  let total = data.reduce((a,b) => a + b, 0);
  let angle = 0;
  for (let i = 0; i < data.length; i++) {
    fill(colors[i]);
    let a = data[i] / total * 360;
    arc(x, y, r*2, r*2, angle, angle + a, PIE);
    angle += a;
  }
  // legend
  const startX = x - r;
  let startY = y + r + 15;
  textSize(12);
  for (let i = 0; i < data.length; i++) {
    fill(colors[i]);
    rect(startX, startY + i*16 - 10, 10, 10);
    fill(200);
    text(`${labels[i]} ${data[i].toFixed(0)}`, startX + 14, startY + i*16 - 5);
  }
}
