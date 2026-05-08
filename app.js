const METRICS = [
  { id: 'bonheur',      label: 'Bonheur' },
  { id: 'productivite', label: 'Productivité' },
  { id: 'energie',      label: 'Énergie' },
  { id: 'sommeil',      label: 'Sommeil' },
  { id: 'alimentation', label: 'Alimentation' },
  { id: 'stress',       label: 'Stress (inv.)' },
  { id: 'gratitude',    label: 'Gratitude' },
  { id: 'sport',        label: 'Sport' }
];

const BANDS = [
  { min: 90, label: 'Excellente journée' },
  { min: 75, label: 'Très bonne journée' },
  { min: 60, label: 'Bonne journée' },
  { min: 45, label: 'Journée correcte' },
  { min: 30, label: 'Journée difficile' },
  { min: 0,  label: 'Journée très difficile' }
];

/* ── Storage ── */
let entries = {};

function loadAll() {
  try {
    const raw = localStorage.getItem('emotion_all');
    if (raw) entries = JSON.parse(raw);
  } catch (e) {}
}

function saveAll() {
  try { localStorage.setItem('emotion_all', JSON.stringify(entries)); } catch (e) {}
}

/* ── Helpers ── */
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(str) {
  const d = new Date(str + 'T12:00:00');
  return d.toLocaleDateString('fr-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function getBand(score) {
  return BANDS.find(b => score >= b.min) || BANDS[BANDS.length - 1];
}

function calcScore(vals) {
  const avg = METRICS.reduce((sum, m) => sum + (vals[m.id] || 5), 0) / METRICS.length;
  return Math.round(avg * 10);
}

function calcStreak() {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (entries[d.toISOString().slice(0, 10)]) streak++;
    else break;
  }
  return streak;
}

function cellColor(score) {
  const pct = score / 100;
  const r = Math.round(180 - pct * 151);
  const g = Math.round(45  + pct * 113);
  const b = Math.round(30  + pct * 87);
  return `rgba(${r},${g},${b},0.2)`;
}

/* ── Header date ── */
function setHeaderDate() {
  const d = new Date();
  const label = d.toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' });
  document.getElementById('header-date').textContent = label.charAt(0).toUpperCase() + label.slice(1);
}

/* ── Tabs ── */
function initTabs() {
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      const section = document.getElementById('section-' + btn.dataset.tab);
      if (section) section.classList.add('active');
      if (btn.dataset.tab === 'calendar') renderCalendar();
      if (btn.dataset.tab === 'stats') renderStats();
    });
  });
}

/* ── Journal ── */
let sliderVals = {};
METRICS.forEach(m => { sliderVals[m.id] = 5; });

function buildSliders() {
  const container = document.getElementById('sliders');
  METRICS.forEach(m => {
    const div = document.createElement('div');
    div.className = 'slider-block';
    div.innerHTML = `
      <div class="slider-header">
        <span class="slider-name">${m.label}</span>
        <span class="slider-val" id="val-${m.id}">5</span>
      </div>
      <input type="range" min="1" max="10" value="5" step="1" id="sl-${m.id}" />
    `;
    container.appendChild(div);
    div.querySelector('input').addEventListener('input', e => {
      sliderVals[m.id] = parseInt(e.target.value);
      document.getElementById('val-' + m.id).textContent = e.target.value;
      updateLiveScore();
    });
  });
}

function updateLiveScore() {
  const score = calcScore(sliderVals);
  document.getElementById('live-score').textContent = score;
  document.getElementById('score-band').textContent = getBand(score).label;
}

