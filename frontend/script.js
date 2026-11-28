const $ = (selector, root = document) => root.querySelector(selector);

const API_BASE = 'http://localhost:3000/api';
const TOKEN_KEY = 'psm_token';
const USER_KEY = 'psm_user';

let currentRole = 'owner';
let currentPage = 'dashboard';
let selectedPatientId = null;
let doctors = [];
let patients = [];
let appointments = [];
let dashboardData = null;

const appointmentStatuses = ['Pending', 'Confirmed', 'Completed', 'Cancelled', 'No-show'];

const allowedStatusTransitions = {
  Pending: ['Confirmed', 'Cancelled'],
  Confirmed: ['Completed', 'Cancelled', 'No-show'],
  Completed: [],
  Cancelled: [],
  'No-show': []
};

const menus = {
  owner: [
    ['dashboard', '▦', 'Dashboard'],
    ['appointments', '▤', 'Appointments'],
    ['booking', '＋', 'New online booking'],
    ['patients', '▣', 'Patient records']
  ],
  receptionist: [
    ['dashboard', '▦', 'Dashboard'],
    ['appointments', '▤', 'Appointments'],
    ['walkin', '♧', 'Walk-in patient'],
    ['patients', '▣', 'Patient records']
  ]
};

const titles = {
  dashboard: 'Dashboard',
  appointments: 'Appointments',
  booking: 'New online booking',
  walkin: 'Walk-in patient',
  patients: 'Patient records',
  'patient-file': 'Patient file'
};

const allowed = {
  owner: ['dashboard', 'appointments', 'booking', 'patients', 'patient-file'],
  receptionist: ['dashboard', 'appointments', 'walkin', 'patients', 'patient-file']
};

function token() {
  return sessionStorage.getItem(TOKEN_KEY) || '';
}

function esc(value = '') {
  return String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[c]);
}

function initials(name = '') {
  return String(name).split(' ').map(p => p[0] || '').slice(0, 2).join('').toUpperCase();
}

function cls(value = '') {
  return String(value).toLowerCase().replace(/\s+/g, '-');
}

function toast(message) {
  const el = $('#toast');
  if (!el) {
    window.alert(message);
    return;
  }

  el.textContent = message;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
}

function markInvalidFields(form) {
  if (!form) return;

  form.querySelectorAll('.invalid-field').forEach(el => el.classList.remove('invalid-field'));

  [...form.elements].forEach(field => {
    if (!field.name || field.disabled || field.type === 'button' || field.type === 'submit' || field.type === 'reset') return;

    const value = String(field.value || '').trim();
    const phoneInvalid = field.name === 'phone' && value && !/^09\d{2}\s?\d{3}\s?\d{4}$/.test(value);
    const pastDate = field.name === 'date' && currentPage === 'booking' && value && value < todayISO();

    if ((field.required && !value) || !field.checkValidity() || phoneInvalid || pastDate) {
      field.classList.add('invalid-field');
    }
  });
}

function showValidationPopup(form) {
  markInvalidFields(form);
  openPopup(
    'form-validation-error',
    'Please review the form',
    'Check the highlighted fields and correct the missing or invalid information.'
  );
}

function todayISO() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());

  const part = type => parts.find(p => p.type === type)?.value || '';

  return `${part('year')}-${part('month')}-${part('day')}`;
}

function isPastAppointment(appointment) {
  return ['Pending', 'Confirmed'].includes(appointment.status) &&
    String(appointment.appointment_datetime || '').slice(0, 16).replace(' ', 'T') <
    new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Manila' }).slice(0, 16).replace(' ', 'T');
}

function getAllowedNextStatuses(status) {
  return allowedStatusTransitions[status] || [];
}

function statusOptions(current) {
  return appointmentStatuses.map(s =>
    `<option value="${esc(s)}"${s === current ? ' selected' : ''}${s !== current && !getAllowedNextStatuses(current).includes(s) ? ' disabled' : ''}>${esc(s)}</option>`
  ).join('');
}

