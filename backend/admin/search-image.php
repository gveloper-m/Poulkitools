<?php
require_once '../config.php';

header('Content-Type: application/json; charset=utf-8');

// Auto-migrate: Add search_image column if it doesn't exist
try {
    $pdo->exec("ALTER TABLE settings ADD COLUMN search_image VARCHAR(255) AFTER home_description");
} catch (PDOException $e) {
    // Column likely already exists
}

if (!isAdminLoggedIn()) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'upload_search_image') {
        try {
            if (!isset($_FILES['image'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'No image uploaded']);
                exit;
            }

            $file = $_FILES['image'];
            $uploadDir = '../../uploads/search/';

            if (!is_dir($uploadDir)) {
                @mkdir($uploadDir, 0755, true);
            }

            // Delete old search image if it exists
            $settings = getSettings();
            if (!empty($settings['search_image']) && file_exists('../../' . $settings['search_image'])) {
                @unlink('../../' . $settings['search_image']);
            }

            $filename = uniqid() . '_' . basename($file['name']);
            $filepath = $uploadDir . $filename;

            if (move_uploaded_file($file['tmp_name'], $filepath)) {
                $imagePath = 'uploads/search/' . $filename;

                $stmt = $pdo->prepare('UPDATE settings SET search_image = ? WHERE id = 1');
                $stmt->execute([$imagePath]);

                echo json_encode(['success' => true, 'path' => $imagePath]);
            } else {
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => 'Failed to upload image']);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        exit;
    }

    if ($action === 'delete_search_image') {
        try {
            $settings = getSettings();
            
            if (!empty($settings['search_image']) && file_exists('../../' . $settings['search_image'])) {
                @unlink('../../' . $settings['search_image']);
            }

            $stmt = $pdo->prepare('UPDATE settings SET search_image = NULL WHERE id = 1');
            $stmt->execute();

            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        exit;
    }

    if ($action === 'get_search_image') {
        try {
            $settings = getSettings();
            echo json_encode([
                'success' => true,
                'search_image' => !empty($settings['search_image']) ? $settings['search_image'] : null
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        exit;
    }
}

http_response_code(400);
echo json_encode(['success' => false, 'error' => 'Invalid request']);
?>
