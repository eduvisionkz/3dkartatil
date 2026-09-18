(function(){
"use strict";

/* ---------------- NAV ---------------- */
const menuBtn = document.getElementById('menuBtn');
const navLinks = document.getElementById('navLinks');
menuBtn.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
});
navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  navLinks.classList.remove('open');
  menuBtn.setAttribute('aria-expanded', 'false');
}));

const navAnchors = [...document.querySelectorAll('[data-nav]')];
const sectionIds = navAnchors.map(a => a.getAttribute('href').slice(1));
const navObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navAnchors.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id));
    }
  });
}, { rootMargin: '-45% 0px -50% 0px' });
sectionIds.forEach(id => { const el = document.getElementById(id); if (el) navObserver.observe(el); });

/* ---------------- REVEAL ON SCROLL ---------------- */
const revealEls = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); revealObserver.unobserve(e.target); } });
}, { threshold: 0.12 });
revealEls.forEach(el => revealObserver.observe(el));
// Safety net: if IntersectionObserver ever fails to fire (unsupported browser, timing edge case),
// force all reveal sections visible after a short delay so content is never permanently hidden.
setTimeout(() => {
  document.querySelectorAll('.reveal:not(.in)').forEach(el => el.classList.add('in'));
}, 1200);

/* ---------------- HERO DECORATIVE ART ---------------- */
(function heroArt(){
  const kz = document.getElementById('heroKZ');
  const dots = document.getElementById('heroDots');
  if (!kz) return;
  kz.innerHTML = '<path d="M60,220 C70,150 150,100 220,95 C270,92 300,70 360,78 C420,85 460,110 480,150 C495,178 485,205 470,225 C455,245 425,238 410,258 C395,278 388,300 358,312 C328,325 290,320 260,335 C225,350 180,343 150,325 C120,308 105,275 90,250 C75,225 55,238 60,220 Z" opacity="0.85"/>';
  const pts = [[220,140],[300,160],[150,240],[380,190],[260,280],[330,240],[200,300]];
  dots.innerHTML = pts.map((p,i) => `<circle class="pulse" cx="${p[0]}" cy="${p[1]}" r="4.5" fill="#2f9e9e" style="animation-delay:${i*0.3}s"></circle>`).join('');
})();

/* ---------------- MAP: build region hotspots (real boundary data) ---------------- */
const oblastsLayer = document.getElementById('oblastsLayer');
const regionsLayer = document.getElementById('regionsLayer');
const legendEl = document.getElementById('mapLegend');
let activePeriod = 'khanate';
let selectedRegionId = null;

function buildMap(){
  // base layer: all 20 administrative units (real geometry), non-target ones shown as soft context shapes
  oblastsLayer.innerHTML = KZ_MAP.regions
    .filter(r => !r.targetId)
    .map(r => `<path class="oblast-path" d="${r.d}"><title>${r.name}</title></path>`)
    .join('');

  // interactive layer: only the 7 studied regions, using their real geometry
  regionsLayer.innerHTML = KZ_MAP.regions
    .filter(r => r.targetId)
    .map(geo => {
      const r = REGIONS.find(x => x.id === geo.targetId);
      const active = r.period.includes(activePeriod);
      return `
      <g class="region-hot" data-id="${r.id}" tabindex="0" role="button"
         aria-label="${r.name} — ақпаратты ашу"
         style="opacity:${active ? 1 : .45}">
        <path d="${geo.d}" fill="${r.color}" fill-opacity="${active ? 0.72 : 0.4}"></path>
        <text class="region-label" x="${geo.cx}" y="${geo.cy}" text-anchor="middle">${r.name.replace(' облысы','').replace(' қаласы','')}</text>
      </g>`;
    }).join('');

  regionsLayer.querySelectorAll('.region-hot').forEach(g => {
    g.addEventListener('click', () => selectRegion(g.dataset.id));
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectRegion(g.dataset.id); } });
  });

  legendEl.innerHTML = REGIONS.map(r => `<span><i style="background:${r.color}"></i>${r.name}</span>`).join('') +
    `<span><i style="background:#e3e8eb;border:1px solid #cfd6db"></i>Зерттеуге алынбаған облыстар</span>`;
}

function selectRegion(id){
  selectedRegionId = id;
  document.querySelectorAll('.region-hot').forEach(g => g.classList.toggle('active', g.dataset.id === id));
  renderPanel(id);
}

