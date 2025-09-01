#!/usr/bin/env php
<?php

require '_client.php';

// Check required environment variables
$trunk_sid = getenv('TRUNK_SID');
$did_number = getenv('DID_NUMBER');

if (!$trunk_sid) {
    echo "Error: TRUNK_SID is required. Set it in your .env file after creating a trunk.\n";
    exit(1);
}

if (!$did_number) {
    echo "Error: DID_NUMBER is required. Set it in your .env file.\n";
    exit(1);
}

// Map DID to trunk
echo "Mapping DID $did_number to trunk $trunk_sid...\n";
$result = exo_post("/trunks/$trunk_sid/phone-numbers", ['phone_number' => $did_number]);
echo "DID mapped successfully!\n"; 