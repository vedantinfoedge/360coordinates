<?php
/**
 * Image Moderation Configuration
 * Google Cloud Vision API Configuration for demo1.360coordinates.com
 */

// Google Cloud Vision API Configuration
// Note: GOOGLE_APPLICATION_CREDENTIALS should be defined in config.php first
// This is a fallback only if config.php hasn't defined it yet
if (!defined('GOOGLE_APPLICATION_CREDENTIALS')) {
    // Production path(s) (Hostinger shared hosting)
    $host = $_SERVER['HTTP_HOST'] ?? '';
    $hostNoPort = preg_replace('/:\d+$/', '', $host);
    $candidatePaths = [];
    if (!empty($hostNoPort)) {
        $candidatePaths[] = "/home/u449667423/domains/{$hostNoPort}/Secure/indiapropertys-8fab286d41e4.json";
    }
    $candidatePaths[] = '/home/u449667423/domains/360coordinates.com/Secure/indiapropertys-8fab286d41e4.json';
    $candidatePaths[] = __DIR__ . '/google-cloud-credentials.json';

    $credentialsPath = $candidatePaths[1];
    foreach ($candidatePaths as $p) {
        if (!empty($p) && file_exists($p)) {
            $credentialsPath = $p;
            break;
        }
    }
    
    define('GOOGLE_APPLICATION_CREDENTIALS', $credentialsPath);
}

// Validate credentials file exists
if (defined('GOOGLE_APPLICATION_CREDENTIALS') && !file_exists(GOOGLE_APPLICATION_CREDENTIALS)) {
    error_log("CRITICAL: Google Vision credentials file not found at: " . GOOGLE_APPLICATION_CREDENTIALS);
    error_log("Please verify the credentials file path is correct and the file exists.");
}

// Content Moderation Thresholds (0.0 to 1.0)
// Standardized SafeSearch thresholds
define('MODERATION_ADULT_THRESHOLD', 0.6);
define('MODERATION_RACY_THRESHOLD', 0.6);
define('MODERATION_VIOLENCE_THRESHOLD', 0.6);

// Human Detection Thresholds (STRICT - Lower thresholds for stricter rejection)
define('MODERATION_FACE_THRESHOLD', 0.5);  // Lowered from 0.7 to catch more human faces
define('MODERATION_HUMAN_OBJECT_THRESHOLD', 0.5);  // Lowered from 0.7 to catch more human objects
define('MODERATION_HUMAN_LABEL_THRESHOLD', 0.3);  // Lowered to 0.3 to catch more human detections (very sensitive)

// Animal Detection Thresholds (STRICT - Lower thresholds for stricter rejection)
define('MODERATION_ANIMAL_OBJECT_THRESHOLD', 0.5);  // Lowered from 0.6 to catch more animals
define('MODERATION_ANIMAL_LABEL_THRESHOLD', 0.6);  // Lowered from 0.7 for stricter detection

// Image Quality Thresholds
define('MIN_IMAGE_WIDTH', 400);
define('MIN_IMAGE_HEIGHT', 300);

// Blur Detection Thresholds
define('HIGH_BLUR_THRESHOLD', 50);
define('MEDIUM_BLUR_THRESHOLD', 100);
define('BLUR_THRESHOLD', HIGH_BLUR_THRESHOLD);

// File Upload Settings
define('MAX_IMAGE_SIZE_MB', 5);
define('MAX_IMAGE_SIZE_BYTES', MAX_IMAGE_SIZE_MB * 1024 * 1024);
define('ALLOWED_IMAGE_TYPES', ['jpg', 'jpeg', 'png', 'webp']);
define('ALLOWED_MIME_TYPES', ['image/jpeg', 'image/png', 'image/webp']);

// Upload Paths - USE /backend/uploads/ (inside backend folder)
// __DIR__ is /backend/config/, so go up one level to /backend/
$baseUploadDir = dirname(__DIR__) . '/uploads/';

// Verify the path is correct (for debugging)
error_log("=== UPLOAD PATH CONFIGURATION ===");
error_log("Base upload directory: {$baseUploadDir}");
error_log("Directory exists: " . (is_dir($baseUploadDir) ? 'YES' : 'NO'));
error_log("Directory writable: " . (is_writable($baseUploadDir) ? 'YES' : 'NO'));

define('UPLOAD_TEMP_PATH', $baseUploadDir . 'temp/');
define('UPLOAD_PROPERTIES_PATH', $baseUploadDir . 'properties/');
define('UPLOAD_REVIEW_PATH', $baseUploadDir . 'review/');
define('UPLOAD_REJECTED_PATH', $baseUploadDir . 'rejected/');

// Create upload directories if they don't exist
$uploadDirs = [
    UPLOAD_TEMP_PATH,
    UPLOAD_PROPERTIES_PATH,
    UPLOAD_REVIEW_PATH,
    UPLOAD_REJECTED_PATH
];

foreach ($uploadDirs as $dir) {
    if (!file_exists($dir)) {
        $created = @mkdir($dir, 0755, true);
        if ($created && file_exists($dir)) {
            error_log("Created upload directory: {$dir}");
        } else {
            error_log("Failed to create upload directory: {$dir}");
            $error = error_get_last();
            if ($error) {
                error_log("Error: " . $error['message']);
            }
        }
    } else {
        error_log("Upload directory already exists: {$dir}");
    }
}

