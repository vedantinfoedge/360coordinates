<?php
// Absolute minimum - just echo
echo "step1\n";

// Load one file at a time
require_once __DIR__ . '/../../config/config.php';
echo "step2-config\n";

require_once __DIR__ . '/../../config/database.php';
echo "step3-database\n";

require_once __DIR__ . '/../../config/moderation.php';
echo "step4-moderation\n";

// Session
session_start();
echo "step5-session\n";

// Load services one by one
require_once __DIR__ . '/../../services/WatermarkService.php';
echo "step6-watermark\n";

require_once __DIR__ . '/../../helpers/FileHelper.php';
echo "step7-filehelper\n";

require_once __DIR__ . '/../../utils/auth.php';
echo "step8-auth\n";

// Try GoogleVisionService last
require_once __DIR__ . '/../../vendor/autoload.php';
echo "step9-composer\n";

require_once __DIR__ . '/../../services/GoogleVisionService.php';
echo "step10-vision\n";

echo "ALL LOADED OK\n";