<?php
/**
 * Firebase Storage Service
 * Uploads files to Firebase Storage (Google Cloud Storage) using the same path.
 * Used to re-upload watermarked images so the existing Firebase URL continues to work.
 */

class FirebaseStorageService {

    /**
     * Parse Firebase Storage download URL to get bucket and object path.
     * URL format: https://firebasestorage.googleapis.com/v0/b/BUCKET_ID/o/ENCODED_PATH?alt=media&token=...
     *
     * @param string $firebaseUrl Download URL from Firebase Storage
     * @return array|null ['bucket' => string, 'object' => string] or null on failure
     */
    public static function parseFirebaseUrl($firebaseUrl) {
        if (empty($firebaseUrl) || strpos($firebaseUrl, 'firebasestorage.googleapis.com') === false) {
            return null;
        }
        $parsed = parse_url($firebaseUrl);
        if (!isset($parsed['path'])) {
            return null;
        }
        // Path is like /v0/b/BUCKET_ID/o/OBJECT_PATH_ENCODED
        if (!preg_match('#^/v0/b/([^/]+)/o/(.+)$#', $parsed['path'], $m)) {
            return null;
        }
        $bucket = $m[1];
        $objectEncoded = $m[2];
        $object = rawurldecode($objectEncoded);
        return ['bucket' => $bucket, 'object' => $object];
    }

