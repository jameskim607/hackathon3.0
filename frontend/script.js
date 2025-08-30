// API Base URL - will be set by environment variable in production
const API_BASE_URL = window.API_BASE_URL || 'https://hackathon3-0-7.onrender.com';

// File Upload Functions
function initializeFileUpload() {
    const fileUploadArea = document.getElementById('fileUploadArea');
    const resourceFile = document.getElementById('resourceFile');
    
    if (!fileUploadArea || !resourceFile) return;
    
    // Drag and drop functionality
    fileUploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.style.borderColor = 'var(--primary-color)';
        this.style.backgroundColor = 'var(--bg-tertiary)';
    });
    
    fileUploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        this.style.borderColor = 'var(--border-color)';
        this.style.backgroundColor = 'transparent';
    });
    
    fileUploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        this.style.borderColor = 'var(--border-color)';
        this.style.backgroundColor = 'transparent';
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            resourceFile.files = files;
            handleFileSelection(files[0]);
        }
    });
    
    // File input change
    resourceFile.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            handleFileSelection(e.target.files[0]);
        }
    });
}

function handleFileSelection(file) {
    // Validate file type
    const allowedTypes = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt', 'jpg', 'jpeg', 'png', 'mp4', 'mp3'];
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    if (!allowedTypes.includes(fileExtension)) {
        showMessage('File type not supported. Please upload a valid document, image, or media file.', 'error');
        return;
    }
    
    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
        showMessage('File too large. Maximum size is 50MB.', 'error');
        return;
    }
    
    // Display file info
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
    const resourceFile = document.getElementById('resourceFile');
    const file = resourceFile.files[0];
    
    if (!file) {
        showMessage('Please select a file to upload', 'error');
        return;
    }
    
    try {
        // Create FormData for file upload
        const uploadFormData = new FormData();
        uploadFormData.append('file', file);
        
        // Add other form data
        uploadFormData.append('title', formData.get('title'));
        uploadFormData.append('description', formData.get('description'));
        uploadFormData.append('subject', formData.get('subject'));
        uploadFormData.append('grade', formData.get('grade'));
        uploadFormData.append('country', formData.get('country'));
        uploadFormData.append('language', formData.get('language'));
        
        // Add tags if provided
        const tags = formData.get('tags');
        if (tags && tags.trim()) {
            uploadFormData.append('tags', tags);
        }
        
        const response = await fetch(`${API_BASE_URL}/resources/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)}`
            },
            body: uploadFormData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Resource uploaded successfully!', 'success');
            event.target.reset();
            const fileInfo = document.getElementById('fileInfo');
            const fileUploadArea = document.getElementById('fileUploadArea');
            if (fileInfo && fileUploadArea) {
                fileInfo.style.display = 'none';
                fileUploadArea.style.display = 'block';
            }
        } else {
            throw new Error(data.detail || 'Upload failed');
        }
    } catch (error) {
        console.error('Upload error:', error);
        showMessage(error.message || 'Upload failed. Please try again.', 'error');
    }
}

// Utility Functions
function showLoading(show) {
    const loadingSpinner = document.getElementById('loadingSpinner');
    if (loadingSpinner) {
        loadingSpinner.style.display = show ? 'block' : 'none';
    }
}

function showMessage(message, type = 'info') {
    // Remove existing messages
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
    
    // Insert at the top of the main content
    const main = document.querySelector('.main');
    if (main) {
        main.insertBefore(messageDiv, main.firstChild);
    }
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (messageDiv.parentElement) {
            messageDiv.remove();
        }
    }, 5000);
}

function clearFilters() {
    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.reset();
    }
    currentFilters = {};
    loadResources();
}

function setViewMode(mode) {
    const resourcesContainer = document.getElementById('resourcesContainer');
    if (!resourcesContainer) return;
    
    if (mode === 'list') {
        resourcesContainer.classList.add('list-view');
        document.getElementById('listView')?.classList.add('active');
        document.getElementById('gridView')?.classList.remove('active');
    } else {
        resourcesContainer.classList.remove('list-view');
        document.getElementById('gridView')?.classList.add('active');
        document.getElementById('listView')?.classList.remove('active');
    }
}

function changePage(delta) {
    const newPage = currentPage + delta;
    if (newPage >= 1) {
        currentPage = newPage;
        displayResources();
        updatePagination();
    }
}

