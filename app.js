// LocalStorage Data Structure Initializer
let store = JSON.parse(localStorage.getItem('homeManagerDB')) || {
  tasks: [],
  reminders: [],
  transactions: [],
  notes: [],
  periods: [],
  avgCycleLength: 28
};

function saveData() {
  localStorage.setItem('homeManagerDB', JSON.stringify(store));
  renderAll();
}

// Navigation Handler
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
  
  const activeBtn = Array.from(document.querySelectorAll('nav button')).find(
    btn => btn.getAttribute('onclick') === `showPage('${pageId}')`
  );
  if (activeBtn) activeBtn.classList.add('active');
}

// Render Functions
function renderAll() {
  renderDashboard();
  renderPeriodTracker();
  renderTasks();
  renderReminders();
  renderBudget();
  renderNotes();
}

function renderDashboard() {
  // Financial Summary
  const income = store.transactions.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0);
  const expense = store.transactions.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0);
  
  document.getElementById('dash-income').innerText = `$${income.toFixed(2)}`;
  document.getElementById('dash-expense').innerText = `$${expense.toFixed(2)}`;
  document.getElementById('dash-balance').innerText = `$${(income - expense).toFixed(2)}`;

  // Period Tracker Quick Summary
  const periodDash = document.getElementById('dash-period');
  if (store.periods && store.periods.length > 0) {
    const sorted = [...store.periods].sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
    const lastPeriod = sorted[0];
    const nextDate = calculateNextPeriod(lastPeriod.startDate, store.avgCycleLength || 28);
    const daysLeft = getDaysUntil(nextDate);
    
    let countdownText = daysLeft > 0 
      ? `Expected in <strong>${daysLeft} day(s)</strong>` 
      : (daysLeft === 0 ? "<strong>Expected Today!</strong>" : `<strong>${Math.abs(daysLeft)} day(s) overdue</strong>`);

    periodDash.innerHTML = `
      <div style="font-size:0.95rem;">
        Next Expected: <strong>${formatDate(nextDate)}</strong><br>
        <span style="color:var(--pink);">${countdownText}</span>
      </div>
    `;
  } else {
    periodDash.innerHTML = `<small style="color:var(--muted)">No cycle logged. Tap the 🌸 Period tab to log.</small>`;
  }

  // Tasks Summary
  const pendingTasks = store.tasks.filter(t => !t.done);
  document.getElementById('dash-tasks').innerHTML = pendingTasks.length 
    ? pendingTasks.slice(0, 3).map(t => `<div class="list-item"><span>${t.title}</span></div>`).join('') 
    : '<small style="color:var(--muted)">All tasks completed!</small>';

  // Reminders Summary
  document.getElementById('dash-reminders').innerHTML = store.reminders.length 
    ? store.reminders.slice(0, 3).map(r => `<div class="list-item"><span>${r.title}</span> <small>${r.date}</small></div>`).join('') 
    : '<small style="color:var(--muted)">No upcoming reminders.</small>';
}

// --- PERIOD TRACKER LOGIC ---
document.getElementById('period-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const startDate = document.getElementById('period-start').value;
  const endDate = document.getElementById('period-end').value || null;
  const cycleLength = parseInt(document.getElementById('cycle-length').value) || 28;

  if (!store.periods) store.periods = [];
  
  store.periods.push({
    id: Date.now(),
    startDate,
    endDate
  });
  store.avgCycleLength = cycleLength;

  e.target.reset();
  document.getElementById('cycle-length').value = store.avgCycleLength;
  saveData();
});

function deletePeriod(id) {
  store.periods = store.periods.filter(p => p.id !== id);
  saveData();
}

function calculateNextPeriod(lastStartDateStr, cycleDays) {
  const date = new Date(lastStartDateStr);
  date.setDate(date.getDate() + parseInt(cycleDays));
  return date.toISOString().split('T')[0];
}

function getDaysUntil(dateStr) {
  const target = new Date(dateStr);
  const today = new Date();
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diffTime = target - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  return new Date(dateStr).toLocaleDateString(undefined, options);
}

function calculateDuration(startStr, endStr) {
  if (!endStr) return 'Ongoing / Single day logged';
  const start = new Date(startStr);
  const end = new Date(endStr);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return `${diffDays} Day(s)`;
}

