-- Learning Management System (LMS) Database Schema
-- This schema supports multi-language, multi-country educational content management

-- Enable UUID extension for PostgreSQL (if using PostgreSQL)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table - stores all system users (admins, teachers, students)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    country VARCHAR(100) NOT NULL,
    language VARCHAR(10) NOT NULL, -- ISO 639-1 language code (e.g., 'en', 'es', 'fr')
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Resources table - stores educational content created by teachers
CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    subject VARCHAR(100) NOT NULL,
    grade VARCHAR(50) NOT NULL, -- e.g., 'K-5', '6-8', '9-12', 'college'
    country VARCHAR(100) NOT NULL,
    language VARCHAR(10) NOT NULL, -- ISO 639-1 language code
    tags TEXT[], -- Array of tags for easy searching
    file_url TEXT, -- URL to the resource file
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Check constraints
    CHECK (grade ~ '^[K-9-]+$|^college$|^university$'), -- Basic grade validation
    CHECK (language ~ '^[a-z]{2}$') -- Basic language code validation
);

-- Ratings table - stores student feedback on resources
CREATE TABLE ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL,
    student_id UUID NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Unique constraint to prevent multiple ratings from same student on same resource
    UNIQUE(resource_id, student_id)
);

-- Translations table - stores translated versions of resources
CREATE TABLE translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL,
    target_language VARCHAR(10) NOT NULL, -- ISO 639-1 language code
    translated_text TEXT NOT NULL,
    tts_url TEXT, -- Text-to-speech audio URL
    summary TEXT, -- Brief summary of the translated content
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE,
    
    -- Check constraints
    CHECK (target_language ~ '^[a-z]{2}$'), -- Basic language code validation
    
    -- Unique constraint to prevent multiple translations of same resource in same language
    UNIQUE(resource_id, target_language)
);

-- Logs table - stores system activity for auditing and analytics
CREATE TABLE logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action VARCHAR(100) NOT NULL, -- e.g., 'login', 'resource_created', 'rating_added'
    details JSONB, -- Flexible JSON storage for additional log information
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints (nullable since some logs might not be user-specific)
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for better query performance
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_country ON users(country);
CREATE INDEX idx_users_language ON users(language);
CREATE INDEX idx_users_email ON users(email);

CREATE INDEX idx_resources_teacher_id ON resources(teacher_id);
CREATE INDEX idx_resources_subject ON resources(subject);
CREATE INDEX idx_resources_grade ON resources(grade);
CREATE INDEX idx_resources_country ON resources(country);
CREATE INDEX idx_resources_language ON resources(language);
CREATE INDEX idx_resources_tags ON resources USING GIN(tags);

CREATE INDEX idx_ratings_resource_id ON ratings(resource_id);
CREATE INDEX idx_ratings_student_id ON ratings(student_id);
CREATE INDEX idx_ratings_rating ON ratings(rating);

CREATE INDEX idx_translations_resource_id ON translations(resource_id);
CREATE INDEX idx_translations_target_language ON translations(target_language);

CREATE INDEX idx_logs_user_id ON logs(user_id);
CREATE INDEX idx_logs_action ON logs(action);
CREATE INDEX idx_logs_created_at ON logs(created_at);
CREATE INDEX idx_logs_details ON logs USING GIN(details);

-- Triggers to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON resources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ratings_updated_at BEFORE UPDATE ON ratings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_translations_updated_at BEFORE UPDATE ON translations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE users IS 'Stores all system users including admins, teachers, and students';
COMMENT ON TABLE resources IS 'Stores educational content and resources created by teachers';
COMMENT ON TABLE ratings IS 'Stores student ratings and feedback on educational resources';
COMMENT ON TABLE translations IS 'Stores translated versions of educational resources';
COMMENT ON TABLE logs IS 'Stores system activity logs for auditing and analytics';

COMMENT ON COLUMN users.role IS 'User role: admin, teacher, or student';
COMMENT ON COLUMN users.language IS 'Primary language preference (ISO 639-1 code)';
COMMENT ON COLUMN resources.grade IS 'Target grade level for the resource';
COMMENT ON COLUMN resources.tags IS 'Array of tags for categorization and search';
COMMENT ON COLUMN ratings.rating IS 'Rating value from 1 (poor) to 5 (excellent)';
COMMENT ON COLUMN translations.tts_url IS 'URL to text-to-speech audio file';
COMMENT ON COLUMN logs.details IS 'JSON object containing additional log information';


