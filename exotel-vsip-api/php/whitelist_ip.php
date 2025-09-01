#!/usr/bin/env php
<?php

require '_client.php';

// Check required environment variables
$trunk_sid = getenv('TRUNK_SID');
$whitelist_ip = getenv('WHITELIST_IP');
$whitelist_mask = (int)(getenv('WHITELIST_MASK') ?: 32);

if (!$trunk_sid) {
    echo "Error: TRUNK_SID is required. Set it in your .env file after creating a trunk.\n";
    exit(1);
}

if (!$whitelist_ip) {
    echo "Error: WHITELIST_IP is required. Set it in your .env file.\n";
    exit(1);
}

// Whitelist IP
echo "Whitelisting IP $whitelist_ip/$whitelist_mask for trunk $trunk_sid...\n";
$result = exo_post("/trunks/$trunk_sid/whitelisted-ips", [
    'ip' => $whitelist_ip,
    'mask' => $whitelist_mask
]);
echo "IP whitelisted successfully!\n"; 