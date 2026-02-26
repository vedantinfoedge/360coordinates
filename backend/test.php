<?php
header("Content-Type: application/json");

$host     = "sql101.infinityfree.com";
$username = "epiz_XXXXXXXX";
$password = "your_password";
$database = "epiz_XXXXXXXX_projectdb";

$conn = new mysqli($host, $username, $password, $database);

if ($conn->connect_error) {
    echo json_encode(['status' => 'error', 'message' => $conn->connect_error]);
} else {
    echo json_encode(['status' => 'success', 'message' => 'Connected!']);
}

$conn->close();
?>
