<?php
// === Allowed website origin ===
// ✅ change this to your real site domain:
$allowed_origin = "https://plants-vs-brainbot-stock-notifier-ryt4lvtlp0.edgeone.app";

// === Check the Origin header ===
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin === $allowed_origin) {
    header("Access-Control-Allow-Origin: $allowed_origin");
} else {
    http_response_code(403);
    echo json_encode(["error" => "Forbidden: Invalid origin"]);
    exit();
}

header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json");

// === Handle preflight OPTIONS request ===
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// === Supabase API Request ===
$curl = curl_init();
curl_setopt_array($curl, [
    CURLOPT_URL => "https://vextbzatpprnksyutbcp.supabase.co/rest/v1/game_stock?select=*&game=eq.plantsvsbrainrots&type=eq.seeds&active=eq.true&order=created_at.desc",
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT => 10,
    CURLOPT_HTTPHEADER => [
        "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZleHRiemF0cHBybmtzeXV0YmNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NjYzMTIsImV4cCI6MjA2OTQ0MjMxMn0.apcPdBL5o-t5jK68d9_r9C7m-8H81NQbTXK0EW0o800",
        "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZleHRiemF0cHBybmtzeXV0YmNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NjYzMTIsImV4cCI6MjA2OTQ0MjMxMn0.apcPdBL5o-t5jK68d9_r9C7m-8H81NQbTXK0EW0o800"
    ]
]);

$response = curl_exec($curl);

if (curl_errno($curl)) {
    echo json_encode(["error" => curl_error($curl)]);
} else {
    echo $response;
}

curl_close($curl);
?>