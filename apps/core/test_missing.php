<?php

try {
    $pdo = new PDO('mysql:host=gateway01.ap-southeast-1.prod.aws.tidbcloud.com;port=4000;dbname=test', '2DPi4auD4Nkeihe.root', 'ZcnfNOAR0VTTrqWY', [
        1014 => false,
        1009 => 'C:/does_not_exist.pem',
    ]);
    echo "Connected\n";
} catch (PDOException $e) {
    echo 'Error: '.$e->getMessage()."\n";
}
