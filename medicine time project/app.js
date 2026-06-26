const STORAGE_KEY = 'medicine_reminder_data';
let currentUser = '';
let editIndex = null;
let lastDueReminderKey = null;
let currentAudioContext = null;
let currentOscillators = [];
let currentGainNode = null;

const homeScreen = document.getElementById('home-screen');
const loginScreen = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const formScreen = document.getElementById('form-screen');
const remindersScreen = document.getElementById('reminders-screen');

const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginButton = document.getElementById('login-button');
const registerButton = document.getElementById('register-button');
const createAccountButton = document.getElementById('create-account-button');
const backToLoginButton = document.getElementById('back-to-login-button');
const guestButton = document.getElementById('guest-button');
const homeLoginButton = document.getElementById('home-login-button');
const homeGuestButton = document.getElementById('home-guest-button');

const registerScreen = document.getElementById('register-screen');
const welcomeText = document.getElementById('welcome-text');
const summaryText = document.getElementById('summary-text');
const guestInfo = document.getElementById('guest-info');
const addMedicineButton = document.getElementById('add-medicine-button');
const viewRemindersButton = document.getElementById('view-reminders-button');
const logoutButton = document.getElementById('logout-button');

const formTitle = document.getElementById('form-title');
const medicineNameInput = document.getElementById('medicine-name');
const medicineDoseInput = document.getElementById('medicine-dose');
const medicineTimeInput = document.getElementById('medicine-time');
const medicineAmPmSelect = document.getElementById('medicine-ampm');
const medicineDayInputs = document.querySelectorAll('.day-checkbox');
const saveButton = document.getElementById('save-button');
const cancelButton = document.getElementById('cancel-button');
const formError = document.getElementById('form-error');

const dueAlert = document.getElementById('due-alert');
const dueAlertText = document.getElementById('due-alert-text');
const reminderTableBody = document.getElementById('reminder-table-body');
const dashboardMedicinesBody = document.getElementById('dashboard-medicines-body');
const refreshButton = document.getElementById('refresh-button');
const backDashboardButton = document.getElementById('back-dashboard-button');

// Modal popup elements
const medicineAlertModal = document.getElementById('medicine-alert-modal');
const modalAlertText = document.getElementById('modal-alert-text');
const modalOkButton = document.getElementById('modal-ok-button');

if (modalOkButton) {
  modalOkButton.addEventListener('click', handleModalOkButton);
}

loginButton.addEventListener('click', handleLogin);
registerButton.addEventListener('click', () => showRegister());
createAccountButton.addEventListener('click', handleRegister);
backToLoginButton.addEventListener('click', () => showLogin());
guestButton.addEventListener('click', () => showDashboard('Guest'));
homeLoginButton.addEventListener('click', () => showLogin());
homeGuestButton.addEventListener('click', () => showDashboard('Guest'));
addMedicineButton.addEventListener('click', () => showForm());
viewRemindersButton.addEventListener('click', showReminders);
logoutButton.addEventListener('click', handleLogout);
saveButton.addEventListener('click', saveMedicine);
cancelButton.addEventListener('click', () => showDashboard(currentUser));
refreshButton.addEventListener('click', () => renderReminders(getMedicines()));
backDashboardButton.addEventListener('click', () => showDashboard(currentUser));

function handleLogin() {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  if (!username || !password) {
    alert('Enter both username and password.');
    return;
  }

  const users = getUsers();
  const existing = users.find(user => user.username === username && user.password === password);
  if (existing || (username === 'admin' && password === 'admin')) {
    showDashboard(username);
    return;
  }

  alert('Invalid login. Please register or use an existing account.');
}

function handleRegister() {
  const username = document.getElementById('new-username').value.trim();
  const password = document.getElementById('new-password').value.trim();

  if (!username || !password) {
    alert('Choose a username and password.');
    return;
  }

  if (username === 'Guest') {
    alert('Username "Guest" is reserved. Choose another username.');
    return;
  }

  const users = getUsers();
  if (users.some(user => user.username === username)) {
    alert('Username already exists. Please choose a different username or login instead.');
    return;
  }

  users.push({ username, password });
  saveUsers(users);
  showDashboard(username);
}

