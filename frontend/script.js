// =======================
// LMS Frontend JS
// =======================
const API_BASE_URL = 'https://web-production-02449.up.railway.app';

// =======================
// Auth Functions
// =======================
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const role = document.getElementById('role').value;

    if (!email) {
        showMessage('Email is required', 'error');
        return;
    }

    try {
        // Get all users from backend
        const response = await fetch(`${API_BASE_URL}/users`);
        if (!response.ok) throw new Error('Failed to fetch users');
        
        const data = await response.json();
        const users = Array.isArray(data) ? data : (data.users || []);
        
        // Find user by email
        const user = users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
        
        if (!user) {
            showMessage('No account found with this email', 'error');
            return;
        }

        // Login successful
        localStorage.setItem('currentUser', JSON.stringify(user));
        localStorage.setItem('isLoggedIn', 'true');
        
        showMessage('Login successful! Redirecting...', 'success');
        
        setTimeout(() => {
            window.location.href = user.role === 'teacher' ? 'upload.html' : 'index.html';
        }, 1500);

    } catch (error) {
        showMessage('Login failed: ' + error.message, 'error');
    }
}

async function handleSignup(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const payload = {
        id: Date.now(),
        name: formData.get('fullName').trim(),
        email: formData.get('email').trim(),
        role: formData.get('role')
    };

    if (!payload.email) {
        showMessage('Email is required', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Failed to create account');

        const userData = await response.json();
        showMessage('Account created successfully!', 'success');
        
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);

    } catch (error) {
        showMessage('Signup failed: ' + error.message, 'error');
    }
}

async function quickSignup() {
    const testEmail = `test${Math.floor(Math.random() * 1000)}@example.com`;
    const testUser = {
        id: Date.now(),
        name: "Test User",
        email: testEmail,
        role: "student"
    };

    try {
        // Create user
        await fetch(`${API_BASE_URL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testUser)
        });

        // Auto-fill and login
        document.getElementById('email').value = testEmail;
        document.getElementById('password').value = 'password';
        document.getElementById('role').value = 'student';
        
        showMessage('Test account created! Logging in...', 'success');
        
        setTimeout(() => {
            handleLogin({ preventDefault: () => {} });
        }, 1000);

    } catch (error) {
        showMessage('Quick signup failed', 'error');
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
    
    if (isLoggedIn && currentUser.id) {
        // Update UI for logged-in users
        const loginLinks = document.querySelectorAll('a[href="login.html"], a[href="signup.html"]');
        loginLinks.forEach(link => link.style.display = 'none');
    }
}

// =======================
// File Upload Functions
// =======================
function initializeFileUpload() {
    const fileUploadArea = document.getElementById('fileUploadArea');
    const resourceFile = document.getElementById('resourceFile');
    
    if (!fileUploadArea || !resourceFile) return;

    fileUploadArea.addEventListener('click', () => resourceFile.click());
    
    fileUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileUploadArea.style.borderColor = 'var(--primary-color)';
    });

    fileUploadArea.addEventListener('dragleave', () => {
        fileUploadArea.style.borderColor = 'var(--border-color)';
    });

    fileUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        fileUploadArea.style.borderColor = 'var(--border-color)';
        if (e.dataTransfer.files[0]) handleFileSelection(e.dataTransfer.files[0]);
    });

    resourceFile.addEventListener('change', (e) => {
        if (e.target.files[0]) handleFileSelection(e.target.files[0]);
    });
}

function handleFileSelection(file) {
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

async function handleResourceUpload(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const resourceData = {
        id: Date.now(),
        title: formData.get('title'),
        description: formData.get('description')
    };

    try {
        const response = await fetch(`${API_BASE_URL}/resources`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(resourceData)
        });

        if (!response.ok) throw new Error('Upload failed');
        
        showMessage('Resource uploaded successfully!', 'success');
        event.target.reset();
        removeFile();

    } catch (error) {
        showMessage('Upload failed: ' + error.message, 'error');
    }
}

// =======================
// Utility Functions
// =======================
function showMessage(message, type = 'info') {
    // Remove existing messages
    document.querySelectorAll('.message').forEach(msg => msg.remove());
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.innerHTML = `
        <div class="message-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        if (messageDiv.parentElement) messageDiv.remove();
    }, 4000);
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeFileUpload();
    checkAuthStatus();
});