<?php
/**
 * Response Helper Functions
 * Standardized JSON response methods
 */

class ResponseHelper {
    
    /**
     * Send success response
     * 
     * @param string $message Success message
     * @param array $data Additional data
     * @return void Exits after outputting
     */
    public static function success($message, $data = []) {
        header('Content-Type: application/json');
        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'message' => $message,
            'data' => $data
        ]);
        exit;
    }
    
    /**
     * Send error response
     * 
     * @param string $message Error message
     * @param int $code HTTP status code (default 400)
     * @return void Exits after outputting
     */
    public static function error($message, $code = 400) {
        header('Content-Type: application/json');
        http_response_code($code);
        echo json_encode([
            'status' => 'error',
            'message' => $message
        ]);
        exit;
    }
    
    /**
     * Send validation error response
     * 
     * @param array $errors Array of validation errors
     * @return void Exits after outputting
     */
    public static function validationError($errors) {
        header('Content-Type: application/json');
        http_response_code(400);
        echo json_encode([
            'status' => 'validation_error',
            'errors' => $errors
        ]);
        exit;
    }
    
    /**
     * Send unauthorized response
     * 
     * @param string $message Error message (default: "Unauthorized")
     * @return void Exits after outputting
     */
    public static function unauthorized($message = "Unauthorized") {
        header('Content-Type: application/json');
        http_response_code(401);
        echo json_encode([
            'status' => 'error',
            'message' => $message
        ]);
        exit;
    }
    
    /**
     * Send forbidden response
     * 
     * @param string $message Error message (default: "Forbidden")
     * @return void Exits after outputting
     */
    public static function forbidden($message = "Forbidden") {
        header('Content-Type: application/json');
        http_response_code(403);
        echo json_encode([
            'status' => 'error',
            'message' => $message
        ]);
        exit;
    }
    
    /**
     * Send server error response
     * 
     * @param string $message Error message (default: "Internal server error")
     * @return void Exits after outputting
     */
    public static function serverError($message = "Internal server error") {
        header('Content-Type: application/json');
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => $message
        ]);
        exit;
    }
    
    /**
     * Send pending/review response
     * 
     * @param string $message Message
     * @param array $data Additional data
     * @return void Exits after outputting
     */
    public static function pending($message, $data = []) {
        header('Content-Type: application/json');
        http_response_code(200);
        echo json_encode([
            'status' => 'pending_review',
            'message' => $message,
            'data' => $data
        ]);
        exit;
    }
    
    /**
     * Send error with error code and details
     * 
     * @param string $message Error message
     * @param string|null $errorCode Error code (e.g., 'animal_detected', 'blur_detected')
     * @param array $details Additional details
     * @param int $code HTTP status code (default 400)
     * @return void Exits after outputting
     */
    public static function errorWithDetails($message, $errorCode = null, $details = [], $code = 400) {
        header('Content-Type: application/json');
        http_response_code($code);
        $response = [
            'status' => 'error',
            'message' => $message
        ];
        
        if ($errorCode) {
            $response['error_code'] = $errorCode;
        }
        
        if (!empty($details)) {
            $response['details'] = $details;
        }
        
        echo json_encode($response);
        exit;
    }
}

