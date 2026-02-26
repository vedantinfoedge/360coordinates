<?php
/**
 * Upload Path Configuration Test Script (HTML Version)
 * Tests all path configurations and file operations
 * 
 * Usage: Access via browser
 * URL: https://360coordinates.com/backend/api/images/test-upload-paths-html.php
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/moderation.php';
require_once __DIR__ . '/../../helpers/FileHelper.php';

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Upload Path Configuration Test</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 1200px;
            margin: 20px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            border-bottom: 2px solid #4CAF50;
            padding-bottom: 10px;
        }
        h2 {
            color: #555;
            margin-top: 30px;
            border-left: 4px solid #4CAF50;
            padding-left: 10px;
        }
        .test-section {
            margin: 20px 0;
            padding: 15px;
            background: #f9f9f9;
            border-radius: 4px;
        }
        .pass {
            color: #4CAF50;
            font-weight: bold;
        }
        .fail {
            color: #f44336;
            font-weight: bold;
        }
        .warning {
            color: #ff9800;
            font-weight: bold;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
        }
        th, td {
            padding: 8px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background-color: #4CAF50;
            color: white;
        }
        tr:hover {
            background-color: #f5f5f5;
        }
        .code {
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: monospace;
            font-size: 0.9em;
        }
        .summary {
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
        }
        .summary.pass {
            background: #d4edda;
            border: 1px solid #c3e6cb;
        }
        .summary.fail {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
        }
        .critical-issue {
            background: #fff3cd;
            border: 1px solid #ffc107;
            padding: 10px;
            margin: 10px 0;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📁 Upload Path Configuration Test</h1>
        <p><strong>Timestamp:</strong> <?php echo date('Y-m-d H:i:s'); ?></p>
        <p><strong>Environment:</strong> <span class="code"><?php echo defined('ENVIRONMENT') ? ENVIRONMENT : 'unknown'; ?></span></p>
        
        <?php
        $allTestsPassed = true;
        $criticalIssues = [];
        
        // Test 1: Constants Defined
        echo '<div class="test-section">';
        echo '<h2>1. Constants Definition</h2>';
        echo '<table>';
        echo '<tr><th>Constant</th><th>Status</th><th>Value</th></tr>';
        
        $constants = [
            'UPLOAD_DIR',
            'UPLOAD_TEMP_PATH',
            'UPLOAD_PROPERTIES_PATH',
            'UPLOAD_BASE_URL',
            'BASE_URL'
        ];
        
        foreach ($constants as $const) {
            $defined = defined($const);
            $value = $defined ? constant($const) : 'NOT DEFINED';
            $status = $defined ? '<span class="pass">✓ Defined</span>' : '<span class="fail">✗ Not Defined</span>';
            
            if (!$defined && in_array($const, ['UPLOAD_PROPERTIES_PATH', 'UPLOAD_BASE_URL'])) {
                $allTestsPassed = false;
                $criticalIssues[] = "$const is not defined";
            }
            
            echo "<tr><td><strong>$const</strong></td><td>$status</td><td class='code'>" . htmlspecialchars($value) . "</td></tr>";
        }
        echo '</table></div>';
        
        // Test 2: Directory Existence and Permissions
        echo '<div class="test-section">';
        echo '<h2>2. Directory Existence & Permissions</h2>';
        echo '<table>';
        echo '<tr><th>Path</th><th>Exists</th><th>Writable</th><th>Readable</th><th>Permissions</th></tr>';
        
        $dirs = [
            'UPLOAD_DIR' => defined('UPLOAD_DIR') ? UPLOAD_DIR : null,
            'UPLOAD_TEMP_PATH' => defined('UPLOAD_TEMP_PATH') ? UPLOAD_TEMP_PATH : null,
            'UPLOAD_PROPERTIES_PATH' => defined('UPLOAD_PROPERTIES_PATH') ? UPLOAD_PROPERTIES_PATH : null,
        ];
        
        foreach ($dirs as $name => $path) {
            if ($path) {
                $exists = is_dir($path);
                $writable = $exists && is_writable($path);
                $readable = $exists && is_readable($path);
                $perms = $exists ? substr(sprintf('%o', fileperms($path)), -4) : 'N/A';
                
                if (!$exists) {
                    $allTestsPassed = false;
                    if ($name === 'UPLOAD_PROPERTIES_PATH') {
                        $criticalIssues[] = "UPLOAD_PROPERTIES_PATH directory does not exist: $path";
                    }
                } elseif (!$writable && $name === 'UPLOAD_PROPERTIES_PATH') {
                    $allTestsPassed = false;
                    $criticalIssues[] = "UPLOAD_PROPERTIES_PATH directory is not writable: $path";
                }
                
                echo "<tr>";
                echo "<td><strong>$name</strong><br><span class='code'>" . htmlspecialchars($path) . "</span></td>";
                echo "<td>" . ($exists ? '<span class="pass">✓</span>' : '<span class="fail">✗</span>') . "</td>";
                echo "<td>" . ($writable ? '<span class="pass">✓</span>' : '<span class="fail">✗</span>') . "</td>";
                echo "<td>" . ($readable ? '<span class="pass">✓</span>' : '<span class="fail">✗</span>') . "</td>";
                echo "<td class='code'>$perms</td>";
                echo "</tr>";
            }
        }
        echo '</table></div>';
        
        // Test 3: Path Resolution
        echo '<div class="test-section">';
        echo '<h2>3. Path Resolution</h2>';
        echo '<table>';
        echo '<tr><th>Variable</th><th>Value</th></tr>';
        echo '<tr><td><strong>__DIR__</strong></td><td class="code">' . htmlspecialchars(__DIR__) . '</td></tr>';
        echo '<tr><td><strong>dirname(__DIR__)</strong></td><td class="code">' . htmlspecialchars(dirname(__DIR__)) . '</td></tr>';
        echo '<tr><td><strong>dirname(__DIR__, 2)</strong></td><td class="code">' . htmlspecialchars(dirname(__DIR__, 2)) . '</td></tr>';
        echo '<tr><td><strong>Expected Base</strong></td><td class="code">' . htmlspecialchars(dirname(__DIR__, 2) . '/uploads/') . '</td></tr>';
        echo '<tr><td><strong>DOCUMENT_ROOT</strong></td><td class="code">' . htmlspecialchars($_SERVER['DOCUMENT_ROOT'] ?? 'NOT SET') . '</td></tr>';
        echo '<tr><td><strong>HTTP_HOST</strong></td><td class="code">' . htmlspecialchars($_SERVER['HTTP_HOST'] ?? 'NOT SET') . '</td></tr>';
        echo '</table></div>';
        
        // Test 4: URL Generation
        echo '<div class="test-section">';
        echo '<h2>4. URL Generation</h2>';
        if (defined('UPLOAD_BASE_URL') && defined('UPLOAD_PROPERTIES_PATH')) {
            $testPropertyId = 999;
            $testFilename = 'test_image.jpg';
            $relativePath = 'properties/' . $testPropertyId . '/' . $testFilename;
            $expectedUrl = UPLOAD_BASE_URL . '/' . $relativePath;
            
            echo '<table>';
            echo '<tr><th>Component</th><th>Value</th></tr>';
            echo '<tr><td><strong>UPLOAD_BASE_URL</strong></td><td class="code">' . htmlspecialchars(UPLOAD_BASE_URL) . '</td></tr>';
            echo '<tr><td><strong>Relative Path Example</strong></td><td class="code">' . htmlspecialchars($relativePath) . '</td></tr>';
            echo '<tr><td><strong>Full URL Example</strong></td><td class="code">' . htmlspecialchars($expectedUrl) . '</td></tr>';
            echo '</table>';
        } else {
            echo '<p class="fail">Cannot test URL generation - required constants not defined</p>';
        }
        echo '</div>';
        
        // Test 5: File Operations Test
        echo '<div class="test-section">';
        echo '<h2>5. File Operations Test</h2>';
        if (defined('UPLOAD_TEMP_PATH') && is_writable(UPLOAD_TEMP_PATH)) {
            $testFileName = 'test_' . time() . '_' . uniqid() . '.txt';
            $testFilePath = UPLOAD_TEMP_PATH . $testFileName;
            $testContent = 'This is a test file created at ' . date('Y-m-d H:i:s');
            
            $writeResult = @file_put_contents($testFilePath, $testContent);
            $writeSuccess = $writeResult !== false;
            
            if ($writeSuccess) {
                $readContent = @file_get_contents($testFilePath);
                $readSuccess = $readContent !== false && $readContent === $testContent;
                
                $deleteResult = FileHelper::deleteFile($testFilePath);
                $deleteSuccess = $deleteResult && !file_exists($testFilePath);
                
                echo '<table>';
                echo '<tr><th>Operation</th><th>Status</th><th>Details</th></tr>';
                echo '<tr><td><strong>Write Test</strong></td><td>' . ($writeSuccess ? '<span class="pass">✓ Pass</span>' : '<span class="fail">✗ Fail</span>') . '</td><td>' . ($writeSuccess ? "Wrote $writeResult bytes" : 'Failed to write') . '</td></tr>';
                echo '<tr><td><strong>Read Test</strong></td><td>' . ($readSuccess ? '<span class="pass">✓ Pass</span>' : '<span class="fail">✗ Fail</span>') . '</td><td>' . ($readSuccess ? 'Content matches' : 'Content mismatch') . '</td></tr>';
                echo '<tr><td><strong>Delete Test</strong></td><td>' . ($deleteSuccess ? '<span class="pass">✓ Pass</span>' : '<span class="fail">✗ Fail</span>') . '</td><td>' . ($deleteSuccess ? 'File deleted' : 'File still exists') . '</td></tr>';
                echo '</table>';
                
                if (!$writeSuccess || !$readSuccess || !$deleteSuccess) {
                    $allTestsPassed = false;
                }
            } else {
                echo '<p class="fail">Failed to write test file. Check directory permissions.</p>';
                $allTestsPassed = false;
            }
        } else {
            echo '<p class="warning">Cannot test file operations - UPLOAD_TEMP_PATH is not writable</p>';
        }
        echo '</div>';
        
        // Test 6: FileHelper Test
        echo '<div class="test-section">';
        echo '<h2>6. FileHelper Methods</h2>';
        $testOriginalFilename = 'test image file.jpg';
        $uniqueFilename = FileHelper::generateUniqueFilename($testOriginalFilename);
        $valid = !empty($uniqueFilename) && strpos($uniqueFilename, '.jpg') !== false;
        
        echo '<table>';
        echo '<tr><th>Method</th><th>Input</th><th>Output</th><th>Status</th></tr>';
        echo '<tr>';
        echo '<td><strong>generateUniqueFilename()</strong></td>';
        echo '<td class="code">' . htmlspecialchars($testOriginalFilename) . '</td>';
        echo '<td class="code">' . htmlspecialchars($uniqueFilename) . '</td>';
        echo '<td>' . ($valid ? '<span class="pass">✓ Valid</span>' : '<span class="fail">✗ Invalid</span>') . '</td>';
        echo '</tr>';
        echo '</table></div>';
        
        // Summary
        echo '<div class="summary ' . ($allTestsPassed ? 'pass' : 'fail') . '">';
        echo '<h2>Summary</h2>';
        echo '<p><strong>Status:</strong> <span class="' . ($allTestsPassed ? 'pass' : 'fail') . '">' . ($allTestsPassed ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED') . '</span></p>';
        
        if (!empty($criticalIssues)) {
            echo '<div class="critical-issue">';
            echo '<h3>⚠ Critical Issues:</h3>';
            echo '<ul>';
            foreach ($criticalIssues as $issue) {
                echo '<li>' . htmlspecialchars($issue) . '</li>';
            }
            echo '</ul>';
            echo '</div>';
        } else {
            echo '<p class="pass">✓ No critical issues found. Upload system should work correctly.</p>';
        }
        echo '</div>';
        
        // Instructions
        echo '<div class="test-section">';
        echo '<h2>Next Steps</h2>';
        echo '<ol>';
        echo '<li>If any tests failed, check the directory permissions and paths above</li>';
        echo '<li>Ensure the <span class="code">uploads</span> directory exists at: <span class="code">' . htmlspecialchars(dirname(__DIR__, 2) . '/uploads/') . '</span></li>';
        echo '<li>Set proper permissions: <span class="code">chmod -R 755 ' . htmlspecialchars(dirname(__DIR__, 2) . '/uploads/') . '</span></li>';
        echo '<li>Test an actual image upload through the application</li>';
        echo '</ol>';
        echo '</div>';
        ?>
    </div>
</body>
</html>

