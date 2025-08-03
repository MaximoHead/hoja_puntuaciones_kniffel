// script.js completo con historial de partidas, control de turnos, notas y cálculos
const maxPlayers = 6;
let players = [];
let currentTurn = 0;
let currentRow = 0;

// Elementos del DOM
const registro = document.getElementById('registro');
const game = document.getElementById('game');
const pcSelect = document.getElementById('player-count');
const inputsD = document.getElementById('player-inputs');
const start = document.getElementById('start-game');
const nextBtn = document.getElementById('next-turn');
const newBtn = document.getElementById('new-game');
const turnLbl = document.getElementById('current-turn');

// Historial
const historySec = document.getElementById('history');
const historyList = document.getElementById('history-list');
let history = JSON.parse(localStorage.getItem('kniffel_history') || '[]');

// Inicializar campos de nombre
pcSelect.addEventListener('change', buildNameFields);
buildNameFields();

function buildNameFields() {
  inputsD.innerHTML = '';
  const n = +pcSelect.value;
  for (let i = 1; i <= n; i++) {
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.placeholder = `Nombre jugador ${i}`;
    inputsD.appendChild(inp);
  }
}

// Eventos
start.addEventListener('click', () => {
  players = Array.from(inputsD.children)
    .map(i => i.value.trim())
    .filter(v => v);
  if (players.length < 2) {
    return alert('Introduce al menos 2 nombres.');
  }
  registro.classList.add('hidden');
  game.classList.remove('hidden');
  currentTurn = 0;
  currentRow = 0;
  renderHistory();
  renderScoreboard();
  renderNotes();
  updateTurnUI();
});

nextBtn.addEventListener('click', () => {
  if (currentTurn < players.length - 1) {
    currentTurn++;
  } else {
    currentTurn = 0;
    currentRow++;
  }
  updateTurnUI();
});

newBtn.addEventListener('click', () => {
  // Recoger totales actuales
  const totals = players.map((_, p) => {
    return parseInt(document.getElementById(`cell-17-${p}`).textContent) || 0;
  });
  // Guardar en historial
  history.push({ date: new Date().toLocaleString(), totals });
  localStorage.setItem('kniffel_history', JSON.stringify(history));
  // Limpiar datos actuales
  Object.keys(localStorage)
    .filter(k => k.startsWith('score_p') || k.startsWith('notes_'))
    .forEach(k => localStorage.removeItem(k));
  // Actualizar historial en UI
  renderHistory();
  // Reiniciar UI
  currentTurn = 0;
  currentRow = 0;
  game.classList.add('hidden');
  registro.classList.remove('hidden');
  buildNameFields();
});

// Renderizar historial
function renderHistory() {
  if (!history.length) {
    historySec.classList.add('hidden');
    return;
  }
  historySec.classList.remove('hidden');
  historyList.innerHTML = history.map((gameItem, i) => {
    const title = `Partida ${i + 1} (${gameItem.date})`;
    const cols = players.map(p => `<th>${p}</th>`).join('');
    const row = `<tr><td><strong>Total</strong></td>${gameItem.totals.map(t => `<td>${t}</td>`).join('')}</tr>`;
    return `
      <div class="history-game">
        <h3>${title}</h3>
        <table>
          <thead><tr><th>Jugador</th>${cols}</tr></thead>
          <tbody>${row}</tbody>
        </table>
      </div>
    `;
  }).join('');
}

