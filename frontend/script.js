
const $ = (selector, root = document) => root.querySelector(selector);

let currentRole = 'owner';
let currentPage = 'dashboard';
let selectedPatient = null;

let doctors = ['Dr. Angela M.', 'Dr. John D.'];

const appointmentStatuses = [
  'Scheduled',
  'Pending',
  'Confirmed',
  'Completed',
  'Cancelled'
];

let patients = [
  { name: 'Sofia Reyes', phone: '0917 123 4567', email: 'sofia.reyes@email.com', last: 'Nov 10, 2026', status: 'Active' },
  { name: 'Miguel Santos', phone: '0918 234 5678', email: 'miguel.s@email.com', last: 'Nov 09, 2026', status: 'Active' },
  { name: 'Isabella Cruz', phone: '0920 345 6789', email: 'isabella.c@email.com', last: 'Nov 08, 2026', status: 'Active' },
  { name: 'Liam Garcia', phone: '0921 456 7890', email: 'liam.g@email.com', last: 'Nov 06, 2026', status: 'Active' }
];

let appointments = [
  { date: 'Nov 11, 2026', time: '09:00 AM', patient: 'Sofia Reyes', service: 'Dental Cleaning', doctor: 'Dr. Angela M.', status: 'Confirmed' },
  { date: 'Nov 11, 2026', time: '10:30 AM', patient: 'Miguel Santos', service: 'Tooth Extraction', doctor: 'Dr. John D.', status: 'Pending' },
  { date: 'Nov 11, 2026', time: '01:00 PM', patient: 'Isabella Cruz', service: 'Consultation', doctor: 'Dr. Angela M.', status: 'Confirmed' },
  { date: 'Nov 12, 2026', time: '02:00 PM', patient: 'Liam Garcia', service: 'Dental Cleaning', doctor: 'Dr. John D.', status: 'Scheduled' }
];

const menus = {
  owner: [
    ['dashboard', '▦', 'Dashboard'],
    ['appointments', '▤', 'Appointments'],
    ['booking', '＋', 'New online booking'],
    ['walkin', '♧', 'Walk-in patient'],
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
  owner: ['dashboard', 'appointments', 'booking', 'walkin', 'patients', 'patient-file'],
  receptionist: ['dashboard', 'appointments', 'walkin', 'patients', 'patient-file']
};


// GENERAL HELPERS

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function initials(name = '') {
  return name.split(' ').map(part => part[0] || '').slice(0, 2).join('').toUpperCase();
}

function cls(value = '') {
  return String(value).toLowerCase().replace(/\s+/g, '-');
}

function toast(message) {
  const element = $('#toast');

  if (!element) return;

  element.textContent = message;
  element.classList.add('show');

  setTimeout(() => element.classList.remove('show'), 2500);
}

function fmtDate(value) {
  const date = new Date(value + 'T12:00:00');

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric'
  });
}

function getDoctor(appointment) {
  return appointment.doctor || appointment.dentist || '';
}


// NAVIGATION

function configureNavigation() {
  const sideNav = $('#sideNav');

  if (!sideNav) return;

  sideNav.innerHTML = menus[currentRole].map(([page, icon, label]) => `
    <button class="nav-link ${page === currentPage ? 'active' : ''}" data-page="${page}">
      <span>${icon}</span>
      ${label}
    </button>
  `).join('');
}

async function setPage(page) {
  if (!allowed[currentRole].includes(page)) {
    toast('You do not have access to this screen.');
    return;
  }

  currentPage = page;

  const folder = currentRole;
  const file = page === 'patient-file' ? 'patient-file' : page;

  try {
    const response = await fetch(`screens/${folder}/${file}.html`);

    if (!response.ok) {
      throw new Error('Screen not found');
    }

    $('#pageContent').innerHTML = await response.text();

    if ($('#crumb')) {
      $('#crumb').textContent = titles[page] || 'Dashboard';
    }

    configureNavigation();
    hydratePage(page);

  } catch (error) {
    $('#pageContent').innerHTML = `
      <section class="panel">
        <h3>Unable to load screen</h3>
        <p class="small-note">
          Please check the frontend screens folder and make sure
          the backend server is running.
        </p>
      </section>
    `;

    console.error(error);
  }
}


