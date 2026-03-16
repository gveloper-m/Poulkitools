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

    if ($action === 'get_shipping_methods') {
        $stmt = $pdo->query('SELECT * FROM shipping_methods ORDER BY name');
        echo json_encode($stmt->fetchAll());
        exit;
    }

    if ($action === 'create_shipping') {
        $name = $_POST['name'] ?? '';
        $description = $_POST['description'] ?? '';
        $cost = $_POST['cost'] ?? 0;

        if (!$name) {
            http_response_code(400);
            echo json_encode(['error' => 'Name required']);
            exit;
        }

        $stmt = $pdo->prepare('INSERT INTO shipping_methods (name, description, cost) VALUES (?, ?, ?)');
        $stmt->execute([$name, $description, $cost]);

        echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
        exit;
    }

    if ($action === 'update_shipping') {
        $id = $_POST['id'] ?? null;
        $name = $_POST['name'] ?? '';
        $description = $_POST['description'] ?? '';
        $cost = $_POST['cost'] ?? 0;

        if (!$id || !$name) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid data']);
            exit;
        }

        $stmt = $pdo->prepare('UPDATE shipping_methods SET name = ?, description = ?, cost = ? WHERE id = ?');
        $stmt->execute([$name, $description, $cost, $id]);

        echo json_encode(['success' => true]);
        exit;
    }

    if ($action === 'delete_shipping') {
        $id = $_POST['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'ID required']);
            exit;
        }

        $stmt = $pdo->prepare('DELETE FROM shipping_methods WHERE id = ?');
        $stmt->execute([$id]);

        echo json_encode(['success' => true]);
        exit;
    }
}

http_response_code(400);
echo json_encode(['error' => 'Invalid request']);
?>