function renderPanel(id){
  const r = REGIONS.find(x => x.id === id);
  const panel = document.getElementById('panelInner');
  if (!r) { panel.className = 'rp-empty'; panel.innerHTML = 'Өңірді тізімнен немесе картадан таңдаңыз.'; return; }
  panel.className = '';
  panel.innerHTML = `
    <div class="rp-header" style="background:linear-gradient(135deg, ${r.color}, ${shade(r.color)})">
      <h3>${r.name}</h3>
      <div class="rp-sub">${PERIODS.filter(p => r.period.includes(p.id)).map(p=>p.label).join(' · ')}</div>
    </div>
    <div class="rp-body">
      <h4>Қысқаша сипаттама</h4>
      <p>${r.desc}</p>
      <h4>Тілдік ортаның қалыптасуы</h4>
      <p>${r.lang}</p>
      ${r.langHistory ? `<h4>Тіл тарихы</h4><p>${r.langHistory}</p>` : ''}
      ${r.note ? `<div class="fact-note">${r.note}</div>` : ''}
      <h4>Карта белгілері</h4>
      <div class="chip-row">${r.markers.map(m => `<span class="chip">${m}</span>`).join('')}</div>
      <h4>Негізгі ұғымдар</h4>
      <div class="chip-row">${r.concepts.map(c => `<span class="chip">${c}</span>`).join('')}</div>
      <div>
        <a class="rp-source" href="${r.source.url}" target="_blank" rel="noopener">Ресми дереккөз →</a>
        ${r.source2 ? `<br><a class="rp-source" href="${r.source2.url}" target="_blank" rel="noopener">Қосымша дереккөз →</a>` : ''}
      </div>
    </div>
    <div class="rp-nav">
      <button id="prevRegion">← алдыңғы</button>
      <button id="nextRegion">келесі →</button>
    </div>
  `;
  document.getElementById('prevRegion').addEventListener('click', () => step(-1));
  document.getElementById('nextRegion').addEventListener('click', () => step(1));
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function step(dir){
  const idx = REGIONS.findIndex(r => r.id === selectedRegionId);
  const next = REGIONS[(idx + dir + REGIONS.length) % REGIONS.length];
  selectRegion(next.id);
}
function shade(hex){
  // slightly lighten a hex color for gradient partner
  const c = hex.replace('#','');
  const num = parseInt(c,16);
  let r = Math.min(255, (num>>16)+40), g = Math.min(255, ((num>>8)&0xff)+40), b = Math.min(255,(num&0xff)+40);
  return `rgb(${r},${g},${b})`;
}

/* ---------------- MAP CONTROLS (2D rotate/zoom — no 3D perspective, avoids SVG render bugs) ---------------- */
const wrap = document.getElementById('kzsvg-wrap');
let rotZ = 0, zoom = 1;
function applyTransform(){
  wrap.style.transform = `rotate(${rotZ}deg) scale(${zoom})`;
}
document.getElementById('rotL').addEventListener('click', () => { rotZ -= 8; applyTransform(); });
document.getElementById('rotR').addEventListener('click', () => { rotZ += 8; applyTransform(); });
document.getElementById('zoomIn').addEventListener('click', () => { zoom = Math.min(1.6, zoom + 0.12); applyTransform(); });
document.getElementById('zoomOut').addEventListener('click', () => { zoom = Math.max(0.7, zoom - 0.12); applyTransform(); });
document.getElementById('resetMap').addEventListener('click', () => { rotZ = 0; zoom = 1; applyTransform(); selectedRegionId=null; document.querySelectorAll('.region-hot').forEach(g=>g.classList.remove('active')); renderPanel(null); });
let labelsOn = true;
document.getElementById('toggleLabels').addEventListener('click', () => {
  labelsOn = !labelsOn;
  document.querySelectorAll('.region-label').forEach(l => l.style.display = labelsOn ? '' : 'none');
});
// touch/mouse drag to rotate (2D)
let dragging = false, lastX = 0;
wrap.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; });
window.addEventListener('pointerup', () => dragging = false);
window.addEventListener('pointermove', e => {
  if (!dragging) return;
  const dx = e.clientX - lastX; lastX = e.clientX;
  rotZ += dx * 0.15;
  applyTransform();
});
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  wrap.style.transition = 'none';
}
applyTransform();

