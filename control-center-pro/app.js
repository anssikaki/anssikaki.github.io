// Control Center Pro — app.js with Trend/Area Inspectors
// Adds: click-to-open drilldowns for charts and area tiles, all runtime-injected.
// Also includes: DOM-ready guard, robust LLM parsing, alarm Q&A modal (from previous build).

const apiURL = 'https://anssi-openai-gateway.azurewebsites.net/api/http_trigger';
const apiKey = 'qQGNldzEhrEKBq8v4HRBRs2eKRgVu27h';
const systemPrompt = "You are Millie, a confident and direct AI control assistant for a pulp mill control room. Provide clear, concise answers and avoid speculation.";

(function main(){
  function onReady(fn){
    if (document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', fn, { once:true });
    } else { fn(); }
  }

  onReady(()=>{
    const DEPARTMENTS = ['Wood Handling','Pulping','Bleaching','Recovery','Utilities','Water Treatment','QC Lab','Shipping'];
    const $ = s => document.querySelector(s);
    const $$ = s => Array.from(document.querySelectorAll(s));

    // Clock
    function tickClock(){ const el=$('#clock'); if(el) el.textContent = new Date().toLocaleString(); }
    setInterval(tickClock, 1000); tickClock();

    // Mini charts
    function ring(el, value, max, color){
      if(!el) return;
      const ctx = el.getContext('2d');
      const r = el.width/2 - 8, cx = el.width/2, cy = el.height/2;
      ctx.clearRect(0,0,el.width, el.height);
      ctx.beginPath(); ctx.lineWidth = 14; ctx.strokeStyle = '#1e293b';
      ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
      const pct = Math.max(0, Math.min(1, value/max));
      ctx.beginPath(); ctx.lineWidth = 14; ctx.strokeStyle = color;
      ctx.arc(cx,cy,r,-Math.PI/2, -Math.PI/2 + Math.PI*2*pct); ctx.stroke();
    }
    function spark(el, arr){
      if(!el) return;
      const ctx = el.getContext('2d');
      const w = el.width, h = el.height, pad = 10;
      ctx.clearRect(0,0,w,h);
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 2;
      ctx.strokeRect(0.5,0.5,w-1,h-1);
      const min = Math.min(...arr), max = Math.max(...arr);
      ctx.beginPath(); ctx.lineWidth = 2; ctx.strokeStyle = '#60a5fa';
      arr.forEach((v,i)=>{
        const x = pad + (w-2*pad) * (i/(arr.length-1));
        const y = h - pad - ((v-min)/(max-min || 1)) * (h-2*pad);
        i? ctx.lineTo(x,y) : ctx.moveTo(x,y);
      });
      ctx.stroke();
    }

    // Chat helpers
    async function* fakeStream(text){
      const str = String(text ?? '');
      for (let i=0;i<str.length;i+=3){
        yield str.slice(i, i+3);
        await new Promise(r=>setTimeout(r,10));
      }
    }
    function appendMsg(role, content){
      const wrap = document.createElement('div');
      wrap.className = `msg ${role}`;
      wrap.innerHTML = `<div class="role">${role==='user'?'🧑':'🤖'}</div><div class="bubble"></div>`;
      wrap.querySelector('.bubble').textContent = content;
      const log = $('#chatLog'); if (log){ log.appendChild(wrap); log.scrollTop = log.scrollHeight; }
      return wrap.querySelector('.bubble');
    }
    async function callLLM(userText, imageDataUrl){
      const payload = { system_prompt: systemPrompt, user_input: userText };
      if (imageDataUrl){ payload.image_url = imageDataUrl; }
      const res = await fetch(apiURL, { method: 'POST', headers: { 'Content-Type':'application/json', 'x-api-key': apiKey }, body: JSON.stringify(payload) });
      if (!res.ok){ const t = await res.text(); throw new Error(`API error ${res.status}: ${t}`); }
      return res.json();
    }
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
      } catch (e){ return String(resp); }
    }
    async function sendMessage(text){
      if (!text.trim()) return;
      appendMsg('user', text);
      const asstBubble = appendMsg('assistant', '…');
      try {
        const imgInput = $('#imageInput'); let imgData = null;
        if (imgInput && imgInput.files && imgInput.files[0]){
          imgData = await new Promise((resolve,reject)=>{ const fr=new FileReader(); fr.onload=()=>resolve(fr.result); fr.onerror=reject; fr.readAsDataURL(imgInput.files[0]); });
        }
        const resp = await callLLM(text, imgData);
        const content = extractText(resp);
        asstBubble.textContent = '';
        for await (const chunk of fakeStream(content)){ asstBubble.textContent += chunk; const log=$('#chatLog'); if (log) log.scrollTop = log.scrollHeight; }
      } catch(err){ asstBubble.textContent = String(err.message || err); }
    }

    // Composer wiring
    $('#sendBtn')?.addEventListener('click', ()=> sendMessage($('#userInput').value));
    $('#userInput')?.addEventListener('keydown', e=>{ if (e.key==='Enter' && (e.metaKey || e.ctrlKey)) sendMessage($('#userInput').value); });
    $$('.presets button').forEach(b=> b.addEventListener('click',()=>{ const ui=$('#userInput'); if (ui){ ui.value=b.dataset.prompt; ui.focus(); } }));

    // Departments & KPIs
    function randomStatus(){ const r=Math.random(); return r>0.88?'error': r>0.7?'warn':'ok'; }
    function badge(status){ const label = status==='ok'?'OK':status==='warn'?'ATTN':'ALARM'; return `<span class="badge ${status}">${label}</span>`; }
    function renderDepartments(){
      const grid = $('#deptGrid'); if(!grid) return;
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

    const state = {
      energy:55, steam:180, yield:48, emissions:12,
      energySeries: Array.from({length:120},(_,i)=> 40 + 10*Math.sin(i/8) + Math.random()*10),
      gradeMix:[52,28,20]
    };
    function updateKPIs(){
      ring($('#kpiEnergy'), state.energy, 100, '#22c55e');
      ring($('#kpiSteam'), state.steam, 300, '#60a5fa');
      ring($('#kpiYield'), state.yield, 80, '#f59e0b');
      ring($('#kpiEmissions'), state.emissions, 80, '#ef4444');
      $('#kpiEnergyVal') && ($('#kpiEnergyVal').textContent = `${state.energy.toFixed(0)} MW`);
      $('#kpiSteamVal') && ($('#kpiSteamVal').textContent = `${state.steam.toFixed(0)} t/h`);
      $('#kpiYieldVal') && ($('#kpiYieldVal').textContent = `${state.yield.toFixed(0)} %`);
      $('#kpiEmissionsVal') && ($('#kpiEmissionsVal').textContent = `${state.emissions.toFixed(0)} ppm`);
      spark($('#energyTrend'), state.energySeries.slice(-60));
      const ctx = $('#gradeMix')?.getContext('2d');
      if (ctx){
        const w= ctx.canvas.width, h=ctx.canvas.height; ctx.clearRect(0,0,w,h);
        const colors = ['#22c55e','#60a5fa','#f59e0b']; let x=20;
        ['A','B','C'].forEach((label,i)=>{
          const val = state.gradeMix[i];
          ctx.fillStyle = '#1e293b'; ctx.fillRect(x,30,120,150);
          ctx.fillStyle = colors[i]; const barH = 1.2*val;
          ctx.fillRect(x+6, 180-barH, 108, barH);
          ctx.fillStyle = '#cbd5e1'; ctx.fillText(`${label} — ${val}%`, x+8, 195);
          x += 160;
        });
      }
    }
    updateKPIs();
    setInterval(()=>{
      state.energy = Math.max(35, Math.min(90, state.energy + (Math.random()*6-3)));
      state.steam = Math.max(120, Math.min(260, state.steam + (Math.random()*12-6)));
      state.yield = Math.max(40, Math.min(70, state.yield + (Math.random()*2-1)));
      state.emissions = Math.max(6, Math.min(35, state.emissions + (Math.random()*2-1)));
      state.energySeries.push(40 + 10*Math.sin(state.energySeries.length/8) + Math.random()*10);
      if (state.energySeries.length>240) state.energySeries.shift();
      updateKPIs();
    }, 3000);

    // Incidents
    const incidentList = $('#incidentList');
    function pushIncident(sev, text){
      if(!incidentList) return;
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
    setInterval(()=>{ const sev = Math.random()<0.15?1: (Math.random()<0.5?2:3); const txt = incidentPool[Math.floor(Math.random()*incidentPool.length)]; pushIncident(sev, txt); }, 7000);

    // ===== Shared Modal Infrastructure (runtime injected) =====
    function injectBaseStyles(){
      const id='inspectorStyles'; if (document.getElementById(id)) return;
      const style=document.createElement('style'); style.id=id; style.textContent = `
.modal{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(3,6,11,.6);backdrop-filter:blur(2px);z-index:1000}
.modal.hidden{display:none}
.modal-card{width:min(920px,94vw);background:#131b26;border:1px solid #1e293b;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.35);overflow:hidden}
.modal-header{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid #1e293b;background:#0d141d}
.modal-title{display:flex;gap:10px;align-items:center;color:#e6f0ff}
.modal-close{background:transparent;color:#7a8aa0;border:none;font-size:18px;cursor:pointer}
.modal-body{padding:12px 14px;display:grid;gap:12px}
.modal-footer{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-top:1px solid #1e293b}
.primary{background:#2dd4bf;color:#002b28;border:none;padding:10px 14px;border-radius:10px;font-weight:700;cursor:pointer}
.section{border:1px solid #1e293b;background:#0f1924;border-radius:12px;padding:10px}
.kbar{display:flex;gap:8px;flex-wrap:wrap}
.kbar button{background:#0f1924;border:1px solid #1e293b;color:#eaf2ff;border-radius:10px;padding:6px 10px;cursor:pointer;font-size:13px}
.badge{padding:4px 8px;border-radius:999px;font-size:12px;border:1px solid #1e293b}
.sev1{background:rgba(239,68,68,.15);color:#ef4444}
.sev2{background:rgba(245,158,11,.15);color:#f59e0b}
.sev3{background:rgba(34,197,94,.15);color:#22c55e}
      `;
      document.head.appendChild(style);
    }
    function ensureInspector(){
      if (document.getElementById('inspectModal')) return;
      injectBaseStyles();
      const wrap = document.createElement('div');
      wrap.innerHTML = `
<div id="inspectModal" class="modal hidden" role="dialog" aria-modal="true" aria-labelledby="inspectTitle">
  <div class="modal-card">
    <div class="modal-header">
      <div class="modal-title"><h3 id="inspectTitle" style="margin:0;font-size:16px">Inspector</h3></div>
      <button class="modal-close" id="inspectClose" aria-label="Close">✕</button>
    </div>
    <div class="modal-body">
      <div id="inspectContent"></div>
    </div>
    <div class="modal-footer">
      <div class="kbar" id="inspectKbar"></div>
      <div>
        <button id="inspectAsk" class="primary">Ask Millie</button>
      </div>
    </div>
  </div>
</div>`;
      document.body.appendChild(wrap.firstElementChild);
    }
    function openInspector({title, content, quickQs=[], onAsk}){
      ensureInspector();
      const modal = document.getElementById('inspectModal'); const t = document.getElementById('inspectTitle'); const c = document.getElementById('inspectContent'); const kb = document.getElementById('inspectKbar');
      t.textContent = title; c.innerHTML = content;
      kb.innerHTML = '';
      quickQs.forEach(q=>{ const b=document.createElement('button'); b.textContent=q; b.addEventListener('click',()=>{ onAsk && onAsk(q); }); kb.appendChild(b); });
      document.getElementById('inspectAsk').onclick = ()=> onAsk && onAsk('Give me a clear, short operator summary.');
      document.getElementById('inspectClose').onclick = ()=> modal.classList.add('hidden');
      modal.addEventListener('click', (e)=>{ if (e.target===modal) modal.classList.add('hidden'); }, { once:true });
      modal.classList.remove('hidden');
    }

    // ===== Trend Inspector (charts) =====
    function openTrendInspector(name, series){
      const id = 'trendCanvas_'+Math.random().toString(36).slice(2);
      const content = `
<div class="section">
  <canvas id="${id}" width="820" height="260" aria-label="${name} detail"></canvas>
</div>
<div class="section" style="display:flex;gap:10px;flex-wrap:wrap">
  <div class="badge">Window: last 60 mins</div>
  <div class="badge">Anomaly: ~T-18m</div>
  <div class="badge">Volatility: medium</div>
</div>
<div class="section">
  <div style="font-size:13px;color:#cfe6ff">Tap a quick question below or Ask Millie.</div>
</div>`;
      openInspector({
        title: `${name} — Trend Inspector`,
        content,
        quickQs: [
          'Explain the spike around T-20m and likely causes.',
          'Is this within control limits? Recommend setpoint tweak.',
          'What should the operator watch in the next 30 minutes?'
        ],
        onAsk: (q)=>{
          const prompt = `You are Millie. Analyze this ${name} trend (simulated) with an anomaly ~20 min ago. ${q} Keep it concise, bullet points, clearly illustrative.`;
          sendMessage(prompt);
          document.getElementById('inspectModal')?.classList.add('hidden');
        }
      });
      // draw detail chart
      const el = document.getElementById(id);
      if (!el) return;
      const ctx = el.getContext('2d');
      const w = el.width, h = el.height, pad = 30;
      const seg = series.slice(-120);
      const min = Math.min(...seg), max = Math.max(...seg);
      ctx.clearRect(0,0,w,h);
      ctx.fillStyle = '#0b1320'; ctx.fillRect(0,0,w,h);
      // grid
      ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1;
      for (let i=0;i<=6;i++){ const y = pad + (h-2*pad)*i/6; ctx.beginPath(); ctx.moveTo(pad,y); ctx.lineTo(w-pad,y); ctx.stroke(); }
      // line
      ctx.beginPath(); ctx.lineWidth = 2; ctx.strokeStyle = '#60a5fa';
      seg.forEach((v,i)=>{
        const x = pad + (w-2*pad) * (i/(seg.length-1));
        const y = h - pad - ((v-min)/(max-min || 1)) * (h-2*pad);
        i? ctx.lineTo(x,y) : ctx.moveTo(x,y);
      });
      ctx.stroke();
      // anomaly marker
      const idx = Math.max(5, seg.length-40);
      const ax = pad + (w-2*pad) * (idx/(seg.length-1));
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(ax-2, pad, 4, h-2*pad);
    }

    // Bind canvas clicks
    document.getElementById('energyTrend')?.addEventListener('click', ()=> openTrendInspector('Energy (MW)', state.energySeries));
    document.getElementById('gradeMix')?.addEventListener('click', ()=>{
      // For mix, build a mini donut + recommendations
      const content = `
<div class="section">
  <canvas id="mixDonut" width="380" height="220"></canvas>
</div>
<div class="section">
  <div style="font-size:13px;color:#cfe6ff;line-height:1.4">
  Current mix leans Grade A (52%). Consider trial: shift 3–5% from A→B to balance steam load and bleaching chemical cost.
  </div>
</div>`;
      openInspector({
        title: 'Grade Mix — Explorer',
        content,
        quickQs:[
          'What is the cost/energy trade-off if shifting 5% from A to B?',
          'Any quality risks with more Grade C in current conditions?',
          'Suggest a 2-hour plan to optimize mix.'
        ],
        onAsk: (q)=>{
          const prompt = `You are Millie. Given grade mix A/B/C = 52/28/20 (illustrative), ${q} Provide crisp, actionable bullets.`;
          sendMessage(prompt);
          document.getElementById('inspectModal')?.classList.add('hidden');
        }
      });
      const el = document.getElementById('mixDonut');
      if (el){
        const ctx = el.getContext('2d'); const w=el.width, h=el.height; const cx=w/2, cy=h/2, r=70;
        const vals = state.gradeMix; const colors = ['#22c55e','#60a5fa','#f59e0b']; const labels=['A','B','C'];
        const sum = vals.reduce((a,b)=>a+b,0); let a0 = -Math.PI/2;
        for (let i=0;i<vals.length;i++){
          const a1 = a0 + (vals[i]/sum) * Math.PI*2;
          ctx.beginPath(); ctx.fillStyle = colors[i];
          ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,a0,a1); ctx.closePath(); ctx.fill();
          const mid = (a0+a1)/2; const lx=cx + Math.cos(mid)*(r+18), ly=cy + Math.sin(mid)*(r+18);
          ctx.fillStyle = '#cbd5e1'; ctx.fillText(`${labels[i]} ${vals[i]}%`, lx-14, ly);
          a0 = a1;
        }
        // hole
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath(); ctx.arc(cx,cy,40,0,Math.PI*2); ctx.fill(); ctx.globalCompositeOperation='source-over';
      }
    });

    // ===== Area Inspector (department tiles) =====
    document.getElementById('deptGrid')?.addEventListener('click', (e)=>{
      const tile = e.target.closest('.dept'); if (!tile) return;
      const name = tile.querySelector('.name')?.textContent || 'Area';
      const sevEl = tile.querySelector('.badge'); const sev = sevEl?.classList.contains('warn') ? 2 : sevEl?.classList.contains('error') ? 1 : 3;
      const content = `
<div class="section" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
  <div>
    <div class="badge ${sev===1?'sev1':sev===2?'sev2':'sev3'}">Status</div>
    <ul style="margin:8px 0 0 16px; line-height:1.5">
      <li>Throughput: ~${(40+Math.random()*20).toFixed(0)} t/h</li>
      <li>Energy: ~${(30+Math.random()*25).toFixed(0)} MW</li>
      <li>Quality index: ${(80+Math.random()*15).toFixed(0)} / 100</li>
    </ul>
  </div>
  <div>
    <canvas id="mini_${name.replace(/\s+/g,'_')}" width="360" height="120"></canvas>
  </div>
</div>
<div class="section">
  <div style="font-size:13px;color:#cfe6ff">Quick actions</div>
  <div class="kbar" style="margin-top:8px">
    <button data-q="Give a 60-second operator briefing for ${name}.">Operator briefing</button>
    <button data-q="Identify likely constraints in ${name} and suggest low-risk optimizations.">Constraints & optimizations</button>
    <button data-q="What should we monitor closely in ${name} for the next 30 minutes?">What to monitor</button>
  </div>
</div>`;
      openInspector({
        title: `${name} — Area Inspector`,
        content,
        quickQs: [
          'Root causes for minor instability right now?',
          'Any interlocks or safety concerns likely to trigger?',
          'Suggest a short checklist to stabilize.'
        ],
        onAsk: (q)=>{
          const prompt = `You are Millie. Focus on area "${name}" (illustrative data). ${q} Use bullet points, be concise.`;
          sendMessage(prompt);
          document.getElementById('inspectModal')?.classList.add('hidden');
        }
      });
      // draw mini spark
      const cn = document.getElementById(`mini_${name.replace(/\s+/g,'_')}`);
      if (cn){
        const arr = Array.from({length:60},()=> 40 + Math.random()*20);
        spark(cn, arr);
      }
      // wire quick action buttons inside modal
      document.getElementById('inspectContent')?.querySelectorAll('[data-q]')?.forEach(btn=>{
        btn.addEventListener('click', ()=>{
          const q = btn.getAttribute('data-q');
          const prompt = `You are Millie. ${q} Provide actionable points.`;
          sendMessage(prompt);
          document.getElementById('inspectModal')?.classList.add('hidden');
        });
      });
    });

    // ===== Alarm Q&A modal (existing) =====
    function ensureAlarmModal(){
      if (!document.getElementById('alarmModal')){
        const styleId = 'alarmModalStyles';
        if (!document.getElementById(styleId)){
          const style = document.createElement('style');
          style.id = styleId;
          style.textContent = `
.modal{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(3,6,11,.6);backdrop-filter:blur(2px);z-index:1000}
.modal.hidden{display:none}
.modal-card{width:min(720px,92vw);background:#131b26;border:1px solid #1e293b;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.35);overflow:hidden}
.modal-header{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid #1e293b;background:#0d141d}
.modal-title{display:flex;gap:10px;align-items:center}
.modal-title h3{margin:0;font-size:16px;color:#e6f0ff}
.modal-close{background:transparent;color:#7a8aa0;border:none;font-size:18px;cursor:pointer}
.modal-body{padding:12px 14px;display:flex;flex-direction:column;gap:10px}
.alarm-text{padding:10px;border:1px dashed #1e293b;border-radius:10px;background:#0e1620;color:#cfe6ff}
.quick-qs{display:flex;gap:8px;flex-wrap:wrap}
.quick-qs .qq{background:#0f1924;border:1px solid #1e293b;color:#eaf2ff;border-radius:10px;padding:6px 10px;cursor:pointer;font-size:13px}
.modal-footer{display:flex;justify-content:flex-end;padding:12px 14px;border-top:1px solid #1e293b}
.modal-footer .primary{background:#2dd4bf;color:#002b28;border:none;padding:10px 14px;border-radius:10px;font-weight:700;cursor:pointer}
.badge{padding:4px 8px;border-radius:999px;font-size:12px;border:1px solid #1e293b}
.sev1{background:rgba(239,68,68,.15);color:#ef4444}
.sev2{background:rgba(245,158,11,.15);color:#f59e0b}
.sev3{background:rgba(34,197,94,.15);color:#22c55e}
          `;
          document.head.appendChild(style);
        }
        const wrap = document.createElement('div');
        wrap.innerHTML = `
<div id="alarmModal" class="modal hidden" role="dialog" aria-modal="true" aria-labelledby="alarmTitle">
  <div class="modal-card">
    <div class="modal-header">
      <div class="modal-title">
        <div class="badge sev2" id="alarmSev">S2</div>
        <h3 id="alarmTitle">Ask about alarm</h3>
      </div>
      <button class="modal-close" id="alarmClose" aria-label="Close">✕</button>
    </div>
    <div class="modal-body">
      <div class="alarm-text" id="alarmText"></div>
      <div class="quick-qs">
        <button class="qq" data-q="What is the likely root cause and how can we confirm it quickly?">Root cause</button>
        <button class="qq" data-q="What immediate actions should the operator take to stabilize the situation?">Immediate actions</button>
        <button class="qq" data-q="What is the expected impact on quality and production over the next 2 hours?">Impact</button>
      </div>
      <textarea id="alarmInput" rows="3" placeholder="Ask Millie about this alarm… (Ctrl/Cmd+Enter to send)"></textarea>
    </div>
    <div class="modal-footer">
      <button id="alarmSend" class="primary">Ask Millie</button>
    </div>
  </div>
</div>`;
        document.body.appendChild(wrap.firstElementChild);
      }
    }
    function getAlarmEls(){ return { modal:document.getElementById('alarmModal'), title:document.getElementById('alarmTitle'), text:document.getElementById('alarmText'), input:document.getElementById('alarmInput'), sev:document.getElementById('alarmSev'), close:document.getElementById('alarmClose'), send:document.getElementById('alarmSend') }; }
    function openAlarmModal(sev, text){
      ensureAlarmModal();
      requestAnimationFrame(()=>{
        const els = getAlarmEls();
        if (!els.sev || !els.modal) return;
        els.sev.className = 'badge sev' + (sev||2);
        els.sev.textContent = 'S' + (sev||2);
        els.title && (els.title.textContent = 'Ask about alarm');
        els.text && (els.text.textContent = text || '');
        if (els.input) els.input.value = '';
        els.modal.classList.remove('hidden');
        els.input?.focus();
      });
    }
    function closeAlarmModal(){ getAlarmEls().modal?.classList.add('hidden'); }
    function wireAlarmModal(){
      ensureAlarmModal();
      const els = getAlarmEls();
      els.close?.addEventListener('click', closeAlarmModal);
      els.modal?.addEventListener('click', (e)=>{ if (e.target===els.modal) closeAlarmModal(); });
      document.addEventListener('click', (e)=>{
        if (e.target.matches('.quick-qs .qq')){
          els.input.value = e.target.dataset.q || '';
          els.input.focus();
        }
      });
      els.send?.addEventListener('click', ()=>{
        const q = (els.input?.value || '').trim() || 'Provide a short operator briefing.';
        const augmented = `You are Millie, the pulp mill control assistant. An alarm was triggered: "${els.text?.textContent || ''}". The user asks: "${q}". For this demo, invent plausible operational details (clearly illustrative), give likely root causes, immediate actions, and near-term impact. Use bullet points and be concise.`;
        sendMessage(augmented);
        closeAlarmModal();
      });
      els.input?.addEventListener('keydown', (e)=>{ if ((e.ctrlKey || e.metaKey) && e.key === 'Enter'){ els.send?.click(); } });
    }
    incidentList?.addEventListener('click', (e)=>{
      const li = e.target.closest('li.incident'); if (!li) return;
      const sevBadge = li.querySelector('.sev');
      const sev = sevBadge ? Number((sevBadge.textContent||'S2').replace('S',''))||2 : 2;
      const text = (li.querySelector('.text')?.textContent || '').trim();
      openAlarmModal(sev, text || 'Unknown alarm'); wireAlarmModal();
    });

    // Default input
    document.getElementById('userInput') && (document.getElementById('userInput').value = 'Summarize plant status and key risks for the next 2 hours.');
  });
})();
