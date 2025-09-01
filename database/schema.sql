-- PostgreSQL Schema for TransLearn

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'student',
    phone VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Kenya',
    language VARCHAR(50) DEFAULT 'english',
    is_verified BOOLEAN DEFAULT FALSE,
    balance DECIMAL(10,2) DEFAULT 0.00,
    subscription_plan VARCHAR(20) DEFAULT 'free',
    subscription_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE resources (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    subject VARCHAR(100),
    grade_level VARCHAR(50),
    language VARCHAR(50),
    file_url VARCHAR(500),
    file_type VARCHAR(50),
    price DECIMAL(10,2) DEFAULT 0.00,
    tags JSONB,
    download_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ratings (
    id SERIAL PRIMARY KEY,
    resource_id INTEGER REFERENCES resources(id),
    user_id INTEGER REFERENCES users(id),
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (resource_id, user_id)
);

CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    amount DECIMAL(10,2),
    currency VARCHAR(10) DEFAULT 'KES',
    payment_method VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending',
    transaction_id VARCHAR(255),
    resource_id INTEGER REFERENCES resources(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE translations (
    id SERIAL PRIMARY KEY,
    resource_id INTEGER REFERENCES resources(id),
    original_language VARCHAR(50),
    target_language VARCHAR(50),
    translated_content TEXT,
    audio_url VARCHAR(500),
    summary TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_resources_subject ON resources(subject);
CREATE INDEX idx_resources_language ON resources(language);
CREATE INDEX idx_payments_transaction ON payments(transaction_id);