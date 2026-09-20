// LocalStorage Data Structure Initializer
let store = JSON.parse(localStorage.getItem('homeManagerDB')) || {
  tasks: [],
  reminders: [],
  transactions: [],
  notes: [],
  periods: [],
  medications: [],
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

// Render All Components
function renderAll() {
  renderDashboard();
  renderMedications();
  renderPeriodTracker();
  renderTasks();
  renderReminders();
  renderBudget();
  renderNotes();
}

// Helper to get today's date string YYYY-MM-DD
function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

// --- DASHBOARD RENDER ---
function renderDashboard() {
  // Financial Summary
  const income = store.transactions.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0);
  const expense = store.transactions.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0);
  
  document.getElementById('dash-income').innerText = `$${income.toFixed(2)}`;
  document.getElementById('dash-expense').innerText = `$${expense.toFixed(2)}`;
  document.getElementById('dash-balance').innerText = `$${(income - expense).toFixed(2)}`;

  // Meds Schedule by Time Slots
  const scheduleDash = document.getElementById('dash-med-schedule');
  scheduleDash.innerHTML = generateDailyScheduleHTML(true);

  // Period Summary
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
    periodDash.innerHTML = `<small style="color:var(--muted)">No cycle logged. Tap 🌸 Period tab to log.</small>`;
  }

  // Tasks
  const pendingTasks = store.tasks.filter(t => !t.done);
  document.getElementById('dash-tasks').innerHTML = pendingTasks.length 
    ? pendingTasks.slice(0, 3).map(t => `<div class="list-item"><span>${t.title}</span></div>`).join('') 
    : '<small style="color:var(--muted)">All tasks completed!</small>';

  // Reminders
  document.getElementById('dash-reminders').innerHTML = store.reminders.length 
    ? store.reminders.slice(0, 3).map(r => `<div class="list-item"><span>${r.title}</span> <small>${r.date}</small></div>`).join('') 
    : '<small style="color:var(--muted)">No upcoming reminders.</small>';
}

// --- MEDICINE LOGIC ---
document.getElementById('med-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('med-name').value;
  const doctor = document.getElementById('med-doctor').value;
  const relation = document.getElementById('med-relation').value;
  const stock = parseInt(document.getElementById('med-stock').value);
  const dailyDose = parseInt(document.getElementById('med-daily').value) || 1;
  const startDate = document.getElementById('med-start').value;

  const checkboxes = document.querySelectorAll('input[name="med-slot"]:checked');
  const slots = Array.from(checkboxes).map(cb => cb.value);

  if (slots.length === 0) {
    alert('Please select at least one schedule time (Morning, Afternoon, Evening, or Night).');
    return;
  }

  if (!store.medications) store.medications = [];

  store.medications.push({
    id: Date.now(),
    name,
    doctor,
    relation,
    slots,
    stock,
    dailyDose,
    startDate,
    history: {} // Records taken dates e.g. { "2026-03-30_Morning": true }
  });

  e.target.reset();
  saveData();
});

function deleteMedication(id) {
  store.medications = store.medications.filter(m => m.id !== id);
  saveData();
}

function recordDose(id, slotKey) {
  const med = store.medications.find(m => m.id === id);
  if (!med) return;

  if (!med.history) med.history = {};
  const today = getTodayStr();
  const fullKey = `${today}_${slotKey}`;

  if (med.history[fullKey]) {
    // Undo
    delete med.history[fullKey];
    med.stock += 1;
  } else {
    // Take dose
    if (med.stock > 0) {
      med.history[fullKey] = true;
      med.stock -= 1;
    } else {
      alert("Stock is empty! Refill required.");
      return;
    }
  }
  saveData();
}

function refillMed(id) {
  const amountStr = prompt("How many pills/units are you adding to stock?", "30");
  const amount = parseInt(amountStr);
  if (amount && !isNaN(amount)) {
    const med = store.medications.find(m => m.id === id);
    if (med) {
      med.stock += amount;
      saveData();
    }
  }
}

