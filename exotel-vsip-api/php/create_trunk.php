#!/usr/bin/env php
<?php

require '_client.php';

// Create trunk with environment variables
$trunk_data = [
    'trunk_name' => getenv('TRUNK_NAME') ?: 'my_ai_trunk',
    'nso_code' => getenv('NSO_CODE') ?: 'ANY-ANY',
    'domain_name' => getenv('EXO_ACCOUNT_SID') . '.pstn.exotel.com'
];

echo "Creating trunk...\n";
$result = exo_post('/trunks', $trunk_data);
echo "Trunk created successfully!\n"; 