/* ---------------- TIMELINE / PERIODS ---------------- */
const periodButtons = document.getElementById('periodButtons');
const periodContent = document.getElementById('periodContent');
const periodIndicator = document.getElementById('periodIndicator');
const periodMini = document.getElementById('periodMini');

function buildPeriods(){
  periodButtons.innerHTML = PERIODS.map(p => `
    <button class="period-btn ${p.id===activePeriod?'active':''}" data-id="${p.id}">
      <b>${p.label}</b><span>${p.years}</span>
    </button>`).join('');
  periodButtons.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => setPeriod(btn.dataset.id));
  });
  renderPeriodContent();
  updateIndicator();
}
function updateIndicator(){
  const idx = PERIODS.findIndex(p => p.id === activePeriod);
  const pct = (idx / (PERIODS.length - 1)) * 100;
  periodIndicator.style.left = `calc(${pct}% - 5px)`;
  periodMini.textContent = PERIODS.find(p=>p.id===activePeriod).label;
}
function setPeriod(id){
  activePeriod = id;
  periodButtons.querySelectorAll('.period-btn').forEach(b => b.classList.toggle('active', b.dataset.id === id));
  updateIndicator();
  renderPeriodContent();
  buildMap(); // refresh region opacity/relevance on map
  if (selectedRegionId) renderPanel(selectedRegionId);
}
function renderPeriodContent(){
  const p = PERIODS.find(x => x.id === activePeriod);
  const related = REGIONS.filter(r => r.period.includes(activePeriod));
  periodContent.innerHTML = `
    <div class="card">
      <h3 style="color:var(--sapphire-deep);font-size:18px">${p.label} <span style="color:#7a8899;font-weight:500;font-size:13px">(${p.years})</span></h3>
      <p style="margin-top:10px;color:#4a5a6a;font-size:14.5px">${p.desc}</p>
      <div class="fact-note">Нақты дата/пайыз көрсетілмеген тұстар «дерек нақтылануда» деп белгіленеді.</div>
    </div>
    <div class="card">
      <h3 style="color:var(--sapphire-deep);font-size:18px">Осы кезеңмен байланысты өңірлер</h3>
      <div class="chip-row" style="margin-top:12px">
        ${related.map(r => `<span class="chip" style="cursor:pointer" data-jump="${r.id}">${r.name}</span>`).join('')}
      </div>
    </div>
  `;
  periodContent.querySelectorAll('[data-jump]').forEach(el => {
    el.addEventListener('click', () => {
      document.getElementById('map').scrollIntoView({ behavior: 'smooth' });
      selectRegion(el.dataset.jump);
    });
  });
}

/* ---------------- COMPARE ---------------- */
const comparePicker = document.getElementById('comparePicker');
const compareTable = document.getElementById('compareTable');
let picked = [REGIONS[0].id, REGIONS[6].id];

function buildCompare(){
  comparePicker.innerHTML = REGIONS.map(r => `
    <button class="pick-chip ${picked.includes(r.id)?'on':''}" data-id="${r.id}">${r.name}</button>
  `).join('');
  comparePicker.querySelectorAll('.pick-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      if (picked.includes(id)) {
        picked = picked.filter(x => x !== id);
      } else {
        if (picked.length >= 3) picked.shift();
        picked.push(id);
      }
      buildCompare();
      renderCompareTable();
    });
  });
  renderCompareTable();
}
function renderCompareTable(){
  const chosen = REGIONS.filter(r => picked.includes(r.id));
  if (chosen.length === 0) { compareTable.innerHTML = '<tr><td style="padding:20px">Кемінде бір өңір таңдаңыз.</td></tr>'; return; }
  let html = '<thead><tr><th>Өлшем</th>' + chosen.map(r => `<th>${r.name}</th>`).join('') + '</tr></thead><tbody>';
  CRITERIA.forEach(c => {
    html += `<tr><td class="crit">${c.label}</td>` + chosen.map(r => `<td>${COMPARE_DATA[r.id][c.key]}</td>`).join('') + '</tr>';
  });
  html += '</tbody>';
  compareTable.innerHTML = html;
}

