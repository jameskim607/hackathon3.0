// =======================
// script.js - TransLearn Frontend (complete)
// =======================

// Backend base URL - FIXED: Correct URL from your console
const API_BASE_URL = (window.API_BASE_URL || 'https://web-production-82449.up.railway.app').replace(/\/$/, '');

// =======================
// Global status message helper
// =======================
function showStatus(message, type = 'success') {
  let statusDiv = document.getElementById('statusMessage');
  if (!statusDiv) {
    statusDiv = document.createElement('div');
    statusDiv.id = 'statusMessage';
    statusDiv.className = `status ${type}`;
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

  fileUploadArea.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];
      fileNameSpan.textContent = file.name;
      fileSizeSpan.textContent = `(${(file.size / (1024*1024)).toFixed(2)} MB)`;
      fileInfo.style.display = 'block';
      fileUploadArea.style.display = 'none';
    }
  });

  fileUploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileUploadArea.classList.add('dragover');
  });

  fileUploadArea.addEventListener('dragleave', () => {
    fileUploadArea.classList.remove('dragover');
  });

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
// Enhanced fetch with error handling
// =======================
async function safeFetch(url, options = {}) {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch (e) {
        // If response is not JSON, use status text
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}

// =======================
// Signup (FIXED with better error handling)
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
    
    const response = await safeFetch(`${API_BASE_URL}/users/register`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    showStatus('Account created. Please login.', 'success');
    setTimeout(() => window.location.href = 'login.html', 1200);
    
  } catch (error) {
    console.error('Signup error:', error);
    showStatus(`Signup failed: ${error.message}`, 'error');
  }
}

// =======================
// Login (SIMPLIFIED and FIXED)
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

  // Try the most common format first
  const payload = { email, password };

  try {
    showStatus('Signing in...', 'loading');
    
    const response = await safeFetch(`${API_BASE_URL}/users/login`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    // Handle different response formats
    const userData = response.user || response.data || response;
    
    if (!userData.email) {
      userData.email = email; // Ensure email is set
    }

    saveCurrentUser(userData);
    showStatus('Login successful! Redirecting...', 'success');
    
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 800);

  } catch (error) {
    console.error('Login error:', error);
    showStatus(`Login failed: ${error.message}`, 'error');
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
    
    const response = await safeFetch(`${API_BASE_URL}/resources?search=${encodeURIComponent(query)}&limit=20`);
    
    const resources = response.resources || response || [];
    
    if (!resources.length) {
      resultsEl.innerHTML = `<p>No resources found for "${query}".</p>`;
      return;
    }

    resultsEl.innerHTML = resources.map(r => {
      const priceStr = (r.price && r.price > 0) ? `KES ${r.price}` : 'Free';
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
            <a class="btn" href="#">View</a>
          </div>
        </div>
      `;
    }).join('');
    
  } catch (error) {
    console.error('Search error:', error);
    resultsEl.innerHTML = `<p class="error">Search failed: ${error.message}</p>`;
  }
}

// Helper to avoid XSS
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
  const subject = (form.querySelector('#subject')?.value || '').trim();
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
    
    const response = await safeFetch(`${API_BASE_URL}/resources/upload`, {
      method: 'POST',
      body: formData
    });

    showStatus('Resource uploaded successfully!', 'success');
    form.reset();
    removeFile();
    
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1000);
    
  } catch (error) {
    console.error('Upload error:', error);
    showStatus(`Upload failed: ${error.message}`, 'error');
  }
}

// =======================
// Load dashboard resources
// =======================
async function loadDashboard() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  // Update user name in dashboard
  const userNameEls = document.querySelectorAll('.user-name');
  userNameEls.forEach(el => {
    el.textContent = user.full_name || user.name || 'User';
  });

  // Load recommended resources
  try {
    const response = await safeFetch(`${API_BASE_URL}/resources?limit=6`);
    const recEl = document.getElementById('recommendedResources');
    if (!recEl) return;
    
    const resources = response.resources || response || [];
    
    if (resources.length === 0) {
      recEl.innerHTML = '<p>No resources available yet.</p>';
      return;
    }

    recEl.innerHTML = resources.map(r => {
      const priceStr = (r.price && r.price > 0) ? `KES ${r.price}` : 'Free';
      return `
        <div class="resource-card">
          <h3>${escapeHtml(r.title || 'Untitled')}</h3>
          <p>${escapeHtml((r.description || '').substring(0, 140))}${(r.description || '').length > 140 ? '...' : ''}</p>
          <div class="meta">
            <span>${escapeHtml(r.subject || '')}</span>
            <span>${escapeHtml(r.grade_level || '')}</span>
          </div>
          <div class="footer">
            <span class="price">${priceStr}</span>
            <a class="btn" href="#">View</a>
          </div>
        </div>
      `;
    }).join('');
    
  } catch (error) {
    console.error('Dashboard load error:', error);
    const recEl = document.getElementById('recommendedResources');
    if (recEl) {
      recEl.innerHTML = '<p>Unable to load resources at this time.</p>';
    }
  }
}

// =======================
// Load homepage stats
// =======================
async function loadHomepageStats() {
  try {
    const data = await safeFetch(`${API_BASE_URL}/api/stats`);
    
    if (data.resources) {
      const el = document.getElementById('resource-count');
      if (el) el.textContent = data.resources;
    }
    
    if (data.languages) {
      const el = document.getElementById('language-count');
      if (el) el.textContent = data.languages;
    }
    
    if (data.students) {
      const el = document.getElementById('student-count');
      if (el) el.textContent = data.students;
    }
  } catch (error) {
    console.error('Stats load error:', error);
    // Set default values if API fails
    const resourceCount = document.getElementById('resource-count');
    const languageCount = document.getElementById('language-count');
    const studentCount = document.getElementById('student-count');
    
    if (resourceCount) resourceCount.textContent = '500+';
    if (languageCount) languageCount.textContent = '10+';
    if (studentCount) studentCount.textContent = '1,000+';
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
  const searchForm = document.getElementById('searchForm');
  if (searchForm) searchForm.addEventListener('submit', handleSearch);

  // upload form
  const uploadForm = document.getElementById('uploadForm');
  if (uploadForm) uploadForm.addEventListener('submit', handleResourceUpload);

  // dashboard loader
  if (document.querySelector('.user-name')) {
    loadDashboard();
  }

  // homepage stats loader
  if (document.getElementById('resource-count')) {
    loadHomepageStats();
  }

  // Check if user is logged in for protected pages
  const protectedPages = ['dashboard.html', 'upload.html', 'search.html', 'payment.html'];
  const currentPage = window.location.pathname.split('/').pop();
  
  if (protectedPages.includes(currentPage)) {
    const user = getCurrentUser();
    if (!user) {
      window.location.href = 'login.html';
    }
  }
});

// =======================
// Service Worker Registration (FIXED)
// =======================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Only register service worker if we're not getting errors
    navigator.serviceWorker.register('service-worker.js')
      .then((registration) => {
        console.log('Service Worker registered successfully:', registration);
      })
      .catch((registrationError) => {
        console.log('Service Worker registration failed. This is normal if you dont have a service-worker.js file:', registrationError);
        // Don't show error to user - it's not critical
      });
  });
}