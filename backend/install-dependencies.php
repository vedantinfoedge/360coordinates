<?php
/**
 * Composer Dependencies Installation Guide
 * 
 * This file provides instructions for installing Composer dependencies
 * required for Google Vision API image moderation.
 * 
 * Visit: https://indiapropertys.com/backend/install-dependencies.php
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: text/html; charset=utf-8');

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Install Composer Dependencies - India Propertys</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            max-width: 900px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            border-bottom: 3px solid #4CAF50;
            padding-bottom: 10px;
        }
        h2 {
            color: #555;
            margin-top: 30px;
        }
        .status {
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .status.success {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
        }
        .status.warning {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
        }
        .status.error {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
        }
        .code-block {
            background: #2d2d2d;
            color: #f8f8f2;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
            margin: 15px 0;
            font-family: 'Courier New', monospace;
            font-size: 14px;
        }
        .code-block code {
            color: #f8f8f2;
        }
        .step {
            background: #f8f9fa;
            padding: 15px;
            margin: 15px 0;
            border-left: 4px solid #4CAF50;
            border-radius: 4px;
        }
        .step-number {
            display: inline-block;
            background: #4CAF50;
            color: white;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            text-align: center;
            line-height: 30px;
            font-weight: bold;
            margin-right: 10px;
        }
        ul {
            line-height: 1.8;
        }
        .note {
            background: #e7f3ff;
            border-left: 4px solid #2196F3;
            padding: 15px;
            margin: 15px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📦 Install Composer Dependencies</h1>
        
        <?php
        // Check current status
        $vendorPath = __DIR__ . '/vendor/autoload.php';
        $composerJsonPath = __DIR__ . '/composer.json';
        $composerAvailable = file_exists($vendorPath);
        $composerJsonExists = file_exists($composerJsonPath);
        
        // Check if Composer is installed
        $composerInstalled = false;
        $composerVersion = '';
        if (function_exists('exec')) {
            exec('composer --version 2>&1', $output, $returnCode);
            if ($returnCode === 0 && !empty($output)) {
                $composerInstalled = true;
                $composerVersion = $output[0];
            }
        }
        ?>
        
        <h2>Current Status</h2>
        
        <?php if ($composerAvailable): ?>
            <div class="status success">
                <strong>✓ Composer dependencies are installed!</strong><br>
                Vendor autoload file found at: <code><?php echo htmlspecialchars($vendorPath); ?></code>
            </div>
        <?php else: ?>
            <div class="status warning">
                <strong>⚠ Composer dependencies are NOT installed</strong><br>
                Vendor autoload file missing at: <code><?php echo htmlspecialchars($vendorPath); ?></code>
            </div>
        <?php endif; ?>
        
        <?php if ($composerJsonExists): ?>
            <div class="status success">
                <strong>✓ composer.json found</strong><br>
                Path: <code><?php echo htmlspecialchars($composerJsonPath); ?></code>
            </div>
        <?php else: ?>
            <div class="status error">
                <strong>✗ composer.json NOT found</strong><br>
                Please create composer.json file first.
            </div>
        <?php endif; ?>
        
        <?php if ($composerInstalled): ?>
            <div class="status success">
                <strong>✓ Composer is installed</strong><br>
                Version: <code><?php echo htmlspecialchars($composerVersion); ?></code>
            </div>
        <?php else: ?>
            <div class="status warning">
                <strong>⚠ Composer may not be installed or accessible</strong><br>
                Check if Composer is installed on the server.
            </div>
        <?php endif; ?>
        
        <h2>Installation Instructions</h2>
        
        <div class="step">
            <span class="step-number">1</span>
            <strong>Connect to your server via SSH</strong>
            <p>Use your hosting provider's SSH access or cPanel Terminal.</p>
        </div>
        
        <div class="step">
            <span class="step-number">2</span>
            <strong>Navigate to the backend directory</strong>
            <div class="code-block">
cd /home/u449667423/domains/indiapropertys.com/public_html/demo1/backend
            </div>
        </div>
        
        <div class="step">
            <span class="step-number">3</span>
            <strong>Install Composer (if not already installed)</strong>
            <p>If Composer is not installed, download it:</p>
            <div class="code-block">
php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
php composer-setup.php
php -r "unlink('composer-setup.php');"
            </div>
            <p>Or use the global Composer if available:</p>
            <div class="code-block">
composer --version
            </div>
        </div>
        
        <div class="step">
            <span class="step-number">4</span>
            <strong>Install dependencies</strong>
            <p>Run Composer install to download Google Cloud Vision SDK:</p>
            <div class="code-block">
composer install
            </div>
            <p>Or if using composer.phar:</p>
            <div class="code-block">
php composer.phar install
            </div>
        </div>
        
        <div class="step">
            <span class="step-number">5</span>
            <strong>Verify installation</strong>
            <p>Check if vendor/autoload.php was created:</p>
            <div class="code-block">
ls -la vendor/autoload.php
            </div>
            <p>You should see the file exists.</p>
        </div>
        
        <h2>Alternative: Manual Installation via cPanel</h2>
        
        <div class="note">
            <strong>Note:</strong> If you don't have SSH access, you can:
            <ol>
                <li>Use cPanel File Manager to navigate to <code>/backend/</code></li>
                <li>Use cPanel Terminal (if available) to run the commands above</li>
                <li>Or contact your hosting provider to install Composer dependencies</li>
            </ol>
        </div>
        
        <h2>Required Dependencies</h2>
        
        <p>The following package will be installed:</p>
        <ul>
            <li><strong>google/cloud-vision</strong> (^2.0) - Google Cloud Vision API SDK for image moderation</li>
        </ul>
        
        <h2>After Installation</h2>
        
        <p>Once dependencies are installed:</p>
        <ol>
            <li>Refresh this page to verify installation</li>
            <li>Test image upload functionality</li>
            <li>Google Vision API moderation will be enabled automatically</li>
        </ol>
        
        <div class="note">
            <strong>Important:</strong> Make sure your Google Cloud credentials file is at:<br>
            <code>/home/u449667423/domains/indiapropertys.com/Secure/indiapropertys-8fab286d41e4.json</code>
        </div>
        
        <h2>Current File Status</h2>
        
        <ul>
            <li>composer.json: <?php echo $composerJsonExists ? '✓ Exists' : '✗ Missing'; ?></li>
            <li>vendor/autoload.php: <?php echo $composerAvailable ? '✓ Exists' : '✗ Missing'; ?></li>
            <li>Composer installed: <?php echo $composerInstalled ? '✓ Yes' : '? Unknown'; ?></li>
        </ul>
        
        <p style="margin-top: 30px; color: #666; font-size: 14px;">
            <em>Last checked: <?php echo date('Y-m-d H:i:s'); ?></em>
        </p>
    </div>
</body>
</html>

