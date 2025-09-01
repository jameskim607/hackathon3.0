// =======================
// script.js - Backend Crash Resistant Version
// =======================

const API_BASE_URL = 'https://web-production-82449.up.railway.app';
let backendStatus = 'unknown'; // unknown, healthy, crashing, offline

// =======================
// Check Backend Health
// =======================
async function checkBackendHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    
    if (response.ok) {
      backendStatus = 'healthy';
      return true;
    }
    backendStatus = 'crashing';
    return false;
  } catch (error) {
    console.log('Backend is offline or crashing:', error);
    backendStatus = 'offline';
    return false;
  }
}

// =======================
// Safe Fetch with Backend Awareness
// =======================
async function safeFetch(url, options = {}) {
  // Check backend status first
  if (backendStatus === 'offline' || backendStatus === 'crashing') {
    throw new Error('Backend is currently unavailable. Please try again later.');
  }

  try {
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    if (response.status >= 500) {
      backendStatus = 'crashing';
      throw new Error('Backend server error. Please try again later.');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      backendStatus = 'offline';
      throw new Error('Backend timeout. Service may be down.');
    }
    throw error;
  }
}

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
// Demo Mode Functions
// =======================
const demoUsers = [
  { id: 1, email: 'student@translearn.com', full_name: 'Demo Student', role: 'student' },
  { id: 2, email: 'teacher@translearn.com', full_name: 'Demo Teacher', role: 'teacher' }
];

const demoResources = [
  {
    id: 1,
    title: 'Mathematics Basics',
    description: 'Learn basic algebra and geometry concepts.',
    subject: 'Mathematics',
    grade_level: 'Primary',
    price: 0
  },
  {
    id: 2, 
    title: 'Science Experiments',
    description: 'Fun science activities for students.',
    subject: 'Science',
    grade_level: 'Primary',
    price: 0
  }
];

function enableDemoMode() {
  console.log('Enabling demo mode due to backend issues');
  
  // Override forms for demo
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.onsubmit = async (e) => {
      e.preventDefault();
      const email = e.target.email.value || 'demo@translearn.com';
      const user = demoUsers.find(u => u.email === email) || demoUsers[0];
      
      localStorage.setItem('currentUser', JSON.stringify(user));
      showStatus('Demo mode: Login successful!', 'success');
      setTimeout(() => window.location.href = 'dashboard.html', 1000);
    };
  }

  const signupForm = document.getElementById('signupForm');
  if (signupForm) {
    signupForm.onsubmit = async (e) => {
      e.preventDefault();
      const email = e.target.email.value || 'newuser@translearn.com';
      const name = e.target.name.value || 'New User';
      
      const newUser = { id: Date.now(), email, full_name: name, role: 'student' };
      localStorage.setItem('currentUser', JSON.stringify(newUser));
      showStatus('Demo mode: Account created!', 'success');
      setTimeout(() => window.location.href = 'dashboard.html', 1000);
    };
  }

  // Load demo data
  if (document.getElementById('recommendedResources')) {
    const resourcesHtml = demoResources.map(r => `
      <div class="resource-card">
        <h3>${r.title}</h3>
        <p>${r.description}</p>
        <div class="meta">
          <span>${r.subject}</span>
          <span>${r.grade_level}</span>
        </div>
        <div class="footer">
          <span class="price">Free</span>
          <a class="btn" href="#">View</a>
        </div>
      </div>
    `).join('');
    
    document.getElementById('recommendedResources').innerHTML = resourcesHtml;
  }

  // Set demo stats
  if (document.getElementById('resource-count')) {
    document.getElementById('resource-count').textContent = '25+';
    document.getElementById('language-count').textContent = '3+';
    document.getElementById('student-count').textContent = '50+';
  }
}

// =======================
// Auth helpers
// =======================
function getCurrentUser() {
  const user = localStorage.getItem('currentUser');
  return user ? JSON.parse(user) : null;
}

// =======================
// Main Functions with Fallback
// =======================
async function handleLogin(evt) {
  evt.preventDefault();
  
  const isHealthy = await checkBackendHealth();
  if (!isHealthy) {
    showStatus('Backend is having issues. Using demo mode.', 'error');
    enableDemoMode();
    return handleLogin(evt); // Retry with demo mode
  }

  try {
    showStatus('Signing in...', 'loading');
    const formData = new FormData(evt.target);
    const payload = Object.fromEntries(formData);
    
    const response = await safeFetch(`${API_BASE_URL}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    localStorage.setItem('currentUser', JSON.stringify(response));
    showStatus('Login successful!', 'success');
    setTimeout(() => window.location.href = 'dashboard.html', 1000);
    
  } catch (error) {
    showStatus(`Login failed: ${error.message}`, 'error');
  }
}

// Similar handleSignup, handleSearch functions with fallback...

// =======================
// Initialize
// =======================
document.addEventListener('DOMContentLoaded', async () => {
  // Check backend status first
  const isHealthy = await checkBackendHealth();
  
  if (!isHealthy) {
    showStatus('⚠️ Backend is experiencing issues. Demo mode activated.', 'error');
    enableDemoMode();
  }

  // Wire up forms
  const loginForm = document.getElementById('loginForm');
  if (loginForm) loginForm.addEventListener('submit', handleLogin);

  // Load data
  if (document.getElementById('resource-count')) {
    document.getElementById('resource-count').textContent = '500+';
    document.getElementById('language-count').textContent = '10+';
    document.getElementById('student-count').textContent = '1000+';
  }
});