async function apiRequest(path, options = {}) {
  const headers = { ...(options.headers || {}) };

  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token()) {
    headers.Authorization = `Bearer ${token()}`;
  }

  let response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers
    });
  } catch (error) {
    throw new Error('Cannot connect to the PSM server. Check that the backend is running.');
  }

  const result = await response.json().catch(() => ({}));

  if (response.status === 401 && path !== '/auth/login') {
    clearSession();
    throw new Error('Your session expired. Please sign in again.');
  }

  if (!response.ok || result.success === false) {
    throw new Error(result.message || `Request failed (${response.status}).`);
  }

  return result;
}

function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);

  $('#app')?.classList.add('hidden');
  $('#loginScreen')?.classList.remove('hidden');
}

function parseDateTime(value) {
  const raw = String(value || '').replace('T', ' ');
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?/);

  if (!match) {
    return {
      date: '',
      time24: '',
      dateLabel: '',
      timeLabel: ''
    };
  }

  const [, date, hh, mm] = match;
  const d = new Date(`${date}T12:00:00`);

  return {
    date,
    time24: `${hh}:${mm}`,
    dateLabel: d.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric'
    }),
    timeLabel: new Date(`2000-01-01T${hh}:${mm}:00`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  };
}

function toMysqlDateTime(date, timeLabel) {
  const match = String(timeLabel || '').match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (!match) {
    throw new Error('Please select a valid appointment time.');
  }

  let hour = Number(match[1]);
  const minute = match[2];
  const meridiem = match[3].toUpperCase();

  if (meridiem === 'PM' && hour !== 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;

  return `${date} ${String(hour).padStart(2, '0')}:${minute}:00`;
}

function fmtDate(value) {
  if (!value) return '';

  const d = new Date(`${value}T12:00:00`);

  return Number.isNaN(d.getTime())
    ? String(value)
    : d.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric'
      });
}

function normalizePatient(p) {
  return {
    patient_id: Number(p.patient_id),
    name: p.name || p.full_name || '',
    phone: p.phone || p.phone_number || '',
    birthday: p.birthday || p.birth || '',
    address: p.address || '',
    occupation: p.occupation || '',
    civil_status: p.civil_status || p.civilStatus || '',
    last: '—',
    status: 'No Appointment'
  };
}

function normalizeAppointment(a) {
  const dt = parseDateTime(a.appointment_datetime);

  return {
    appointment_id: Number(a.appointment_id),
    patient_id: Number(a.patient_id),
    patient: a.patient_name || '',
    phone: a.phone_number || '',
    doctor_id: Number(a.doctor_id),
    doctor_name: a.doctor_name || '',
    user_id: Number(a.user_id),
    service: a.procedure_type || '',
    booking_type: a.booking_type || '',
    appointment_datetime: a.appointment_datetime,
    date: dt.dateLabel,
    dateValue: dt.date,
    time: dt.timeLabel,
    time24: dt.time24,
    status: a.appointment_status || ''
  };
}

function getDoctor(a) {
  return a.doctor_name ||
    doctors.find(d => Number(d.doctor_id) === Number(a.doctor_id))?.doctor_name ||
    '';
}

function getPatientLastVisit(patient) {
  const visits = appointments
    .filter(a => a.patient_id === patient.patient_id && !['Cancelled', 'No-show'].includes(a.status))
    .sort((a, b) => String(b.appointment_datetime).localeCompare(String(a.appointment_datetime)));

  return visits[0]?.date || '—';
}

function latestAppointmentStatus(patient) {
  const list = appointments
    .filter(a => a.patient_id === patient.patient_id)
    .sort((a, b) => String(b.appointment_datetime).localeCompare(String(a.appointment_datetime)));

  return list[0]?.status || 'No Appointment';
}

async function loadDoctors() {
  const result = await apiRequest('/doctors');
  doctors = Array.isArray(result.data) ? result.data : [];
}

async function loadPatients() {
  const result = await apiRequest('/patients');
  patients = (Array.isArray(result.data) ? result.data : []).map(normalizePatient);
}

async function loadAppointments() {
  let all = [];

  if (currentRole === 'owner') {
    let page = 1;
    let totalPages = 1;

    do {
      const result = await apiRequest(`/appointments?page=${page}&limit=100`);
      const payload = result.data || {};

      all = all.concat(payload.appointments || []);
      totalPages = Number(payload.pagination?.totalPages || 1);
      page += 1;
    } while (page <= totalPages);
  } else {
    const result = await apiRequest('/appointments');
    all = result.data?.appointments || [];
  }

  appointments = all.map(normalizeAppointment);
}

