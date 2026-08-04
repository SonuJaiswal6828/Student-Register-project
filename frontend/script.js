// ---- Configure this to match your backend ----
const API_BASE = "http://localhost:8000";

let allStudents = [];   // full parsed dataset from upload
let visibleStudents = []; // currently filtered set

const els = {
  csvInput: document.getElementById('csvInput'),
  fileStatus: document.getElementById('fileStatus'),
  collegeFilter: document.getElementById('collegeFilter'),
  streamFilter: document.getElementById('streamFilter'),
  classFilter: document.getElementById('classFilter'),
  nameFilter: document.getElementById('nameFilter'),
  resetBtn: document.getElementById('resetBtn'),
  tableBody: document.getElementById('tableBody'),
  storedTableBody: document.getElementById('storedTableBody'),
  loadStoredBtn: document.getElementById('loadStoredBtn'),
  resultCount: document.getElementById('resultCount'),
  totalCount: document.getElementById('totalCount'),
  moveBtn: document.getElementById('moveBtn'),
  toast: document.getElementById('toast'),
};

function showToast(msg, isError=false){
  els.toast.textContent = msg;
  els.toast.className = 'toast show' + (isError ? ' error' : '');
  setTimeout(()=> els.toast.className = 'toast', 3000);
}

function uniqueSorted(arr){
  return [...new Set(arr)].filter(Boolean).sort();
}

function populateSelect(select, values, placeholder){
  select.innerHTML = `<option value="">${placeholder}</option>` +
    values.map(v => `<option value="${v}">${v}</option>`).join('');
}

// ---- CSV Upload ----
els.csvInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if(!file) return;

  els.fileStatus.textContent = 'Uploading...';
  els.fileStatus.className = '';

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch(`${API_BASE}/upload-csv`, { method: 'POST', body: formData });
    if(!res.ok) throw new Error(`Server responded ${res.status}`);
    const data = await res.json();

    // Expecting an array of objects with keys:
    // UniversityCode, CollegeName, ProgrammeCode, ProgrammeName,
    // EnrolmentNumber, StudentName, EnrolmentYear
    allStudents = data;
    els.fileStatus.textContent = `${file.name} — ${allStudents.length} records loaded.`;
    els.fileStatus.className = 'ok';

    populateSelect(els.collegeFilter, uniqueSorted(allStudents.map(s => s.CollegeName)), 'All colleges');
    els.streamFilter.innerHTML = '<option value="">All streams</option>';
    els.classFilter.innerHTML = '<option value="">All years</option>';

    applyFilters();
  } catch(err){
    els.fileStatus.textContent = `Upload failed: ${err.message}`;
    els.fileStatus.className = 'err';
    showToast('Could not reach /upload-csv. Is your backend running?', true);
  }
});

// ---- Cascading filters ----
els.collegeFilter.addEventListener('change', () => {
  const college = els.collegeFilter.value;
  const scoped = college ? allStudents.filter(s => s.CollegeName === college) : allStudents;
  populateSelect(els.streamFilter, uniqueSorted(scoped.map(s => s.ProgrammeName)), 'All streams');
  els.classFilter.innerHTML = '<option value="">All years</option>';
  applyFilters();
});

els.streamFilter.addEventListener('change', () => {
  const college = els.collegeFilter.value;
  const stream = els.streamFilter.value;
  let scoped = allStudents;
  if(college) scoped = scoped.filter(s => s.CollegeName === college);
  if(stream) scoped = scoped.filter(s => s.ProgrammeName === stream);
  populateSelect(els.classFilter, uniqueSorted(scoped.map(s => s.EnrolmentYear)), 'All years');
  applyFilters();
});

els.classFilter.addEventListener('change', applyFilters);
els.nameFilter.addEventListener('input', applyFilters);

