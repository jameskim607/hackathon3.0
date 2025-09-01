-- Database Schema Update Script for TransLearn LMS
-- Run this script to add subscription and payment features to existing database

-- Add subscription fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(20) DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP;

-- Update existing users to have 'free' plan
UPDATE users SET subscription_plan = 'free' WHERE subscription_plan IS NULL;

-- Create subscription_plans table for tracking user subscriptions
CREATE TABLE IF NOT EXISTS subscription_plans (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    plan_name VARCHAR(20) NOT NULL,
    plan_type VARCHAR(20) DEFAULT 'monthly',
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'KES',
    status VARCHAR(20) DEFAULT 'active',
    starts_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    payment_transaction_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create payment_transactions table for detailed payment tracking
CREATE TABLE IF NOT EXISTS payment_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    transaction_id VARCHAR(255) UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'KES',
    payment_method VARCHAR(50),
    payment_provider VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending',
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_upload_counts table for tracking monthly uploads
CREATE TABLE IF NOT EXISTS user_upload_counts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    month_year VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    upload_count INTEGER DEFAULT 0,
    upload_limit INTEGER DEFAULT 3,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, month_year)
);

-- Create translation_logs table for AI translation tracking
CREATE TABLE IF NOT EXISTS translation_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    resource_id INTEGER REFERENCES resources(id),
    source_language VARCHAR(10) NOT NULL,
    target_language VARCHAR(10) NOT NULL,
    text_length INTEGER,
    translation_status VARCHAR(20) DEFAULT 'completed',
    model_used VARCHAR(100),
    confidence_score DECIMAL(3,2),
    processing_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_subscription ON users(subscription_plan);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_user ON subscription_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_upload_counts_user ON user_upload_counts(user_id);
CREATE INDEX IF NOT EXISTS idx_translation_logs_user ON translation_logs(user_id);

-- Insert default subscription plan data
INSERT INTO subscription_plans (user_id, plan_name, plan_type, amount, currency, status, expires_at)
SELECT 
    u.id,
    'free',
    'monthly',
    0.00,
    'KES',
    'active',
    CURRENT_TIMESTAMP + INTERVAL '1 month'
FROM users u
WHERE u.subscription_plan = 'free'
ON CONFLICT DO NOTHING;

-- Create function to reset monthly upload counts
CREATE OR REPLACE FUNCTION reset_monthly_upload_counts()
RETURNS void AS $$
BEGIN
    -- Reset upload counts for new month
    INSERT INTO user_upload_counts (user_id, month_year, upload_count, upload_limit)
    SELECT 
        u.id,
        TO_CHAR(CURRENT_DATE, 'YYYY-MM'),
        CASE 
            WHEN u.subscription_plan = 'free' THEN 3
            WHEN u.subscription_plan = 'basic' THEN 15
            WHEN u.subscription_plan = 'premium' THEN 50
            WHEN u.subscription_plan = 'enterprise' THEN 200
            ELSE 3
        END,
        CASE 
            WHEN u.subscription_plan = 'free' THEN 3
            WHEN u.subscription_plan = 'basic' THEN 15
            WHEN u.subscription_plan = 'premium' THEN 50
            WHEN u.subscription_plan = 'enterprise' THEN 200
            ELSE 3
        END
    FROM users u
    WHERE NOT EXISTS (
        SELECT 1 FROM user_upload_counts uuc 
        WHERE uuc.user_id = u.id 
        AND uuc.month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
    );
END;
$$ LANGUAGE plpgsql;

-- Create function to check upload limit
CREATE OR REPLACE FUNCTION check_upload_limit(user_id_param INTEGER)
RETURNS TABLE(
    can_upload BOOLEAN,
    current_uploads INTEGER,
    upload_limit INTEGER,
    remaining_uploads INTEGER,
    message TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN uuc.upload_count < uuc.upload_limit THEN true
            ELSE false
        END as can_upload,
        COALESCE(uuc.upload_count, 0) as current_uploads,
        uuc.upload_limit,
        GREATEST(uuc.upload_limit - COALESCE(uuc.upload_count, 0), 0) as remaining_uploads,
        CASE 
            WHEN uuc.upload_count < uuc.upload_limit THEN 
                'You can upload ' || (uuc.upload_limit - uuc.upload_count) || ' more resources this month'
            ELSE 
                'You have reached your monthly upload limit. Upgrade your plan for more uploads.'
        END as message
    FROM users u
    LEFT JOIN user_upload_counts uuc ON u.id = uuc.user_id 
        AND uuc.month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
    WHERE u.id = user_id_param;
END;
$$ LANGUAGE plpgsql;

-- Create function to increment upload count
CREATE OR REPLACE FUNCTION increment_upload_count(user_id_param INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    current_count INTEGER;
    upload_limit INTEGER;
BEGIN
    -- Get current upload count and limit
    SELECT 
        COALESCE(uuc.upload_count, 0),
        uuc.upload_limit
    INTO current_count, upload_limit
    FROM users u
    LEFT JOIN user_upload_counts uuc ON u.id = uuc.user_id 
        AND uuc.month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
    WHERE u.id = user_id_param;
    
    -- Check if user can upload
    IF current_count >= upload_limit THEN
        RETURN FALSE;
    END IF;
    
    -- Increment upload count
    INSERT INTO user_upload_counts (user_id, month_year, upload_count, upload_limit)
    VALUES (user_id_param, TO_CHAR(CURRENT_DATE, 'YYYY-MM'), 1, upload_limit)
    ON CONFLICT (user_id, month_year)
    DO UPDATE SET 
        upload_count = user_upload_counts.upload_count + 1,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions (adjust as needed for your Railway setup)
-- GRANT EXECUTE ON FUNCTION reset_monthly_upload_counts() TO your_app_user;
-- GRANT EXECUTE ON FUNCTION check_upload_limit(INTEGER) TO your_app_user;
-- GRANT EXECUTE ON FUNCTION increment_upload_count(INTEGER) TO your_app_user;

-- Display current database status
SELECT 
    'Database schema updated successfully!' as status,
    COUNT(*) as total_users,
    COUNT(CASE WHEN subscription_plan = 'free' THEN 1 END) as free_users,
    COUNT(CASE WHEN subscription_plan != 'free' THEN 1 END) as paid_users
FROM users;