function renderPeriodTracker() {
  if (!store.periods) store.periods = [];
  const sortedPeriods = [...store.periods].sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

  const nextDisplay = document.getElementById('next-period-date');
  const countdownDisplay = document.getElementById('days-countdown');
  
  if (sortedPeriods.length > 0) {
    const lastPeriod = sortedPeriods[0];
    const nextDateStr = calculateNextPeriod(lastPeriod.startDate, store.avgCycleLength || 28);
    const daysLeft = getDaysUntil(nextDateStr);

    nextDisplay.innerText = formatDate(nextDateStr);
    
    if (daysLeft > 0) {
      countdownDisplay.innerText = `Expected in ~${daysLeft} day(s)`;
    } else if (daysLeft === 0) {
      countdownDisplay.innerText = `Expected today!`;
    } else {
      countdownDisplay.innerText = `${Math.abs(daysLeft)} day(s) past expected date`;
    }
  } else {
    nextDisplay.innerText = 'Not set';
    countdownDisplay.innerText = 'Log your first period below to calculate.';
  }

  // Render Logged History
  const container = document.getElementById('period-list');
  if (sortedPeriods.length === 0) {
    container.innerHTML = '<small style="color:var(--muted)">No cycles recorded yet.</small>';
    return;
  }

  container.innerHTML = sortedPeriods.map(p => `
    <div class="list-item">
      <div>
        <strong>${formatDate(p.startDate)} ${p.endDate ? ' - ' + formatDate(p.endDate) : ''}</strong><br>
        <small style="color:var(--pink)">Duration: ${calculateDuration(p.startDate, p.endDate)}</small>
      </div>
      <button class="delete-btn" onclick="deletePeriod(${p.id})">Delete</button>
    </div>
  `).join('');
}

// --- TASK LOGIC ---
document.getElementById('task-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('task-input');
  store.tasks.push({ id: Date.now(), title: input.value, done: false });
  input.value = '';
  saveData();
});

function toggleTask(id) {
  const task = store.tasks.find(t => t.id === id);
  if (task) task.done = !task.done;
  saveData();
}

function deleteTask(id) {
  store.tasks = store.tasks.filter(t => t.id !== id);
  saveData();
}

function renderTasks() {
  const container = document.getElementById('tasks-list');
  container.innerHTML = store.tasks.map(t => `
    <div class="list-item">
      <span class="item-text ${t.done ? 'done' : ''}" onclick="toggleTask(${t.id})" style="cursor:pointer;">
        ${t.done ? '☑️' : '⏹️'} ${t.title}
      </span>
      <button class="delete-btn" onclick="deleteTask(${t.id})">Delete</button>
    </div>
  `).join('');
}

// --- REMINDER LOGIC ---
document.getElementById('reminder-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const title = document.getElementById('reminder-title').value;
  const date = document.getElementById('reminder-date').value;
  store.reminders.push({ id: Date.now(), title, date });
  e.target.reset();
  saveData();
});

function deleteReminder(id) {
  store.reminders = store.reminders.filter(r => r.id !== id);
  saveData();
}

function renderReminders() {
  const container = document.getElementById('reminders-list');
  container.innerHTML = store.reminders.map(r => `
    <div class="list-item">
      <div><strong>${r.title}</strong><br><small style="color:var(--muted)">Due: ${formatDate(r.date)}</small></div>
      <button class="delete-btn" onclick="deleteReminder(${r.id})">Delete</button>
    </div>
  `).join('');
}

// --- BUDGET LOGIC ---
document.getElementById('budget-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const title = document.getElementById('trans-title').value;
  const amount = parseFloat(document.getElementById('trans-amount').value);
  const type = document.getElementById('trans-type').value;
  store.transactions.push({ id: Date.now(), title, amount, type });
  e.target.reset();
  saveData();
});

function deleteTransaction(id) {
  store.transactions = store.transactions.filter(t => t.id !== id);
  saveData();
}

function renderBudget() {
  const container = document.getElementById('budget-list');
  container.innerHTML = store.transactions.map(t => `
    <div class="list-item">
      <div>
        <strong>${t.title}</strong><br>
        <small style="color:${t.type === 'income' ? 'var(--success)' : 'var(--danger)'}">
          ${t.type.toUpperCase()}
        </small>
      </div>
      <div>
        <strong>${t.type === 'income' ? '+' : '-'}$${t.amount.toFixed(2)}</strong>
        <button class="delete-btn" onclick="deleteTransaction(${t.id})">✕</button>
      </div>
    </div>
  `).join('');
}

// --- NOTES LOGIC ---
document.getElementById('note-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const title = document.getElementById('note-title').value;
  const content = document.getElementById('note-content').value;
  store.notes.push({ id: Date.now(), title, content });
  e.target.reset();
  saveData();
});

function deleteNote(id) {
  store.notes = store.notes.filter(n => n.id !== id);
  saveData();
}

function renderNotes() {
  const container = document.getElementById('notes-list');
  container.innerHTML = store.notes.map(n => `
    <div class="list-item" style="flex-direction:column; align-items:flex-start;">
      <div style="width:100%; display:flex; justify-content:space-between;">
        <strong>${n.title}</strong>
        <button class="delete-btn" onclick="deleteNote(${n.id})">Delete</button>
      </div>
      <p style="color:var(--muted); font-size:0.9rem; margin-top:0.3rem;">${n.content}</p>
    </div>
  `).join('');
}

// Initial Run
renderAll();
                   
