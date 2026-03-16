<?php
require_once '../config.php';

header('Content-Type: application/json');

if (!isAdminLoggedIn()) {
    http_response_code(403);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'get_banners') {
        $stmt = $pdo->query('SELECT * FROM banners ORDER BY position');
        echo json_encode($stmt->fetchAll());
        exit;
    }

    if ($action === 'upload_banner') {
        if (!isset($_FILES['image'])) {
            http_response_code(400);
            echo json_encode(['error' => 'No image uploaded']);
            exit;
        }

        $file = $_FILES['image'];
        $uploadDir = '../../uploads/banners/';

        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $filename = uniqid() . '_' . basename($file['name']);
        $filepath = $uploadDir . $filename;

        if (move_uploaded_file($file['tmp_name'], $filepath)) {
            $title = $_POST['title'] ?? 'Banner';
            $link = $_POST['link'] ?? '';
            $position = $_POST['position'] ?? 0;

            $stmt = $pdo->prepare('INSERT INTO banners (title, image_path, link, position) VALUES (?, ?, ?, ?)');
            $stmt->execute([$title, 'uploads/banners/' . $filename, $link, $position]);

            echo json_encode(['success' => true, 'id' => $pdo->lastInsertId(), 'path' => 'uploads/banners/' . $filename]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to upload image']);
        }
        exit;
    }

    if ($action === 'delete_banner') {
        $id = $_POST['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'ID required']);
            exit;
        }

        $stmt = $pdo->prepare('SELECT image_path FROM banners WHERE id = ?');
        $stmt->execute([$id]);
        $banner = $stmt->fetch();

        if ($banner && file_exists('../../' . $banner['image_path'])) {
            unlink('../../' . $banner['image_path']);
        }

        $deleteStmt = $pdo->prepare('DELETE FROM banners WHERE id = ?');
        $deleteStmt->execute([$id]);

        echo json_encode(['success' => true]);
        exit;
    }

    if ($action === 'update_banner_position') {
        $id = $_POST['id'] ?? null;
        $position = $_POST['position'] ?? 0;

        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'ID required']);
            exit;
        }

        $stmt = $pdo->prepare('UPDATE banners SET position = ? WHERE id = ?');
        $stmt->execute([$position, $id]);

        echo json_encode(['success' => true]);
        exit;
    }
}

http_response_code(400);
echo json_encode(['error' => 'Invalid request']);
?>