function updatePagination() {
    const pageInfo = document.getElementById('pageInfo');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    
    if (pageInfo) {
        pageInfo.textContent = `Page ${currentPage}`;
    }
    
    if (prevPageBtn) {
        prevPageBtn.disabled = currentPage === 1;
    }
    if (nextPageBtn) {
        nextPageBtn.disabled = resources.length < 20;
    }
}

function getLanguageName(code) {
    const languages = {
        'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
        'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian', 'zh': 'Chinese',
        'ja': 'Japanese', 'ko': 'Korean', 'ar': 'Arabic', 'hi': 'Hindi'
    };
    return languages[code] || code;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function loadSavedPreferences() {
    const savedLanguage = localStorage.getItem(STORAGE_KEYS.PREFERRED_LANGUAGE);
    const preferredLanguage = document.getElementById('preferredLanguage');
    
    if (savedLanguage && preferredLanguage) {
        preferredLanguage.value = savedLanguage;
    }
    
    const savedAITranslation = localStorage.getItem(STORAGE_KEYS.AI_TRANSLATION);
    const enableAITranslation = document.getElementById('enableAITranslation');
    
    if (savedAITranslation && enableAITranslation) {
        enableAITranslation.checked = savedAITranslation === 'true';
    }
}

function saveLanguagePreference() {
    const preferredLanguage = document.getElementById('preferredLanguage');
    if (preferredLanguage) {
        localStorage.setItem(STORAGE_KEYS.PREFERRED_LANGUAGE, preferredLanguage.value);
    }
}

function saveAITranslationPreference() {
    const enableAITranslation = document.getElementById('enableAITranslation');
    if (enableAITranslation) {
        localStorage.setItem(STORAGE_KEYS.AI_TRANSLATION, enableAITranslation.checked);
    }
}

// Authentication Functions
async function handleLogin(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const email = formData.get('email');
    const password = formData.get('password');
    const role = formData.get('role');
    
    try {
        // For now, simulate successful login
        // In a real app, you'd call your backend API
        const user = {
            id: 'user_' + Date.now(),
            email: email,
            role: role,
            name: email.split('@')[0]
        };
        
        // Store user info in localStorage
        localStorage.setItem('currentUser', JSON.stringify(user));
        localStorage.setItem('isLoggedIn', 'true');
        
        // Redirect based on role
        if (role === 'teacher' || role === 'admin') {
            window.location.href = 'upload.html';
        } else {
            window.location.href = 'index.html';
        }
        
        showMessage('Login successful!', 'success');
    } catch (error) {
        showMessage('Login failed: ' + error.message, 'error');
    }
}

async function handleSignup(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const fullName = formData.get('fullName');
    const email = formData.get('email');
    const password = formData.get('password');
    const role = formData.get('role');
    const country = formData.get('country');
    const language = formData.get('language');
    
    try {
        // For now, simulate successful signup
        // In a real app, you'd call your backend API
        const user = {
            id: 'user_' + Date.now(),
            fullName: fullName,
            email: email,
            role: role,
            country: country,
            language: language
        };
        
        // Store user info in localStorage
        localStorage.setItem('currentUser', JSON.stringify(user));
        localStorage.setItem('isLoggedIn', 'true');
        
        // Redirect based on role
        if (role === 'teacher' || role === 'admin') {
            window.location.href = 'upload.html';
        } else {
            window.location.href = 'index.html';
        }
        
        showMessage('Account created successfully!', 'success');
    } catch (error) {
        showMessage('Signup failed: ' + error.message, 'error');
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
        // User is logged in, show appropriate content
        const loginLink = document.querySelector('a[href="login.html"]');
        const signupLink = document.querySelector('a[href="signup.html"]');
        
        if (loginLink) loginLink.style.display = 'none';
        if (signupLink) signupLink.style.display = 'none';
        
        // Add logout button
        const header = document.querySelector('header');
        if (header && !document.querySelector('.logout-btn')) {
            const logoutBtn = document.createElement('button');
            logoutBtn.className = 'logout-btn';
            logoutBtn.textContent = `Logout (${currentUser.fullName || currentUser.email})`;
            logoutBtn.onclick = logout;
            header.appendChild(logoutBtn);
        }
    }
}

// Export functions for global access
window.lmsApp = {
    login: handleLogin,
    signup: handleSignup,
    logout: logout
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    checkAuthStatus();
});
