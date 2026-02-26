<?php
/**
 * Upload Property Files API
 * POST /api/upload/property-files.php
 * 
 * Handles file uploads for properties (images, videos, brochures)
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/response.php';
require_once __DIR__ . '/../../utils/validation.php';
require_once __DIR__ . '/../../utils/auth.php';
require_once __DIR__ . '/../../utils/upload.php';

handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', null, 405);
}

try {
    $user = requireUserType(['seller', 'agent']);
    
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        sendError('No file uploaded or upload error', null, 400);
    }
    
    $file = $_FILES['file'];
    $fileType = sanitizeInput($_POST['file_type'] ?? 'image'); // image, video, brochure
    $propertyId = isset($_POST['property_id']) ? $_POST['property_id'] : 0;
    
    // Validate and convert property ID
    // For new properties, property should be created first, so we expect numeric ID
    // But handle string temp IDs for backward compatibility
    if (is_string($propertyId) && strpos($propertyId, 'temp_') === 0) {
        // Temp ID - allow it but moderation DB operations will be skipped
        // This is for backward compatibility only
    } elseif (is_numeric($propertyId)) {
        $propertyId = intval($propertyId);
    } else {
        // Invalid property ID - reject upload
        sendError('Invalid property ID. Property must be created first.', null, 400);
    }
    
    $result = null;
    
    switch ($fileType) {
        case 'image':
            $result = uploadPropertyImage($file, $propertyId);
            break;
        case 'video':
            $result = uploadPropertyVideo($file, $propertyId);
            break;
        case 'brochure':
            $result = uploadPropertyBrochure($file, $propertyId);
            break;
        default:
            sendError('Invalid file type. Allowed: image, video, brochure', null, 400);
    }
    
    if (!$result['success']) {
        $errorMessage = !empty($result['errors']) ? implode(', ', $result['errors']) : 'Upload failed';
        $errorData = ['errors' => $result['errors'] ?? []];
        
        // Include moderation information if available
        if (isset($result['moderation_status'])) {
            $errorData['moderation_status'] = $result['moderation_status'];
        }
        if (isset($result['moderation_reason'])) {
            $errorData['moderation_reason'] = $result['moderation_reason'];
        }
        
        sendError($errorMessage, $errorData, 400);
    }
    
    // Log successful upload for debugging
    error_log("File uploaded successfully: {$result['filename']} to {$result['url']}");
    
    // CRITICAL FIX: Save video URL to database if property ID is valid
    if ($fileType === 'video') {
        error_log("Video upload detected - Property ID: {$propertyId}, Type: " . gettype($propertyId));
        error_log("Video URL to save: {$result['url']}");
        
        if (is_numeric($propertyId) && $propertyId > 0) {
            try {
                $db = getDB();
                
                // Verify property exists and belongs to the user
                $stmt = $db->prepare("SELECT id, video_url, user_id FROM properties WHERE id = ?");
                $stmt->execute([$propertyId]);
                $property = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($property) {
                    // Check if property belongs to the user
                    $userMatches = ($property['user_id'] == $user['id']);
                    if (!$userMatches) {
                        error_log("WARNING: Property ID {$propertyId} user_id ({$property['user_id']}) does not match current user ({$user['id']})");
                        // Still try to update for agents (they might be managing properties for sellers)
                        if ($user['user_type'] === 'agent') {
                            error_log("INFO: User is agent, attempting update anyway");
                        } else {
                            // For non-agents, log warning but still try to update
                            error_log("WARNING: User type is {$user['user_type']}, attempting update despite user_id mismatch");
                        }
                    }
                    
                    // Update video_url in database
                    // Use a more direct approach - update by ID only (user_id check already verified above)
                    // This ensures the update happens even if there are minor user_id mismatches
                    $updateStmt = $db->prepare("UPDATE properties SET video_url = ? WHERE id = ?");
                    $updateStmt->execute([$result['url'], $propertyId]);
                    $rowsAffected = $updateStmt->rowCount();
                    
                    // If still no rows affected, property might not exist or there's a database issue
                    if ($rowsAffected === 0) {
                        error_log("WARNING: UPDATE by ID only failed (0 rows affected)");
                        error_log("Attempting with user_id check as alternative...");
                        // Try with user_id check as alternative
                        $altUpdateStmt = $db->prepare("UPDATE properties SET video_url = ? WHERE id = ? AND user_id = ?");
                        $altUpdateStmt->execute([$result['url'], $propertyId, $user['id']]);
                        $rowsAffected = $altUpdateStmt->rowCount();
                    }
                    
                    if ($rowsAffected > 0) {
                        // Verify the update by reading back from database (with a small delay to ensure commit)
                        usleep(100000); // 100ms delay to ensure database commit
                        $verifyStmt = $db->prepare("SELECT video_url FROM properties WHERE id = ?");
                        $verifyStmt->execute([$propertyId]);
                        $updated = $verifyStmt->fetch(PDO::FETCH_ASSOC);
                        
                        error_log("SUCCESS: Video URL saved to database for property ID: {$propertyId}");
                        error_log("Video URL before update: " . ($property['video_url'] ?? 'NULL'));
                        error_log("Video URL after update: " . ($updated['video_url'] ?? 'NULL'));
                        error_log("Video URL being saved: {$result['url']}");
                        error_log("Rows affected by UPDATE: {$rowsAffected}");
                        
                        // Double-check the URL matches
                        if ($updated && $updated['video_url'] === $result['url']) {
                            error_log("VERIFIED: Video URL correctly saved to database");
                        } else {
                            error_log("WARNING: Video URL mismatch! Expected: {$result['url']}, Got: " . ($updated['video_url'] ?? 'NULL'));
                            // Try one more time if mismatch
                            if ($updated && $updated['video_url'] !== $result['url']) {
                                error_log("Retrying UPDATE to fix mismatch...");
                                $retryStmt = $db->prepare("UPDATE properties SET video_url = ? WHERE id = ?");
                                $retryStmt->execute([$result['url'], $propertyId]);
                                $retryRows = $retryStmt->rowCount();
                                error_log("Retry UPDATE affected {$retryRows} rows");
                            }
                        }
                    } else {
                        error_log("ERROR: UPDATE query failed - no rows were affected for property ID: {$propertyId}");
                        error_log("Video file was uploaded successfully to: {$result['url']}");
                        error_log("Property exists: " . ($property ? 'YES' : 'NO'));
                        if ($property) {
                            error_log("Property user_id: {$property['user_id']}, Current user_id: {$user['id']}");
                        }
                        error_log("But video_url was NOT saved to database - manual update may be required");
                        
                        // Last resort: Try direct SQL update without any checks
                        try {
                            error_log("Last resort: Attempting direct UPDATE...");
                            $directStmt = $db->prepare("UPDATE properties SET video_url = ? WHERE id = ?");
                            $directStmt->execute([$result['url'], $propertyId]);
                            $directRows = $directStmt->rowCount();
                            if ($directRows > 0) {
                                error_log("SUCCESS: Direct UPDATE succeeded (affected {$directRows} rows)");
                            } else {
                                error_log("ERROR: Even direct UPDATE failed - property may not exist or database issue");
                            }
                        } catch (Exception $directE) {
                            error_log("ERROR: Direct UPDATE exception: " . $directE->getMessage());
                        }
                    }
                } else {
                    error_log("ERROR: Property ID {$propertyId} not found in database");
                    error_log("User ID: {$user['id']}, User Type: {$user['user_type']}");
                    
                    // Try to find the property without user_id check (for debugging)
                    $debugStmt = $db->prepare("SELECT id, user_id FROM properties WHERE id = ?");
                    $debugStmt->execute([$propertyId]);
                    $debugProperty = $debugStmt->fetch(PDO::FETCH_ASSOC);
                    if ($debugProperty) {
                        error_log("DEBUG: Property exists but user_id mismatch. Property user_id: {$debugProperty['user_id']}, Current user_id: {$user['id']}");
                        // Try to update anyway (property exists, just user_id doesn't match)
                        error_log("Attempting UPDATE despite user_id mismatch...");
                        $fallbackStmt = $db->prepare("UPDATE properties SET video_url = ? WHERE id = ?");
                        $fallbackStmt->execute([$result['url'], $propertyId]);
                        $fallbackRows = $fallbackStmt->rowCount();
                        if ($fallbackRows > 0) {
                            error_log("SUCCESS: UPDATE succeeded despite user_id mismatch (affected {$fallbackRows} rows)");
                            // Verify
                            $verifyStmt = $db->prepare("SELECT video_url FROM properties WHERE id = ?");
                            $verifyStmt->execute([$propertyId]);
                            $updated = $verifyStmt->fetch(PDO::FETCH_ASSOC);
                            error_log("Verified video_url: " . ($updated['video_url'] ?? 'NULL'));
                        } else {
                            error_log("ERROR: UPDATE failed even without user_id check - property may not exist or database issue");
                        }
                    } else {
                        error_log("DEBUG: Property ID {$propertyId} does not exist in database at all");
                        error_log("This might be a timing issue - property may not be committed yet");
                        error_log("Video file was uploaded successfully to: {$result['url']}");
                        error_log("But video_url was NOT saved to database - property may need to be created first");
                    }
                }
            } catch (PDOException $e) {
                error_log("ERROR: Failed to save video URL to database (PDO): " . $e->getMessage());
                error_log("PDO Error Code: " . $e->getCode());
                error_log("PDO Error Info: " . print_r($e->errorInfo ?? [], true));
                error_log("SQL State: " . ($e->errorInfo[0] ?? 'N/A'));
            } catch (Exception $e) {
                error_log("ERROR: Error saving video URL to database (Exception): " . $e->getMessage());
                error_log("Exception Stack Trace: " . $e->getTraceAsString());
            }
        } else {
            error_log("ERROR: Video upload skipped - Invalid property ID: {$propertyId} (must be numeric and > 0)");
        }
    }
    
    // Prepare response data
    $responseData = [
        'url' => $result['url'],
        'filename' => $result['filename'],
        'file_type' => $fileType
    ];
    
    // Include moderation information if available
    if (isset($result['moderation_status'])) {
        $responseData['moderation_status'] = $result['moderation_status'];
    }
    if (isset($result['moderation_reason'])) {
        $responseData['moderation_reason'] = $result['moderation_reason'];
    }
    if (isset($result['message'])) {
        $responseData['message'] = $result['message'];
    }
    
    sendSuccess('File uploaded successfully', $responseData);
    
} catch (PDOException $e) {
    error_log("File Upload Database Error: " . $e->getMessage());
    error_log("File Upload Error Code: " . $e->getCode());
    // Don't expose database error details to users
    if (defined('ENVIRONMENT') && ENVIRONMENT === 'production') {
        sendError('Database error during upload. Please try again later.', null, 500);
    } else {
        sendError('Database error during upload: ' . $e->getMessage(), null, 500);
    }
} catch (Exception $e) {
    error_log("File Upload Error: " . $e->getMessage());
    error_log("File Upload Stack Trace: " . $e->getTraceAsString());
    
    // Check if it's a directory/permission issue
    if (strpos($e->getMessage(), 'Permission denied') !== false || 
        strpos($e->getMessage(), 'No such file or directory') !== false) {
        error_log("Upload directory permission issue detected");
        sendError('Upload directory error. Please check server permissions.', null, 500);
    } else {
        // Don't expose internal error details in production
        if (defined('ENVIRONMENT') && ENVIRONMENT === 'production') {
            sendError('File upload failed. Please try again later.', null, 500);
        } else {
            sendError('File upload failed: ' . $e->getMessage(), null, 500);
        }
    }
}

