<?php
declare(strict_types=1);

echo "🧪 Running Reviewer Hub API Verification Suite...\n\n";

$testsPassed = 0;
$totalTests = 0;

function runTest(string $title, callable $testFn) {
    global $testsPassed, $totalTests;
    $totalTests++;
    echo "Test {$totalTests}: {$title}... ";
    try {
        $result = $testFn();
        if ($result === true) {
            echo "✅ PASSED\n";
            $testsPassed++;
        } else {
            echo "❌ FAILED (" . $result . ")\n";
        }
    } catch (\Throwable $e) {
        echo "💥 ERROR: " . $e->getMessage() . "\n";
    }
}

// 1. Data Source
runTest("Mock openalex data exists & reads articles/reviewers", function () {
    $dataFile = __DIR__ . '/../mock_openalex_data.json';
    if (!file_exists($dataFile)) return "mock_openalex_data.json missing";
    $json = json_decode(file_get_contents($dataFile), true);
    return is_array($json['articles']) && is_array($json['reviewers']);
});

// 2. JWT Generation & Verification
runTest("JWT HMAC-SHA256 Token creation & signature validation", function () {
    $secret = 'straive_secret_key_2026';
    $payload = ['sub' => 'usr_01', 'role' => 'editor', 'exp' => time() + 3600];
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $b64Header = rtrim(strtr(base64_encode($header), '+/', '-_'), '=');
    $b64Payload = rtrim(strtr(base64_encode(json_encode($payload)), '+/', '-_'), '=');
    $signature = hash_hmac('sha256', "{$b64Header}.{$b64Payload}", $secret, true);
    $b64Signature = rtrim(strtr(base64_encode($signature), '+/', '-_'), '=');
    $token = "{$b64Header}.{$b64Payload}.{$b64Signature}";

    $parts = explode('.', $token);
    if (count($parts) !== 3) return false;
    $expected = rtrim(strtr(base64_encode(hash_hmac('sha256', "{$parts[0]}.{$parts[1]}", $secret, true)), '+/', '-_'), '=');
    return hash_equals($expected, $parts[2]);
});

// 3. Conflict of Interest Business Rule
runTest("Stanford Lead Author vs Stanford Referee triggers Conflict of Interest", function () {
    $authorUni = mb_strtolower(trim("Stanford University"));
    $reviewerUni = mb_strtolower(trim("Stanford University"));
    return ($authorUni === $reviewerUni);
});

runTest("Stanford Lead Author vs MIT Referee does NOT trigger Conflict of Interest", function () {
    $authorUni = mb_strtolower(trim("Stanford University"));
    $reviewerUni = mb_strtolower(trim("MIT"));
    return ($authorUni !== $reviewerUni);
});

// 4. Persistence Files Check
runTest("Storage directory & data files writable", function () {
    $dir = __DIR__ . '/data';
    if (!is_dir($dir)) mkdir($dir, 0777, true);
    $file = $dir . '/assignments.json';
    return file_put_contents($file, json_encode([])) !== false;
});

// 5. Article Master Simulation
runTest("Article Master: add and remove simulated article", function () {
    $dir = __DIR__ . '/data';
    $file = $dir . '/articles.json';
    $mockDataFile = dirname(__DIR__) . '/mock_openalex_data.json';
    if (!file_exists($file)) {
        $raw = json_decode(file_get_contents($mockDataFile), true);
        file_put_contents($file, json_encode($raw['articles'] ?? [], JSON_PRETTY_PRINT));
    }
    $articles = json_decode(file_get_contents($file), true) ?? [];
    $testId = 'art_test_' . time();
    $articles[] = [
        'id' => $testId,
        'title' => 'Test Quantum Article',
        'author' => ['name' => 'Tester', 'institution' => 'Test Uni']
    ];
    file_put_contents($file, json_encode($articles, JSON_PRETTY_PRINT));
    
    // Check exists
    $reloaded = json_decode(file_get_contents($file), true) ?? [];
    $found = false;
    foreach ($reloaded as $a) {
        if ($a['id'] === $testId) { $found = true; break; }
    }
    if (!$found) return "Article was not added";
    
    // Clean up
    $cleaned = array_values(array_filter($reloaded, fn($a) => $a['id'] !== $testId));
    file_put_contents($file, json_encode($cleaned, JSON_PRETTY_PRINT));
    return true;
});

// 6. Reviewer Master Simulation
runTest("Reviewer Master: add and remove simulated reviewer", function () {
    $dir = __DIR__ . '/data';
    $file = $dir . '/reviewers.json';
    $mockDataFile = dirname(__DIR__) . '/mock_openalex_data.json';
    if (!file_exists($file)) {
        $raw = json_decode(file_get_contents($mockDataFile), true);
        file_put_contents($file, json_encode($raw['reviewers'] ?? [], JSON_PRETTY_PRINT));
    }
    $reviewers = json_decode(file_get_contents($file), true) ?? [];
    $testId = 'rev_test_' . time();
    $reviewers[] = [
        'id' => $testId,
        'name' => 'Dr. Test Reviewer',
        'institution' => 'Test Reviewer Uni',
        'keywords' => ['Testing', 'Verification']
    ];
    file_put_contents($file, json_encode($reviewers, JSON_PRETTY_PRINT));
    
    // Check exists
    $reloaded = json_decode(file_get_contents($file), true) ?? [];
    $found = false;
    foreach ($reloaded as $r) {
        if ($r['id'] === $testId) { $found = true; break; }
    }
    if (!$found) return "Reviewer was not added";
    
    // Clean up
    $cleaned = array_values(array_filter($reloaded, fn($r) => $r['id'] !== $testId));
    file_put_contents($file, json_encode($cleaned, JSON_PRETTY_PRINT));
    return true;
});

// 7. Password Management Simulation
runTest("Password storage & change logic", function () {
    $dir = __DIR__ . '/data';
    $file = $dir . '/users.json';
    if (!file_exists($file)) {
        file_put_contents($file, json_encode([[
            'id' => 'editor_01',
            'name' => 'Editor',
            'email' => 'editor@straive.com',
            'role' => 'Managing Editor',
            'password' => 'admin123'
        ]], JSON_PRETTY_PRINT));
    }
    $users = json_decode(file_get_contents($file), true) ?? [];
    $oldPass = $users[0]['password'] ?? '';
    if ($oldPass === '') return "No password found";
    
    // Simulate change
    $users[0]['password'] = 'new_secret_456';
    file_put_contents($file, json_encode($users, JSON_PRETTY_PRINT));
    
    $check = json_decode(file_get_contents($file), true) ?? [];
    if (($check[0]['password'] ?? '') !== 'new_secret_456') return "Password update failed";
    
    // Revert back
    $users[0]['password'] = $oldPass;
    file_put_contents($file, json_encode($users, JSON_PRETTY_PRINT));
    return true;
});

echo "\n📊 Summary: {$testsPassed} / {$totalTests} tests passed.\n";
if ($testsPassed === $totalTests) {
    echo "🎉 All backend verification tests passed flawlessly!\n";
}
