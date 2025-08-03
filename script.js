// script.js completo con historial de partidas, control de turnos, notas y cálculos
const maxPlayers = 6;
let players = [];
let currentTurn = 0;

// Elementos del DOM
const registro = document.getElementById('registro');
const game = document.getElementById('game');
const inputsD = document.getElementById('player-inputs');
const start = document.getElementById('start-game');
const nextBtn = document.getElementById('next-turn');
const newBtn = document.getElementById('new-game');
const turnLbl = document.getElementById('current-turn');

// Historial
const historySec = document.getElementById('history');
const historyList = document.getElementById('history-list');
let history = JSON.parse(localStorage.getItem('kniffel_history') || '[]');

// Índices de filas donde los jugadores introducen puntuaciones
const scoreRows = [...Array(6).keys(), ...Array(7).keys()].map((_, i) =>
  i >= 6 ? i + 3 : i
);

// Avanzar al siguiente jugador (sin restringir las filas)
function advanceTurn() {
  currentTurn = (currentTurn + 1) % players.length;
  updateTurnUI();
}

// Inicializar campos de nombre
buildNameFields();

function buildNameFields() {
  inputsD.innerHTML = '';
  for (let i = 1; i <= maxPlayers; i++) {
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
  renderHistory();
  renderScoreboard();
  updateTurnUI();
});

nextBtn.addEventListener('click', advanceTurn);

newBtn.addEventListener('click', () => {
  // Recoger totales actuales
  const totals = players.map((_, p) => {
    return parseInt(document.getElementById(`cell-17-${p}`).textContent) || 0;
  });
  // Guardar en historial
  history.push({ date: new Date().toLocaleString(), players: [...players], totals });
  localStorage.setItem('kniffel_history', JSON.stringify(history));
  // Limpiar datos actuales
  Object.keys(localStorage)
    .filter(k => k.startsWith('score_p'))
    .forEach(k => localStorage.removeItem(k));
  players = [];
  document.getElementById('scoreboard-container').innerHTML = '';
  turnLbl.textContent = 'Turno de: —';
  // Actualizar historial en UI
  renderHistory();
  // Reiniciar UI
  currentTurn = 0;
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
    const names = gameItem.players || Array.from({ length: gameItem.totals.length }, (_, idx) => players[idx] || `Jugador ${idx + 1}`);
    const cols = names.map(p => `<th>${p}</th>`).join('');
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
      const td = document.createElement('td');
      td.id = `cell-${ri}-${pi}`;
      if (ri <= 5 || (ri >= 9 && ri <= 15)) {
        const inp = document.createElement('input');
        inp.type = 'number';
        inp.min = 0;
        inp.inputMode = 'numeric';
        inp.pattern = '\d*';
        inp.classList.add('score');
        inp.dataset.player = pi;
        inp.dataset.row = ri;
        inp.addEventListener('change', onScoreChange);
        td.appendChild(inp);
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.appendChild(table);

  loadFromStorage();
  calculateAll();
}

function loadFromStorage() {
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
}
// Actualizar UI de turnos
function updateTurnUI() {
  turnLbl.textContent = `Turno de: ${players[currentTurn]}`;
}

// Guardar score y recalcular
function onScoreChange(e) {
  const p = e.target.dataset.player;
  const r = e.target.dataset.row;
  localStorage.setItem(`score_p${p}_r${r}`, e.target.value || 0);
  e.target.disabled = true;
  calculateAll();
  advanceTurn();
}

// Cálculos automáticos
function calculateAll() {
  players.forEach((_, p) => {
    let sup = 0;
    let inf = 0;
    scoreRows.forEach(r => {
      const val = parseInt(localStorage.getItem(`score_p${p}_r${r}`)) || 0;
      if (r <= 5) {
        sup += val;
      } else {
        inf += val;
      }
    });
    document.getElementById(`cell-6-${p}`).textContent = sup;
    const bonus = sup >= 63 ? 35 : 0;
    document.getElementById(`cell-7-${p}`).textContent = bonus;
    document.getElementById(`cell-8-${p}`).textContent = sup + bonus;
    document.getElementById(`cell-16-${p}`).textContent = inf;
    const total = sup + bonus + inf;
    document.getElementById(`cell-17-${p}`).textContent = total;
  });
}