// DOCTOR SELECT

function populateDoctorSelect(root = document) {
  const selects = root.querySelectorAll(
    'select[name="doctor"], select[name="dentist"], #doctorSelect'
  );

  selects.forEach(select => {
    const selectedValue = select.value;

    select.innerHTML = '';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select doctor';
    select.appendChild(placeholder);

    doctors.forEach(doctor => {
      const option = document.createElement('option');
      option.value = doctor;
      option.textContent = doctor;
      select.appendChild(option);
    });

    if (doctors.includes(selectedValue)) {
      select.value = selectedValue;
    }
  });
}

function doctorField() {
  return `
    <div class="field">
      <label for="doctorSelect">Doctor</label>

      <div class="doctor-select-row">
        <select name="doctor" id="doctorSelect" required>
          <option value="">Select doctor</option>
          ${doctors.map(doctor => `
            <option value="${esc(doctor)}">${esc(doctor)}</option>
          `).join('')}
        </select>

        ${currentRole === 'owner' ? `
          <button
            type="button"
            class="btn btn-outline"
            id="addDoctorBtn"
          >
            + Add Doctor
          </button>
        ` : ''}
      </div>
    </div>
  `;
}


// ADD DOCTOR POPUP

async function addDoctor() {
  if (currentRole !== 'owner') {
    toast('Only the Owner can add doctors.');
    return;
  }

  await openPopup('add-doctor');

  const innerModal = $('#addDoctorModal');

  if (innerModal) {
    const root = $('#modalRoot');
    root.innerHTML = innerModal.innerHTML;
  }

  const form = $('#addDoctorForm');
  const nameInput = $('#doctorName');

  if (!form || !nameInput) {
    toast('Add Doctor popup form was not found.');
    return;
  }

  nameInput.focus();

  $('#closeAddDoctor')?.addEventListener('click', closePopup);
  $('#cancelAddDoctor')?.addEventListener('click', closePopup);

  form.addEventListener('submit', event => {
    event.preventDefault();

    const doctorName = nameInput.value.trim();

    if (!doctorName) {
      toast('Please enter the doctor’s name.');
      nameInput.focus();
      return;
    }

    const duplicate = doctors.some(
      doctor => doctor.toLowerCase() === doctorName.toLowerCase()
    );

    if (duplicate) {
      toast('This doctor is already in the list.');
      nameInput.focus();
      return;
    }

    doctors.push(doctorName);

    closePopup();

    populateDoctorSelect();

    const doctorSelect = $(
      'select[name="doctor"], select[name="dentist"], #doctorSelect'
    );

    if (doctorSelect) {
      doctorSelect.value = doctorName;
    }

    toast('Doctor added successfully.');
  });
}


// PATIENT TABLE

function latestAppointmentStatus(patientName) {
  const patientAppointments = appointments.filter(
    appointment => appointment.patient === patientName
  );

  if (!patientAppointments.length) {
    return 'No Appointment';
  }

  return patientAppointments[0].status;
}

function patientRows(list = patients) {
  if (!list.length) {
    return '<tr><td colspan="5">No patient records found.</td></tr>';
  }

  return list.map(patient => {
    const status = latestAppointmentStatus(patient.name);

    return `
      <tr>
        <td>
          <div class="patient-cell">
            <span class="mini-avatar">${initials(esc(patient.name))}</span>
            <strong>${esc(patient.name)}</strong>
          </div>
        </td>

        <td>${esc(patient.phone)}</td>
        <td>${esc(patient.last)}</td>

        <td>
          <span class="status ${cls(status)}">
            ${esc(status)}
          </span>
        </td>

        <td>
          <button
            class="action-link"
            data-open-patient="${esc(patient.name)}"
          >
            Open file →
          </button>
        </td>
      </tr>
    `;
  }).join('');
}


