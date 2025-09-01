#!/usr/bin/env php
<?php

require '_client.php';

// Check required environment variables
$trunk_sid = getenv('TRUNK_SID');
$exophone = getenv('EXOPHONE');

if (!$trunk_sid) {
    echo "Error: TRUNK_SID is required. Set it in your .env file after creating a trunk.\n";
    exit(1);
}

if (!$exophone) {
    echo "Warning: EXOPHONE is not set. Skipping trunk alias configuration.\n";
    exit(0);
}

// Set trunk alias
echo "Setting trunk alias $exophone for trunk $trunk_sid...\n";
$result = exo_post("/trunks/$trunk_sid/settings", [
    'settings' => [['name' => 'trunk_external_alias', 'value' => $exophone]]
]);
echo "Trunk alias set successfully!\n"; 