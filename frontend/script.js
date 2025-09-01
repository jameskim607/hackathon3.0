// =======================
// script.js - TransLearn Frontend (complete)
// =======================

// Backend base URL - change if needed
const API_BASE_URL = (window.API_BASE_URL || 'https://web-production-02449.up.railway.app').replace(/\/$/, '');

// =======================
// Global status message helper
// =======================
function showStatus(message, type = 'success') {
  // type: 'success' | 'error' | 'loading'
  let statusDiv = document.getElementById('statusMessage');
  if (!statusDiv) {
    statusDiv = document.createElement('div');
    statusDiv.id = 'statusMessage';
    document.body.appendChild(statusDiv);
  }

  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.style.display = 'block';

  if (type !== 'loading') {
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 4000);
  }
}

// =======================
// File upload UI helpers
// =======================
function initializeFileUpload() {
  const fileUploadArea = document.getElementById('fileUploadArea');
  const fileInput = document.getElementById('resourceFile');
  const fileInfo = document.getElementById('fileInfo');
  const fileNameSpan = document.getElementById('fileName');
  const fileSizeSpan = document.getElementById('fileSize');

  if (!fileUploadArea || !fileInput) return;

  // click area opens file selector
  fileUploadArea.addEventListener('click', () => fileInput.click());

  // when file selected via file picker
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];
      fileNameSpan.textContent = file.name;
      fileSizeSpan.textContent = `(${(file.size / (1024*1024)).toFixed(2)} MB)`;
      fileInfo.style.display = 'block';
      fileUploadArea.style.display = 'none';
    }
  });

  // drag over
  fileUploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileUploadArea.classList.add('dragover');
  });

  fileUploadArea.addEventListener('dragleave', () => {
    fileUploadArea.classList.remove('dragover');
  });

  // drop
  fileUploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    fileUploadArea.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      fileInput.files = e.dataTransfer.files;
      const file = fileInput.files[0];
      fileNameSpan.textContent = file.name;
      fileSizeSpan.textContent = `(${(file.size / (1024*1024)).toFixed(2)} MB)`;
      fileInfo.style.display = 'block';
      fileUploadArea.style.display = 'none';
    }
  });
}

function removeFile() {
  const fileInput = document.getElementById('resourceFile');
  const fileInfo = document.getElementById('fileInfo');
  const fileUploadArea = document.getElementById('fileUploadArea');
  if (!fileInput) return;
  fileInput.value = '';
  if (fileInfo) fileInfo.style.display = 'none';
  if (fileUploadArea) fileUploadArea.style.display = 'block';
}

// =======================
// Auth helpers
// =======================
function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('currentUser') || 'null') || null;
  } catch (e) {
    return null;
  }
}

function saveCurrentUser(userObj) {
  localStorage.setItem('currentUser', JSON.stringify(userObj));
}

function clearCurrentUser() {
  localStorage.removeItem('currentUser');
}

// =======================
// Signup
// =======================
async function handleSignup(evt) {
  evt.preventDefault();
  const form = document.getElementById('signupForm');
  if (!form) return;

  const name = (form.querySelector('#name')?.value || '').trim();
  const email = (form.querySelector('#email')?.value || '').trim();
  const password = (form.querySelector('#password')?.value || '');
  const role = (form.querySelector('#role')?.value || 'student');

  if (!name || !email || !password) {
    showStatus('Please fill all required fields.', 'error');
    return;
  }

  const payload = {
    full_name: name,
    email,
    password,
    role,
    phone: '',
    country: 'Kenya',
    language: 'english'
  };

  try {
    showStatus('Creating account...', 'loading');
    const res = await fetch(`${API_BASE_URL}/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = body.detail || body.message || 'Signup failed';
      showStatus(err, 'error');
      return;
    }

    showStatus('Account created. Please login.', 'success');
    setTimeout(() => window.location.href = 'login.html', 1200);
  } catch (err) {
    console.error(err);
    showStatus('Network error. Try again later.', 'error');
  }
}

// =======================
// Login
// =======================
async function handleLogin(evt) {
  evt.preventDefault();
  const form = document.getElementById('loginForm');
  if (!form) return;

  const email = (form.querySelector('#email')?.value || '').trim();
  const password = (form.querySelector('#password')?.value || '');

  if (!email || !password) {
    showStatus('Please enter email and password.', 'error');
    return;
  }

  try {
    showStatus('Signing in...', 'loading');
    const res = await fetch(`${API_BASE_URL}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = body.detail || body.message || 'Login failed';
      showStatus(err, 'error');
      return;
    }

    // backend may return the user object directly
    const user = body;
    saveCurrentUser(user);
    showStatus('Login successful! Redirecting...', 'success');
    setTimeout(() => window.location.href = 'dashboard.html', 800);
  } catch (err) {
    console.error(err);
    showStatus('Network error. Try again later.', 'error');
  }
}