async function loadDashboard() {
  const result = await apiRequest('/dashboard');
  dashboardData = result.data || {};
}

async function refreshData() {
  await Promise.all([
    loadDoctors(),
    loadPatients(),
    loadAppointments(),
    loadDashboard()
  ]);
}

function configureNavigation() {
  const nav = $('#sideNav');
  if (!nav) return;

  nav.innerHTML = menus[currentRole].map(([page, icon, label]) =>
    `<button class="nav-link ${page === currentPage ? 'active' : ''}" data-page="${page}"><span>${icon}</span>${label}</button>`
  ).join('');
}

async function setPage(page) {
  if (!allowed[currentRole].includes(page)) {
    toast('You do not have access to this screen.');
    return;
  }

  currentPage = page;
  const file = page === 'patient-file' ? 'patient-file' : page;

  try {
    const sharedPages = ['appointments', 'patients', 'patient-file'];
    let response;

    if (sharedPages.includes(file)) {
      response = await fetch(`screens/shared/${file}.html`);

      if (!response.ok) {
        response = await fetch(`screens/${currentRole}/${file}.html`);
      }
    } else {
      response = await fetch(`screens/${currentRole}/${file}.html`);
    }

    if (!response.ok) throw new Error('Screen not found');

    $('#pageContent').innerHTML = await response.text();

    if ($('#crumb')) {
      $('#crumb').textContent = titles[page] || 'Dashboard';
    }

    if (page === 'dashboard') {
      const user = JSON.parse(sessionStorage.getItem(USER_KEY) || '{}');
      const greeting = $('#dashboardGreeting');

      if (greeting) {
        greeting.textContent = `Good day, ${user.full_name || user.username || 'there'}`;
      }
    }

    configureNavigation();
    await refreshData();
    await hydratePage(page);

  } catch (error) {
    console.error(error);

    $('#pageContent').innerHTML =
      `<section class="panel"><h3>Unable to load this screen</h3><p class="small-note">${esc(error.message)}</p></section>`;
  }
}

/* Automatically select the first available doctor. */
function populateDoctorSelect(root = document) {
  root.querySelectorAll('select[name="doctor_id"], #doctorSelect').forEach(select => {
    select.innerHTML = '';

    if (!doctors.length) {
      const option = document.createElement('option');

      option.value = '';
      option.textContent = 'No doctor available';
      option.disabled = true;
      option.selected = true;

      select.appendChild(option);
      return;
    }

    doctors.forEach(doctor => {
      const option = document.createElement('option');

      option.value = String(doctor.doctor_id);
      option.textContent = doctor.doctor_name;

      select.appendChild(option);
    });

    select.value = String(doctors[0].doctor_id);
  });
}

function patientRows(list = patients) {
  if (!list.length) {
    return '<tr><td colspan="5">No patient records found.</td></tr>';
  }

  return list.map(p => {
    const status = latestAppointmentStatus(p);

    return `<tr><td><div class="patient-cell"><span class="mini-avatar">${esc(initials(p.name))}</span><strong>${esc(p.name)}</strong></div></td><td>${esc(p.phone)}</td><td>${esc(getPatientLastVisit(p))}</td><td><span class="status ${cls(status)}">${esc(status)}</span></td><td><button class="action-link" data-open-patient="${p.patient_id}">Open file →</button></td></tr>`;
  }).join('');
}

function appointmentRows(list = appointments) {
  if (!list.length) {
    return '<tr><td colspan="7">No appointments found.</td></tr>';
  }

  return list.map(a => {
    const overdue = isPastAppointment(a);

    return `<tr class="${overdue ? 'appointment-overdue' : ''}"><td>${esc(a.date)}</td><td>${esc(a.time)}</td><td>${esc(a.patient)}</td><td>${esc(a.service)}</td><td>${esc(getDoctor(a))}</td><td><span class="status ${cls(a.status)}">${esc(a.status)}</span>${overdue ? '<small class="overdue-note">Past appointment · needs closure</small>' : ''}</td><td><button class="action-link" data-manage="${a.appointment_id}">${currentRole === 'owner' ? 'Manage' : 'View'}</button></td></tr>`;
  }).join('');
}