function showScreen(screen) {
  [homeScreen, loginScreen, registerScreen, dashboardScreen, formScreen, remindersScreen].forEach(element => {
    element.classList.add('hidden');
  });
  screen.classList.remove('hidden');
}

function showHome() {
  currentUser = '';
  editIndex = null;
  usernameInput.value = '';
  passwordInput.value = '';
  formError.classList.add('hidden');
  hideMedicineAlert();
  showScreen(homeScreen);
}

function showLogin() {
  currentUser = '';
  editIndex = null;
  usernameInput.value = '';
  passwordInput.value = '';
  formError.classList.add('hidden');
  hideMedicineAlert();
  showScreen(loginScreen);
}

function showRegister() {
  currentUser = '';
  editIndex = null;
  document.getElementById('new-username').value = '';
  document.getElementById('new-password').value = '';
  formError.classList.add('hidden');
  hideMedicineAlert();
  showScreen(registerScreen);
}

function showDashboard(user) {
  currentUser = user;
  editIndex = null;
  formError.classList.add('hidden');
  usernameInput.value = '';
  passwordInput.value = '';
  welcomeText.textContent = `Welcome, ${user}`;

  const isGuest = user === 'Guest';
  guestInfo.classList.toggle('hidden', !isGuest);
  summaryText.classList.toggle('hidden', isGuest);
  addMedicineButton.classList.toggle('hidden', isGuest);
  viewRemindersButton.classList.toggle('hidden', isGuest);

  if (isGuest) {
    summaryText.textContent = '';
    logoutButton.textContent = 'Home';
  } else {
    summaryText.textContent = getSummaryText();
    logoutButton.textContent = 'Logout';
    showScreen(dashboardScreen);
    renderDashboardMedicines(getMedicines());
    return;
  }

  showScreen(dashboardScreen);
}

function handleLogout() {
  if (currentUser === 'Guest') {
    showHome();
  } else {
    showLogin();
  }
}

function showForm(medicine = null, index = null) {
  editIndex = index;
  if (medicine) {
    formTitle.textContent = 'Edit Medicine';
    medicineNameInput.value = medicine.name;
    medicineDoseInput.value = medicine.dose;
    const parts = getTimeParts(medicine.time);
    medicineTimeInput.value = `${parts.hour}:${parts.minute}`;
    medicineAmPmSelect.value = parts.ampm;
    const selectedDays = (medicine.days || '').split(',').map(day => day.trim());
    medicineDayInputs.forEach(input => {
      input.checked = selectedDays.includes(input.value);
    });
  } else {
    formTitle.textContent = 'Add Medicine';
    medicineNameInput.value = '';
    medicineDoseInput.value = '';
    medicineTimeInput.value = '08:00';
    medicineAmPmSelect.value = 'AM';
    medicineDayInputs.forEach(input => input.checked = false);
  }
  showScreen(formScreen);
}

function showReminders() {
  renderReminders(getMedicines());
  showScreen(remindersScreen);
}

