<?php
/**
 * Generate Password Hash
 * Run this to generate the correct password hash for Admin@123456
 */

$password = 'Admin@123456';
$hash = password_hash($password, PASSWORD_DEFAULT);

echo "Password: " . $password . "\n";
echo "Hash: " . $hash . "\n";
echo "\n";
echo "Verify: " . (password_verify($password, $hash) ? 'YES' : 'NO') . "\n";

// Also test the old hash
$oldHash = '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
echo "\nOld hash verification: " . (password_verify($password, $oldHash) ? 'YES' : 'NO') . "\n";
