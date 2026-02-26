<?php
/**
 * Uploads Directory Setup Script
 * 
 * This script will:
 * 1. Create the uploads directory structure
 * 2. Set correct permissions (755)
 * 3. Create .htaccess for security
 * 4. Verify everything is working
 * 
 * USAGE:
 * 1. Upload this file to: public_html/demo1/backend/
 * 2. Visit: https://360coordinates.com/backend/setup-uploads.php
 * 3. Review the output
 * 4. DELETE THIS FILE after running for security!
 */

// Security: Only allow direct access (not via include)
if (basename($_SERVER['PHP_SELF']) !== 'setup-uploads.php') {
    die('Direct access only');
}

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Uploads Directory Setup</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
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
        .success {
            color: #4CAF50;
            background: #e8f5e9;
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
        }
        .error {
            color: #f44336;
            background: #ffebee;
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
        }
        .warning {
            color: #ff9800;
            background: #fff3e0;
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
        }
        .info {
            color: #2196F3;
            background: #e3f2fd;
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
        }
        pre {
            background: #f5f5f5;
            padding: 10px;
            border-radius: 4px;
            overflow-x: auto;
        }
        .step {
            margin: 20px 0;
            padding: 15px;
            background: #f9f9f9;
            border-left: 4px solid #4CAF50;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📁 Uploads Directory Setup</h1>
        
        <?php
        $baseDir = __DIR__ . '/uploads';
        $errors = [];
        $success = [];
        
        // Define directory structure
        $directories = [
            'uploads',
            'uploads/properties',
            'uploads/properties/images',
            'uploads/properties/videos',
            'uploads/properties/brochures',
            'uploads/users',
            'uploads/users/profiles',
        ];
        
        echo '<div class="step"><h2>Step 1: Creating Directory Structure</h2>';
        
        // Create directories
        foreach ($directories as $dir) {
            $fullPath = __DIR__ . '/' . $dir;
            
            if (!file_exists($fullPath)) {
                if (@mkdir($fullPath, 0755, true)) {
                    $success[] = "Created directory: $dir";
                    echo "<div class='success'>✅ Created: $dir</div>";
                } else {
                    $errors[] = "Failed to create: $dir";
                    echo "<div class='error'>❌ Failed to create: $dir</div>";
                }
            } else {
                $success[] = "Directory already exists: $dir";
                echo "<div class='info'>ℹ️ Already exists: $dir</div>";
            }
        }
        
        echo '</div>';
        
        echo '<div class="step"><h2>Step 2: Setting Permissions</h2>';
        
        // Set permissions
        foreach ($directories as $dir) {
            $fullPath = __DIR__ . '/' . $dir;
            
            if (file_exists($fullPath)) {
                if (@chmod($fullPath, 0755)) {
                    $currentPerms = substr(sprintf('%o', fileperms($fullPath)), -4);
                    $success[] = "Set permissions for: $dir (current: $currentPerms)";
                    echo "<div class='success'>✅ Permissions set for: $dir (Current: $currentPerms)</div>";
                } else {
                    $errors[] = "Failed to set permissions for: $dir";
                    echo "<div class='error'>❌ Failed to set permissions for: $dir</div>";
                }
            }
        }
        
        echo '</div>';
        
        echo '<div class="step"><h2>Step 3: Creating .htaccess for Security</h2>';
        
        // Create .htaccess in uploads folder
        $htaccessPath = __DIR__ . '/uploads/.htaccess';
        $htaccessContent = <<<'HTACCESS'
# Prevent direct access to PHP files in uploads
<FilesMatch "\.php$">
    Order allow,deny
    Deny from all
</FilesMatch>

# Allow access to images, videos, and PDFs
<FilesMatch "\.(jpg|jpeg|png|gif|webp|mp4|webm|pdf)$">
    Order allow,deny
    Allow from all
</FilesMatch>

# Prevent directory listing
Options -Indexes
HTACCESS;
        
        if (file_put_contents($htaccessPath, $htaccessContent)) {
            chmod($htaccessPath, 0644);
            $success[] = "Created .htaccess file";
            echo "<div class='success'>✅ Created .htaccess file for security</div>";
        } else {
            $errors[] = "Failed to create .htaccess file";
            echo "<div class='error'>❌ Failed to create .htaccess file</div>";
        }
        
        echo '</div>';
        
        echo '<div class="step"><h2>Step 4: Testing Write Permissions</h2>';
        
        // Test write permissions
        $testFile = __DIR__ . '/uploads/test-write-' . time() . '.txt';
        $testContent = 'This is a test file. You can delete this.';
        
        if (file_put_contents($testFile, $testContent)) {
            $success[] = "Write test successful";
            echo "<div class='success'>✅ Write test successful - PHP can write files</div>";
            
            // Clean up test file
            if (unlink($testFile)) {
                echo "<div class='info'>ℹ️ Test file cleaned up</div>";
            }
        } else {
            $errors[] = "Write test failed - PHP cannot write files";
            echo "<div class='error'>❌ Write test failed - PHP cannot write files. Check permissions!</div>";
        }
        
        echo '</div>';
        
        echo '<div class="step"><h2>Step 5: Summary</h2>';
        
        if (empty($errors)) {
            echo "<div class='success'><h3>✅ Setup Complete!</h3>";
            echo "<p>All directories created and permissions set correctly.</p>";
            echo "<p><strong>Total successes:</strong> " . count($success) . "</p>";
            echo "</div>";
        } else {
            echo "<div class='warning'><h3>⚠️ Setup Completed with Warnings</h3>";
            echo "<p><strong>Successes:</strong> " . count($success) . "</p>";
            echo "<p><strong>Errors:</strong> " . count($errors) . "</p>";
            echo "<p>Some operations failed. You may need to set permissions manually via hPanel File Manager.</p>";
            echo "</div>";
        }
        
        echo '</div>';
        
        // Display current permissions
        echo '<div class="step"><h2>Current Directory Permissions</h2>';
        echo '<pre>';
        foreach ($directories as $dir) {
            $fullPath = __DIR__ . '/' . $dir;
            if (file_exists($fullPath)) {
                $perms = fileperms($fullPath);
                $permsOct = substr(sprintf('%o', $perms), -4);
                $isWritable = is_writable($fullPath) ? '✅ Writable' : '❌ Not Writable';
                echo "$dir: $permsOct ($isWritable)\n";
            }
        }
        echo '</pre>';
        echo '</div>';
        ?>
        
        <div class="warning">
            <h3>🔒 Security Reminder</h3>
            <p><strong>IMPORTANT:</strong> Delete this file (<code>setup-uploads.php</code>) after running the setup for security reasons!</p>
            <p>This file should not be accessible to the public once setup is complete.</p>
        </div>
        
        <div class="info">
            <h3>📋 Next Steps</h3>
            <ol>
                <li>Verify all directories show ✅ in the summary above</li>
                <li>Test file upload functionality in your application</li>
                <li><strong>Delete this setup file</strong> for security</li>
                <li>If permissions are still incorrect, set them manually via hPanel File Manager</li>
            </ol>
        </div>
    </div>
</body>
</html>