els.resetBtn.addEventListener('click', () => {
  els.collegeFilter.value = '';
  els.streamFilter.innerHTML = '<option value="">All streams</option>';
  els.classFilter.innerHTML = '<option value="">All years</option>';
  els.nameFilter.value = '';
  applyFilters();
});

function applyFilters(){
  const college = els.collegeFilter.value;
  const stream = els.streamFilter.value;
  const cls = els.classFilter.value;
  const name = els.nameFilter.value.trim().toLowerCase();

  visibleStudents = allStudents.filter(s => {
    if(college && s.CollegeName !== college) return false;
    if(stream && s.ProgrammeName !== stream) return false;
    if(cls && String(s.EnrolmentYear) !== String(cls)) return false;
    if(name && !s.StudentName.toLowerCase().includes(name)) return false;
    return true;
  });

  renderTable();
}

function renderTable(){
  els.totalCount.textContent = allStudents.length;
  els.resultCount.textContent = `${visibleStudents.length} student${visibleStudents.length !== 1 ? 's' : ''} shown`;
  els.moveBtn.disabled = visibleStudents.length === 0;

  if(visibleStudents.length === 0){
    els.tableBody.innerHTML = `<tr class="empty-row"><td colspan="7">${allStudents.length === 0 ? 'Upload a CSV to see records here.' : 'No students match these filters.'}</td></tr>`;
    return;
  }

  els.tableBody.innerHTML = visibleStudents.map(s => `
    <tr>
      <td class="mono">${s.UniversityCode}</td>
      <td>${s.CollegeName}</td>
      <td class="mono">${s.ProgrammeCode}</td>
      <td>${s.ProgrammeName}</td>
      <td class="mono">${s.EnrolmentYear}</td>
      <td class="mono">${s.EnrolmentNumber}</td>
      <td class="name">${s.StudentName}</td>
    </tr>
  `).join('');
}

// ---- Move to Database ----
els.moveBtn.addEventListener('click', async () => {
  if(visibleStudents.length === 0) return;
  els.moveBtn.disabled = true;
  els.moveBtn.textContent = 'Saving...';

  try {
    const res = await fetch(`${API_BASE}/save-students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ students: visibleStudents })
    });
    if(!res.ok) throw new Error(`Server responded ${res.status}`);
    const result = await res.json();
    showToast(`Saved ${visibleStudents.length} students to database.`);
  } catch(err){
    showToast(`Could not save: ${err.message}`, true);
  } finally {
    els.moveBtn.disabled = false;
    els.moveBtn.textContent = 'Move to Database';
  }
});

// ---- View Stored Records (from DB) ----
els.loadStoredBtn.addEventListener('click', async () => {
  els.loadStoredBtn.disabled = true;
  els.loadStoredBtn.textContent = 'Loading...';

  try {
    const res = await fetch(`${API_BASE}/students`);
    if(!res.ok) throw new Error(`Server responded ${res.status}`);
    const stored = await res.json();

    if(stored.length === 0){
      els.storedTableBody.innerHTML = `<tr class="empty-row"><td colspan="7">No students stored in the database yet.</td></tr>`;
    } else {
      // Note: DB columns come back lowercase snake_case (e.g. college_name),
      // unlike the CSV-derived PascalCase keys used in the upload table above.
      els.storedTableBody.innerHTML = stored.map(s => `
        <tr>
          <td class="mono">${s.university_code}</td>
          <td>${s.college_name}</td>
          <td class="mono">${s.programme_code}</td>
          <td>${s.programme_name}</td>
          <td class="mono">${s.enrolment_year}</td>
          <td class="mono">${s.enrolment_number}</td>
          <td class="name">${s.student_name}</td>
        </tr>
      `).join('');
    }
    showToast(`Loaded ${stored.length} stored student(s).`);
  } catch(err){
    showToast(`Could not load stored students: ${err.message}`, true);
  } finally {
    els.loadStoredBtn.disabled = false;
    els.loadStoredBtn.textContent = 'Load Saved Students';
  }
});