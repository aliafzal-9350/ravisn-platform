<?php

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make("Illuminate\Contracts\Console\Kernel")->bootstrap();

config(['database.connections.mysql.options' => [
    PDO::MYSQL_ATTR_SSL_CA => base_path('isrgrootx1.pem'),
    PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT => false,
]]);

try {
    $pdo = DB::connection('mysql')->getPdo();
    echo "Connected Laravel!\n";
} catch (Exception $e) {
    echo 'Laravel error: '.(string) $e."\n";
}