// Renderizar hoja de puntuación
function renderScoreboard() {
  const container = document.getElementById('scoreboard-container');
  container.innerHTML = '';
  const table = document.createElement('table');
  const rows = [
    'Unos', 'Doses', 'Treses', 'Cuatros', 'Cincos', 'Seises',
    'Total superior', 'Bonus (>=63 → +35)', 'Total sup. c/bonus',
    'Trío', 'Cuarteto', 'Full House', 'Escalera pequeña', 'Escalera grande', 'Kniffel', 'Chance',
    'Total inferior', 'Puntuación total'
  ];

  // Cabecera
  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  hr.appendChild(document.createElement('th'));
  players.forEach(p => {
    const th = document.createElement('th');
    th.textContent = p;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  // Cuerpo
  const tbody = document.createElement('tbody');
  rows.forEach((rName, ri) => {
    const tr = document.createElement('tr');
    const td0 = document.createElement('td'); td0.textContent = rName;
    tr.appendChild(td0);

    players.forEach((_, pi) => {
      const td = document.createElement('td'); td.id = `cell-${ri}-${pi}`;
      if ((ri <= 5) || (ri >= 9 && ri <= 15)) {
        td.classList.add('with-input');
        const inp = document.createElement('input');
        inp.type = 'number'; inp.min = 0;
        inp.classList.add('score');
        inp.dataset.player = pi;
        inp.dataset.row = ri;
        inp.addEventListener('change', onScoreChange);
        td.appendChild(inp);
        const span = document.createElement('span');
        span.classList.add('score-val');
        td.appendChild(span);
        td.addEventListener('click', () => {
          currentRow = ri;
          currentTurn = pi;
          updateTurnUI();
          inp.focus();
        });
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.appendChild(table);

  loadFromStorage();
  calculateAll();
  // Deshabilitar todos los inputs y habilitar solo el correspondiente al turno
  table.querySelectorAll('input.score').forEach(inp => (inp.disabled = true));
  const active = document.querySelector(`#cell-${currentRow}-${currentTurn} input`);
  if (active) active.disabled = false;
}

function loadFromStorage() {
  const scoreRows = [...Array(6).keys(), ...Array(7).keys().map(i => i + 9)];
  players.forEach((_, p) => {
    scoreRows.forEach(r => {
      const key = `score_p${p}_r${r}`;
      const val = localStorage.getItem(key);
      if (val !== null) {
        const cell = document.getElementById(`cell-${r}-${p}`);
        const inp = cell.querySelector('input');
        if (inp) {
          inp.value = val;
          inp.disabled = true;
        }
      }
    });
  });
  // Determinar siguiente celda vacía
  let found = false;
  for (let r of scoreRows) {
    for (let p = 0; p < players.length; p++) {
      if (localStorage.getItem(`score_p${p}_r${r}`) === null) {
        currentRow = r;
        currentTurn = p;
        found = true;
        break;
      }
    }
    if (found) break;
  }
}

// Renderizar notas por sección
function renderNotes() {
  const upperSec = document.getElementById('notes-upper');
  const lowerSec = document.getElementById('notes-lower');
  const totalSec = document.getElementById('notes-totals');
  upperSec.innerHTML = lowerSec.innerHTML = totalSec.innerHTML = '';

  players.forEach((p, i) => {
    ['upper', 'lower', 'total'].forEach(sec => {
      const ta = document.createElement('textarea');
      ta.classList.add('notes-box');
      const label = sec === 'upper' ? 'sup.' : sec === 'lower' ? 'inf.' : 'totales';
      ta.placeholder = `Notas ${label} de ${p}...`;
      ta.dataset.player = i;
      ta.dataset.sec = sec;
      const key = `notes_${sec}_p${i}`;
      ta.value = localStorage.getItem(key) || '';
      ta.addEventListener('input', e => localStorage.setItem(key, e.target.value));
      if (sec === 'upper') upperSec.appendChild(ta);
      else if (sec === 'lower') lowerSec.appendChild(ta);
      else totalSec.appendChild(ta);
    });
  });
}

// Actualizar UI de turnos
function updateTurnUI() {
  turnLbl.textContent = `Turno de: ${players[currentTurn]}`;
  document.querySelectorAll('input.score').forEach(inp => {
    const p = parseInt(inp.dataset.player);
    const r = parseInt(inp.dataset.row);
    inp.disabled = !(p === currentTurn && r === currentRow);
  });
}

// Guardar score y recalcular
function onScoreChange(e) {
  const p = e.target.dataset.player;
  const r = e.target.dataset.row;
  localStorage.setItem(`score_p${p}_r${r}`, e.target.value || 0);
  e.target.disabled = true;
  calculateAll();
  if (currentTurn < players.length - 1) {
    currentTurn++;
  } else {
    currentTurn = 0;
    currentRow++;
  }
  updateTurnUI();
}

// Cálculos automáticos
function calculateAll() {
  players.forEach((_, p) => {
    // Sección superior
    let sup = 0;
    for (let r = 0; r <= 5; r++) {
      sup += parseInt(localStorage.getItem(`score_p${p}_r${r}`)) || 0;
    }
    document.getElementById(`cell-6-${p}`).textContent = sup;
    // Bonus
    const bonus = sup >= 63 ? 35 : 0;
    document.getElementById(`cell-7-${p}`).textContent = bonus;
    // Total superior + bonus
    document.getElementById(`cell-8-${p}`).textContent = sup + bonus;
    // Sección inferior
    let inf = 0;
    for (let r = 9; r <= 15; r++) {
      inf += parseInt(localStorage.getItem(`score_p${p}_r${r}`)) || 0;
    }
    document.getElementById(`cell-16-${p}`).textContent = inf;
    // Total general
    const total = sup + bonus + inf;
    document.getElementById(`cell-17-${p}`).textContent = total;

    // Actualizar la vista de los valores ingresados sin eliminar los inputs
    [...Array(6).keys(), ...Array(7).keys().map(i => i + 9)].forEach(r => {
      const cell = document.getElementById(`cell-${r}-${p}`);
      const inp = cell.querySelector('input');
      const span = cell.querySelector('.score-val');
      if (inp && span) span.textContent = inp.value || '';
    });

  });
}