async function hydratePage(page) {
  if (page === 'dashboard') {
    const d = dashboardData || {};

    if ($('#totalAppointments')) {
      $('#totalAppointments').textContent = d.totalAppointments ?? appointments.length;
    }

    if ($('#todayAppointments')) {
      $('#todayAppointments').textContent = appointments.filter(a =>
        a.dateValue === new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }) &&
        !['Cancelled', 'No-show'].includes(a.status)
      ).length;
    }

    if ($('#totalPatients')) {
      $('#totalPatients').textContent = d.totalPatients ?? patients.length;
    }

    if ($('#pendingAppointments')) {
      $('#pendingAppointments').textContent = appointments.filter(a => a.status === 'Pending').length;
    }

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

    const todayList = appointments
      .filter(a => a.dateValue === today && !['Cancelled', 'No-show'].includes(a.status))
      .sort((a, b) => a.appointment_datetime.localeCompare(b.appointment_datetime));

    if ($('#todayTable')) {
      $('#todayTable').innerHTML = todayList.map(a =>
        `<tr><td>${esc(a.time)}</td><td>${esc(a.patient)}</td><td>${esc(a.service)}</td><td>${esc(getDoctor(a))}</td><td><span class="status ${cls(a.status)}">${esc(a.status)}</span></td></tr>`
      ).join('') || '<tr><td colspan="5">No appointments for today.</td></tr>';
    }
  }

  if (page === 'appointments') {
    $('#appointmentTable').innerHTML = appointmentRows();

    $('#appointmentSearch')?.addEventListener('input', filterAppointments);

    ['appointmentFilter', 'appointmentDate'].forEach(id => {
      $('#' + id)?.addEventListener('change', filterAppointments);
    });
  }

  if (page === 'patients') {
    const update = () => {
      const q = ($('#patientSearch')?.value || '').toLowerCase();
      const status = $('#patientStatusFilter')?.value || 'All';

      const filtered = patients.filter(p =>
        (`${p.name} ${p.phone}`).toLowerCase().includes(q) &&
        (status === 'All' || latestAppointmentStatus(p) === status)
      );

      $('#patientTable').innerHTML = patientRows(filtered);
    };

    update();

    $('#patientSearch')?.addEventListener('input', update);
    $('#patientStatusFilter')?.addEventListener('change', update);
  }

  if (page === 'booking' || page === 'walkin') {
    populateDoctorSelect();

    const form = $('#bookingForm');

    form?.addEventListener('submit', submitBooking);

    const dateInput = form?.elements.namedItem('date');
    const doctorInput = form?.elements.namedItem('doctor_id');
    const timeSelect = form?.elements.namedItem('time');

    if (dateInput) {
      dateInput.min = todayISO();

      if (currentPage === 'walkin') {
        dateInput.value = todayISO();
      }
    }

    form?.addEventListener('input', event => {
      event.target.classList.remove('invalid-field');
    });

    form?.addEventListener('change', event => {
      event.target.classList.remove('invalid-field');
    });

    const updateSlots = async () => {
      if (!dateInput?.value || !doctorInput?.value || !timeSelect) return;

      try {
        const result = await apiRequest(
          `/doctors/slots?doctor_id=${encodeURIComponent(doctorInput.value)}&date=${encodeURIComponent(dateInput.value)}`
        );

        const current = timeSelect.value;

        timeSelect.innerHTML = '<option value="">Select time</option>';

        (result.data?.slots || []).forEach(slot => {
          const option = document.createElement('option');

          option.value = new Date(`2000-01-01T${slot.time}`).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          });

          option.textContent = option.value + (slot.available ? '' : ' — Unavailable');
          option.disabled = !slot.available;

          timeSelect.appendChild(option);
        });

        if ([...timeSelect.options].some(o => o.value === current && !o.disabled)) {
          timeSelect.value = current;
        }

      } catch (error) {
        toast(error.message);
      }
    };

    dateInput?.addEventListener('change', updateSlots);
    doctorInput?.addEventListener('change', updateSlots);

    await updateSlots();
  }

  if (page === 'patient-file') {
    const patient = patients.find(p => p.patient_id === selectedPatientId);

    if (!patient) {
      toast('Patient record not found.');
      await setPage('patients');
      return;
    }

    $('#editName').value = patient.name || '';
    $('#editBirthday').value = patient.birthday ? String(patient.birthday).slice(0, 10) : '';
    $('#editAddress').value = patient.address || '';
    $('#editOccupation').value = patient.occupation || '';
    $('#editCivilStatus').value = patient.civil_status || '';
    $('#editPhone').value = patient.phone || '';

    const history = appointments
      .filter(a => a.patient_id === patient.patient_id)
      .sort((a, b) => b.appointment_datetime.localeCompare(a.appointment_datetime));

    $('#editLast').value = getPatientLastVisit(patient);

    $('#patientHistory').innerHTML = history.map(a =>
      `<tr><td>${esc(a.date)}</td><td>${esc(a.service)}</td><td>${esc(getDoctor(a))}</td><td>${esc(a.status)}</td></tr>`
    ).join('') || '<tr><td colspan="4">No appointment history yet.</td></tr>';

    $('#editPatientForm')?.addEventListener('submit', async event => {
      event.preventDefault();

      const fd = new FormData(event.target);
      const name = String(fd.get('name') || '').trim();
      const phone = String(fd.get('phone') || '').trim();

      if (!name || !/^09\d{2}\s?\d{3}\s?\d{4}$/.test(phone)) {
        showValidationPopup(event.target);
        return;
      }

      const body = {
        name,
        phone,
        birthday: fd.get('birthday') || null,
        address: String(fd.get('address') || '').trim(),
        occupation: String(fd.get('occupation') || '').trim(),
        civilStatus: fd.get('civil_status') || ''
      };

      try {
        await apiRequest(`/patients/${patient.patient_id}`, {
          method: 'PUT',
          body: JSON.stringify(body)
        });

        await openPopup(
          'changes-saved',
          'Changes saved',
          'Patient information has been updated.',
          'Your changes have been saved to the patient record.'
        );

        await refreshData();

      } catch (error) {
        toast(error.message);
      }
    });
  }
}

