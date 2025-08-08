// Control Center Pro — Full app.js
// - DOMContentLoaded guard
// - Robust LLM response parsing (supports `openai_response` etc.)
// - Modal injected at runtime for "Ask about alarm"
// - Event delegation for incidents

const apiURL = 'https://anssi-openai-gateway.azurewebsites.net/api/http_trigger';
const apiKey = 'qQGNldzEhrEKBq8v4HRBRs2eKRgVu27h';
const systemPrompt = "You are Millie, a confident and direct AI control assistant for a pulp mill control room. Provide clear, concise answers and avoid speculation.";

(function main(){
  function onReady(fn){
    if (document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else { fn(); }
  }

  onReady(()=>{
    const DEPARTMENTS = ['Wood Handling','Pulping','Bleaching','Recovery','Utilities','Water Treatment','QC Lab','Shipping'];
    const $ = s => document.querySelector(s);
    const $$ = s => Array.from(document.querySelectorAll(s));

    //=============== Clock ===============//
    function tickClock(){
      const el = $('#clock');
      if (el) el.textContent = new Date().toLocaleString();
    }
    setInterval(tickClock, 1000); tickClock();

    //=============== Mini Charts ===============//
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

    //=============== Chat Helpers ===============//
    async function* fakeStream(text){
      const str = String(text ?? '');
      for (let i=0;i<str.length;i+=3){
        yield str.slice(i, i+3);
        await new Promise(r=>setTimeout(r,12));
      }
    }
    function appendMsg(role, content){
      const wrap = document.createElement('div');
      wrap.className = `msg ${role}`;
      wrap.innerHTML = `<div class="role">${role==='user'?'🧑':'🤖'}</div><div class="bubble"></div>`;
      wrap.querySelector('.bubble').textContent = content;
      const log = document.getElementById('chatLog');
      if (log){ log.appendChild(wrap); log.scrollTop = log.scrollHeight; }
      return wrap.querySelector('.bubble');
    }
    async function callLLM(userText, imageDataUrl){
      const payload = { system_prompt: systemPrompt, user_input: userText };
      if (imageDataUrl){ payload.image_url = imageDataUrl; }

      const res = await fetch(apiURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify(payload)
      });
      if (!res.ok){
        const t = await res.text();
        throw new Error(`API error ${res.status}: ${t}`);
      }
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
      } catch(e){
        return String(resp);
      }
    }
    async function sendMessage(text){
      if (!text.trim()) return;
      appendMsg('user', text);
      const asstBubble = appendMsg('assistant', '…');
      try {
        const imgInput = document.getElementById('imageInput');
        let imgData = null;
        if (imgInput && imgInput.files && imgInput.files[0]){
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
          const log = document.getElementById('chatLog');
          if (log) log.scrollTop = log.scrollHeight;
        }
      } catch (e){
        asstBubble.textContent = String(e.message || e);
      }
    }

    //=============== Wire composer ===============//
    document.getElementById('sendBtn')?.addEventListener('click', ()=> sendMessage(document.getElementById('userInput').value));
    document.getElementById('userInput')?.addEventListener('keydown', e=>{
      if (e.key==='Enter' && (e.metaKey || e.ctrlKey)){ sendMessage(document.getElementById('userInput').value); }
    });
    $$('.presets button').forEach(b=> b.addEventListener('click',()=>{
      const ui = document.getElementById('userInput');
      if (ui){ ui.value = b.dataset.prompt; ui.focus(); }
    }));

    //=============== Departments & KPIs ===============//
    function randomStatus(){ const r=Math.random(); return r>0.88?'error': r>0.7?'warn':'ok'; }
    function badge(status){ const label = status==='ok'?'OK':status==='warn'?'ATTN':'ALARM'; return `<span class="badge ${status}">${label}</span>`; }
    function renderDepartments(){
      const grid = document.getElementById('deptGrid'); if(!grid) return;
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

    const state = { energy:55, steam:180, yield:48, emissions:12, energySeries:Array.from({length:60},()=>40+Math.random()*20), gradeMix:[52,28,20] };
    function updateKPIs(){
      ring(document.getElementById('kpiEnergy'), state.energy, 100, '#22c55e');
      ring(document.getElementById('kpiSteam'), state.steam, 300, '#60a5fa');
      ring(document.getElementById('kpiYield'), state.yield, 80, '#f59e0b');
      ring(document.getElementById('kpiEmissions'), state.emissions, 80, '#ef4444');
      const ev=document.getElementById('kpiEnergyVal'); if(ev) ev.textContent = `${state.energy.toFixed(0)} MW`;
      const sv=document.getElementById('kpiSteamVal'); if(sv) sv.textContent = `${state.steam.toFixed(0)} t/h`;
      const yv=document.getElementById('kpiYieldVal'); if(yv) yv.textContent = `${state.yield.toFixed(0)} %`;
      const emv=document.getElementById('kpiEmissionsVal'); if(emv) emv.textContent = `${state.emissions.toFixed(0)} ppm`;
      spark(document.getElementById('energyTrend'), state.energySeries);
      const ctx = document.getElementById('gradeMix')?.getContext('2d');
      if (ctx){
        const w= ctx.canvas.width, h=ctx.canvas.height;
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
    }
    updateKPIs();
    setInterval(()=>{
      state.energy = Math.max(35, Math.min(90, state.energy + (Math.random()*6-3)));
      state.steam = Math.max(120, Math.min(260, state.steam + (Math.random()*12-6)));
      state.yield = Math.max(40, Math.min(70, state.yield + (Math.random()*2-1)));
      state.emissions = Math.max(6, Math.min(35, state.emissions + (Math.random()*2-1)));
      state.energySeries.push(40+Math.random()*20); state.energySeries.shift();
      updateKPIs();
    }, 3000);

    //=============== Incidents list ===============//
    const incidentList = document.getElementById('incidentList');
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
    setInterval(()=>{
      const sev = Math.random()<0.15?1: (Math.random()<0.5?2:3);
      const txt = incidentPool[Math.floor(Math.random()*incidentPool.length)];
      pushIncident(sev, txt);
    }, 7000);

    //=============== Alarm Q&A — runtime modal ===============//
    function ensureAlarmModal(){
      if (!document.getElementById('alarmModal')){
        // Inject CSS once
        const styleId = 'alarmModalStyles';
        if (!document.getElementById(styleId)){
          const style = document.createElement('style');
          style.id = styleId;
          style.textContent = `
.modal{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(3,6,11,.6);backdrop-filter:blur(2px);z-index:1000}
.modal.hidden{display:none}
.modal-card{width:min(720px,92vw);background:var(--card, #131b26);border:1px solid var(--border, #1e293b);border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.35);overflow:hidden}
.modal-header{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid var(--border, #1e293b);background:#0d141d}
.modal-title{display:flex;gap:10px;align-items:center}
.modal-title h3{margin:0;font-size:16px;color:#e6f0ff}
.modal-close{background:transparent;color:var(--muted, #7a8aa0);border:none;font-size:18px;cursor:pointer}
.modal-body{padding:12px 14px;display:flex;flex-direction:column;gap:10px}
.alarm-text{padding:10px;border:1px dashed var(--border, #1e293b);border-radius:10px;background:#0e1620;color:#cfe6ff}
.quick-qs{display:flex;gap:8px;flex-wrap:wrap}
.quick-qs .qq{background:#0f1924;border:1px solid var(--border, #1e293b);color:var(--text, #eaf2ff);border-radius:10px;padding:6px 10px;cursor:pointer;font-size:13px}
.modal-footer{display:flex;justify-content:flex-end;padding:12px 14px;border-top:1px solid var(--border, #1e293b)}
.modal-footer .primary{background:var(--accent, #2dd4bf);color:#002b28;border:none;padding:10px 14px;border-radius:10px;font-weight:700;cursor:pointer}
.badge{padding:4px 8px;border-radius:999px;font-size:12px;border:1px solid var(--border, #1e293b)}
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
    function getEls(){
      return {
        modal: document.getElementById('alarmModal'),
        title: document.getElementById('alarmTitle'),
        text: document.getElementById('alarmText'),
        input: document.getElementById('alarmInput'),
        sev: document.getElementById('alarmSev'),
        close: document.getElementById('alarmClose'),
        send: document.getElementById('alarmSend')
      };
    }
    function openAlarmModal(sev, text){
      ensureAlarmModal();
      requestAnimationFrame(()=>{
        let els = getEls();
        if (!els.sev || !els.modal){ console.warn('Alarm modal missing'); return; }
        els.sev.className = 'badge sev' + (sev||2);
        els.sev.textContent = 'S' + (sev||2);
        els.title && (els.title.textContent = 'Ask about alarm');
        els.text && (els.text.textContent = text || '');
        if (els.input) els.input.value = '';
        els.modal.classList.remove('hidden');
        els.input?.focus();
      });
    }
    function closeAlarmModal(){ getEls().modal?.classList.add('hidden'); }
    function wireModal(){
      ensureAlarmModal();
      const els = getEls();
      els.close?.addEventListener('click', closeAlarmModal);
      els.modal?.addEventListener('click', (e)=>{ if (e.target === els.modal) closeAlarmModal(); });
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
      els.input?.addEventListener('keydown', (e)=>{
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter'){ els.send?.click(); }
      });
    }

    // Delegated clicks on incidents (covers future items too)
    incidentList?.addEventListener('click', (e)=>{
      const li = e.target.closest('li.incident'); if (!li) return;
      const sevBadge = li.querySelector('.sev');
      const sev = sevBadge ? Number((sevBadge.textContent||'S2').replace('S',''))||2 : 2;
      const text = (li.querySelector('.text')?.textContent || '').trim();
      openAlarmModal(sev, text || 'Unknown alarm');
      wireModal();
    });

    // Default demo input text
    const def = document.getElementById('userInput');
    if (def) def.value = 'Summarize plant status and key risks for the next 2 hours.';
  });
})();
