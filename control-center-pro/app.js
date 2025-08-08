// Control Center Pro UI — stand-alone static client
// Uses the same Azure endpoint as the original demo. No changes to README/INSTRUCTIONS.

// Keep these aligned with the existing repo (duplicated here for isolation).
const apiURL = 'https://anssi-openai-gateway.azurewebsites.net/api/http_trigger';
const apiKey = 'qQGNldzEhrEKBq8v4HRBRs2eKRgVu27h';

const systemPrompt = "You are Millie, a confident and direct AI control assistant for a pulp mill control room. Provide clear, concise answers and avoid speculation.";

const DEPARTMENTS = ['Wood Handling','Pulping','Bleaching','Recovery','Utilities','Water Treatment','QC Lab','Shipping'];

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

// Clock
function tickClock(){
  const now = new Date();
  $('#clock').textContent = now.toLocaleString();
}
setInterval(tickClock, 1000); tickClock();

// Simple ring (donut) chart
function ring(el, value, max, color){
  const ctx = el.getContext('2d');
  const r = el.width/2 - 8, cx = el.width/2, cy = el.height/2;
  ctx.clearRect(0,0,el.width, el.height);
  // track
  ctx.beginPath(); ctx.lineWidth = 14; ctx.strokeStyle = '#1e293b';
  ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
  // value
  const pct = Math.max(0, Math.min(1, value/max));
  ctx.beginPath(); ctx.lineWidth = 14; ctx.strokeStyle = color;
  ctx.arc(cx,cy,r,-Math.PI/2, -Math.PI/2 + Math.PI*2*pct); ctx.stroke();
}

// Tiny line chart
function spark(el, arr){
  const ctx = el.getContext('2d');
  const w = el.width, h = el.height, pad = 10;
  ctx.clearRect(0,0,w,h);
  ctx.strokeStyle = '#334155'; ctx.lineWidth = 2;
  ctx.strokeRect(0.5,0.5,w-1,h-1);
  const min = Math.min(...arr), max = Math.max(...arr);
  ctx.beginPath(); ctx.lineWidth = 2; ctx.strokeStyle = '#60a5fa';
  arr.forEach((v,i)=>{
    const x = pad + (w-2*pad) * (i/(arr.length-1));
    const y = h - pad - ( (v-min)/(max-min || 1) ) * (h-2*pad);
    i? ctx.lineTo(x,y) : ctx.moveTo(x,y);
  });
  ctx.stroke();
}

// Fake streaming
async function* fakeStream(text){
  const str = String(text ?? '');
  for (let i=0;i<str.length;i+=3){
    yield str.slice(i, i+3);
    await new Promise(r=>setTimeout(r,12));
  }
}

// Assistant chat
function appendMsg(role, content){
  const wrap = document.createElement('div');
  wrap.className = `msg ${role}`;
  wrap.innerHTML = `<div class="role">${role==='user'?'🧑':'🤖'}</div><div class="bubble"></div>`;
  wrap.querySelector('.bubble').textContent = content;
  $('#chatLog').appendChild(wrap);
  $('#chatLog').scrollTop = $('#chatLog').scrollHeight;
  return wrap.querySelector('.bubble');
}

async function callLLM(userText, imageDataUrl){
  const payload = { system_prompt: systemPrompt, user_input: userText };
  if (imageDataUrl){ payload.image_url = imageDataUrl; }

  const res = await fetch(apiURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok){
    const t = await res.text();
    throw new Error(`API error ${res.status}: ${t}`);
  }
  return res.json();
}

// Robust extraction across possible response shapes
function extractText(resp){
  try{
    if (typeof resp === 'string') return resp;
    if (!resp || typeof resp !== 'object') return JSON.stringify(resp);
    if (resp.content && typeof resp.content === 'string') return resp.content;
    if (resp.answer && typeof resp.answer === 'string') return resp.answer;
    if (resp.message && typeof resp.message === 'string') return resp.message;
    if (resp.output && typeof resp.output === 'string') return resp.output;
    if (resp.openai_response && typeof resp.openai_response === 'string') return resp.openai_response;
    if (resp.choices && resp.choices.length){
      const ch = resp.choices[0];
      if (ch.message && typeof ch.message.content === 'string') return ch.message.content;
      if (typeof ch.text === 'string') return ch.text;
      if (ch.delta && typeof ch.delta.content === 'string') return ch.delta.content;
    }
    if (resp.data && typeof resp.data === 'string') return resp.data;
    return JSON.stringify(resp);
  } catch(e){
    return String(resp);
  }
}

async function sendMessage(text){
  if (!text.trim()) return;
  appendMsg('user', text);
  const asstBubble = appendMsg('assistant', '…');

  try {
    const imgInput = $('#imageInput');
    let imgData = null;
    if (imgInput.files && imgInput.files[0]){
      imgData = await new Promise((resolve,reject)=>{
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.onerror = reject;
        fr.readAsDataURL(imgInput.files[0]);
      });
    }

    const resp = await callLLM(text, imgData);
    const content = extractText(resp);
    asstBubble.textContent = '';
    for await (const chunk of fakeStream(content)){
      asstBubble.textContent += chunk;
      $('#chatLog').scrollTop = $('#chatLog').scrollHeight;
    }
  } catch (e){
    asstBubble.textContent = String(e.message || e);
  }
}

