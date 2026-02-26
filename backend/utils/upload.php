<?php
/**
 * File Upload Helper Functions
 */

require_once __DIR__ . '/../config/config.php';

/**
 * Upload property image with Google Vision API moderation
 */
function uploadPropertyImage($file, $propertyId, $enableModeration = true) {
    $errors = validateFileUpload($file, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE);
    if (!empty($errors)) {
        return ['success' => false, 'errors' => $errors];
    }
    
    // Ensure temp directory exists for moderation
    if (!file_exists(UPLOAD_TEMP_DIR)) {
        $created = @mkdir(UPLOAD_TEMP_DIR, 0755, true);
        if (!$created && !file_exists(UPLOAD_TEMP_DIR)) {
            error_log("Failed to create temp directory: " . UPLOAD_TEMP_DIR);
            return ['success' => false, 'errors' => ['Failed to create upload directory. Please check server permissions.']];
        }
    }
    
    // Check if temp file exists
    if (!file_exists($file['tmp_name'])) {
        error_log("Temporary file does not exist: {$file['tmp_name']}");
        return ['success' => false, 'errors' => ['Temporary file not found. Please try again.']];
    }
    
    // Check if temp file is readable
    if (!is_readable($file['tmp_name'])) {
        error_log("Temporary file is not readable: {$file['tmp_name']}");
        return ['success' => false, 'errors' => ['Temporary file cannot be read. Please try again.']];
    }
    
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    // Sanitize property ID for filename (handle both numeric and string IDs)
    $safePropertyId = is_numeric($propertyId) ? $propertyId : preg_replace('/[^a-zA-Z0-9_-]/', '', (string)$propertyId);
    $uniqueFilename = 'prop_' . $safePropertyId . '_' . time() . '_' . uniqid() . '.' . $extension;
    $tempPath = UPLOAD_TEMP_DIR . $uniqueFilename;
    
    // Copy file to temp directory for moderation
    if (!copy($file['tmp_name'], $tempPath)) {
        error_log("Failed to copy file to temp directory: {$tempPath}");
        return ['success' => false, 'errors' => ['Failed to prepare image for moderation. Please try again.']];
    }
    
    // Initialize moderation variables
    $decision = null;
    $apiResponse = null;
    
    // Google Vision API Moderation (if enabled)
    if ($enableModeration && file_exists(GOOGLE_APPLICATION_CREDENTIALS)) {
        try {
            require_once __DIR__ . '/../services/GoogleVisionService.php';
            require_once __DIR__ . '/../services/ModerationDecisionService.php';
            
            $visionService = new GoogleVisionService();
            $apiResponse = $visionService->analyzeImage($tempPath);
            
            $decisionService = new ModerationDecisionService();
            $decision = $decisionService->evaluate($apiResponse);
            
            $decisionResult = $decision['decision'];
            $decisionReason = $decision['reason'];
            
            // Handle UNSAFE decision - reject image
            if ($decisionResult === 'UNSAFE') {
                @unlink($tempPath); // Delete temp file
                return [
                    'success' => false, 
                    'errors' => ['Image rejected: ' . $decisionReason . '. Please upload appropriate property images only.'],
                    'moderation_status' => 'UNSAFE',
                    'moderation_reason' => $decisionReason
                ];
            }
            
            // Handle NEEDS_REVIEW decision - save to review folder
            if ($decisionResult === 'NEEDS_REVIEW') {
                // Ensure review directory exists
                if (!file_exists(UPLOAD_REVIEW_DIR)) {
                    @mkdir(UPLOAD_REVIEW_DIR, 0755, true);
                }
                
                $reviewPath = UPLOAD_REVIEW_DIR . $uniqueFilename;
                if (!rename($tempPath, $reviewPath)) {
                    error_log("Failed to move file to review directory");
                    @unlink($tempPath);
                    return ['success' => false, 'errors' => ['Failed to queue image for review. Please try again.']];
                }
                
                // Save moderation record to database if property_id is valid
                if (is_numeric($propertyId) && $propertyId > 0) {
                    try {
                        require_once __DIR__ . '/../config/database.php';
                        $db = getDB();
                        
                        // Check if property_images table has moderation columns
                        $checkStmt = $db->query("SHOW COLUMNS FROM property_images LIKE 'moderation_status'");
                        if ($checkStmt->rowCount() > 0) {
                            // Calculate relative file path from uploads directory
                            $basePath = realpath(__DIR__ . '/../uploads');
                            $reviewPathReal = realpath($reviewPath);
                            if ($basePath && $reviewPathReal && strpos($reviewPathReal, $basePath) === 0) {
                                $filePath = 'uploads' . str_replace($basePath, '', $reviewPathReal);
                                // Normalize path separators
                                $filePath = str_replace('\\', '/', $filePath);
                            } else {
                                // Fallback: use relative path
                                $filePath = 'uploads/review/' . $uniqueFilename;
                            }
                            $apisUsed = json_encode(['google_vision' => 'success']);
                            $confidenceScores = json_encode($decision['confidence_scores']);
                            $apiResponseJson = json_encode($apiResponse);
                            
                            $stmt = $db->prepare("
                                INSERT INTO property_images 
                                (property_id, file_name, file_path, original_filename, file_size, mime_type,
                                 moderation_status, moderation_reason, apis_used, confidence_scores, api_response, checked_at)
                                VALUES (?, ?, ?, ?, ?, ?, 'NEEDS_REVIEW', ?, ?, ?, ?, NOW())
                            ");
                            
                            $finfo = finfo_open(FILEINFO_MIME_TYPE);
                            $mimeType = finfo_file($finfo, $reviewPath);
                            finfo_close($finfo);
                            
                            $stmt->execute([
                                $propertyId,
                                $uniqueFilename,
                                $filePath,
                                $file['name'],
                                $file['size'],
                                $mimeType,
                                $decisionReason,
                                $apisUsed,
                                $confidenceScores,
                                $apiResponseJson
                            ]);
                        }
                    } catch (Exception $e) {
                        error_log("Failed to save moderation record: " . $e->getMessage());
                        // Continue - image is still saved for review
                    }
                }
                
                $url = UPLOAD_BASE_URL . '/review/' . $uniqueFilename;
                return [
                    'success' => true, 
                    'url' => $url, 
                    'filename' => $uniqueFilename,
                    'moderation_status' => 'NEEDS_REVIEW',
                    'moderation_reason' => $decisionReason,
                    'message' => 'Image is under review. We will notify you once approved.'
                ];
            }
            
            // SAFE decision - proceed with normal upload
            // File is already in temp, will move to final destination below
            
        } catch (Exception $e) {
            error_log("Google Vision API error: " . $e->getMessage());
            // If moderation fails, continue with upload but log the error
            // This ensures the system doesn't break if Vision API is unavailable
        }
    }
    
    // Ensure upload directory exists
    if (!file_exists(PROPERTY_IMAGES_DIR)) {
        $created = @mkdir(PROPERTY_IMAGES_DIR, 0755, true);
        if (!$created && !file_exists(PROPERTY_IMAGES_DIR)) {
            error_log("Failed to create upload directory: " . PROPERTY_IMAGES_DIR);
            @unlink($tempPath);
            return ['success' => false, 'errors' => ['Failed to create upload directory. Please check server permissions.']];
        }
    }
    
    // Check if directory is writable
    if (!is_writable(PROPERTY_IMAGES_DIR)) {
        error_log("Upload directory is not writable: " . PROPERTY_IMAGES_DIR);
        @unlink($tempPath);
        return ['success' => false, 'errors' => ['Upload directory is not writable. Please check server permissions.']];
    }
    
    // Move file from temp to final destination
    $destination = PROPERTY_IMAGES_DIR . $uniqueFilename;
    if (!rename($tempPath, $destination)) {
        // Fallback: try copy then delete
        if (!copy($tempPath, $destination)) {
            $error = error_get_last();
            error_log("Failed to move file from temp to destination: {$tempPath} to {$destination}");
            error_log("PHP Error: " . ($error ? $error['message'] : 'Unknown error'));
            @unlink($tempPath);
            return ['success' => false, 'errors' => ['Failed to upload image. Please check server permissions and try again.']];
        }
        @unlink($tempPath);
    }
    
    // Verify file was saved
    if (!file_exists($destination)) {
        error_log("File was not saved to destination: {$destination}");
        return ['success' => false, 'errors' => ['File was not saved correctly. Please try again.']];
    }
    
    // Verify file is readable
    if (!is_readable($destination)) {
        error_log("Uploaded file is not readable: {$destination}");
        return ['success' => false, 'errors' => ['Uploaded file cannot be read. Please try again.']];
    }
    
    // Add 360coordinates watermark to approved image
    try {
        require_once __DIR__ . '/../services/WatermarkService.php';
        if (class_exists('WatermarkService') && !WatermarkService::addWatermark($destination)) {
            error_log("WatermarkService: Failed to add watermark to image: {$destination}");
            // Continue - image is still valid without watermark
        }
    } catch (Exception $e) {
        error_log("WatermarkService: " . $e->getMessage());
        // Continue - image is still valid
    }
    
    // Save moderation record to database if property_id is valid and moderation was performed
    if ($enableModeration && is_numeric($propertyId) && $propertyId > 0 && isset($decision)) {
        try {
            require_once __DIR__ . '/../config/database.php';
            $db = getDB();
            
            // Check if property_images table has moderation columns
            $checkStmt = $db->query("SHOW COLUMNS FROM property_images LIKE 'moderation_status'");
            if ($checkStmt->rowCount() > 0) {
                // Calculate relative file path from uploads directory
                $basePath = realpath(__DIR__ . '/../uploads');
                $destinationReal = realpath($destination);
                if ($basePath && $destinationReal && strpos($destinationReal, $basePath) === 0) {
                    $filePath = 'uploads' . str_replace($basePath, '', $destinationReal);
                    // Normalize path separators
                    $filePath = str_replace('\\', '/', $filePath);
                } else {
                    // Fallback: use relative path
                    $filePath = 'uploads/properties/images/' . $uniqueFilename;
                }
                $apisUsed = json_encode(['google_vision' => 'success']);
                $confidenceScores = json_encode($decision['confidence_scores']);
                $apiResponseJson = json_encode($apiResponse);
                
                $stmt = $db->prepare("
                    INSERT INTO property_images 
                    (property_id, file_name, file_path, original_filename, file_size, mime_type,
                     moderation_status, moderation_reason, apis_used, confidence_scores, api_response, checked_at)
                    VALUES (?, ?, ?, ?, ?, ?, 'SAFE', ?, ?, ?, ?, NOW())
                ");
                
                $finfo = finfo_open(FILEINFO_MIME_TYPE);
                $mimeType = finfo_file($finfo, $destination);
                finfo_close($finfo);
                
                $stmt->execute([
                    $propertyId,
                    $uniqueFilename,
                    $filePath,
                    $file['name'],
                    $file['size'],
                    $mimeType,
                    $decision['reason'],
                    $apisUsed,
                    $confidenceScores,
                    $apiResponseJson
                ]);
            }
        } catch (Exception $e) {
            error_log("Failed to save moderation record: " . $e->getMessage());
            // Continue - image is still uploaded successfully
        }
    }
    
    $url = UPLOAD_BASE_URL . '/properties/images/' . $uniqueFilename;
    return [
        'success' => true, 
        'url' => $url, 
        'filename' => $uniqueFilename,
        'moderation_status' => isset($decision) ? 'SAFE' : 'SKIPPED'
    ];
}

/**
 * Upload property video
 */
function uploadPropertyVideo($file, $propertyId) {
    $errors = validateFileUpload($file, ALLOWED_VIDEO_TYPES, MAX_VIDEO_SIZE);
    if (!empty($errors)) {
        return ['success' => false, 'errors' => $errors];
    }
    
    // Ensure upload directory exists
    if (!file_exists(PROPERTY_VIDEOS_DIR)) {
        $created = @mkdir(PROPERTY_VIDEOS_DIR, 0755, true);
        if (!$created && !file_exists(PROPERTY_VIDEOS_DIR)) {
            error_log("Failed to create upload directory: " . PROPERTY_VIDEOS_DIR);
            return ['success' => false, 'errors' => ['Failed to create upload directory. Please check server permissions.']];
        }
    }
    
    // Check if directory is writable
    if (!is_writable(PROPERTY_VIDEOS_DIR)) {
        error_log("Upload directory is not writable: " . PROPERTY_VIDEOS_DIR);
        return ['success' => false, 'errors' => ['Upload directory is not writable. Please check server permissions.']];
    }
    
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = 'prop_' . $propertyId . '_' . time() . '_' . uniqid() . '.' . $extension;
    $destination = PROPERTY_VIDEOS_DIR . $filename;
    
    // Check if temp file exists and is readable
    if (!file_exists($file['tmp_name']) || !is_readable($file['tmp_name'])) {
        error_log("Temporary video file issue: {$file['tmp_name']}");
        return ['success' => false, 'errors' => ['Temporary file issue. Please try again.']];
    }
    
    if (!move_uploaded_file($file['tmp_name'], $destination)) {
        $error = error_get_last();
        error_log("Failed to move uploaded video from {$file['tmp_name']} to {$destination}");
        error_log("PHP Error: " . ($error ? $error['message'] : 'Unknown error'));
        return ['success' => false, 'errors' => ['Failed to upload video. Please check server permissions and try again.']];
    }
    
    // Verify file was saved
    if (!file_exists($destination) || !is_readable($destination)) {
        error_log("Video file was not saved correctly to destination: {$destination}");
        return ['success' => false, 'errors' => ['Video file was not saved correctly. Please try again.']];
    }
    
    $url = UPLOAD_BASE_URL . '/properties/videos/' . $filename;
    return ['success' => true, 'url' => $url, 'filename' => $filename];
}

/**
 * Upload property brochure
 */
function uploadPropertyBrochure($file, $propertyId) {
    $errors = validateFileUpload($file, ALLOWED_BROCHURE_TYPES, MAX_BROCHURE_SIZE);
    if (!empty($errors)) {
        return ['success' => false, 'errors' => $errors];
    }
    
    // Ensure upload directory exists
    if (!file_exists(PROPERTY_BROCHURES_DIR)) {
        $created = @mkdir(PROPERTY_BROCHURES_DIR, 0755, true);
        if (!$created && !file_exists(PROPERTY_BROCHURES_DIR)) {
            error_log("Failed to create upload directory: " . PROPERTY_BROCHURES_DIR);
            return ['success' => false, 'errors' => ['Failed to create upload directory. Please check server permissions.']];
        }
    }
    
    // Check if directory is writable
    if (!is_writable(PROPERTY_BROCHURES_DIR)) {
        error_log("Upload directory is not writable: " . PROPERTY_BROCHURES_DIR);
        return ['success' => false, 'errors' => ['Upload directory is not writable. Please check server permissions.']];
    }
    
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = 'prop_' . $propertyId . '_' . time() . '_' . uniqid() . '.' . $extension;
    $destination = PROPERTY_BROCHURES_DIR . $filename;
    
    // Check if temp file exists and is readable
    if (!file_exists($file['tmp_name']) || !is_readable($file['tmp_name'])) {
        error_log("Temporary brochure file issue: {$file['tmp_name']}");
        return ['success' => false, 'errors' => ['Temporary file issue. Please try again.']];
    }
    
    if (!move_uploaded_file($file['tmp_name'], $destination)) {
        $error = error_get_last();
        error_log("Failed to move uploaded brochure from {$file['tmp_name']} to {$destination}");
        error_log("PHP Error: " . ($error ? $error['message'] : 'Unknown error'));
        return ['success' => false, 'errors' => ['Failed to upload brochure. Please check server permissions and try again.']];
    }
    
    // Verify file was saved
    if (!file_exists($destination) || !is_readable($destination)) {
        error_log("Brochure file was not saved correctly to destination: {$destination}");
        return ['success' => false, 'errors' => ['Brochure file was not saved correctly. Please try again.']];
    }
    
    $url = UPLOAD_BASE_URL . '/properties/brochures/' . $filename;
    return ['success' => true, 'url' => $url, 'filename' => $filename];
}

/**
 * Delete file
 */
function deleteFile($filePath) {
    if (file_exists($filePath)) {
        return unlink($filePath);
    }
    return false;
}

/**
 * Extract filename from URL
 */
function getFilenameFromUrl($url) {
    return basename(parse_url($url, PHP_URL_PATH));
}

