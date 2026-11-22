<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/config.php';

function respond($success, $message = '', $data = null, $status = 200) {
    http_response_code($status);
    $result = ['success' => $success, 'message' => $message];
    if ($data !== null) $result['data'] = $data;
    echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
function read_json() {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!is_array($data)) respond(false, 'Data yang dikirim tidak valid.', null, 400);
    return $data;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? '';
$allowedStatuses = ['Menunggu', 'Diproses', 'Siap diambil', 'Selesai'];

try {
    if ($method === 'GET' && $action === 'dashboard') {
        $stats = $pdo->query("SELECT COUNT(*) AS total_orders,
          COALESCE(SUM(status = 'Menunggu'), 0) AS waiting_orders,
          COALESCE(SUM(status = 'Diproses'), 0) AS processing_orders,
          COALESCE(SUM(status = 'Siap diambil'), 0) AS ready_orders,
          COALESCE(SUM(status = 'Selesai'), 0) AS completed_orders
          FROM queue_orders WHERE order_date = CURDATE()")->fetch();
        $orders = $pdo->query("SELECT id, queue_no, customer_name, order_details, status, order_date, created_at
          FROM queue_orders WHERE order_date = CURDATE() ORDER BY queue_no DESC LIMIT 100")->fetchAll();
        respond(true, 'Data antrean berhasil dimuat.', ['stats' => $stats, 'orders' => $orders]);
    }

    if ($method === 'POST') {
        $input = read_json();
        $action = $input['action'] ?? '';

        if ($action === 'create_order') {
            $name = trim((string)($input['customer_name'] ?? ''));
            $details = trim((string)($input['order_details'] ?? ''));
            if ($name === '') respond(false, 'Nama pemesan wajib diisi.', null, 422);
            if ($details === '') respond(false, 'Pesanan wajib diisi.', null, 422);
            if (mb_strlen($name) > 80 || mb_strlen($details) > 500) respond(false, 'Nama atau pesanan terlalu panjang.', null, 422);

            $pdo->beginTransaction();
            // Baris sequence dikunci agar dua pesanan bersamaan tidak mendapat nomor yang sama.
            $pdo->exec("INSERT IGNORE INTO queue_sequences (order_date, last_number) VALUES (CURDATE(), 0)");
            $sequence = $pdo->query("SELECT last_number FROM queue_sequences WHERE order_date = CURDATE() FOR UPDATE")->fetch();
            $nextNumber = ((int)$sequence['last_number']) + 1;
            $updateSequence = $pdo->prepare("UPDATE queue_sequences SET last_number = ? WHERE order_date = CURDATE()");
            $updateSequence->execute([$nextNumber]);

            $insert = $pdo->prepare("INSERT INTO queue_orders (queue_no, customer_name, order_details, status, order_date) VALUES (?, ?, ?, 'Menunggu', CURDATE())");
            $insert->execute([$nextNumber, $name, $details]);
            $id = (int)$pdo->lastInsertId();
            $pdo->commit();
            respond(true, 'Pesanan berhasil ditambahkan ke antrean.', [
                'id' => $id,
                'queue_no' => $nextNumber,
                'queue_label' => 'A' . str_pad((string)$nextNumber, 3, '0', STR_PAD_LEFT),
                'customer_name' => $name,
                'order_details' => $details,
                'status' => 'Menunggu',
                'created_at' => date('Y-m-d H:i:s')
            ]);
        }

        if ($action === 'update_status') {
            $id = (int)($input['id'] ?? 0);
            $status = trim((string)($input['status'] ?? ''));
            if ($id < 1 || !in_array($status, $allowedStatuses, true)) respond(false, 'ID atau status antrean tidak valid.', null, 422);
            $stmt = $pdo->prepare("UPDATE queue_orders SET status = ? WHERE id = ? AND order_date = CURDATE()");
            $stmt->execute([$status, $id]);
            if ($stmt->rowCount() < 1) {
                $check = $pdo->prepare("SELECT id, status FROM queue_orders WHERE id = ? AND order_date = CURDATE()");
                $check->execute([$id]);
                $existing = $check->fetch();
                if (!$existing) respond(false, 'Pesanan tidak ditemukan.', null, 404);
                if ($existing['status'] !== $status) respond(false, 'Status pesanan gagal diperbarui.', null, 500);
            }
            respond(true, 'Status antrean berhasil diperbarui.');
        }

        if ($action === 'delete_order') {
            $id = (int)($input['id'] ?? 0);
            if ($id < 1) respond(false, 'ID antrean tidak valid.', null, 422);
            $stmt = $pdo->prepare("DELETE FROM queue_orders WHERE id = ? AND order_date = CURDATE()");
            $stmt->execute([$id]);
            if ($stmt->rowCount() < 1) respond(false, 'Pesanan tidak ditemukan.', null, 404);
            respond(true, 'Pesanan berhasil dihapus.');
        }
    }

    respond(false, 'Aksi tidak dikenali.', null, 404);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log('Antrean Kantin API: ' . $e->getMessage());
    respond(false, 'Terjadi kesalahan pada server. Periksa konfigurasi dan struktur database.', null, 500);
}