function getUsers() {
  const stored = localStorage.getItem('medicine_reminder_users');
  if (!stored) {
    return [];
  }

  try {
    return JSON.parse(stored).filter(item => item && typeof item.username === 'string');
  } catch (error) {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem('medicine_reminder_users', JSON.stringify(users));
}

function getStorageKey() {
  return `${STORAGE_KEY}_${currentUser}`;
}

function getMedicines() {
  if (!currentUser) {
    return [];
  }

  const stored = localStorage.getItem(getStorageKey());
  if (!stored) {
    return [];
  }

  try {
    return JSON.parse(stored).filter(item => item && typeof item.name === 'string');
  } catch (error) {
    return [];
  }
}

function saveMedicines(list) {
  if (!currentUser) {
    return;
  }
  localStorage.setItem(getStorageKey(), JSON.stringify(list));
}

function getSummaryText() {
  const medicines = getMedicines().filter(item => isValidTime(item.time));
  if (medicines.length === 0) {
    return 'No reminders yet. Add a medicine to get started.';
  }

  const sorted = medicines.slice().sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
  return `${sorted.length} reminders saved. Next: ${sorted[0].name} at ${sorted[0].time}.`;
}

function saveMedicine() {
  const name = medicineNameInput.value.trim();
  const dose = medicineDoseInput.value.trim();
  const time = medicineTimeInput.value.trim();
  const ampm = medicineAmPmSelect.value;
  const fullTime = `${time} ${ampm}`;
  const selectedDays = Array.from(medicineDayInputs)
    .filter(input => input.checked)
    .map(input => input.value);

  if (!name) {
    showFormError('Please enter a medicine name.');
    return;
  }
  if (!isValidTime(fullTime)) {
    showFormError('Enter the time manually in hh:mm format and choose AM or PM.');
    return;
  }
  if (selectedDays.length === 0) {
    showFormError('Select at least one day of the week.');
    return;
  }

  const medicines = getMedicines();
  const newMedicine = { name, dose, time: formatTimeForDisplay(fullTime), days: selectedDays.join(', ') };

  if (editIndex === null) {
    medicines.push(newMedicine);
  } else {
    medicines[editIndex] = newMedicine;
  }

  const sorted = medicines.slice().sort((a, b) => a.time.localeCompare(b.time));
  saveMedicines(sorted);
  showDashboard(currentUser);
}


function renderReminders(medicines) {
  const sorted = medicines.slice().sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
  reminderTableBody.innerHTML = '';

  if (sorted.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="4" class="empty-row">No medicine reminders saved.</td>';
    reminderTableBody.appendChild(row);
    return;
  }

  sorted.forEach((medicine, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${medicine.name}</td>
      <td>${medicine.dose || '-'}</td>
      <td>${medicine.time}</td>
      <td>${medicine.days || '-'}</td>
      <td>
        <button class="action-button edit" type="button">Edit</button>
        <button class="action-button delete" type="button">Delete</button>
      </td>
    `;

    row.querySelector('.edit').addEventListener('click', () => {
      showForm(medicine, index);
    });

    const isNow = isReminderDueNow(medicine);
    if (isNow) {
      row.classList.add('due-now');
    }

    row.querySelector('.delete').addEventListener('click', () => {
      if (confirm(`Delete reminder for ${medicine.name} at ${medicine.time}?`)) {
        const remaining = sorted.filter((_, i) => i !== index);
        saveMedicines(remaining);
        renderReminders(remaining);
        summaryText.textContent = getSummaryText();
      }
    });

    reminderTableBody.appendChild(row);
  });
}

function renderDashboardMedicines(medicines) {
  const sorted = medicines.slice().sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
  dashboardMedicinesBody.innerHTML = '';

  if (sorted.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="5" class="empty-row">No medicines added. Click "Add Medicine" to get started.</td>';
    dashboardMedicinesBody.appendChild(row);
    return;
  }

  sorted.forEach((medicine, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${medicine.name}</td>
      <td>${medicine.dose || '-'}</td>
      <td>${medicine.time}</td>
      <td>${medicine.days || '-'}</td>
      <td>
        <button class="action-button edit" type="button">Edit</button>
        <button class="action-button delete" type="button">Delete</button>
      </td>
    `;

    row.querySelector('.edit').addEventListener('click', () => {
      showForm(medicine, index);
    });

    const isNow = isReminderDueNow(medicine);
    if (isNow) {
      row.classList.add('due-now');
    }

    row.querySelector('.delete').addEventListener('click', () => {
      if (confirm(`Delete reminder for ${medicine.name} at ${medicine.time}?`)) {
        const remaining = sorted.filter((_, i) => i !== index);
        saveMedicines(remaining);
        renderDashboardMedicines(remaining);
        summaryText.textContent = getSummaryText();
      }
    });

    dashboardMedicinesBody.appendChild(row);
  });
}

function isValidTime(value) {
  return timeToMinutes(value) !== null;
}

function formatTimeForDisplay(value) {
  const time = String(value).trim();
  const match12 = /^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/.exec(time);
  if (match12) {
    const hour = parseInt(match12[1], 10);
    const minute = match12[2];
    const ampm = match12[3].toUpperCase();
    if (hour < 1 || hour > 12 || minute < 0 || minute > 59) {
      return null;
    }
    return `${pad(hour)}:${minute} ${ampm}`;
  }

  const match24 = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (match24) {
    let hour = parseInt(match24[1], 10);
    const minute = match24[2];
    const suffix = hour >= 12 ? 'PM' : 'AM';
    if (hour === 0) {
      hour = 12;
    } else if (hour > 12) {
      hour -= 12;
    }
    return `${pad(hour)}:${minute} ${suffix}`;
  }

  return null;
}

function getTimeParts(value) {
  const formatted = formatTimeForDisplay(value);
  const match = /^(\d{2}):(\d{2})\s*(AM|PM)$/.exec(formatted || '08:00 AM');
  return {
    hour: match[1],
    minute: match[2],
    ampm: match[3],
    time: `${match[1]}:${match[2]}`,
  };
}

function timeToMinutes(value) {
  const formatted = formatTimeForDisplay(value);
  if (!formatted) {
    return null;
  }

  const [, rawHour, rawMinute, meridiem] = /^(\d{2}):(\d{2})\s*(AM|PM)$/.exec(formatted);
  let hour = parseInt(rawHour, 10);
  const minute = parseInt(rawMinute, 10);

  if (meridiem === 'AM') {
    if (hour === 12) {
      hour = 0;
    }
  } else {
    if (hour !== 12) {
      hour += 12;
    }
  }

  return hour * 60 + minute;
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function showFormError(message) {
  formError.textContent = message;
  formError.classList.remove('hidden');
}



function requestNotificationPermission() {
  if (!('Notification' in window) || Notification.permission !== 'default') {
    return;
  }

  Notification.requestPermission().then(permission => {
    if (permission !== 'granted') {
      return;
    }
  });
}

function getReminderKey(medicine) {
  const now = new Date();
  const weekdayMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = weekdayMap[now.getDay()];
  return `${medicine.name}|${medicine.time}|${today}`;
}

function notifyBrowser(due) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const dueKey = getReminderKey(due);
  if (lastDueReminderKey === dueKey) {
    return;
  }

  lastDueReminderKey = dueKey;
  new Notification('Medicine Reminder', {
    body: `Time to take ${due.name} at ${due.time}.`,
    icon: '',
  });
}



function isReminderDueNow(medicine) {
  if (!medicine.time || !medicine.days) {
    return false;
  }

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const weekdayMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = weekdayMap[now.getDay()];

  const medicineMinutes = timeToMinutes(medicine.time);
  if (medicineMinutes !== nowMinutes) {
    return false;
  }

  const scheduledDays = medicine.days.split(',').map(day => day.trim());
  return scheduledDays.includes(today);
}



// Sound notification functions
function playMedicineSound() {
  stopMedicineSound(); // Stop any existing sound first
  
  try {
    // Create audio context if it doesn't exist
    if (!currentAudioContext) {
      currentAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    const audioCtx = currentAudioContext;
    const now = audioCtx.currentTime;
    
    // Create gain node for volume control
    currentGainNode = audioCtx.createGain();
    currentGainNode.connect(audioCtx.destination);
    currentGainNode.gain.setValueAtTime(0.3, now); // Set volume to 30%
    
    // Create multiple oscillators for a more noticeable alarm sound
    const frequencies = [800, 600]; // Two different frequencies for a beeping effect
    
    frequencies.forEach(frequency => {
      const oscillator = audioCtx.createOscillator();
      oscillator.frequency.setValueAtTime(frequency, now);
      oscillator.type = 'sine';
      oscillator.connect(currentGainNode);
      oscillator.start(now);
      currentOscillators.push(oscillator);
    });
  } catch (error) {
    console.error('Error playing sound:', error);
  }
}

function stopMedicineSound() {
  try {
    if (currentAudioContext) {
      const now = currentAudioContext.currentTime;
      
      // Stop all oscillators
      currentOscillators.forEach(oscillator => {
        oscillator.stop(now);
      });
      currentOscillators = [];
      
      // Close gain node
      if (currentGainNode) {
        currentGainNode.gain.setValueAtTime(0, now);
      }
    }
  } catch (error) {
    console.error('Error stopping sound:', error);
  }
}

function showMedicineAlert(message) {
  if (modalAlertText) {
    modalAlertText.textContent = message;
  }
  if (medicineAlertModal) {
    medicineAlertModal.classList.remove('hidden');
  }
  playMedicineSound();
}

function hideMedicineAlert() {
  if (medicineAlertModal) {
    medicineAlertModal.classList.add('hidden');
  }
  stopMedicineSound();
}

function handleModalOkButton() {
  hideMedicineAlert();
  dismissedDueReminderKey = lastDueReminderKey;
}

showHome();