function filterAppointments() {
  const q = ($('#appointmentSearch')?.value || '').toLowerCase();
  const status = $('#appointmentFilter')?.value || 'All';
  const date = $('#appointmentDate')?.value || '';

  const filtered = appointments.filter(a =>
    (`${a.patient} ${a.service} ${getDoctor(a)}`).toLowerCase().includes(q) &&
    (status === 'All' || a.status === status) &&
    (!date || a.dateValue === date)
  );

  $('#appointmentTable').innerHTML = appointmentRows(filtered);
}

async function submitBooking(event) {
  event.preventDefault();

  const form = event.target;
  const fd = new FormData(form);
  const data = Object.fromEntries(fd.entries());

  const name = String(data.name || '').trim();
  const phone = String(data.phone || '').trim();

  const phoneValid = /^09\d{2}\s?\d{3}\s?\d{4}$/.test(phone);
  const dateValid = currentPage !== 'booking' || (data.date && data.date >= todayISO());

  if (
    !name ||
    !phoneValid ||
    !data.doctor_id ||
    !data.date ||
    !data.time ||
    !data.service ||
    !dateValid ||
    !form.checkValidity()
  ) {
    showValidationPopup(form);
    return;
  }

  const button = form.querySelector('button[type="submit"]');
  const originalLabel = button?.textContent || '';

  if (button) {
    button.disabled = true;
    button.textContent = 'Saving...';
  }

  try {
    const patientResult = await apiRequest('/patients', {
      method: 'POST',
      body: JSON.stringify({
        name,
        phone,
        birthday: data.birthday || null,
        address: data.address || ''
      })
    });

    const patient = patientResult.data;

    if (!patient?.patient_id) {
      throw new Error('The patient record could not be confirmed by the server.');
    }

    if (data.occupation || data.civil_status) {
      await apiRequest(`/patients/${patient.patient_id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: patient.full_name || name,
          phone: patient.phone_number || phone,
          birthday: data.birthday || patient.birthday || null,
          address: data.address || patient.address || '',
          occupation: data.occupation || patient.occupation || '',
          civilStatus: data.civil_status || patient.civil_status || ''
        })
      });
    }

    const appointmentDateTime = toMysqlDateTime(data.date, data.time);

    const appointmentResult = await apiRequest('/appointments', {
      method: 'POST',
      body: JSON.stringify({
        patient_id: Number(patient.patient_id),
        doctor_id: Number(data.doctor_id),
        procedure_type: data.service,
        booking_type: currentPage === 'walkin' ? 'Walk-in' : 'Online',
        appointment_datetime: appointmentDateTime
      })
    });

    if (currentPage === 'walkin') {
      toast('Walk-in appointment registered successfully.');
      await setPage('appointments');

    } else {
      const doctorName = doctors.find(d =>
        Number(d.doctor_id) === Number(data.doctor_id)
      )?.doctor_name || 'Assigned doctor';

      const summary = [
        `Patient: ${name}`,
        `Date: ${fmtDate(data.date)}`,
        `Time: ${data.time}`,
        `Service: ${data.service}`,
        `Doctor: ${doctorName}`,
        `Booking status: ${appointmentResult.data?.appointment_status || 'Pending'}`
      ].join('\n');

      await openPopup(
        'booking-confirmation',
        'Booking confirmed',
        'Your appointment request has been submitted.',
        summary
      );

      form.reset();
    }

    await refreshData();

  } catch (error) {
    if (/already has an appointment|slot is busy|not an available clinic time|conflict/i.test(error.message)) {
      openPopup('time-slot-unavailable');
    } else {
      toast(error.message);
    }

  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = originalLabel;
    }
  }
}

async function openPopup(name, title = '', message = '', details = '') {
  const root = $('#modalRoot');

  try {
    const response = await fetch(`screens/popups/${name}.html`);

    if (!response.ok) {
      throw new Error('Popup not found');
    }

    root.innerHTML = await response.text();

    if (title) {
      const heading = root.querySelector('[data-popup-title], .modal-header strong');
      if (heading) heading.textContent = title;
    }

    if (message) {
      const bodyMessage = root.querySelector('[data-popup-message], #popupSuccessTitle');
      if (bodyMessage) bodyMessage.textContent = message;
    }

    if (details) {
      const detailNode = root.querySelector('#bookingConfirmationDetails, #popupSuccessMessage');
      if (detailNode) detailNode.textContent = details;
    }

    root.classList.add('open');
    root.setAttribute('aria-hidden', 'false');

  } catch (error) {
    console.error(error);
    toast('Unable to load popup.');
  }
}

function closePopup() {
  const root = $('#modalRoot');

  if (!root) return;

  root.classList.remove('open');
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML = '';
}

async function openAppointmentPopup(appointmentId) {
  const appointment = appointments.find(a => a.appointment_id === Number(appointmentId));

  if (!appointment) return;

  if (currentRole !== 'owner') {
    toast('Appointment editing is not available for Receptionist accounts in the current backend.');
    return;
  }

  await openPopup('owner-update-status');

  const form = $('#modalRoot form');
  if (!form) return;

  const select = form.elements.namedItem('status');

  if (select) {
    select.innerHTML = statusOptions(appointment.status);
    select.value = appointment.status;
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();

    const next = new FormData(form).get('status');

    if (next !== appointment.status && !getAllowedNextStatuses(appointment.status).includes(next)) {
      toast('That status change is not allowed.');
      return;
    }

    try {
      await apiRequest(`/appointments/${appointment.appointment_id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ appointment_status: next })
      });

      closePopup();
      toast('Appointment status updated.');
      await setPage('appointments');

    } catch (error) {
      toast(error.message);
    }
  });
}