// APPOINTMENT TABLE

function appointmentRows(list = appointments) {
  if (!list.length) {
    return '<tr><td colspan="7">No appointments found.</td></tr>';
  }

  return list.map(appointment => {
    const index = appointments.indexOf(appointment);

    return `
      <tr>
        <td>${esc(appointment.date)}</td>
        <td>${esc(appointment.time)}</td>
        <td>${esc(appointment.patient)}</td>
        <td>${esc(appointment.service)}</td>
        <td>${esc(getDoctor(appointment))}</td>

        <td>
          <span class="status ${cls(appointment.status)}">
            ${esc(appointment.status)}
          </span>
        </td>

        <td>
          <button class="action-link" data-manage="${index}">
            Manage
          </button>
        </td>
      </tr>
    `;
  }).join('');
}


// PAGE CONTENT

function hydratePage(page) {

  // DASHBOARD

  if (page === 'dashboard') {
    const today = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric'
    });

    const todaysAppointments = appointments.filter(
      appointment => appointment.date === today
    );

    if ($('#totalAppointments')) {
      $('#totalAppointments').textContent = appointments.length;
    }

    if ($('#todayAppointments')) {
      $('#todayAppointments').textContent = todaysAppointments.length;
    }

    if ($('#totalPatients')) {
      $('#totalPatients').textContent = patients.length;
    }

    if ($('#pendingAppointments')) {
      $('#pendingAppointments').textContent = appointments.filter(
        appointment => appointment.status === 'Pending'
      ).length;
    }

    if ($('#todayTable')) {
      $('#todayTable').innerHTML = todaysAppointments.map(appointment => `
        <tr>
          <td>${esc(appointment.time)}</td>
          <td>${esc(appointment.patient)}</td>
          <td>${esc(appointment.service)}</td>
          <td>${esc(getDoctor(appointment))}</td>
          <td>
            <span class="status ${cls(appointment.status)}">
              ${esc(appointment.status)}
            </span>
          </td>
        </tr>
      `).join('') || '<tr><td colspan="5">No appointments for today.</td></tr>';
    }
  }


  // APPOINTMENTS

  if (page === 'appointments') {
    $('#appointmentTable').innerHTML = appointmentRows();

    ['appointmentSearch', 'appointmentFilter', 'appointmentDate'].forEach(id => {
      $('#' + id)?.addEventListener('input', filterAppointments);
      $('#' + id)?.addEventListener('change', filterAppointments);
    });
  }


  // PATIENT RECORDS

  if (page === 'patients') {
    const searchInput = $('#patientSearch');
    const statusFilter = $('#patientStatusFilter');

    function updatePatientTable() {
      const query = (searchInput?.value || '').toLowerCase();
      const selectedStatus = statusFilter?.value || 'All';

      const filteredPatients = patients.filter(patient => {
        const matchesSearch = (
          patient.name + ' ' + patient.phone
        ).toLowerCase().includes(query);

        const status = latestAppointmentStatus(patient.name);

        const matchesStatus =
          selectedStatus === 'All' || status === selectedStatus;

        return matchesSearch && matchesStatus;
      });

      $('#patientTable').innerHTML = patientRows(filteredPatients);
    }

    updatePatientTable();

    searchInput?.addEventListener('input', updatePatientTable);
    statusFilter?.addEventListener('change', updatePatientTable);
  }


  // BOOKING AND WALK-IN

  if (page === 'booking' || page === 'walkin') {
    populateDoctorSelect();

    $('#addDoctorBtn')?.addEventListener('click', addDoctor);

    $('#bookingForm')?.addEventListener('submit', submitBooking);
  }


  // PATIENT FILE

  if (page === 'patient-file') {
    const patient = patients.find(
      item => item.name === selectedPatient
    );

    if (!patient) {
      toast('Patient not found.');
      return;
    }

    if ($('#editName')) $('#editName').value = patient.name;
    if ($('#editPhone')) $('#editPhone').value = patient.phone;
    if ($('#editEmail')) $('#editEmail').value = patient.email || '';
    if ($('#editLast')) $('#editLast').value = patient.last;

    if ($('#patientHistory')) {
      $('#patientHistory').innerHTML = appointments
        .filter(appointment => appointment.patient === patient.name)
        .map(appointment => `
          <tr>
            <td>${esc(appointment.date)}</td>
            <td>${esc(appointment.service)}</td>
            <td>${esc(getDoctor(appointment))}</td>
            <td>${esc(appointment.status)}</td>
          </tr>
        `).join('') || '<tr><td colspan="4">No appointment history yet.</td></tr>';
    }

    $('#editPatientForm')?.addEventListener('submit', event => {
      event.preventDefault();

      const oldName = patient.name;
      const formData = new FormData(event.target);

      patient.name = formData.get('name').trim();
      patient.phone = formData.get('phone');
      patient.email = formData.get('email');

      appointments.forEach(appointment => {
        if (appointment.patient === oldName) {
          appointment.patient = patient.name;
        }
      });

      selectedPatient = patient.name;

      toast('Patient information updated.');
      setPage('patient-file');
    });
  }
}