// =======================
// Search
// =======================
async function handleSearch(evt) {
  evt.preventDefault();
  const qInput = document.getElementById('searchInput');
  const resultsEl = document.getElementById('searchResults');
  const query = (qInput?.value || '').trim();

  if (!resultsEl) return;

  if (!query) {
    resultsEl.innerHTML = '<p>Please enter a search term.</p>';
    return;
  }

  try {
    resultsEl.innerHTML = '<p>Searching...</p>';
    // Use resources endpoint - we send 'search' param even if backend may ignore it
    const params = new URLSearchParams({ search: query, page: '1', limit: '20' });
    const res = await fetch(`${API_BASE_URL}/resources?${params.toString()}`);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      resultsEl.innerHTML = `<p class="error">${body.detail || 'Search failed'}</p>`;
      return;
    }

    const resources = body.resources || body || [];
    if (!resources.length) {
      resultsEl.innerHTML = `<p>No resources found for "${query}".</p>`;
      return;
    }

    resultsEl.innerHTML = resources.map(r => {
      const priceStr = (r.price && r.price > 0) ? `KES ${r.price}` : 'Free';
      const fileLink = r.file_url ? `<a class="btn" href="${r.file_url}" target="_blank" rel="noopener">Download</a>` : `<a class="btn" href="resource-detail.html?id=${r.id}">View</a>`;
      return `
        <div class="resource-card">
          <h3>${escapeHtml(r.title || 'Untitled')}</h3>
          <p>${escapeHtml((r.description || '').substring(0, 180))}${(r.description || '').length > 180 ? '...' : ''}</p>
          <div class="meta">
            <span>${escapeHtml(r.subject || '')}</span>
            <span>${escapeHtml(r.grade_level || '')}</span>
            <span>${escapeHtml(r.language || '')}</span>
          </div>
          <div class="footer">
            <span class="price">${priceStr}</span>
            ${fileLink}
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error(err);
    resultsEl.innerHTML = `<p class="error">Network error. Please try again.</p>`;
  }
}

// small helper to avoid XSS when injecting text
function escapeHtml(s) {
  return String(s || '')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#39;');
}

// =======================
// Upload resource
// =======================
async function handleResourceUpload(evt) {
  evt.preventDefault();
  const form = document.getElementById('uploadForm');
  if (!form) return;

  const title = (form.querySelector('#title')?.value || '').trim();
  const description = (form.querySelector('#description')?.value || '').trim();
  const subject = (form.querySelector('#subject')?.value || form.querySelector('#category')?.value || '').trim();
  const grade_level = (form.querySelector('#gradeLevel')?.value || '').trim();
  const language = (form.querySelector('#language')?.value || '').trim();
  const price = parseFloat(form.querySelector('#price')?.value || 0) || 0;
  const tagsRaw = (form.querySelector('#tags')?.value || '').trim();
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()) : [];
  const fileInput = document.getElementById('resourceFile');
  const file = fileInput?.files?.[0];

  if (!title || !description || !subject || !grade_level || !language) {
    showStatus('Please fill all required fields.', 'error');
    return;
  }

  if (!file) {
    showStatus('Please select a file to upload.', 'error');
    return;
  }

  if (file.size > 50 * 1024 * 1024) {
    showStatus('File too large. Max 50MB.', 'error');
    return;
  }

  const currentUser = getCurrentUser();
  if (!currentUser || !currentUser.id) {
    showStatus('Please login as a teacher to upload.', 'error');
    setTimeout(() => window.location.href = 'login.html', 800);
    return;
  }

  const formData = new FormData();
  formData.append('title', title);
  formData.append('description', description);
  formData.append('subject', subject);
  formData.append('grade_level', grade_level);
  formData.append('language', language);
  formData.append('price', price);
  formData.append('tags', JSON.stringify(tags));
  formData.append('teacher_id', currentUser.id);
  formData.append('file', file);

  try {
    showStatus('Uploading resource...', 'loading');
    const res = await fetch(`${API_BASE_URL}/resources/upload`, {
      method: 'POST',
      body: formData
      // Note: do NOT set Content-Type — browser will set multipart boundary
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = body.detail || body.message || 'Upload failed';
      showStatus(err, 'error');
      return;
    }

    showStatus('Resource uploaded successfully!', 'success');
    form.reset();
    removeFile();
    setTimeout(() => window.location.href = 'dashboard.html', 1000);
  } catch (err) {
    console.error(err);
    showStatus('Network error. Try again later.', 'error');
  }
}

// =======================
// Misc / Dashboard loader
// =======================
async function loadDashboard() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  const userNameEls = document.querySelectorAll('.user-name');
  userNameEls.forEach(el => el.textContent = user.full_name || user.name || 'User');

  // load recommended resources (best-effort)
  try {
    const res = await fetch(`${API_BASE_URL}/resources?limit=6`);
    if (!res.ok) return;
    const body = await res.json();
    const recEl = document.getElementById('recommendedResources');
    if (!recEl) return;
    const resources = body.resources || body || [];
    recEl.innerHTML = resources.map(r => `
      <div class="resource-card">
        <h3>${escapeHtml(r.title)}</h3>
        <p>${escapeHtml((r.description||'').substring(0,140))}${(r.description||'').length>140 ? '...' : ''}</p>
        <div class="meta"><span>${escapeHtml(r.subject)}</span><span>${escapeHtml(r.grade_level)}</span></div>
        <a class="btn" href="resource-detail.html?id=${r.id}">View</a>
      </div>
    `).join('');
  } catch (e) {
    // ignore
  }
}

// =======================
// On load - wire up forms if present
// =======================
document.addEventListener('DOMContentLoaded', () => {
  // initialize file area if present
  initializeFileUpload();

  // login form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) loginForm.addEventListener('submit', handleLogin);

  // signup form
  const signupForm = document.getElementById('signupForm');
  if (signupForm) signupForm.addEventListener('submit', handleSignup);

  // search form
  const searchForm = document.getElementById('searchForm') || document.getElementById('searchFormHeader');
  if (searchForm) searchForm.addEventListener('submit', handleSearch);

  // upload form
  const uploadForm = document.getElementById('uploadForm');
  if (uploadForm) uploadForm.addEventListener('submit', handleResourceUpload);

  // dashboard loader
  if (document.getElementById('recommendedResources') || document.getElementById('dashboardResources')) {
    loadDashboard();
  }
});