// Login
const loginForm = $('#loginForm');

if (loginForm) {
  loginForm.addEventListener('submit', async event => {
    event.preventDefault();

    const username = $('#username')?.value.trim() || '';
    const password = $('#password')?.value || '';
    const selectedRole = ($('#role')?.value || '').toLowerCase();

    const button = loginForm.querySelector('button[type="submit"]');

    if (!username || !password) {
      toast('Please enter your username and password.');
      return;
    }

    if (button) {
      button.disabled = true;
      button.textContent = 'Signing in...';
    }

    try {
      const result = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });

      const user = result.data?.user;
      const actualRole = String(user?.role || '').toLowerCase();

      if (!result.data?.token || !user) {
        throw new Error('Invalid login response.');
      }

      if (actualRole !== selectedRole) {
        throw new Error('Your account does not match the selected role.');
      }

      if (!['owner', 'receptionist'].includes(actualRole)) {
        throw new Error('Unsupported account role.');
      }

      sessionStorage.setItem(TOKEN_KEY, result.data.token);
      sessionStorage.setItem(USER_KEY, JSON.stringify(user));

      currentRole = actualRole;

      if ($('#sidebarName')) {
        $('#sidebarName').textContent = user.full_name || user.username;
      }

      const userInitials = initials(user.full_name || user.username || '');

      document.querySelectorAll('.avatar, .top-avatar').forEach(el => {
        el.textContent = userInitials;
        el.setAttribute('aria-label', `${user.full_name || user.username} initials`);
      });

      if ($('#sidebarRole')) {
        $('#sidebarRole').textContent = actualRole === 'owner' ? 'Owner' : 'Receptionist';
      }

      $('#loginScreen')?.classList.add('hidden');
      $('#app')?.classList.remove('hidden');

      if ($('#password')) {
        $('#password').value = '';
      }

      await setPage('dashboard');

    } catch (error) {
      toast(error.message);

    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = 'Sign in';
      }
    }
  });
}

