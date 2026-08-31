$path = str_replace('\\', '/', base_path('isrgrootx1.pem'));
config(["database.connections.mysql.options" => [
    PDO::MYSQL_ATTR_SSL_CA => $path,
    PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT => false
]]);
try {
    $pdo = DB::connection("mysql")->getPdo();
    echo "Connected Laravel Forward Slashes!\n";
} catch (Exception $e) {
    echo "Laravel error: " . $e->getMessage() . "\n";
}

