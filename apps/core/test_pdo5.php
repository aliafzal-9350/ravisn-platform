<?php

$dsn = 'mysql:host=gateway01.ap-southeast-1.prod.aws.tidbcloud.com;port=4000;dbname=test';
$baseOptions = [
    1009 => 'isrgrootx1.pem',
    1014 => false,
];
try {
    $pdo = new PDO($dsn, '2DPi4auD4Nkeihe.root', 'ZcnfNOAR0VTTrqWY', $baseOptions);
    echo "Relative slashes works!\n";
} catch (PDOException $e) {
    echo 'Relative slashes fails: '.$e->getMessage()."\n";
}
