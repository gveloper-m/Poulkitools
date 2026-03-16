<?php
require_once '../config.php';

header('Content-Type: text/csv');
header('Content-Disposition: attachment; filename="orders_' . date('Y-m-d_H-i-s') . '.csv"');

if (!isAdminLoggedIn()) {
    http_response_code(403);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$dateFrom = $_GET['date_from'] ?? null;
$dateTo = $_GET['date_to'] ?? null;

$query = 'SELECT id, order_code, customer_name, customer_email, customer_phone, total_amount, status, tracking_code, created_at FROM orders WHERE 1=1';
$params = [];

if ($dateFrom) {
    $query .= ' AND DATE(created_at) >= ?';
    $params[] = $dateFrom;
}

if ($dateTo) {
    $query .= ' AND DATE(created_at) <= ?';
    $params[] = $dateTo;
}

$query .= ' ORDER BY created_at DESC';

$stmt = $pdo->prepare($query);
$stmt->execute($params);
$orders = $stmt->fetchAll();

$output = fopen('php://output', 'w');

$headers = ['Order Code', 'Customer Name', 'Email', 'Phone', 'Total Amount', 'Status', 'Tracking Code', 'Order Date'];
fputcsv($output, $headers);

foreach ($orders as $order) {
    fputcsv($output, [
        $order['order_code'],
        $order['customer_name'],
        $order['customer_email'],
        $order['customer_phone'],
        $order['total_amount'],
        $order['status'],
        $order['tracking_code'],
        $order['created_at']
    ]);
}

fclose($output);
?>
