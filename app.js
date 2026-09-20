// LocalStorage Data Structure Initializer
let store = JSON.parse(localStorage.getItem('homeManagerDB')) || {
  tasks: [],
  reminders: [],
  transactions: [],
  notes: []
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
  event.currentTarget.classList.add('active');
}

// Render Functions
function renderAll() {
  renderDashboard();
  renderTasks();
  renderReminders();
  renderBudget();
  renderNotes();
}

function renderDashboard() {
  const income = store.transactions.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0);
  const expense = store.transactions.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0);
  
  document.getElementById('dash-income').innerText = `$${income.toFixed(2)}`;
  document.getElementById('dash-expense').innerText = `$${expense.toFixed(2)}`;
  document.getElementById('dash-balance').innerText = `$${(income - expense).toFixed(2)}`;

  const pendingTasks = store.tasks.filter(t => !t.done);
  document.getElementById('dash-tasks').innerHTML = pendingTasks.length 
    ? pendingTasks.slice(0, 3).map(t => `<div class="list-item"><span>${t.title}</span></div>`).join('') 
    : '<small style="color:var(--muted)">All tasks completed!</small>';

  document.getElementById('dash-reminders').innerHTML = store.reminders.length 
    ? store.reminders.slice(0, 3).map(r => `<div class="list-item"><span>${r.title}</span> <small>${r.date}</small></div>`).join('') 
    : '<small style="color:var(--muted)">No upcoming reminders.</small>';
}

// Task Handlers
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

// Reminder Handlers
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
      <div><strong>${r.title}</strong><br><small style="color:var(--muted)">Due: ${r.date}</small></div>
      <button class="delete-btn" onclick="deleteReminder(${r.id})">Delete</button>
    </div>
  `).join('');
}

// Budget Handlers
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

// Notes Handlers
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
  
