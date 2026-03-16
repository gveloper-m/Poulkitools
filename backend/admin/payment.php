<?php
require_once '../config.php';

header('Content-Type: application/json');

if (!isAdminLoggedIn()) {
    http_response_code(403);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// Ensure cost column exists (migration on first run)
try {
    $pdo->exec('ALTER TABLE payment_methods ADD COLUMN cost DECIMAL(10,2) DEFAULT 0 AFTER description');
} catch (Exception $e) {
    // Column likely already exists, ignore error
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'get_payment_methods') {
        try {
            $stmt = $pdo->query('SELECT * FROM payment_methods ORDER BY name');
            echo json_encode($stmt->fetchAll());
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        }
        exit;
    }

    if ($action === 'create_payment') {
        $name = $_POST['name'] ?? '';
        $description = $_POST['description'] ?? '';
        $cost = floatval($_POST['cost'] ?? 0);

        if (!$name) {
            http_response_code(400);
            echo json_encode(['error' => 'Name required']);
            exit;
        }

        try {
            $stmt = $pdo->prepare('INSERT INTO payment_methods (name, description, cost) VALUES (?, ?, ?)');
            $stmt->execute([$name, $description, $cost]);

            echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        }
        exit;
    }

    if ($action === 'update_payment') {
        $id = $_POST['id'] ?? null;
        $name = $_POST['name'] ?? '';
        $description = $_POST['description'] ?? '';

        if (!$id || !$name) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid data']);
            exit;
        }

        try {
            $stmt = $pdo->prepare('UPDATE payment_methods SET name = ?, description = ? WHERE id = ?');
            $stmt->execute([$name, $description, $id]);

            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        }
        exit;
    }

    if ($action === 'delete_payment') {
        $id = $_POST['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'ID required']);
            exit;
        }

        try {
            $stmt = $pdo->prepare('DELETE FROM payment_methods WHERE id = ?');
            $stmt->execute([$id]);

            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        }
        exit;
    }
}

http_response_code(400);
echo json_encode(['error' => 'Invalid request']);
?>