// APPOINTMENT FILTER

function filterAppointments() {
  const query = ($('#appointmentSearch')?.value || '').toLowerCase();
  const selectedStatus = $('#appointmentFilter')?.value || 'All';
  const selectedDate = $('#appointmentDate')?.value || '';

  const filteredAppointments = appointments.filter(appointment => {
    const matchesSearch = (
      appointment.patient + ' ' +
      appointment.service + ' ' +
      getDoctor(appointment)
    ).toLowerCase().includes(query);

    const matchesStatus =
      selectedStatus === 'All' || appointment.status === selectedStatus;

    const matchesDate =
      !selectedDate || fmtDate(selectedDate) === appointment.date;

    return matchesSearch && matchesStatus && matchesDate;
  });

  $('#appointmentTable').innerHTML = appointmentRows(filteredAppointments);
}


// BOOKING SUBMISSION

function submitBooking(event) {
  event.preventDefault();

  const data = Object.fromEntries(new FormData(event.target));

  const name = (data.name || '').trim();
  const date = fmtDate(data.date);
  const doctor = data.doctor || data.dentist;

  if (!name || !doctor) {
    showValidationPopup();
    return;
  }

  const conflict = appointments.some(appointment =>
    appointment.date === date &&
    appointment.time === data.time &&
    getDoctor(appointment) === doctor &&
    appointment.status !== 'Cancelled'
  );

  if (conflict) {
    openPopup('time-slot-unavailable');
    return;
  }

  let patient = patients.find(
    item => item.name.toLowerCase() === name.toLowerCase()
  );

  if (!patient) {
    patient = {
      name,
      phone: data.phone,
      email: data.email,
      last: date,
      status: 'Active'
    };

    patients.unshift(patient);
  } else {
    patient.phone = data.phone;
    patient.email = data.email;
    patient.last = date;
  }

  appointments.unshift({
    date,
    time: data.time,
    patient: name,
    service: data.service,
    doctor,
    status: currentPage === 'walkin' ? 'Confirmed' : 'Pending'
  });

  toast(
    currentPage === 'walkin'
      ? 'Walk-in patient registered.'
      : 'Online booking created.'
  );

  setPage('appointments');
}


// POPUP WINDOWS

async function openPopup(name) {
  const root = $('#modalRoot');

  try {
    const response = await fetch(`screens/popups/${name}.html`);

    if (!response.ok) {
      throw new Error('Popup not found');
    }

    root.innerHTML = await response.text();

    root.classList.add('open');
    root.setAttribute('aria-hidden', 'false');

  } catch (error) {
    console.error(error);
    toast('Unable to load popup. Please check the popup file.');
  }
}

