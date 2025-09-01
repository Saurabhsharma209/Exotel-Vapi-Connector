#!/usr/bin/env php
<?php

require '_client.php';

// Check required environment variables
$trunk_sid = getenv('TRUNK_SID');
$dest_ip = getenv('TRUNK_DEST_IP');
$dest_port = getenv('TRUNK_DEST_PORT');

if (!$trunk_sid) {
    echo "Error: TRUNK_SID is required. Set it in your .env file after creating a trunk.\n";
    exit(1);
}

if (!$dest_ip || !$dest_port) {
    echo "Error: TRUNK_DEST_IP and TRUNK_DEST_PORT are required. Set them in your .env file.\n";
    exit(1);
}

// Add TLS destination
$dest = "$dest_ip:$dest_port;transport=tls";
echo "Adding TLS destination $dest to trunk $trunk_sid...\n";
$result = exo_post("/trunks/$trunk_sid/destination-uris", [
    'destinations' => [['destination' => $dest]]
]);
echo "TLS destination added successfully!\n"; 