<?php
/**
 * File Helper Functions
 * Utility functions for file operations
 */

class FileHelper {
    
    /**
     * Generate unique filename with timestamp and uniqid
     * 
     * @param string $originalFilename Original filename
     * @return string Unique filename
     */
    public static function generateUniqueFilename($originalFilename) {
        $extension = self::getFileExtension($originalFilename);
        $timestamp = time();
        $uniqid = uniqid();
        return "img_{$timestamp}_{$uniqid}.{$extension}";
    }
    
    /**
     * Move file from source to destination
     * Creates destination directory if needed
     * 
     * @param string $source Source file path
     * @param string $destination Destination file path
     * @return bool True on success, false on failure
     */
    public static function moveFile($source, $destination) {
        try {
            // Create destination directory if it doesn't exist
            $destinationDir = dirname($destination);
            if (!self::createDirectory($destinationDir)) {
                error_log("FileHelper::moveFile - Failed to create directory: {$destinationDir}");
                return false;
            }
            
            // Move file
            if (!rename($source, $destination)) {
                // Fallback: try copy then delete
                if (copy($source, $destination)) {
                    @unlink($source);
                    return true;
                }
                error_log("FileHelper::moveFile - Failed to move file from {$source} to {$destination}");
                return false;
            }
            
            return true;
        } catch (Exception $e) {
            error_log("FileHelper::moveFile - Exception: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Safely delete file if exists
     * 
     * @param string $path File path
     * @return bool True if deleted or doesn't exist, false on error
     */
    public static function deleteFile($path) {
        try {
            if (file_exists($path)) {
                return @unlink($path);
            }
            return true; // File doesn't exist, consider it "deleted"
        } catch (Exception $e) {
            error_log("FileHelper::deleteFile - Exception: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Create directory with proper permissions if not exists
     * 
     * @param string $path Directory path
     * @return bool True on success, false on failure
     */
    public static function createDirectory($path) {
        try {
            if (!file_exists($path)) {
                return @mkdir($path, 0755, true);
            }
            return true; // Directory already exists
        } catch (Exception $e) {
            error_log("FileHelper::createDirectory - Exception: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Get file extension (lowercase)
     * 
     * @param string $filename Filename
     * @return string Lowercase extension without dot
     */
    public static function getFileExtension($filename) {
        return strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    }
    
    /**
     * Get MIME type of file using finfo
     * 
     * @param string $path File path
     * @return string MIME type or 'application/octet-stream' if unknown
     */
    public static function getMimeType($path) {
        try {
            if (!file_exists($path)) {
                return 'application/octet-stream';
            }
            
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            if ($finfo === false) {
                return 'application/octet-stream';
            }
            
            $mimeType = finfo_file($finfo, $path);
            finfo_close($finfo);
            
            return $mimeType ?: 'application/octet-stream';
        } catch (Exception $e) {
            error_log("FileHelper::getMimeType - Exception: " . $e->getMessage());
            return 'application/octet-stream';
        }
    }
    
    /**
     * Get image dimensions
     * 
     * @param string $path Image file path
     * @return array ['width' => int, 'height' => int] or null on error
     */
    public static function getImageDimensions($path) {
        try {
            if (!file_exists($path)) {
                return null;
            }
            
            $imageInfo = @getimagesize($path);
            if ($imageInfo === false) {
                return null;
            }
            
            return [
                'width' => $imageInfo[0],
                'height' => $imageInfo[1]
            ];
        } catch (Exception $e) {
            error_log("FileHelper::getImageDimensions - Error: " . $e->getMessage());
            return null;
        }
    }
    
    /**
     * Validate uploaded image file
     * LENIENT: Pass if extension OR mime type is valid
     * 
     * @param array $file $_FILES array element
     * @param int $maxSize Maximum file size in bytes
     * @param array $allowedTypes Allowed file extensions
     * @return array ['valid' => bool, 'error' => string|null]
     */
    public static function validateImageFile($file, $maxSize, $allowedTypes) {
        // Check if file was uploaded
        if (!isset($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
            return ['valid' => false, 'error' => 'No file uploaded'];
        }
        
        // Check for upload errors
        if ($file['error'] !== UPLOAD_ERR_OK) {
            $errorMessages = [
                UPLOAD_ERR_INI_SIZE => 'File exceeds upload_max_filesize directive',
                UPLOAD_ERR_FORM_SIZE => 'File exceeds MAX_FILE_SIZE directive',
                UPLOAD_ERR_PARTIAL => 'File was only partially uploaded',
                UPLOAD_ERR_NO_FILE => 'No file was uploaded',
                UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder',
                UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
                UPLOAD_ERR_EXTENSION => 'File upload stopped by extension'
            ];
            $error = $errorMessages[$file['error']] ?? 'Unknown upload error';
            return ['valid' => false, 'error' => $error];
        }
        
        // Check file size
        if ($file['size'] > $maxSize) {
            $maxSizeMB = round($maxSize / (1024 * 1024), 2);
            return ['valid' => false, 'error' => "File size exceeds maximum allowed size of {$maxSizeMB}MB"];
        }
        
        // Check file extension
        $extension = self::getFileExtension($file['name']);
        $extensionValid = in_array($extension, $allowedTypes);
        
        // Check MIME type
        $mimeType = self::getMimeType($file['tmp_name']);
        $allowedMimeTypes = [
            'image/jpeg',
            'image/png',
            'image/webp'
        ];
        $mimeValid = $mimeType && in_array($mimeType, $allowedMimeTypes);
        
        // LENIENT: Pass if EITHER extension OR mime type is valid
        if (!$extensionValid && !$mimeValid) {
            return ['valid' => false, 'error' => 'Invalid file type. Please upload JPG, PNG, or WebP images.'];
        }
        
        // Verify it's actually an image
        $imageInfo = @getimagesize($file['tmp_name']);
        if ($imageInfo === false) {
            return ['valid' => false, 'error' => 'File is not a valid image'];
        }
        
        return ['valid' => true, 'error' => null];
    }
}