function closePopup() {
  const root = $('#modalRoot');

  if (!root) return;

  root.classList.remove('open');
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML = '';
}


// POPUP CLICK EVENTS

document.addEventListener('click', event => {

  if (event.target.closest('[data-close-popup]')) {
    closePopup();
  }

  if (event.target.id === 'modalRoot') {
    closePopup();
  }

  if (event.target.id === 'confirmLogout') {
    closePopup();

    // Clear the authenticated session when the user logs out.
    sessionStorage.removeItem('psm_token');
    sessionStorage.removeItem('psm_user');

    $('#app').classList.add('hidden');
    $('#loginScreen').classList.remove('hidden');

    $('#loginForm').reset();

    currentRole = 'owner';
    currentPage = 'dashboard';
    selectedPatient = null;

    toast('You have been logged out.');
  }
});


// APPOINTMENT MANAGEMENT POPUP

async function openAppointmentPopup(index) {
  const appointment = appointments[index];

  if (!appointment) return;

  const popup = currentRole === 'owner'
    ? 'owner-update-status'
    : 'update-appointment';

  await openPopup(popup);

  const form = $('#modalRoot form');

  if (!form) return;

  if (currentRole === 'owner') {
    if (form.status) {
      form.status.value = appointment.status;
    }

    form.addEventListener('submit', event => {
      event.preventDefault();

      appointment.status = new FormData(form).get('status');

      closePopup();
      openPopup('changes-saved');
      setPage('appointments');
    });

  } else {
    const dateObject = new Date(appointment.date + ' 12:00:00');

    const dateValue = [
      dateObject.getFullYear(),
      String(dateObject.getMonth() + 1).padStart(2, '0'),
      String(dateObject.getDate()).padStart(2, '0')
    ].join('-');

    if (form.date) form.date.value = dateValue;
    if (form.time) form.time.value = appointment.time;
    if (form.patient) form.patient.value = appointment.patient;

    if (form.doctor) {
      form.doctor.value = getDoctor(appointment);
    } else if (form.dentist) {
      form.dentist.value = getDoctor(appointment);
    }

    if (form.service) form.service.value = appointment.service;
    if (form.status) form.status.value = appointment.status;

    form.addEventListener('submit', event => {
      event.preventDefault();

      const data = Object.fromEntries(new FormData(form));

      appointment.date = fmtDate(data.date);
      appointment.time = data.time;
      appointment.patient = data.patient;
      appointment.doctor = data.doctor || data.dentist;
      appointment.service = data.service;
      appointment.status = data.status;

      delete appointment.dentist;

      closePopup();
      openPopup('changes-saved');
      setPage('appointments');
    });
  }
}


// EDIT PATIENT INFORMATION POPUP

async function openPatientPopup() {
  const patient = patients.find(
    item => item.name === selectedPatient
  );

  if (!patient) return;

  await openPopup('edit-patient-information');

  const form = $('#editPatientPopupForm');

  if (!form) return;

  if (form.name) form.name.value = patient.name;
  if (form.phone) form.phone.value = patient.phone;
  if (form.address) form.address.value = patient.address || '';

  if ($('#editPatientInitials')) {
    $('#editPatientInitials').textContent = initials(patient.name);
  }

  if ($('#editPatientDisplayName')) {
    $('#editPatientDisplayName').textContent = patient.name;
  }

  form.addEventListener('submit', event => {
    event.preventDefault();

    const oldName = patient.name;
    const data = Object.fromEntries(new FormData(form));

    patient.name = data.name.trim();
    patient.phone = data.phone;
    patient.address = data.address;

    appointments.forEach(appointment => {
      if (appointment.patient === oldName) {
        appointment.patient = patient.name;
      }
    });

    selectedPatient = patient.name;

    closePopup();
    openPopup('changes-saved');
    setPage('patient-file');
  });
}


