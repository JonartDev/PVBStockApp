<?php
header("Content-Type: text/plain"); // show raw output

$curl = curl_init();

curl_setopt_array($curl, array(
    CURLOPT_URL => 'https://bot-1-8at8.onrender.com/api/discord',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT => 0,
    CURLOPT_CUSTOMREQUEST => 'GET',
));

$response = curl_exec($curl);
$error = curl_error($curl);
curl_close($curl);

if ($error) {
    echo "cURL Error: " . $error;
} else {
    echo $response; // show the raw API output
}
?>