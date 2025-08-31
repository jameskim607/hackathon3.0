// =======================
// LMS Frontend JS (Fixed for Railway backend)
// =======================

// API Base URL - Railway deployment (no trailing slash)
const API_BASE_URL = (window.API_BASE_URL || 'https://web-production-02449.up.railway.app').replace(/\/$/, '');

// -----------------------
// Helpers for API shapes
// -----------------------
function unwrapUsersResponse(data) {
    // Supports: [{...}, ...] OR { users: [{...}, ...] }
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.users)) return data.users;
    return [];
}

function unwrapUserResponse(data) {
    // Supports: { ...userFields } OR { user: {...} }
    if (!data) return null;
    if (data.user) return data.user;
    return data;
}

// =======================
// File Upload Functions
// =======================
function initializeFileUpload() {
    const fileUploadArea = document.getElementById('fileUploadArea');
    const resourceFile = document.getElementById('resourceFile');
    if (!fileUploadArea || !resourceFile) return;

    fileUploadArea.addEventListener('dragover', e => {
        e.preventDefault();
        fileUploadArea.style.borderColor = 'var(--primary-color)';
        fileUploadArea.style.backgroundColor = 'var(--bg-tertiary)';
    });

    fileUploadArea.addEventListener('dragleave', e => {
        e.preventDefault();
        fileUploadArea.style.borderColor = 'var(--border-color)';
        fileUploadArea.style.backgroundColor = 'transparent';
    });

    fileUploadArea.addEventListener('drop', e => {
        e.preventDefault();
        fileUploadArea.style.borderColor = 'var(--border-color)';
        fileUploadArea.style.backgroundColor = 'transparent';
        const files = e.dataTransfer.files;
        if (files.length > 0) handleFileSelection(files[0]);
    });

    resourceFile.addEventListener('change', e => {
        if (e.target.files.length > 0) handleFileSelection(e.target.files[0]);
    });
}

function handleFileSelection(file) {
    const allowedTypes = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt', 'jpg', 'jpeg', 'png', 'mp4', 'mp3'];
    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (!allowedTypes.includes(fileExtension)) return showMessage('File type not supported.', 'error');
    if (file.size > 50 * 1024 * 1024) return showMessage('File too large. Maximum size is 50MB.', 'error');

    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileUploadArea = document.getElementById('fileUploadArea');

    if (fileInfo && fileName && fileUploadArea) {
        fileName.textContent = file.name;
        fileInfo.style.display = 'block';
        fileUploadArea.style.display = 'none';
    }
}

function removeFile() {
    const resourceFile = document.getElementById('resourceFile');
    const fileInfo = document.getElementById('fileInfo');
    const fileUploadArea = document.getElementById('fileUploadArea');
    if (resourceFile && fileInfo && fileUploadArea) {
        resourceFile.value = '';
        fileInfo.style.display = 'none';
        fileUploadArea.style.display = 'block';
    }
}

// =======================
// Resource Upload
// NOTE: Your current backend /resources expects JSON {id,title,description}.
// This form submits multipart (with a file). That will 422 on your backend.
// Keep this as-is if you plan to update the backend to accept files.
// =======================
async function handleResourceUpload(event) {
    event.preventDefault();
    const resourceFile = document.getElementById('resourceFile');
    const file = resourceFile?.files?.[0];
    if (!file) return showMessage('Please select a file to upload', 'error');

    const formData = new FormData(event.target);
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    ['title', 'description', 'subject', 'grade', 'country', 'language'].forEach(key => {
        uploadFormData.append(key, formData.get(key));
    });
    const tags = formData.get('tags');
    if (tags && tags.trim()) uploadFormData.append('tags', tags);

    try {
        const response = await fetch(`${API_BASE_URL}/resources`, {
            method: 'POST',
            body: uploadFormData
        });
        const data = await response.json();
        if (response.ok) {
            showMessage('Resource uploaded successfully!', 'success');
            event.target.reset();
            document.getElementById('fileInfo')?.style?.setProperty('display', 'none');
            document.getElementById('fileUploadArea')?.style?.setProperty('display', 'block');
        } else {
            throw new Error(data.detail || data.message || 'Upload failed');
        }
    } catch (error) {
        showMessage(error.message || 'Upload failed. Please try again.', 'error');
    }
}

