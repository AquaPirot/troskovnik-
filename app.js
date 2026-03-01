const STORAGE_KEY = 'troskovnik-entries-v1';

const form = document.querySelector('#entry-form');
const entriesList = document.querySelector('#entries');
const monthFilter = document.querySelector('#month-filter');
const clearFilterBtn = document.querySelector('#clear-filter');
const clearAllBtn = document.querySelector('#clear-all');
const template = document.querySelector('#entry-template');

const totalIncomeEl = document.querySelector('#total-income');
const totalExpenseEl = document.querySelector('#total-expense');
const balanceEl = document.querySelector('#balance');

const currency = new Intl.NumberFormat('hr-HR', {
  style: 'currency',
  currency: 'EUR',
});

const dateFormat = new Intl.DateTimeFormat('hr-HR', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

let entries = loadEntries();

setTodayAsDefault();
render();

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const amount = Number(formData.get('amount'));

  const entry = {
    id: crypto.randomUUID(),
    description: String(formData.get('description')).trim(),
    amount,
    type: String(formData.get('type')),
    category: String(formData.get('category')),
    date: String(formData.get('date')),
  };

  if (!entry.description || !entry.date || !Number.isFinite(amount) || amount <= 0) {
    return;
  }

  entries.unshift(entry);
  persistEntries();
  form.reset();
  setTodayAsDefault();
  render();
});

monthFilter.addEventListener('change', render);
clearFilterBtn.addEventListener('click', () => {
  monthFilter.value = '';
  render();
});

clearAllBtn.addEventListener('click', () => {
  if (!entries.length) {
    return;
  }

  const isConfirmed = window.confirm('Sigurno želiš obrisati sve unose?');
  if (!isConfirmed) {
    return;
  }

  entries = [];
  persistEntries();
  render();
});

function render() {
  const filtered = getFilteredEntries();
  renderSummary(filtered);
  renderList(filtered);
}

function renderSummary(filteredEntries) {
  const totals = filteredEntries.reduce(
    (acc, entry) => {
      if (entry.type === 'income') {
        acc.income += entry.amount;
      } else {
        acc.expense += entry.amount;
      }
      return acc;
    },
    { income: 0, expense: 0 }
  );

  const balance = totals.income - totals.expense;

  totalIncomeEl.textContent = currency.format(totals.income);
  totalExpenseEl.textContent = currency.format(totals.expense);
  balanceEl.textContent = currency.format(balance);
  balanceEl.style.color = balance >= 0 ? 'var(--income)' : 'var(--expense)';
}

function renderList(filteredEntries) {
  entriesList.innerHTML = '';

  if (!filteredEntries.length) {
    const empty = document.createElement('li');
    empty.className = 'empty';
    empty.textContent = 'Nema unosa za odabrani period.';
    entriesList.append(empty);
    return;
  }

  filteredEntries.forEach((entry) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.querySelector('.entry-description').textContent = entry.description;
    node.querySelector('.entry-meta').textContent = `${entry.category} • ${dateFormat.format(new Date(entry.date))}`;

    const amountEl = node.querySelector('.entry-amount');
    const sign = entry.type === 'income' ? '+' : '-';
    amountEl.textContent = `${sign}${currency.format(entry.amount)}`;
    amountEl.style.color = entry.type === 'income' ? 'var(--income)' : 'var(--expense)';

    node.querySelector('.delete-btn').addEventListener('click', () => {
      entries = entries.filter((item) => item.id !== entry.id);
      persistEntries();
      render();
    });

    entriesList.append(node);
  });
}

function getFilteredEntries() {
  const value = monthFilter.value;

  if (!value) {
    return [...entries];
  }

  return entries.filter((entry) => entry.date.startsWith(value));
}

function persistEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((entry) => entry && typeof entry === 'object')
      .map((entry) => ({
        id: String(entry.id ?? crypto.randomUUID()),
        description: String(entry.description ?? ''),
        amount: Number(entry.amount ?? 0),
        type: entry.type === 'income' ? 'income' : 'expense',
        category: String(entry.category ?? 'Ostalo'),
        date: String(entry.date ?? ''),
      }))
      .filter((entry) => entry.description && entry.date && entry.amount > 0);
  } catch {
    return [];
  }
}

function setTodayAsDefault() {
  const dateInput = document.querySelector('#date');
  dateInput.value = new Date().toISOString().slice(0, 10);
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {
      // ignore errors to keep app working normally
    });
  });
}