// Watermark Settings (360coordinates - visible on light and dark images)
define('WATERMARK_TEXT', '360coordinates');
define('WATERMARK_COLOR_R', 255);   // White for visibility
define('WATERMARK_COLOR_G', 255);
define('WATERMARK_COLOR_B', 255);
// GD alpha: 0 = opaque, 127 = transparent. 70 = more transparent, 40 = more visible
define('WATERMARK_OPACITY', 70);
define('WATERMARK_FONT_SIZE', 16);  // Smaller watermark text
define('WATERMARK_ANGLE', -45);
define('WATERMARK_SPACING_X', 200);
define('WATERMARK_SPACING_Y', 150);
// Optional: path to .ttf for large text. If not set, scaled built-in font is used.
define('WATERMARK_FONT_PATH', '');  // e.g. __DIR__ . '/../assets/fonts/DejaVuSans.ttf'

// =======================
// HUMAN LABELS (MODIFIED)
// =======================
define('HUMAN_LABELS', [
    // Basic human terms
    'Person', 'People', 'Human', 'Humans', 'Man', 'Men', 'Woman', 'Women',
    'Child', 'Children', 'Baby', 'Babies', 'Infant', 'Toddler', 'Kid', 'Kids',
    'Boy', 'Boys', 'Girl', 'Girls', 'Teenager', 'Teen', 'Adult', 'Adults',

    // Face-related (kept)
    'Face', 'Faces', 'Portrait', 'Portraits', 'Selfie', 'Selfies',

    // Groups
    'Family', 'Families', 'Crowd', 'Crowds', 'Group', 'Groups',
    'Team', 'Teams', 'Couple', 'Couples', 'Friends', 'Friend',

    // Professional
    'Worker', 'Workers', 'Employee', 'Employees', 'Staff', 'Personnel',

    // Age-specific
    'Elderly', 'Senior', 'Youth', 'Young', 'Old'
]);

// =======================
// ANIMAL LABELS (MODIFIED)
// =======================
define('ANIMAL_LABELS', [
    // Dogs
    'Dog', 'Dogs', 'Puppy', 'Puppies', 'Canine', 'Canines', 'Hound', 'Hounds',
    'Terrier', 'Bulldog', 'Labrador', 'German Shepherd', 'Poodle',
    'Golden Retriever', 'Beagle', 'Rottweiler', 'Boxer',

    // Cats
    'Cat', 'Cats', 'Kitten', 'Kittens', 'Feline', 'Felines',
    'Persian', 'Siamese', 'Maine Coon', 'Bengal',

    // Birds
    'Bird', 'Birds', 'Parrot', 'Parrots', 'Pigeon', 'Pigeons',
    'Crow', 'Crows', 'Eagle', 'Eagles', 'Owl', 'Owls',

    // Farm & large animals
    'Horse', 'Horses', 'Cow', 'Cows', 'Buffalo', 'Goat', 'Goats',
    'Sheep', 'Pig', 'Pigs',

    // Wild animals (specific only)
    'Monkey', 'Monkeys', 'Elephant', 'Elephants',
    'Tiger', 'Tigers', 'Lion', 'Lions', 'Bear', 'Bears'
]);

// =======================
// PROPERTY LABELS (MODIFIED)
// =======================
define('PROPERTY_LABELS', [
    'House', 'Building', 'Room', 'Interior', 'Exterior',
    'Kitchen', 'Bedroom', 'Bathroom', 'Living Room',
    'Property', 'Real Estate', 'Architecture', 'Home',
    'Apartment', 'Floor', 'Wall', 'Ceiling',
    'Door', 'Window', 'Furniture',
    'Land', 'Plot', 'Balcony', 'Terrace',
    'Pool', 'Garage', 'Driveway',

    // Outdoor / landscape property support (ADDED)
    'Tree', 'Trees', 'Grass', 'Field', 'Meadow',
    'Landscape', 'Countryside', 'Rural',
    'Hillside', 'Mountain', 'Farm', 'Yard'
]);

// Property Context Threshold
define('PROPERTY_CONTEXT_THRESHOLD', 0.3);

// Error Messages (UNCHANGED)
if (!function_exists('getErrorMessage')) {
    function getErrorMessage($code, $replacements = []) {
        $messages = [
            'human_detected' => 'You have uploaded an image with human appearance. Please upload only property images without any people.',
            'animal_detected' => 'You have uploaded an image with animal appearance ({animal_name}). Please upload only property images without any animals or pets.',
            'blur_detected' => 'You have uploaded a blurry image. Please upload a clear and sharp photo.',
            'low_quality' => 'You have uploaded a low quality image. Your image is {width}x{height} pixels. Minimum required is 400x300 pixels.',
            'adult_content' => 'This image contains inappropriate content and cannot be uploaded.',
            'violence_content' => 'This image contains violent content and cannot be uploaded.',
            'not_property' => 'This image does not appear to be a property photo. Please upload images of the property only.',
            'file_too_large' => 'Image file is too large. Maximum size is 5MB.',
            'invalid_type' => 'Invalid file type. Please upload JPG, PNG, or WebP images only.',
            'ocr_content_rejected' => 'This image contains text that is not allowed (phone number, email, or visiting/business card). Please upload only property images without personal contact details or documents.',
            'high_text_rejected' => 'This image contains too much text (e.g. document, poster, or heavy signage). Please upload only property photos without documents or text-heavy images.'
        ];

        $message = $messages[$code] ?? 'An error occurred.';

        foreach ($replacements as $key => $value) {
            $message = str_replace('{' . $key . '}', $value, $message);
        }

        return $message;
    }
}