// =======================
// Auth Functions
// =======================
async function handleLogin(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const email = (formData.get('email') || '').trim();
    const password = (formData.get('password') || '').trim();

    if (!email) return showMessage('Email is required', 'error');

    try {
        const response = await fetch(`${API_BASE_URL}/users`);
        const raw = await response.json();
        const users = unwrapUsersResponse(raw);

        // Find by email
        const user = users.find(u => (u.email || '').toLowerCase() === email.toLowerCase());

        if (!user) throw new Error('Invalid email or password');

        // If backend has password, enforce it; otherwise allow (dev-mode)
        if (user.password !== undefined) {
            if (user.password !== password) throw new Error('Invalid email or password');
        } else {
            // Backend missing password support
            if (!password) {
                showMessage('Backend has no password field; logged in for testing only.', 'info');
            }
        }

        localStorage.setItem('currentUser', JSON.stringify(user));
        localStorage.setItem('isLoggedIn', 'true');

        const role = user.role || 'student';
        window.location.href = (role === 'teacher' || role === 'admin') ? 'upload.html' : 'index.html';
        showMessage('Login successful!', 'success');
    } catch (error) {
        showMessage('Login failed: ' + (error.message || 'Unknown error'), 'error');
    }
}

async function handleSignup(event) {
    event.preventDefault();
    const formData = new FormData(event.target);

    // Generate an ID because your backend requires it
    const generatedId = Date.now();

    // Build a payload compatible with BOTH schemas:
    // - your frontend fields, and
    // - backend that expects {id, name, email}
    const full_name = (formData.get('fullName') || '').trim();
    const payload = {
        id: generatedId,
        // Frontend schema
        full_name,
        email: (formData.get('email') || '').trim(),
        password: (formData.get('password') || '').trim(),
        role: (formData.get('role') || 'student').trim(),
        country: (formData.get('country') || '').trim(),
        language: (formData.get('language') || '').trim(),
        // Backend fallback (name instead of full_name)
        name: full_name || (formData.get('name') || '').trim()
    };

    if (!payload.email) return showMessage('Email is required', 'error');

    try {
        const response = await fetch(`${API_BASE_URL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const raw = await response.json();
        if (!response.ok) throw new Error(raw.detail || raw.message || 'Signup failed');

        const createdUser = unwrapUserResponse(raw);
        if (!createdUser || !createdUser.email) {
            throw new Error('Unexpected signup response from server');
        }

        // Persist & redirect
        localStorage.setItem('currentUser', JSON.stringify(createdUser));
        localStorage.setItem('isLoggedIn', 'true');

        const role = createdUser.role || 'student';
        window.location.href = (role === 'teacher' || role === 'admin') ? 'upload.html' : 'index.html';
        showMessage('Account created successfully!', 'success');
    } catch (error) {
        showMessage('Signup failed: ' + (error.message || 'Unknown error'), 'error');
    }
}

function logout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('isLoggedIn');
    window.location.href = 'login.html';
}

function checkAuthStatus() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (isLoggedIn && currentUser && (currentUser.id !== undefined)) {
        const loginLink = document.querySelector('a[href="login.html"]');
        const signupLink = document.querySelector('a[href="signup.html"]');
        if (loginLink) loginLink.style.display = 'none';
        if (signupLink) signupLink.style.display = 'none';
        const header = document.querySelector('header');
        if (header && !document.querySelector('.logout-btn')) {
            const logoutBtn = document.createElement('button');
            logoutBtn.className = 'logout-btn';
            logoutBtn.textContent = `Logout (${currentUser.full_name || currentUser.name || currentUser.email})`;
            logoutBtn.onclick = logout;
            header.appendChild(logoutBtn);
        }
    }
}

// =======================
// Utility Functions
// =======================
function showMessage(message, type = 'info') {
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());

    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.innerHTML = `
        <div class="message-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
            <button class="message-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    const main = document.querySelector('.main');
    if (main) main.insertBefore(messageDiv, main.firstChild);

    setTimeout(() => { if (messageDiv.parentElement) messageDiv.remove(); }, 5000);
}

// =======================
// Initialize
// =======================
document.addEventListener('DOMContentLoaded', function() {
    initializeFileUpload();
    checkAuthStatus();
});

window.lmsApp = {
    login: handleLogin,
    signup: handleSignup,
    logout: logout,
    uploadResource: handleResourceUpload
};