    /**
     * Get OAuth2 access token using service account credentials (JWT grant).
     *
     * @param string $credentialsPath Path to service account JSON file
     * @return string|null Access token or null on failure
     */
    public static function getAccessToken($credentialsPath) {
        if (!file_exists($credentialsPath) || !is_readable($credentialsPath)) {
            error_log("FirebaseStorageService: Credentials file not found or not readable: {$credentialsPath}");
            return null;
        }
        $json = @file_get_contents($credentialsPath);
        if ($json === false) {
            return null;
        }
        $creds = @json_decode($json, true);
        if (!$creds || empty($creds['client_email']) || empty($creds['private_key'])) {
            error_log("FirebaseStorageService: Invalid credentials JSON");
            return null;
        }
        $now = time();
        $payload = [
            'iss' => $creds['client_email'],
            'scope' => 'https://www.googleapis.com/auth/devstorage.full_control',
            'aud' => 'https://oauth2.googleapis.com/token',
            'iat' => $now,
            'exp' => $now + 3600
        ];
        $header = ['alg' => 'RS256', 'typ' => 'JWT'];
        $headerB64 = self::base64UrlEncode(json_encode($header));
        $payloadB64 = self::base64UrlEncode(json_encode($payload));
        $signatureInput = $headerB64 . '.' . $payloadB64;
        $privateKey = openssl_pkey_get_private($creds['private_key']);
        if ($privateKey === false) {
            error_log("FirebaseStorageService: Failed to load private key");
            return null;
        }
        $signature = '';
        if (!openssl_sign($signatureInput, $signature, $privateKey, OPENSSL_ALGO_SHA256)) {
            error_log("FirebaseStorageService: Failed to sign JWT");
            return null;
        }
        $signatureB64 = self::base64UrlEncode($signature);
        $jwt = $signatureInput . '.' . $signatureB64;
        $post = http_build_query([
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion' => $jwt
        ]);
        $ctx = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
                'content' => $post,
                'timeout' => 15
            ]
        ]);
        $response = @file_get_contents('https://oauth2.googleapis.com/token', false, $ctx);
        if ($response === false) {
            error_log("FirebaseStorageService: Failed to get access token (request failed)");
            return null;
        }
        $data = @json_decode($response, true);
        if (isset($data['access_token'])) {
            return $data['access_token'];
        }
        if (isset($data['error'])) {
            error_log("FirebaseStorageService: Token error: " . $data['error'] . " - " . ($data['error_description'] ?? ''));
        }
        return null;
    }

    private static function base64UrlEncode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    /**
     * Upload a local file to Google Cloud Storage (Firebase Storage) at the given bucket and object path.
     * Overwrites existing object so the same download URL can be used.
     *
     * @param string $localFilePath Path to the file to upload
     * @param string $bucket GCS bucket name (e.g. project-id.appspot.com)
     * @param string $objectPath Object path in bucket (e.g. properties/123/img_123.jpg)
     * @param string $contentType MIME type (e.g. image/jpeg)
     * @param string|null $credentialsPath Path to service account JSON; null = use GOOGLE_APPLICATION_CREDENTIALS
     * @return bool True on success, false on failure
     */
    public static function uploadFile($localFilePath, $bucket, $objectPath, $contentType = 'image/jpeg', $credentialsPath = null) {
        if (!file_exists($localFilePath) || !is_readable($localFilePath)) {
            error_log("FirebaseStorageService: Local file not found or not readable: {$localFilePath}");
            return false;
        }
        if (!function_exists('curl_init')) {
            error_log("FirebaseStorageService: cURL required for upload");
            return false;
        }
        $credentialsPath = $credentialsPath ?: (getenv('GOOGLE_APPLICATION_CREDENTIALS') ?: (defined('GOOGLE_APPLICATION_CREDENTIALS') ? GOOGLE_APPLICATION_CREDENTIALS : ''));
        if (empty($credentialsPath)) {
            error_log("FirebaseStorageService: No credentials path");
            return false;
        }
        $accessToken = self::getAccessToken($credentialsPath);
        if (empty($accessToken)) {
            error_log("FirebaseStorageService: Failed to get access token");
            return false;
        }
        // GCS API: name = object path, URL-encoded (e.g. properties%2F123%2Fimg.jpg)
        $url = 'https://www.googleapis.com/upload/storage/v1/b/' . rawurlencode($bucket) . '/o?uploadType=media&name=' . rawurlencode($objectPath);
        $fileContent = file_get_contents($localFilePath);
        if ($fileContent === false) {
            error_log("FirebaseStorageService: Failed to read file: {$localFilePath}");
            return false;
        }
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $fileContent,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $accessToken,
                'Content-Type: ' . $contentType,
                'Content-Length: ' . strlen($fileContent)
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 60,
            CURLOPT_SSL_VERIFYPEER => true
        ]);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);
        if ($response === false) {
            error_log("FirebaseStorageService: cURL error: {$curlError}");
            return false;
        }
        if ($httpCode < 200 || $httpCode >= 300) {
            $preview = strlen($response) > 200 ? substr($response, 0, 200) . '...' : $response;
            error_log("FirebaseStorageService: Upload failed HTTP {$httpCode} bucket={$bucket} object={$objectPath}: {$preview}");
            return false;
        }
        return true;
    }

    /**
     * Upload a local file to the Firebase Storage path from the given download URL (overwrites existing).
     * Use this when the file is already watermarked. Does not apply watermark.
     *
     * @param string $localFilePath Path to the file to upload
     * @param string $firebaseUrl Firebase download URL (used to get bucket and object path)
     * @param string|null $credentialsPath Optional credentials path
     * @return bool True on success
     */
    public static function uploadFileToFirebaseUrl($localFilePath, $firebaseUrl, $credentialsPath = null) {
        if (!file_exists($localFilePath)) {
            error_log("FirebaseStorageService::uploadFileToFirebaseUrl: File not found: {$localFilePath}");
            return false;
        }
        $parsed = self::parseFirebaseUrl($firebaseUrl);
        if (!$parsed) {
            error_log("FirebaseStorageService::uploadFileToFirebaseUrl: Could not parse Firebase URL (check URL format)");
            return false;
        }
        $imageInfo = @getimagesize($localFilePath);
        $contentType = isset($imageInfo['mime']) ? $imageInfo['mime'] : 'image/jpeg';
        $bucket = 'my-chat-box-ec5b0.firebasestorage.app';
        return self::uploadFile($localFilePath, $bucket, $parsed['object'], $contentType, $credentialsPath);
    }

    /**
     * Download image from Firebase URL, apply watermark locally, then re-upload to the same Firebase path.
     * Keeps the same Firebase URL so the DB does not need to change.
     *
     * @param string $tempFilePath Local path to the downloaded image (will be watermarked in place)
     * @param string $firebaseUrl Original Firebase download URL (used to get bucket and object path)
     * @param string|null $credentialsPath Optional credentials path
     * @return bool True if watermark and re-upload succeeded
     */
    public static function watermarkAndReuploadToFirebase($tempFilePath, $firebaseUrl, $credentialsPath = null) {
        if (!file_exists($tempFilePath)) {
            error_log("FirebaseStorageService::watermarkAndReuploadToFirebase: File not found: {$tempFilePath}");
            return false;
        }
        $parsed = self::parseFirebaseUrl($firebaseUrl);
        if (!$parsed) {
            error_log("FirebaseStorageService::watermarkAndReuploadToFirebase: Could not parse Firebase URL");
            return false;
        }
        if (!class_exists('WatermarkService')) {
            @require_once __DIR__ . '/../config/moderation.php';
            @require_once __DIR__ . '/WatermarkService.php';
        }
        if (!class_exists('WatermarkService')) {
            error_log("FirebaseStorageService: WatermarkService not available");
            return false;
        }
        if (!WatermarkService::addWatermark($tempFilePath)) {
            error_log("FirebaseStorageService: Watermark failed for: {$tempFilePath}");
            return false;
        }
        return self::uploadFileToFirebaseUrl($tempFilePath, $firebaseUrl, $credentialsPath);
    }
}
