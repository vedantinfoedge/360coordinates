<?php
/**
 * Setup Google Authenticator 2FA
 * POST /api/admin/auth/setup-2fa.php
 */

// Start output buffering
ob_start();

// Error handling
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../utils/response.php';

// Load Google2FA and QR Code libraries
// Check root vendor first (where vendor directory is located), then backend vendor as fallback
$rootVendorPath = __DIR__ . '/../../../../vendor/autoload.php';  // Root vendor (from backend/api/admin/auth/)
$backendVendorPath = __DIR__ . '/../../../vendor/autoload.php';  // Backend vendor (fallback - doesn't exist in new structure)

$vendorAutoloadPath = null;
if (file_exists($rootVendorPath)) {
    $vendorAutoloadPath = $rootVendorPath;
} elseif (file_exists($backendVendorPath)) {
    $vendorAutoloadPath = $backendVendorPath;
}

if ($vendorAutoloadPath !== null) {
    require_once $vendorAutoloadPath;
} else {
    error_log("WARNING: Composer autoload not found at root vendor: {$rootVendorPath}");
    error_log("WARNING: Composer autoload not found at backend vendor: {$backendVendorPath}");
}

use PragmaRX\Google2FA\Google2FA;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ob_end_clean();
    sendError('Method not allowed', null, 405);
}

