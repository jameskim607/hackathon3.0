// TransLearn Frontend JavaScript
const API_BASE_URL = 'https://web-production-02449.up.railway.app';

// =======================
// Authentication Functions
// =======================

async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!email || !password) {
        showMessage('Please fill in all fields', 'error');
        return;
    }

    try {
        // For demo purposes - in real app, this would call your backend
        const response = await fetch(`${API_BASE_URL}/users/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            throw new Error('Login failed');
        }

        const userData = await response.json();
        
        // Store user data
        localStorage.setItem('currentUser', JSON.stringify(userData));
        localStorage.setItem('isLoggedIn', 'true');
        
        showMessage('Login successful! Redirecting...', 'success');
        
        // Redirect based on user role
        setTimeout(() => {
            window.location.href = userData.role === 'teacher' ? 'dashboard.html' : 'index.html';
        }, 1500);

    } catch (error) {
        console.error('Login error:', error);
        showMessage('Invalid email or password', 'error');
    }
}

async function handleSignup(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const userData = {
        full_name: formData.get('fullName'),
        email: formData.get('email'),
        password: formData.get('password'),
        phone: formData.get('phone'),
        role: formData.get('role'),
        country: formData.get('country'),
        language: formData.get('language')
    };

    if (userData.password !== formData.get('confirmPassword')) {
        showMessage('Passwords do not match', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/users/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });

        if (!response.ok) {
            throw new Error('Registration failed');
        }

        const result = await response.json();
        showMessage('Account created successfully! Please login.', 'success');
        
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);

    } catch (error) {
        console.error('Signup error:', error);
        showMessage('Registration failed. Please try again.', 'error');
    }
}

function logout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('isLoggedIn');
    window.location.href = 'index.html';
}

function checkAuth() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (!isLoggedIn && !window.location.href.includes('login') && !window.location.href.includes('signup')) {
        window.location.href = 'login.html';
    }
}

// =======================
// Resource Functions
// =======================

async function handleResourceUpload(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    if (!user.id) {
        showMessage('Please login to upload resources', 'error');
        return;
    }

    const resourceData = {
        title: formData.get('title'),
        description: formData.get('description'),
        subject: formData.get('subject'),
        grade_level: formData.get('gradeLevel'),
        language: formData.get('language'),
        price: parseFloat(formData.get('price')) || 0,
        tags: formData.get('tags').split(',').map(tag => tag.trim()),
        teacher_id: user.id
    };

    try {
        const response = await fetch(`${API_BASE_URL}/resources/upload`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(resourceData)
        });

        if (!response.ok) {
            throw new Error('Upload failed');
        }

        const result = await response.json();
        showMessage('Resource uploaded successfully!', 'success');
        
        // Reset form
        event.target.reset();
        removeFile();
        
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);

    } catch (error) {
        console.error('Upload error:', error);
        showMessage('Upload failed. Please try again.', 'error');
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
        fileUploadArea.style.backgroundColor = 'var(--bg-tertiary)';
    });

    fileUploadArea.addEventListener('dragleave', () => {
        fileUploadArea.style.borderColor = 'var(--border-color)';
        fileUploadArea.style.backgroundColor = 'transparent';
    });

    fileUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        fileUploadArea.style.borderColor = 'var(--border-color)';
        fileUploadArea.style.backgroundColor = 'transparent';
        
        if (e.dataTransfer.files.length > 0) {
            handleFileSelection(e.dataTransfer.files[0]);
        }
    });

    resourceFile.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelection(e.target.files[0]);
        }
    });
}

function handleFileSelection(file) {
    const allowedTypes = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt', 'jpg', 'jpeg', 'png', 'mp4', 'mp3'];
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    if (!allowedTypes.includes(fileExtension)) {
        showMessage('File type not supported. Please upload PDF, DOC, PPT, images, or videos.', 'error');
        return;
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB limit
        showMessage('File too large. Maximum size is 50MB.', 'error');
        return;
    }

    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const fileUploadArea = document.getElementById('fileUploadArea');

    if (fileInfo && fileName && fileSize && fileUploadArea) {
        fileName.textContent = file.name;
        fileSize.textContent = `(${(file.size / 1024 / 1024).toFixed(1)} MB)`;
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
// Utility Functions
// =======================

function showMessage(message, type = 'info') {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());

    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.innerHTML = `
        <div class="message-content">
            <i class="fas ${getMessageIcon(type)}"></i>
            <span>${message}</span>
            <button class="message-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    document.body.appendChild(messageDiv);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (messageDiv.parentElement) {
            messageDiv.remove();
        }
    }, 5000);
}

function getMessageIcon(type) {
    switch (type) {
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-exclamation-circle';
        case 'warning': return 'fa-exclamation-triangle';
        default: return 'fa-info-circle';
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// =======================
// Payment Functions
// =======================

async function handlePayment(paymentData) {
    try {
        const response = await fetch(`${API_BASE_URL}/payments/initiate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(paymentData)
        });

        if (!response.ok) {
            throw new Error('Payment initiation failed');
        }

        const result = await response.json();
        return result;

    } catch (error) {
        console.error('Payment error:', error);
        throw error;
    }
}

// =======================
// Initialize Application
// =======================

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication status
    checkAuth();
    
    // Initialize file upload functionality
    initializeFileUpload();
    
    // Check if user is logged in
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (user.id) {
        // Update UI for logged-in users
        const loginLinks = document.querySelectorAll('a[href="login.html"], a[href="signup.html"]');
        loginLinks.forEach(link => link.style.display = 'none');
        
        const userElements = document.querySelectorAll('.user-name');
        userElements.forEach(el => {
            el.textContent = user.full_name || 'User';
        });
    }
    
    // Register service worker for PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    }
});

// Global functions
window.handleLogin = handleLogin;
window.handleSignup = handleSignup;
window.handleResourceUpload = handleResourceUpload;
window.logout = logout;
window.removeFile = removeFile;
window.showMessage = showMessage;