// Global UI events
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && $('#modalRoot')?.classList.contains('open')) {
    closePopup();
  }
});

document.addEventListener('click', event => {
  if (event.target.closest('[data-close-popup]') || event.target.id === 'modalRoot') {
    closePopup();
  }

  if (event.target.id === 'confirmLogout') {
    closePopup();
    clearSession();

    currentRole = 'owner';
    currentPage = 'dashboard';
    selectedPatientId = null;
  }

  const nav = event.target.closest('[data-page]');

  if (nav && !nav.closest('#sideNav')) {
    setPage(nav.dataset.page);
  }

  const patientButton = event.target.closest('[data-open-patient]');

  if (patientButton) {
    selectedPatientId = Number(patientButton.dataset.openPatient);
    setPage('patient-file');
  }

  const manage = event.target.closest('[data-manage]');

  if (manage) {
    openAppointmentPopup(Number(manage.dataset.manage));
  }
});

$('#logoutBtn')?.addEventListener('click', () => {
  openPopup('logout-confirmation');
});

$('#sideNav')?.addEventListener('click', event => {
  const button = event.target.closest('[data-page]');

  if (button) {
    setPage(button.dataset.page);
  }
});

document.addEventListener('invalid', event => {
  const form = event.target.form;

  if (form && (form.id === 'bookingForm' || form.id === 'editPatientForm')) {
    event.preventDefault();
    showValidationPopup(form);
  }
}, true);

// Restore an existing session after a page refresh.
(async function restoreSession() {
  if (!token()) return;

  try {
    const user = JSON.parse(sessionStorage.getItem(USER_KEY) || '{}');
    const role = String(user.role || '').toLowerCase();

    if (!['owner', 'receptionist'].includes(role)) {
      throw new Error('Invalid saved session.');
    }

    currentRole = role;

    if ($('#sidebarName')) {
      $('#sidebarName').textContent = user.full_name || user.username || '';
    }

    const userInitials = initials(user.full_name || user.username || '');

    document.querySelectorAll('.avatar, .top-avatar').forEach(el => {
      el.textContent = userInitials;
      el.setAttribute('aria-label', `${user.full_name || user.username || 'User'} initials`);
    });

    if ($('#sidebarRole')) {
      $('#sidebarRole').textContent = role === 'owner' ? 'Owner' : 'Receptionist';
    }

    $('#loginScreen')?.classList.add('hidden');
    $('#app')?.classList.remove('hidden');

    await setPage('dashboard');

  } catch (error) {
    clearSession();
    toast(error.message || 'Please sign in again.');
  }
})();