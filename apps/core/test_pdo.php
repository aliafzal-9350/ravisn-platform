<?php

$dsn = 'mysql:host=gateway01.ap-southeast-1.prod.aws.tidbcloud.com;port=4000;dbname=test';
$baseOptions = [
    1009 => "C:\Users\Style Foam\Desktop\whatsapp marketing\zeromsg-main\isrgrootx1.pem",
    1014 => false,
];

$testOptions = [
    8 => 0,
    3 => 2,
    11 => 0,
    17 => false,
    20 => false,
];

foreach ($testOptions as $k => $v) {
    try {
        $opts = $baseOptions + [$k => $v];
        $pdo = new PDO($dsn, '2DPi4auD4Nkeihe.root', 'ZcnfNOAR0VTTrqWY', $opts);
        echo "Option $k works!\n";
    } catch (PDOException $e) {
        echo "Option $k fails: ".$e->getMessage()."\n";
    }
}
