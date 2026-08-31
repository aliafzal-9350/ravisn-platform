<?php

$dsn = 'mysql:host=gateway01.ap-southeast-1.prod.aws.tidbcloud.com;port=4000;dbname=test';
$path = str_replace(DIRECTORY_SEPARATOR, '/', __DIR__.'/isrgrootx1.pem');
$baseOptions = [
    1009 => $path,
    1014 => false,
];
try {
    $pdo = new PDO($dsn, '2DPi4auD4Nkeihe.root', 'ZcnfNOAR0VTTrqWY', $baseOptions);
    echo "Forward slashes works!\n";
} catch (PDOException $e) {
    echo 'Forward slashes fails: '.$e->getMessage()."\n";
}