try {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);
    
    error_log("=== SETUP 2FA REQUEST ===");
    error_log("Raw Input: " . substr($rawInput, 0, 500));
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        error_log("JSON Decode Error: " . json_last_error_msg());
        ob_end_clean();
        sendError('Invalid JSON data', null, 400);
    }
    
    $adminEmail = isset($data['email']) ? trim($data['email']) : '';
    
    if (empty($adminEmail)) {
        error_log("ERROR: Email is empty");
        ob_end_clean();
        sendError('Email is required', null, 400);
    }
    
    error_log("Setting up 2FA for email: " . $adminEmail);
    
    $db = getDB();
    
    // Get admin user - use case-insensitive email match
    $stmt = $db->prepare("SELECT * FROM admin_users WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))");
    $stmt->execute([$adminEmail]);
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$admin) {
        error_log("ERROR: Admin not found for email: " . $adminEmail);
        // Try to find any admin users
        $stmt = $db->query("SELECT email FROM admin_users LIMIT 5");
        $allEmails = $stmt->fetchAll(PDO::FETCH_COLUMN);
        error_log("Available admin emails: " . json_encode($allEmails));
        ob_end_clean();
        sendError('Admin account not found. Please create admin user first.', null, 404);
    }
    
    // Use the actual email from database for consistency
    $actualEmail = $admin['email'];
    error_log("Admin found - ID: " . $admin['id'] . ", Email: " . $actualEmail);
    
    error_log("Admin found, generating secret key...");
    
    // Generate secret key
    $google2fa = new Google2FA();
    $secretKey = $google2fa->generateSecretKey();
    
    error_log("Secret key generated: " . substr($secretKey, 0, 10) . "...");
    
    // Generate QR Code URL (use actual email from database)
    $qrCodeUrl = $google2fa->getQRCodeUrl(
        'IndiaPropertys',
        $actualEmail,
        $secretKey
    );
    
    error_log("QR Code URL generated");
    
    // Generate QR Code SVG
    $renderer = new ImageRenderer(
        new RendererStyle(200),
        new SvgImageBackEnd()
    );
    $writer = new Writer($renderer);
    $qrCodeSvg = $writer->writeString($qrCodeUrl);
    $qrCodeBase64 = base64_encode($qrCodeSvg);
    
    error_log("QR Code SVG generated");
    
    // Check if google2fa_secret column exists
    try {
        // First, check if columns exist
        $checkColumns = $db->query("SHOW COLUMNS FROM admin_users LIKE 'google2fa_secret'");
        $hasSecretColumn = $checkColumns->rowCount() > 0;
        
        $checkColumns2 = $db->query("SHOW COLUMNS FROM admin_users LIKE 'is_2fa_enabled'");
        $hasEnabledColumn = $checkColumns2->rowCount() > 0;
        
        if (!$hasSecretColumn || !$hasEnabledColumn) {
            error_log("2FA columns missing - adding them...");
            if (!$hasSecretColumn) {
                $db->exec("ALTER TABLE admin_users ADD COLUMN google2fa_secret VARCHAR(32) NULL");
                error_log("Added google2fa_secret column");
            }
            if (!$hasEnabledColumn) {
                $db->exec("ALTER TABLE admin_users ADD COLUMN is_2fa_enabled TINYINT(1) DEFAULT 0");
                error_log("Added is_2fa_enabled column");
            }
        }
        
        // Store secret key (but don't enable 2FA yet - wait for verification)
        // Use admin ID for more reliable update
        $stmt = $db->prepare("UPDATE admin_users SET google2fa_secret = ? WHERE id = ?");
        $result = $stmt->execute([$secretKey, $admin['id']]);
        $rowsAffected = $stmt->rowCount();
        
        error_log("UPDATE executed - Result: " . ($result ? 'SUCCESS' : 'FAILED') . ", Rows affected: " . $rowsAffected);
        error_log("Secret key stored in database for admin ID: " . $admin['id'] . ", Email: " . $actualEmail);
        
        // Verify it was saved immediately
        $verifyStmt = $db->prepare("SELECT google2fa_secret FROM admin_users WHERE id = ?");
        $verifyStmt->execute([$admin['id']]);
        $verifyAdmin = $verifyStmt->fetch(PDO::FETCH_ASSOC);
        
        if (empty($verifyAdmin['google2fa_secret'])) {
            error_log("ERROR: Secret key was NOT saved! Admin ID: " . $admin['id']);
            error_log("Current secret value: " . ($verifyAdmin['google2fa_secret'] ?? 'NULL'));
            throw new Exception("Secret key was not saved to database");
        }
        
        if ($verifyAdmin['google2fa_secret'] !== $secretKey) {
            error_log("WARNING: Secret key mismatch! Expected length: " . strlen($secretKey) . ", Got length: " . strlen($verifyAdmin['google2fa_secret']));
        }
        
        error_log("✅ Secret key verified and saved successfully - length: " . strlen($verifyAdmin['google2fa_secret']));
    } catch (PDOException $e) {
        // Column might not exist - try to add it
        if (strpos($e->getMessage(), 'google2fa_secret') !== false) {
            error_log("Column doesn't exist, attempting to add it...");
            try {
                $db->exec("ALTER TABLE admin_users ADD COLUMN google2fa_secret VARCHAR(32) NULL");
                $db->exec("ALTER TABLE admin_users ADD COLUMN is_2fa_enabled TINYINT(1) DEFAULT 0");
                // Retry the update using ID
                $stmt = $db->prepare("UPDATE admin_users SET google2fa_secret = ? WHERE id = ?");
                $stmt->execute([$secretKey, $admin['id']]);
                error_log("Columns added and secret key stored for admin ID: " . $admin['id']);
            } catch (PDOException $e2) {
                error_log("Failed to add columns: " . $e2->getMessage());
                ob_end_clean();
                sendError('Database error. Please run the migration script first.', null, 500);
            }
        } else {
            error_log("Database error: " . $e->getMessage());
            throw $e;
        }
    } catch (Exception $e) {
        error_log("Error saving secret: " . $e->getMessage());
        ob_end_clean();
        sendError('Failed to save secret key. Please try again.', null, 500);
    }
    
    ob_end_clean();
    sendSuccess('QR code generated', [
        'secretKey' => $secretKey,
        'qrCode' => 'data:image/svg+xml;base64,' . $qrCodeBase64,
        'message' => 'Scan QR code with Google Authenticator app'
    ]);
    
} catch (PDOException $e) {
    error_log("Database Error: " . $e->getMessage());
    ob_end_clean();
    sendError('Database error. Please check database connection and migration.', null, 500);
} catch (Exception $e) {
    error_log("Setup 2FA Error: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    ob_end_clean();
    sendError('Failed to setup 2FA: ' . $e->getMessage(), null, 500);
} catch (Error $e) {
    error_log("Fatal Error: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    ob_end_clean();
    sendError('Server error occurred. Please try again.', null, 500);
}
