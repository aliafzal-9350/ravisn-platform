<?php

$dsn = 'mysql:host=gateway01.ap-southeast-1.prod.aws.tidbcloud.com;port=4000;dbname=test';
$baseOptions = [
    1009 => __DIR__.'/isrgrootx1.pem',
    1014 => false,
];
try {
    $pdo = new PDO($dsn, '2DPi4auD4Nkeihe.root', 'ZcnfNOAR0VTTrqWY', $baseOptions);
    echo "Base options works!\n";
} catch (PDOException $e) {
    echo 'Base options fails: '.$e->getMessage()."\n";
}