$('#sendBtn')?.addEventListener('click', ()=> sendMessage($('#userInput').value));
$('#userInput')?.addEventListener('keydown', e=>{
  if (e.key==='Enter' && (e.metaKey || e.ctrlKey)){
    sendMessage($('#userInput').value);
  }
});
$$('.presets button').forEach(b=> b.addEventListener('click',()=>{
  $('#userInput').value = b.dataset.prompt;
  $('#userInput').focus();
}));

// Departments
function randomStatus(){
  const r = Math.random();
  return r>0.88 ? 'error' : r>0.7 ? 'warn' : 'ok';
}
function badge(status){
  const label = status==='ok'?'OK':status==='warn'?'ATTN':'ALARM';
  return `<span class="badge ${status}">${label}</span>`;
}
function renderDepartments(){
  const grid = $('#deptGrid');
  grid.innerHTML = '';
  DEPARTMENTS.forEach(name=>{
    const status = randomStatus();
    const el = document.createElement('div');
    el.className = 'dept';
    el.innerHTML = `<span class="name">${name}</span>${badge(status)}`;
    grid.appendChild(el);
  });
}
renderDepartments(); setInterval(renderDepartments, 12000);

// KPIs & charts demo data
const state = {
  energy: 55, steam: 180, yield: 48, emissions: 12,
  energySeries: Array.from({length:60},()=>40+Math.random()*20),
  gradeMix: [52, 28, 20],
};

function updateKPIs(){
  ring($('#kpiEnergy'), state.energy, 100, '#22c55e');
  ring($('#kpiSteam'), state.steam, 300, '#60a5fa');
  ring($('#kpiYield'), state.yield, 80, '#f59e0b');
  ring($('#kpiEmissions'), state.emissions, 80, '#ef4444');

  $('#kpiEnergyVal').textContent = `${state.energy.toFixed(0)} MW`;
  $('#kpiSteamVal').textContent = `${state.steam.toFixed(0)} t/h`;
  $('#kpiYieldVal').textContent = `${state.yield.toFixed(0)} %`;
  $('#kpiEmissionsVal').textContent = `${state.emissions.toFixed(0)} ppm`;

  spark($('#energyTrend'), state.energySeries);
  // grade mix bars
  const ctx = $('#gradeMix').getContext('2d');
  const w= $('#gradeMix').width, h=$('#gradeMix').height;
  ctx.clearRect(0,0,w,h);
  const colors = ['#22c55e','#60a5fa','#f59e0b'];
  let x=20;
  ['A','B','C'].forEach((label,i)=>{
    const val = state.gradeMix[i];
    ctx.fillStyle = '#1e293b'; ctx.fillRect(x,30,120,150);
    ctx.fillStyle = colors[i]; const barH = 1.2*val;
    ctx.fillRect(x+6, 180-barH, 108, barH);
    ctx.fillStyle = '#cbd5e1'; ctx.fillText(`${label} — ${val}%`, x+8, 195);
    x += 160;
  });
}
updateKPIs();
setInterval(()=>{
  // drift the data
  state.energy = Math.max(35, Math.min(90, state.energy + (Math.random()*6-3)));
  state.steam = Math.max(120, Math.min(260, state.steam + (Math.random()*12-6)));
  state.yield = Math.max(40, Math.min(70, state.yield + (Math.random()*2-1)));
  state.emissions = Math.max(6, Math.min(35, state.emissions + (Math.random()*2-1)));
  state.energySeries.push(40+Math.random()*20); state.energySeries.shift();
  updateKPIs();
}, 3000);

// Incidents
const incidentList = $('#incidentList');
function pushIncident(sev, text){
  const li = document.createElement('li');
  li.className = 'incident';
  li.innerHTML = `<span class="sev sev${sev}">S${sev}</span><div class="text">${text}</div>`;
  incidentList.prepend(li);
  while(incidentList.children.length > 8) incidentList.removeChild(incidentList.lastChild);
}
const incidentPool = [
  'White liquor density drifting low in digester feed.',
  'High TRS near recausticizer scrubber.',
  'Evaporator ΔP rising — potential fouling.',
  'Steam header oscillation detected.',
  'Chlorine dioxide usage 12% above target.',
  'Unscheduled chipper downtime (Line 2).',
  'Condensate tank level fluctuation.',
];
setInterval(()=>{
  const sev = Math.random()<0.15?1: (Math.random()<0.5?2:3);
  const txt = incidentPool[Math.floor(Math.random()*incidentPool.length)];
  pushIncident(sev, txt);
}, 7000);

// Default prompt
$('#userInput').value = 'Summarize plant status and key risks for the next 2 hours.';
