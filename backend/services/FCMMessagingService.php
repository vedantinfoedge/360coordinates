<?php
/**
 * Firebase Cloud Messaging (FCM) Service
 * Sends push notifications to mobile devices via FCM HTTP v1 API.
 * Uses same Firebase project and service account as Storage/Chat.
 */

class FCMMessagingService {

    /**
     * Get OAuth2 access token for FCM (firebase.messaging scope).
     *
     * @param string|null $credentialsPath Path to service account JSON; null = use config
     * @return string|null Access token or null on failure
     */
    public static function getAccessToken($credentialsPath = null) {
        $credentialsPath = $credentialsPath ?: (defined('FCM_CREDENTIALS_PATH') ? FCM_CREDENTIALS_PATH : null);
        if (empty($credentialsPath)) {
            $credentialsPath = getenv('GOOGLE_APPLICATION_CREDENTIALS') ?: (defined('GOOGLE_APPLICATION_CREDENTIALS') ? GOOGLE_APPLICATION_CREDENTIALS : __DIR__ . '/../firebase-key.json');
        }
        if (!file_exists($credentialsPath) || !is_readable($credentialsPath)) {
            error_log("FCMMessagingService: Credentials file not found or not readable: {$credentialsPath}");
            return null;
        }
        $json = @file_get_contents($credentialsPath);
        if ($json === false) {
            return null;
        }
        $creds = @json_decode($json, true);
        if (!$creds || empty($creds['client_email']) || empty($creds['private_key'])) {
            error_log("FCMMessagingService: Invalid credentials JSON");
            return null;
        }
        $now = time();
        $payload = [
            'iss' => $creds['client_email'],
            'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
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
            error_log("FCMMessagingService: Failed to load private key");
            return null;
        }
        $signature = '';
        if (!openssl_sign($signatureInput, $signature, $privateKey, OPENSSL_ALGO_SHA256)) {
            error_log("FCMMessagingService: Failed to sign JWT");
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
            error_log("FCMMessagingService: Failed to get access token (request failed)");
            return null;
        }
        $data = @json_decode($response, true);
        if (isset($data['access_token'])) {
            return $data['access_token'];
        }
        if (isset($data['error'])) {
            error_log("FCMMessagingService: Token error: " . $data['error'] . " - " . ($data['error_description'] ?? ''));
        }
        return null;
    }

    private static function base64UrlEncode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    /**
     * Send push notification to a single device token.
     *
     * @param string $deviceToken FCM device token
     * @param string $title Notification title
     * @param string $body Notification body
     * @param array $data Optional key-value data payload for deep linking
     * @return bool True on success
     */
    public static function sendToToken($deviceToken, $title, $body, $data = []) {
        if (empty($deviceToken)) {
            error_log("FCMMessagingService: Empty device token");
            return false;
        }
        $projectId = defined('FCM_PROJECT_ID') ? FCM_PROJECT_ID : 'my-chat-box-ec5b0';
        $accessToken = self::getAccessToken();
        if (empty($accessToken)) {
            error_log("FCMMessagingService: Failed to get access token");
            return false;
        }
        $url = 'https://fcm.googleapis.com/v1/projects/' . $projectId . '/messages:send';
        $message = [
            'message' => [
                'token' => $deviceToken,
                'notification' => [
                    'title' => $title,
                    'body' => $body
                ]
            ]
        ];
        if (!empty($data)) {
            $message['message']['data'] = [];
            foreach ($data as $k => $v) {
                $message['message']['data'][(string)$k] = (string)$v;
            }
        }
        $jsonBody = json_encode($message);
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $jsonBody,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $accessToken,
                'Content-Type: application/json'
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_SSL_VERIFYPEER => true
        ]);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);
        if ($response === false) {
            error_log("FCMMessagingService: cURL error: {$curlError}");
            return false;
        }
        if ($httpCode < 200 || $httpCode >= 300) {
            error_log("FCMMessagingService: FCM API HTTP {$httpCode}: " . substr($response, 0, 500));
            return false;
        }
        return true;
    }

    /**
     * Send push notification to all device tokens for a user.
     *
     * @param int $userId User ID
     * @param string $title Notification title
     * @param string $body Notification body
     * @param array $data Optional key-value data payload for deep linking
     * @return int Number of devices successfully notified
     */
    public static function sendToUser($userId, $title, $body, $data = []) {
        if (!$userId) {
            return 0;
        }
        $db = getDB();
        $stmt = $db->prepare("SELECT device_token FROM device_tokens WHERE user_id = ?");
        $stmt->execute([$userId]);
        $tokens = $stmt->fetchAll(PDO::FETCH_COLUMN);
        $sent = 0;
        foreach ($tokens as $token) {
            if (self::sendToToken($token, $title, $body, $data)) {
                $sent++;
            }
        }
        return $sent;
    }
}
