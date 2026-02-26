<?php
/**
 * Response Helper Utility Class
 * Provides standardized JSON response methods
 */

require_once __DIR__ . '/response.php';

class ResponseHelper {
    /**
     * Send success response
     * 
     * @param string $message Success message
     * @param array|null $data Optional data to include
     * @return void
     */
    public static function success($message, $data = null) {
        sendSuccess($message, $data);
    }
    
    /**
     * Send error response
     * 
     * @param string $message Error message
     * @param int|null $code HTTP status code (default: 400)
     * @return void
     */
    public static function error($message, $code = 400) {
        sendError($message, null, $code);
    }
    
    /**
     * Send validation error response
     * 
     * @param array $errors Array of validation errors
     * @param string|null $message Optional custom message
     * @return void
     */
    public static function validationError($errors, $message = null) {
        $defaultMessage = 'Validation failed';
        sendValidationError($errors, $message ?: $defaultMessage);
    }
}

