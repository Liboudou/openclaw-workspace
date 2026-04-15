// === State ===
let allCards = [];
let activeType = null;
let types = {};

// === DOM ===
const grid = document.getElementById('cardGrid');
const searchInput = document.getElementById('search');
const typeFilters = document.getElementById('typeFilters');
const detailModal = document.getElementById('detailModal');
const detailContent = document.getElementById('detailContent');
const detailClose = document.getElementById('detailClose');
const addModal = document.getElementById('addModal');
const addBtn = document.getElementById('addBtn');
const addClose = document.getElementById('addClose');
const addForm = document.getElementById('addForm');
const cardTypeSelect = document.getElementById('cardType');

// === API ===
async function fetchCards(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`/api/pokemon${query ? '?' + query : ''}`);
  return res.json();
}

async function fetchTypes() {
  const res = await fetch('/api/types');
  return res.json();
}

async function deleteCard(id) {
  await fetch(`/api/pokemon/${id}`, { method: 'DELETE' });
}

async function createCard(data) {
  const res = await fetch('/api/pokemon', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

// === Render ===
function renderCards(cards) {
  if (cards.length === 0) {
    grid.innerHTML = '<div class="empty-state"><p>No Pokemon found</p></div>';
    return;
  }

  grid.innerHTML = cards.map(card => `
    <div class="pokemon-card" data-id="${card.id}">
      <div class="card-image-wrapper">
        <img src="${card.image}" alt="${card.name}" loading="lazy">
      </div>
      <div class="card-info">
        <div class="card-header">
          <span class="card-name">${card.name}</span>
          <span class="card-hp"><span>${card.hp}</span> HP</span>
        </div>
        <span class="card-type" style="background:${card.typeColor}">${card.type}</span>
      </div>
    </div>
  `).join('');

  // Click handlers
  grid.querySelectorAll('.pokemon-card').forEach(el => {
    el.addEventListener('click', () => showDetail(Number(el.dataset.id)));
  });
}

function renderTypeFilters() {
  const entries = Object.entries(types);
  typeFilters.innerHTML = `
    <span class="type-badge active" data-type="" style="background:#555">All</span>
    ${entries.map(([name, color]) => `
      <span class="type-badge" data-type="${name}" style="background:${color}">${name}</span>
    `).join('')}
  `;

  // Also populate the form select
  cardTypeSelect.innerHTML = entries.map(([name]) =>
    `<option value="${name}">${name[0].toUpperCase() + name.slice(1)}</option>`
  ).join('');

  typeFilters.querySelectorAll('.type-badge').forEach(badge => {
    badge.addEventListener('click', () => {
      typeFilters.querySelectorAll('.type-badge').forEach(b => b.classList.remove('active'));
      badge.classList.add('active');
      activeType = badge.dataset.type || null;
      loadCards();
    });
  });
}

function showDetail(id) {
  const card = allCards.find(c => c.id === id);
  if (!card) return;

  detailContent.innerHTML = `
    <div class="detail-image">
      <img src="${card.image}" alt="${card.name}">
    </div>
    <div class="detail-name">${card.name}</div>
    <div class="detail-meta">
      <span class="card-type" style="background:${card.typeColor}">${card.type}</span>
      <span class="detail-hp">${card.hp} HP</span>
    </div>
    <div class="detail-moves-title">Moves</div>
    <ul class="detail-moves">
      ${card.moves.map(m => `<li>${m}</li>`).join('')}
    </ul>
    <div class="detail-actions">
      <button class="btn btn-danger" id="deleteBtn">Delete Card</button>
    </div>
  `;

  document.getElementById('deleteBtn').addEventListener('click', async (e) => {
    e.stopPropagation();
    await deleteCard(card.id);
    closeModal(detailModal);
    loadCards();
  });

  openModal(detailModal);
}

// === Modal helpers ===
function openModal(modal) { modal.classList.add('active'); }
function closeModal(modal) { modal.classList.remove('active'); }

// === Load ===
async function loadCards() {
  const params = {};
  if (activeType) params.type = activeType;
  const search = searchInput.value.trim();
  if (search) params.search = search;

  allCards = await fetchCards(params);
  renderCards(allCards);
}

// === Init ===
async function init() {
  types = await fetchTypes();
  renderTypeFilters();
  await loadCards();
}

// === Events ===
searchInput.addEventListener('input', debounce(loadCards, 250));

detailClose.addEventListener('click', () => closeModal(detailModal));
detailModal.addEventListener('click', (e) => { if (e.target === detailModal) closeModal(detailModal); });

addBtn.addEventListener('click', () => openModal(addModal));
addClose.addEventListener('click', () => closeModal(addModal));
addModal.addEventListener('click', (e) => { if (e.target === addModal) closeModal(addModal); });

addForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {
    name: document.getElementById('cardName').value.trim(),
    type: document.getElementById('cardType').value,
    hp: Number(document.getElementById('cardHp').value),
    moves: document.getElementById('cardMoves').value,
  };
  await createCard(data);
  addForm.reset();
  closeModal(addModal);
  loadCards();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal(detailModal);
    closeModal(addModal);
  }
});

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

init();
