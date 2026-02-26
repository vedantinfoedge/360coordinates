<?php
/**
 * File Helper Utility Class
 * Provides file operations for image moderation system
 */

require_once __DIR__ . '/../config/config.php';

class FileHelper {
    /**
     * Move file from source to destination
     * Creates destination directory if needed
     * 
     * @param string $sourcePath Source file path
     * @param string $destinationPath Destination file path
     * @return bool True on success, false on failure
     */
    public static function moveFile($sourcePath, $destinationPath) {
        try {
            // Check if source file exists
            if (!file_exists($sourcePath)) {
                error_log("FileHelper::moveFile - Source file does not exist: {$sourcePath}");
                return false;
            }
            
            // Create destination directory if it doesn't exist
            $destinationDir = dirname($destinationPath);
            if (!file_exists($destinationDir)) {
                $created = @mkdir($destinationDir, 0755, true);
                if (!$created && !file_exists($destinationDir)) {
                    error_log("FileHelper::moveFile - Failed to create destination directory: {$destinationDir}");
                    return false;
                }
            }
            
            // Check if destination directory is writable
            if (!is_writable($destinationDir)) {
                error_log("FileHelper::moveFile - Destination directory is not writable: {$destinationDir}");
                return false;
            }
            
            // Move the file
            if (!rename($sourcePath, $destinationPath)) {
                error_log("FileHelper::moveFile - Failed to move file from {$sourcePath} to {$destinationPath}");
                return false;
            }
            
            // Verify file was moved
            if (!file_exists($destinationPath)) {
                error_log("FileHelper::moveFile - File was not moved successfully to {$destinationPath}");
                return false;
            }
            
            return true;
        } catch (Exception $e) {
            error_log("FileHelper::moveFile - Exception: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Delete file safely
     * 
     * @param string $filePath Path to file to delete
     * @return bool True on success, false on failure
     */
    public static function deleteFile($filePath) {
        try {
            if (file_exists($filePath)) {
                if (!is_writable($filePath)) {
                    error_log("FileHelper::deleteFile - File is not writable: {$filePath}");
                    return false;
                }
                
                $deleted = @unlink($filePath);
                if (!$deleted) {
                    error_log("FileHelper::deleteFile - Failed to delete file: {$filePath}");
                    return false;
                }
                
                return true;
            }
            
            // File doesn't exist, consider it already deleted
            return true;
        } catch (Exception $e) {
            error_log("FileHelper::deleteFile - Exception: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Generate unique filename with timestamp
     * 
     * @param string $originalFilename Original filename
     * @return string Unique filename
     */
    public static function generateUniqueFilename($originalFilename) {
        $extension = pathinfo($originalFilename, PATHINFO_EXTENSION);
        $baseName = pathinfo($originalFilename, PATHINFO_FILENAME);
        
        // Sanitize base name (remove special characters)
        $baseName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $baseName);
        
        // Generate unique filename: timestamp_uniqid_originalname.extension
        $uniqueName = time() . '_' . uniqid() . '_' . $baseName . '.' . $extension;
        
        return $uniqueName;
    }
    
    /**
     * Get public URL for file path
     * 
     * @param string $filePath File path relative to uploads directory
     * @return string Public URL
     */
    public static function getImageUrl($filePath) {
        // Remove leading slash if present
        $filePath = ltrim($filePath, '/');
        
        // If path already contains uploads/, use as is
        if (strpos($filePath, 'uploads/') === 0) {
            return BASE_URL . '/' . $filePath;
        }
        
        // Otherwise, prepend uploads/
        return UPLOAD_BASE_URL . '/' . $filePath;
    }
    
    /**
     * Get relative path from absolute path
     * 
     * @param string $absolutePath Absolute file path
     * @return string Relative path from uploads directory
     */
    public static function getRelativePath($absolutePath) {
        // Remove upload directory from path
        $relativePath = str_replace(UPLOAD_DIR, '', $absolutePath);
        return ltrim(str_replace('\\', '/', $relativePath), '/');
    }
}