/* ---------------- REAL STATS / CHARTS ---------------- */
function renderStats(){
  const grid = document.getElementById('statsGrid');
  const ethnicMax = Math.max(...REAL_STATS.ethnic2021.map(e => e.value));
  const popMax = Math.max(...REAL_STATS.regionalPopulation.filter(r => !r.pending).map(r => r.value));

  grid.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <h4>Қазақстанның ұлттық құрамы</h4>
        <div class="stat-meta">2021 жылғы санақ, % үлесі</div>
        ${REAL_STATS.ethnic2021.map(e => `
          <div class="bar-row">
            <span class="bar-label">${e.label}</span>
            <div class="bar-track"><div class="bar-fill" style="width:0%;background:linear-gradient(90deg,var(--sapphire),var(--turquoise))" data-w="${(e.value/ethnicMax*100).toFixed(1)}"></div></div>
            <span class="bar-val">${e.value}%</span>
          </div>`).join('')}
        <div class="stat-source">Дереккөз: <a href="${REAL_STATS.sourceUrl}" target="_blank" rel="noopener">${REAL_STATS.sourceLabel}</a></div>
      </div>

      <div class="stat-card">
        <h4>Халық санының өзгеруі және мемлекеттік тілді меңгеру</h4>
        <div class="stat-meta">Қазақстан бойынша, жалпы</div>
        <div class="big-stat-row">
          <div class="big-stat"><b>${REAL_STATS.population.y2009.toLocaleString('ru-RU')}</b><span>2009 ж. халық саны</span></div>
          <div class="big-stat"><b>${REAL_STATS.population.y2021.toLocaleString('ru-RU')}</b><span>2021 ж. халық саны</span></div>
        </div>
        <div style="margin-top:22px">
          <div class="bar-row">
            <span class="bar-label">Мемл. тілді меңгерген</span>
            <div class="bar-track"><div class="bar-fill" style="width:0%;background:var(--bronze)" data-w="${REAL_STATS.stateLanguage2021.knows}"></div></div>
            <span class="bar-val">${REAL_STATS.stateLanguage2021.knows}%</span>
          </div>
          <div class="bar-row">
            <span class="bar-label">Меңгермеген</span>
            <div class="bar-track"><div class="bar-fill" style="width:0%;background:#c7cdd3" data-w="${REAL_STATS.stateLanguage2021.doesNotKnow}"></div></div>
            <span class="bar-val">${REAL_STATS.stateLanguage2021.doesNotKnow}%</span>
          </div>
        </div>
        <div class="stat-source">5 және одан жоғары жастағы халық, мемлекеттік тілді меңгеру деңгейі бойынша. Дереккөз: <a href="${REAL_STATS.sourceUrl}" target="_blank" rel="noopener">Ұлттық статистика бюросы</a></div>
      </div>

      <div class="stat-card" style="grid-column:1/-1">
        <h4>Өңірлер бойынша халық саны</h4>
        <div class="stat-meta">${REAL_STATS.regionalPopulationDate} жағдай бойынша, ресми ағымдағы статистика</div>
        ${REAL_STATS.regionalPopulation.map(r => `
          <div class="bar-row">
            <span class="bar-label">${r.label}</span>
            <div class="bar-track"><div class="bar-fill" style="width:0%;background:linear-gradient(90deg,var(--sapphire),var(--turquoise))" data-w="${(r.value/popMax*100).toFixed(1)}"></div></div>
            <span class="bar-val">${r.value.toLocaleString('ru-RU')}</span>
          </div>`).join('')}
        <div class="stat-source">Дереккөз: <a href="${REAL_STATS.regionalPopulationSourceUrl}" target="_blank" rel="noopener">stat.gov.kz/region</a> — барлық облыстар бойынша ағымдағы ресми деректер</div>
      </div>

      <div class="stat-card" style="grid-column:1/-1">
        <h4>Облыс деңгейіндегі ұлттық құрам және мемлекеттік тілді меңгеру</h4>
        <div class="stat-meta">2021 жылғы Ұлттық халық санағы, «Қысқаша қорытындылар» жинағы (3.2 және 5.2-кестелер)</div>
        <div id="ethnicRows" style="margin-top:16px"></div>
        <div class="ethnic-legend2" id="ethnicLegend"></div>
        <div class="fact-note">Абай облысы бөлек көрсетілмеген — 2021 жылғы санақ кезінде (2021 ж. қыркүйек) ол әлі жеке облыс болмай, Шығыс Қазақстан облысының құрамында есептелген. Абай облысы 2022 жылдың наурызында құрылды.</div>
      </div>
    </div>
  `;

  // animate bars in once visible
  const bars = grid.querySelectorAll('.bar-fill[data-w]');
  const barObserver = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        en.target.style.width = en.target.dataset.w + '%';
        barObserver.unobserve(en.target);
      }
    });
  }, { threshold: 0.3 });
  bars.forEach(b => barObserver.observe(b));

  renderEthnicByRegion();
}

const ETHNIC_COLORS = {
  kazakh: "#1a3a6b", russian: "#c99a63", uzbek: "#2f9e9e", ukrainian: "#a9793f",
  german: "#7a5a9e", tatar: "#5b6a7a", azeri: "#b25b5b", korean: "#3e7ae0", uyghur: "#e0a33e"
};
const ETHNIC_LABELS = {
  kazakh: "Қазақ", russian: "Орыс", uzbek: "Өзбек", ukrainian: "Украин",
  german: "Немiс", tatar: "Татар", azeri: "Әзірбайжан", korean: "Кәрiс", uyghur: "Ұйғыр"
};
function renderEthnicByRegion(){
  const rowsEl = document.getElementById('ethnicRows');
  if (!rowsEl) return;
  const order = ["turkistan","mangistau","sko","vko","karaganda","almaty"];
  const usedKeys = new Set();
  rowsEl.innerHTML = order.map(id => {
    const e = REAL_STATS.regionalEthnic[id];
    const lang = REAL_STATS.regionalLanguage[id];
    const region = REGIONS.find(x => x.id === id);
    const keys = Object.keys(ETHNIC_LABELS).filter(k => e[k] !== undefined);
    const shown = keys.filter(k => e[k] >= 1); // тек 1%-дан асатындарды белгілеймін, қалғаны "басқа"-ға кетеді
    const restPct = Math.max(0, 100 - shown.reduce((s,k) => s + e[k], 0));
    const segs = shown.map(k => { usedKeys.add(k); return { key: k, pct: e[k], color: ETHNIC_COLORS[k] }; });
    if (restPct > 0.5) segs.push({ key: "other", pct: restPct, color: '#d8dde1' });
    const noteHtml = e.note ? `<div class="fact-note" style="margin-top:6px">${e.note}</div>` : '';
    return `
      <div class="ethnic-row">
        <div class="er-label"><span>${region.name}</span><span class="er-lang">мемл. тілді меңгерген: ${lang.knows}%</span></div>
        <div class="ethnic-stack">
          ${segs.map(s => `<span style="width:0%;background:${s.color}" data-w="${s.pct.toFixed(2)}" title="${s.key==='other'?'Басқа':ETHNIC_LABELS[s.key]}: ${s.pct.toFixed(1)}%">${s.pct >= 8 ? (s.key==='other'?'Басқа':ETHNIC_LABELS[s.key]) + ' ' + s.pct.toFixed(0) + '%' : ''}</span>`).join('')}
        </div>
        ${noteHtml}
      </div>`;
  }).join('');

  document.getElementById('ethnicLegend').innerHTML = [...usedKeys].map(k => {
    return `<span><i style="background:${ETHNIC_COLORS[k]}"></i>${ETHNIC_LABELS[k]}</span>`;
  }).join('') + `<span><i style="background:#d8dde1"></i>Басқа</span>`;

  const segBars = rowsEl.querySelectorAll('.ethnic-stack span[data-w]');
  const segObserver = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.style.width = en.target.dataset.w + '%'; segObserver.unobserve(en.target); } });
  }, { threshold: 0.3 });
  segBars.forEach(b => segObserver.observe(b));
}

/* ---------------- METHOD ---------------- */
document.getElementById('methodSteps').innerHTML = METHOD_STEPS.map((s,i) => `
  <div class="method-step reveal">
    <div class="num">${String(i+1).padStart(2,'0')}</div>
    <h4>${s.title}</h4>
    <p>${s.desc}</p>
  </div>`).join('');
document.querySelectorAll('#methodSteps .reveal').forEach(el => revealObserver.observe(el));
document.getElementById('methodList').innerHTML = METHOD_LIST.map(m => `<div>${m}</div>`).join('');

/* ---------------- SOURCES ---------------- */
document.getElementById('sourceList').innerHTML = SOURCES.map(s => `
  <div class="source-item">
    <span>${s.label}</span>
    <a href="${s.url}" target="_blank" rel="noopener">Ашу →</a>
  </div>`).join('');

/* ---------------- QUIZ ---------------- */
let qIndex = 0, qScore = 0, qAnswered = false;
const quizCard = document.getElementById('quizCard');

function renderQuiz(){
  if (qIndex >= QUIZ.length) { renderQuizResult(); return; }
  qAnswered = false;
  const q = QUIZ[qIndex];
  quizCard.innerHTML = `
    <div class="quiz-progress"><i style="width:${(qIndex/QUIZ.length)*100}%"></i></div>
    <div class="q-count">Сұрақ ${qIndex+1} / ${QUIZ.length}</div>
    <div class="q-text">${q.q}</div>
    <div class="q-opts">${q.opts.map((o,i) => `<button class="q-opt" data-i="${i}">${o}</button>`).join('')}</div>
    <div class="q-explain" id="qExplain">${q.exp}</div>
    <div class="quiz-actions">
      <button class="btn btn-ghost" id="qRestart">Қайта бастау</button>
      <button class="btn btn-primary" id="qNext" style="display:none">Келесі сұрақ</button>
    </div>
  `;
  quizCard.querySelectorAll('.q-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      if (qAnswered) return;
      qAnswered = true;
      const i = Number(btn.dataset.i);
      quizCard.querySelectorAll('.q-opt').forEach((b,bi) => {
        if (bi === q.correct) b.classList.add('correct');
        else if (bi === i) b.classList.add('wrong');
      });
      if (i === q.correct) qScore++;
      document.getElementById('qExplain').style.display = 'block';
      document.getElementById('qNext').style.display = 'inline-flex';
    });
  });
  document.getElementById('qNext').addEventListener('click', () => { qIndex++; renderQuiz(); });
  document.getElementById('qRestart').addEventListener('click', resetQuiz);
}
function renderQuizResult(){
  quizCard.innerHTML = `
    <div class="quiz-result">
      <div class="q-count">Нәтиже</div>
      <div class="score">${qScore} / ${QUIZ.length}</div>
      <p style="color:#5b6a7a;margin-top:8px">${resultMsg(qScore)}</p>
      <div class="quiz-result-actions">
        <button class="btn btn-primary" id="qAgain">Тестті қайта бастау</button>
        <button class="btn btn-ghost" id="qShare">Нәтижені көшіру</button>
      </div>
    </div>
  `;
  document.getElementById('qAgain').addEventListener('click', resetQuiz);
  document.getElementById('qShare').addEventListener('click', async () => {
    const text = `Мен «Қазақстанның тарихи-тілдік картасы» тестінен ${qScore}/${QUIZ.length} ұпай жинадым!`;
    try { await navigator.clipboard.writeText(text); document.getElementById('qShare').textContent = 'Көшірілді ✓'; }
    catch { document.getElementById('qShare').textContent = text; }
  });
}
function resultMsg(score){
  if (score === QUIZ.length) return 'Тамаша! Барлық материалды жақсы меңгергенсіз.';
  if (score >= QUIZ.length * 0.7) return 'Жақсы нәтиже! Кейбір бөлімдерді қайта қарап шығуға болады.';
  return 'Материалды қайта оқып, тестті қайта тапсырып көріңіз.';
}
function resetQuiz(){ qIndex = 0; qScore = 0; renderQuiz(); }

/* ---------------- ARCHIVAL DOCUMENT: ALPHABET HISTORY ---------------- */
function renderAlphabetHistory(){
  const el = document.getElementById('alphabetTimeline');
  if (!el) return;
  el.innerHTML = ALPHABET_HISTORY.map(item => `
    <div class="archive-item">
      <div class="archive-year">${item.year}<span>${item.label}</span></div>
      <div>
        <div class="archive-title">${item.title}</div>
        <div class="archive-desc">${item.desc}</div>
        ${item.quote ? `<div class="archive-quote">${item.quote}${item.quoteNote ? `<cite>${item.quoteNote}</cite>` : ''}</div>` : ''}
        <a class="archive-source" href="${item.source.url}" target="_blank" rel="noopener">${item.source.label} →</a>
      </div>
    </div>`).join('');
}

/* ---------------- INIT ---------------- */
buildMap();
buildPeriods();
renderAlphabetHistory();
buildCompare();
renderStats();
renderQuiz();
})();