// REUSABLE POPUPS

function showValidationPopup() {
  openPopup('form-validation-error');
}

function showSavedPopup() {
  openPopup('changes-saved');
}


// LOGIN - CONNECTED TO THE BACKEND API

const loginForm = $('#loginForm');

if (loginForm) {
  loginForm.addEventListener('submit', async event => {
    event.preventDefault();

    const username = $('#username')?.value.trim() || '';
    const password = $('#password')?.value || '';
    const selectedRole = ($('#role')?.value || '').toLowerCase();
    const loginButton = loginForm.querySelector('button[type="submit"]');

    if (!username || !password) {
      toast('Please enter your username and password.');
      return;
    }

    if (loginButton) {
      loginButton.disabled = true;
      loginButton.textContent = 'Signing in...';
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const result = await response.json().catch(() => ({}));

      if (
        !response.ok ||
        !result.success ||
        !result.data?.token ||
        !result.data?.user
      ) {
        throw new Error(
          result.message || 'Unable to sign in. Please check your credentials.'
        );
      }

      const user = result.data.user;
      const actualRole = String(user.role || '').toLowerCase();

      // The database role is authoritative.
      if (actualRole !== selectedRole) {
        throw new Error(
          'Your account does not match the selected role.'
        );
      }

      if (!['owner', 'receptionist'].includes(actualRole)) {
        throw new Error('This account has an unsupported role.');
      }

      // Save authenticated session.
      sessionStorage.setItem('psm_token', result.data.token);
      sessionStorage.setItem('psm_user', JSON.stringify(user));

      currentRole = actualRole;

      if ($('#sidebarName')) {
        $('#sidebarName').textContent = user.full_name || user.username;
      }

      if ($('#sidebarRole')) {
        $('#sidebarRole').textContent =
          actualRole === 'owner' ? 'Owner' : 'Receptionist';
      }

      if ($('#todayLabel')) {
        $('#todayLabel').textContent = new Date().toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      }

      if ($('#loginScreen')) {
        $('#loginScreen').classList.add('hidden');
      }

      if ($('#app')) {
        $('#app').classList.remove('hidden');
      }

      await setPage('dashboard');

      // Clear password after successful login.
      if ($('#password')) {
        $('#password').value = '';
      }

    } catch (error) {
      console.error('Login error:', error);
      toast(error.message || 'Unable to connect to the server.');

    } finally {
      if (loginButton) {
        loginButton.disabled = false;
        loginButton.textContent = 'Sign in';
      }
    }
  });
}


// LOGOUT BUTTON

$('#logoutBtn')?.addEventListener('click', () => {
  openPopup('logout-confirmation');
});


// SIDEBAR NAVIGATION

$('#sideNav')?.addEventListener('click', event => {
  const button = event.target.closest('[data-page]');

  if (button) {
    setPage(button.dataset.page);
  }
});


// GLOBAL CLICK EVENTS

document.addEventListener('click', event => {

  const navigation = event.target.closest('[data-page]');

  if (navigation && !navigation.closest('#sideNav')) {
    setPage(navigation.dataset.page);
  }

  const openPatient = event.target.closest('[data-open-patient]');

  if (openPatient) {
    selectedPatient = openPatient.dataset.openPatient;
    setPage('patient-file');
  }

  const manageAppointment = event.target.closest('[data-manage]');

  if (manageAppointment) {
    openAppointmentPopup(Number(manageAppointment.dataset.manage));
  }

  const editPatient = event.target.closest('[data-edit-patient]');

  if (editPatient) {
    openPatientPopup();
  }
});


// FORM VALIDATION POPUP

document.addEventListener('invalid', event => {
  if (event.target.closest('#bookingForm')) {
    event.preventDefault();
    showValidationPopup();
  }
}, true);