function generateDailyScheduleHTML() {
  if (!store.medications || store.medications.length === 0) {
    return '<small style="color:var(--muted)">No active medications logged.</small>';
  }

  const slots = [
    { key: 'Morning', title: '🌅 Morning Doses' },
    { key: 'Afternoon', title: '☀️ Afternoon Doses' },
    { key: 'Evening', title: '🌆 Evening Doses' },
    { key: 'Night', title: '🌙 Night Doses' }
  ];

  const today = getTodayStr();
  let html = '';

  slots.forEach(slot => {
    const medsForSlot = store.medications.filter(m => m.slots && m.slots.includes(slot.key));
    
    if (medsForSlot.length > 0) {
      html += `<div class="slot-title">${slot.title}</div>`;
      medsForSlot.forEach(m => {
        const fullKey = `${today}_${slot.key}`;
        const isTaken = m.history && m.history[fullKey];

        html += `
          <div class="dose-card">
            <div>
              <strong style="${isTaken ? 'text-decoration:line-through; color:var(--muted);' : ''}">${m.name}</strong> 
              <span class="badge badge-teal">${m.doctor}</span><br>
              <small style="color:var(--primary); font-weight:bold;">${m.relation}</small>
            </div>
            <button class="${isTaken ? 'btn-primary' : 'btn-teal'}" style="width:auto; padding:0.4rem 0.7rem; font-size:0.8rem;" onclick="recordDose(${m.id}, '${slot.key}')">
              ${isTaken ? '✓ Taken' : 'Take Dose'}
            </button>
          </div>
        `;
      });
    }
  });

  return html || '<small style="color:var(--muted)">No medications scheduled.</small>';
}

function renderMedications() {
  if (!store.medications) store.medications = [];

  // Render Low Stock Refill Alerts
  const alertContainer = document.getElementById('refill-alerts');
  const lowStockMeds = store.medications.filter(m => {
    const daysLeft = Math.floor(m.stock / m.dailyDose);
    return daysLeft <= 5;
  });

  if (lowStockMeds.length > 0) {
    alertContainer.innerHTML = lowStockMeds.map(m => {
      const daysLeft = Math.floor(m.stock / m.dailyDose);
      return `
        <div class="list-item">
          <div>
            <strong>${m.name}</strong> <span class="badge badge-danger">${m.doctor}</span><br>
            <small style="color:var(--danger)">Only ${m.stock} pill(s) left (~${daysLeft} day(s) supply)</small>
          </div>
          <button class="btn-teal" style="width:auto; padding:0.3rem 0.6rem; font-size:0.8rem;" onclick="refillMed(${m.id})">+ Refill</button>
        </div>
      `;
    }).join('');
  } else {
    alertContainer.innerHTML = '<small style="color:var(--muted)">All pill counts look good!</small>';
  }

  // Today's Interactive Routine
  document.getElementById('todays-routine').innerHTML = generateDailyScheduleHTML();

  // Active Prescriptions Summary
  const listContainer = document.getElementById('meds-list');
  if (store.medications.length === 0) {
    listContainer.innerHTML = '<small style="color:var(--muted)">No medications added yet.</small>';
    return;
  }

  listContainer.innerHTML = store.medications.map(m => {
    const daysRemaining = Math.floor(m.stock / m.dailyDose);
    const finishDate = new Date();
    finishDate.setDate(finishDate.getDate() + daysRemaining);

    return `
      <div class="list-item" style="flex-direction:column; align-items:flex-start; gap:0.3rem;">
        <div style="width:100%; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <strong style="font-size:1.05rem;">${m.name}</strong>
            <span class="badge badge-teal" style="margin-left:0.3rem;">${m.doctor}</span>
          </div>
          <button class="delete-btn" onclick="deleteMedication(${m.id})">Delete</button>
        </div>

        <div style="font-size:0.85rem; color:var(--muted);">
          ⏰ <strong>Times:</strong> ${m.slots.join(', ')} | <span style="color:var(--primary); font-weight:bold;">${m.relation}</span>
        </div>

        <div style="width:100%; display:flex; justify-content:space-between; align-items:center; background:var(--bg); padding:0.4rem 0.6rem; border-radius:6px; margin-top:0.2rem;">
          <div style="font-size:0.85rem;">
            💊 Stock: <strong>${m.stock} pills</strong> (~${daysRemaining} days left)<br>
            <small style="color:var(--muted)">Ends approx: ${formatDate(finishDate.toISOString().split('T')[0])}</small>
          </div>
          <button class="btn-teal" style="width:auto; padding:0.3rem 0.5rem; font-size:0.8rem;" onclick="refillMed(${m.id})">Refill Stock</button>
        </div>
      </div>
    `;
  }).join('');
}

// --- PERIOD LOGIC ---
document.getElementById('period-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const startDate = document.getElementById('period-start').value;
  const endDate = document.getElementById('period-end').value || null;
  const cycleLength = parseInt(document.getElementById('cycle-length').value) || 28;

  if (!store.periods) store.periods = [];
  store.periods.push({ id: Date.now(), startDate, endDate });
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
  
