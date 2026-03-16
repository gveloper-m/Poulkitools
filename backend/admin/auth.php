<?php
require_once '../config.php';

// Set JSON header immediately
header('Content-Type: application/json');

// Disable error display to prevent HTML in JSON response
ini_set('display_errors', 0);
error_reporting(E_ALL);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'login') {
        $username = $_POST['username'] ?? '';
        $password = $_POST['password'] ?? '';

        if (empty($username) || empty($password)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Username and password required']);
            exit;
        }

        try {
            $stmt = $pdo->prepare('SELECT admin_username, admin_password FROM settings WHERE id = 1');
            if (!$stmt) {
                throw new Exception('Database prepare failed');
            }
            
            $stmt->execute();
            $settings = $stmt->fetch();

            if ($settings && $settings['admin_username'] === $username && password_verify($password, $settings['admin_password'])) {
                $_SESSION['admin_logged_in'] = true;
                $_SESSION['admin_username'] = $username;
                http_response_code(200);
                echo json_encode(['success' => true]);
            } else {
                http_response_code(401);
                echo json_encode(['success' => false, 'error' => 'Invalid credentials']);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
        }
        exit;
    }

    if ($action === 'logout') {
        session_destroy();
        http_response_code(200);
        echo json_encode(['success' => true]);
        exit;
    }
}

http_response_code(400);
echo json_encode(['success' => false, 'error' => 'Invalid request']);
?>