function saveEntry() {
  const note = document.getElementById('journal-note').value;
  const score = calcScore(sliderVals);
  entries[todayStr()] = { metrics: { ...sliderVals }, note, score };
  saveAll();
  const toast = document.getElementById('toast');
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

/* ── Calendar ── */
let currentMonth = new Date().getMonth();
let currentYear  = new Date().getFullYear();

function renderCalendar() {
  const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  document.getElementById('month-title').textContent = months[currentMonth] + ' ' + currentYear;

  const grid  = document.getElementById('cal-grid');
  grid.innerHTML = '';

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const today = todayStr();

  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'cal-cell';
    grid.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = currentYear + '-' + String(currentMonth + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    const entry = entries[dateStr];
    const cell = document.createElement('div');
    cell.className = 'cal-cell' + (entry ? ' has-entry' : '') + (dateStr === today ? ' today' : '');
    cell.textContent = d;
    if (entry) {
      cell.style.background = cellColor(entry.score);
      cell.addEventListener('click', () => showModal(dateStr, entry));
    }
    grid.appendChild(cell);
  }
}

function showModal(dateStr, entry) {
  document.getElementById('modal-date').textContent = formatDate(dateStr);
  document.getElementById('modal-score').textContent = entry.score;
  document.getElementById('modal-band').textContent = getBand(entry.score).label;

  const mg = document.getElementById('modal-metrics');
  mg.innerHTML = '';
  METRICS.forEach(m => {
    const div = document.createElement('div');
    div.className = 'modal-metric';
    div.innerHTML = `<div class="modal-metric-label">${m.label}</div><div class="modal-metric-val">${entry.metrics[m.id] || '--'}/10</div>`;
    mg.appendChild(div);
  });

  const mn = document.getElementById('modal-note');
  mn.innerHTML = entry.note
    ? `<div class="modal-note-text">${entry.note}</div>`
    : '';

  const delBtn = document.getElementById('modal-delete');
  delBtn.onclick = () => {
    if (confirm('Supprimer cette journée ?')) {
      delete entries[dateStr];
      saveAll();
      document.getElementById('entry-modal').classList.remove('visible');
      renderCalendar();
    }
  };

  document.getElementById('entry-modal').classList.add('visible');
}

/* ── Stats ── */
let scoreChart = null;
let radarChart  = null;

function renderStats() {
  const keys = Object.keys(entries).sort();
  const sc = document.getElementById('stat-cards');
  sc.innerHTML = '';

  document.getElementById('delete-all-btn').onclick = () => {
    if (confirm('Supprimer toutes les données ? Cette action est irréversible.')) {
      entries = {};
      saveAll();
      renderStats();
    }
  };

  if (keys.length === 0) {
    sc.innerHTML = '<div style="color:var(--text-muted);font-size:14px;grid-column:1/-1;padding:1rem 0">Aucune entrée pour le moment.</div>';
  } else {
    const scores = keys.map(k => entries[k].score);
    const avg    = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const best   = Math.max(...scores);
    const streak = calcStreak();
    [
      { label: 'Moyenne',          val: avg + '%' },
      { label: 'Meilleure journée', val: best + '%' },
      { label: 'Entrées totales',  val: keys.length },
      { label: 'Série actuelle',   val: streak + ' j' }
    ].forEach(item => {
      const card = document.createElement('div');
      card.className = 'stat-card';
      card.innerHTML = `<div class="stat-label">${item.label}</div><div class="stat-value">${item.val}</div>`;
      sc.appendChild(card);
    });
  }

  const last30     = keys.slice(-30);
  const labels     = last30.map(k => { const d = new Date(k + 'T12:00:00'); return d.toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' }); });
  const scoreData  = last30.map(k => entries[k].score);
  const radarAvg   = METRICS.map(m => {
    const vals = keys.map(k => entries[k].metrics[m.id] || 0);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10 : 0;
  });

  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const tickColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)';

  if (scoreChart) scoreChart.destroy();
  scoreChart = new Chart(document.getElementById('scoreChart'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Score',
        data: scoreData,
        borderColor: '#1a1a18',
        backgroundColor: 'rgba(26,26,24,0.06)',
        tension: 0.35,
        pointRadius: 3,
        pointBackgroundColor: '#1a1a18',
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          min: 0, max: 100,
          ticks: { callback: v => v + '%', color: tickColor, font: { size: 11 } },
          grid: { color: gridColor }
        },
        x: {
          ticks: { color: tickColor, font: { size: 11 }, maxRotation: 45, autoSkip: true },
          grid: { display: false }
        }
      }
    }
  });

  if (radarChart) radarChart.destroy();
  radarChart = new Chart(document.getElementById('radarChart'), {
    type: 'radar',
    data: {
      labels: METRICS.map(m => m.label),
      datasets: [{
        label: 'Moyenne',
        data: radarAvg,
        borderColor: '#1d9e75',
        backgroundColor: 'rgba(29,158,117,0.1)',
        pointBackgroundColor: '#1d9e75',
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        r: {
          min: 0, max: 10,
          ticks: { stepSize: 2, color: tickColor, font: { size: 10 } },
          grid: { color: gridColor },
          pointLabels: { color: tickColor, font: { size: 11 } }
        }
      }
    }
  });
}

/* ── Init ── */
loadAll();
setHeaderDate();
initTabs();
buildSliders();
updateLiveScore();

document.getElementById('save-btn').addEventListener('click', saveEntry);
document.getElementById('prev-month').addEventListener('click', () => {
  currentMonth--;
  if (currentMonth < 0) { currentMonth = 11; currentYear--; }
  renderCalendar();
});
document.getElementById('next-month').addEventListener('click', () => {
  currentMonth++;
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  renderCalendar();
});
document.getElementById('modal-close').addEventListener('click', () => {
  document.getElementById('entry-modal').classList.remove('visible');
});
