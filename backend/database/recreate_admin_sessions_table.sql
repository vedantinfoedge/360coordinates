-- Drop and recreate admin_sessions table
-- Run this SQL to ensure table exists correctly without foreign key constraints

DROP TABLE IF EXISTS admin_sessions;

CREATE TABLE admin_sessions (
    id INT(11) NOT NULL AUTO_INCREMENT,
    session_id VARCHAR(255) NOT NULL,
    admin_id INT(11) NOT NULL,
    admin_mobile VARCHAR(20) NOT NULL,
    admin_role VARCHAR(50) NOT NULL,
    admin_email VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY unique_session_id (session_id),
    KEY idx_admin_id (admin_id),
    KEY idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verify table was created
SELECT 'admin_sessions table created successfully' AS status;

