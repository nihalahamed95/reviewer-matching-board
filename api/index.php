<?php
declare(strict_types=1);

if (!headers_sent()) {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if (!headers_sent()) {
    header('Content-Type: application/json; charset=utf-8');
}

$mockDataFile    = dirname(__DIR__) . '/mock_openalex_data.json';
$dataDir         = __DIR__ . '/data';
$articlesFile    = $dataDir . '/articles.json';
$reviewersFile   = $dataDir . '/reviewers.json';
$assignmentsFile = $dataDir . '/assignments.json';
$usersFile       = $dataDir . '/users.json';

if (!is_dir($dataDir)) {
    mkdir($dataDir, 0777, true);
}

function sendJson(int $statusCode, array $data): void {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function readJsonFile(string $file, array $default = []): array {
    if (!file_exists($file)) return $default;
    $raw = file_get_contents($file);
    $data = json_decode($raw, true);
    return is_array($data) ? $data : $default;
}

function writeJsonFile(string $file, array $data): bool {
    return file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)) !== false;
}

if (!file_exists($assignmentsFile)) {
    writeJsonFile($assignmentsFile, []);
}

if (!file_exists($usersFile)) {
    writeJsonFile($usersFile, [
        [
            'id'       => 'editor_01',
            'name'     => 'Editor',
            'email'    => 'editor@straive.com',
            'role'     => 'Managing Editor',
            'password' => 'admin123'
        ]
    ]);
}

if (!file_exists($articlesFile) || !file_exists($reviewersFile)) {
    $seedArticles = [];
    $seedReviewers = [];
    if (file_exists($mockDataFile)) {
        $rawMock = json_decode(file_get_contents($mockDataFile), true) ?? [];
        $seedArticles = $rawMock['articles'] ?? [];
        $seedReviewers = $rawMock['reviewers'] ?? [];
    }
    if (!file_exists($articlesFile)) {
        writeJsonFile($articlesFile, $seedArticles);
    }
    if (!file_exists($reviewersFile)) {
        writeJsonFile($reviewersFile, $seedReviewers);
    }
}

const JWT_SECRET = 'straive_secret_key_2026';

function generateJwt(array $payload): string {
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $b64Header = rtrim(strtr(base64_encode($header), '+/', '-_'), '=');
    $b64Payload = rtrim(strtr(base64_encode(json_encode($payload)), '+/', '-_'), '=');
    $signature = hash_hmac('sha256', "{$b64Header}.{$b64Payload}", JWT_SECRET, true);
    $b64Signature = rtrim(strtr(base64_encode($signature), '+/', '-_'), '=');
    return "{$b64Header}.{$b64Payload}.{$b64Signature}";
}

function getBearerToken(): ?string {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/Bearer\s+(\S+)/i', $header, $matches)) {
        return $matches[1];
    }
    return null;
}

$rawUri = $_SERVER['REQUEST_URI'] ?? '/';
$parsedPath = parse_url($rawUri, PHP_URL_PATH) ?? '/';
$queryRoute = $_GET['route'] ?? $_GET['r'] ?? null;

if ($queryRoute !== null) {
    $route = '/' . trim($queryRoute, '/');
} else {
    $basePath = dirname($_SERVER['SCRIPT_NAME'] ?? '/straive_task/api');
    $relative = substr($parsedPath, strlen($basePath));
    $relative = preg_replace('#^/index\.php#i', '', (string)$relative);
    $route = '/' . trim((string)$relative, '/');
    $route = '/' . trim(preg_replace('#^/+(api)?#i', '', $route), '/');
}

$input = file_get_contents('php://input');
$payload = json_decode($input, true) ?? [];

if ($method === 'GET' && ($route === '/' || $route === '')) {
    sendJson(200, [
        'status'    => 'online',
        'service'   => 'Reviewer Matching API',
        'endpoints' => [
            'login'            => 'POST /login',
            'change-password'  => 'POST /change-password',
            'articles'         => 'GET, POST /articles',
            'articles-delete'  => 'POST /articles/delete',
            'reviewers'        => 'GET, POST /reviewers',
            'reviewers-delete' => 'POST /reviewers/delete',
            'assign'           => 'POST /assign',
            'stats'            => 'GET  /stats',
            'reset'            => 'POST /reset'
        ]
    ]);
}

if ($method === 'POST' && ($route === '/login' || $route === 'login')) {
    $email    = trim((string)($payload['email'] ?? ''));
    $password = trim((string)($payload['password'] ?? ''));

    $users = readJsonFile($usersFile);
    $matchedUser = null;

    foreach ($users as $u) {
        if (mb_strtolower(trim($u['email'] ?? '')) === mb_strtolower($email) && ($u['password'] ?? '') === $password) {
            $matchedUser = $u;
            break;
        }
    }

    if ($matchedUser !== null) {
        $jwtToken = generateJwt([
            'sub'   => $matchedUser['id'],
            'email' => $matchedUser['email'],
            'iat'   => time(),
            'exp'   => time() + 86400 * 7
        ]);

        unset($matchedUser['password']);

        sendJson(200, [
            'success' => true,
            'message' => 'Login successful',
            'token'   => $jwtToken,
            'user'    => $matchedUser
        ]);
    }

    sendJson(401, [
        'success' => false,
        'error'   => 'Invalid credentials. Demo: editor@straive.com / admin123'
    ]);
}

if ($method === 'POST' && ($route === '/change-password' || $route === 'change-password')) {
    $currentPassword = trim((string)($payload['current_password'] ?? ''));
    $newPassword     = trim((string)($payload['new_password'] ?? ''));
    $email           = trim((string)($payload['email'] ?? 'editor@straive.com'));

    if ($currentPassword === '' || $newPassword === '') {
        sendJson(400, ['success' => false, 'error' => 'Both current and new passwords are required.']);
    }

    if (strlen($newPassword) < 6) {
        sendJson(400, ['success' => false, 'error' => 'New password must be at least 6 characters.']);
    }

    $users = readJsonFile($usersFile);
    $updated = false;

    foreach ($users as &$u) {
        if (mb_strtolower(trim($u['email'] ?? '')) === mb_strtolower($email)) {
            if (($u['password'] ?? '') !== $currentPassword) {
                sendJson(400, ['success' => false, 'error' => 'Current password is incorrect.']);
            }
            $u['password'] = $newPassword;
            $updated = true;
            break;
        }
    }

    if (!$updated) {
        sendJson(404, ['success' => false, 'error' => 'User account not found.']);
    }

    writeJsonFile($usersFile, $users);

    sendJson(200, [
        'success' => true,
        'message' => 'Password updated successfully.'
    ]);
}

if ($method === 'GET' && ($route === '/articles' || $route === 'articles')) {
    $articlesList = readJsonFile($articlesFile);
    $assignments  = readJsonFile($assignmentsFile);

    $assignedMap = [];
    foreach ($assignments as $a) {
        if (!empty($a['article_id'])) {
            $assignedMap[$a['article_id']] = $a['reviewer_id'];
        }
    }

    $articles = array_map(function ($art) use ($assignedMap) {
        $id = (string)($art['id'] ?? '');
        return [
            'id'     => $id,
            'title'  => (string)($art['title'] ?? 'Untitled'),
            'author' => [
                'name'        => (string)($art['author']['name'] ?? 'Unknown Author'),
                'institution' => (string)($art['author']['institution'] ?? 'Unaffiliated')
            ],
            'assigned_reviewer_id' => $assignedMap[$id] ?? null
        ];
    }, $articlesList);

    sendJson(200, [
        'success' => true,
        'data'    => $articles
    ]);
}

if ($method === 'POST' && ($route === '/articles' || $route === 'articles')) {
    $title       = trim((string)($payload['title'] ?? ''));
    $authorName  = trim((string)($payload['author']['name'] ?? $payload['author_name'] ?? ''));
    $authorInst  = trim((string)($payload['author']['institution'] ?? $payload['author_institution'] ?? ''));
    $customId    = trim((string)($payload['id'] ?? ''));

    if ($title === '' || $authorName === '' || $authorInst === '') {
        sendJson(400, ['success' => false, 'error' => 'Title, Author Name, and Institution are required.']);
    }

    $articles = readJsonFile($articlesFile);

    if ($customId === '') {
        $maxNum = 100;
        foreach ($articles as $art) {
            if (preg_match('/^art_(\d+)$/', (string)($art['id'] ?? ''), $m)) {
                $num = (int)$m[1];
                if ($num > $maxNum) $maxNum = $num;
            }
        }
        $customId = 'art_' . ($maxNum + 1);
    }

    foreach ($articles as $art) {
        if (($art['id'] ?? '') === $customId) {
            sendJson(409, ['success' => false, 'error' => "Article with ID '{$customId}' already exists."]);
        }
    }

    $newArticle = [
        'id'     => $customId,
        'title'  => $title,
        'author' => [
            'name'        => $authorName,
            'institution' => $authorInst
        ]
    ];

    $articles[] = $newArticle;
    writeJsonFile($articlesFile, $articles);

    $newArticle['assigned_reviewer_id'] = null;

    sendJson(201, [
        'success' => true,
        'message' => 'Article created successfully.',
        'data'    => $newArticle
    ]);
}

if ($method === 'POST' && ($route === '/articles/delete' || $route === 'articles/delete')) {
    $id = trim((string)($payload['id'] ?? $_GET['id'] ?? ''));
    if ($id === '') {
        sendJson(400, ['success' => false, 'error' => 'Article ID is required for deletion.']);
    }

    $articles = readJsonFile($articlesFile);
    $filtered = array_values(array_filter($articles, fn($a) => ($a['id'] ?? '') !== $id));

    if (count($filtered) === count($articles)) {
        sendJson(404, ['success' => false, 'error' => "Article ID '{$id}' not found."]);
    }

    writeJsonFile($articlesFile, $filtered);

    $assignments = readJsonFile($assignmentsFile);
    $assignmentsFiltered = array_values(array_filter($assignments, fn($a) => ($a['article_id'] ?? '') !== $id));
    writeJsonFile($assignmentsFile, $assignmentsFiltered);

    sendJson(200, [
        'success' => true,
        'message' => "Article '{$id}' deleted successfully."
    ]);
}

if ($method === 'GET' && ($route === '/reviewers' || $route === 'reviewers')) {
    $reviewersList = readJsonFile($reviewersFile);

    $reviewers = array_map(function ($rev) {
        return [
            'id'          => (string)($rev['id'] ?? ''),
            'name'        => (string)($rev['name'] ?? 'Reviewer'),
            'institution' => (string)($rev['institution'] ?? 'Unaffiliated'),
            'keywords'    => is_array($rev['keywords'] ?? null) ? $rev['keywords'] : []
        ];
    }, $reviewersList);

    sendJson(200, [
        'success' => true,
        'data'    => $reviewers
    ]);
}

if ($method === 'POST' && ($route === '/reviewers' || $route === 'reviewers')) {
    $name       = trim((string)($payload['name'] ?? ''));
    $institution= trim((string)($payload['institution'] ?? ''));
    $keywordsRaw= $payload['keywords'] ?? [];
    $customId   = trim((string)($payload['id'] ?? ''));

    if ($name === '' || $institution === '') {
        sendJson(400, ['success' => false, 'error' => 'Reviewer Name and Institution are required.']);
    }

    $keywords = is_array($keywordsRaw)
        ? array_values(array_filter(array_map('trim', $keywordsRaw)))
        : array_values(array_filter(array_map('trim', explode(',', (string)$keywordsRaw))));

    $reviewers = readJsonFile($reviewersFile);

    if ($customId === '') {
        $maxNum = 0;
        foreach ($reviewers as $rev) {
            if (preg_match('/^rev_(\d+)$/', (string)($rev['id'] ?? ''), $m)) {
                $num = (int)$m[1];
                if ($num > $maxNum) $maxNum = $num;
            }
        }
        $customId = sprintf('rev_%03d', $maxNum + 1);
    }

    foreach ($reviewers as $rev) {
        if (($rev['id'] ?? '') === $customId) {
            sendJson(409, ['success' => false, 'error' => "Reviewer with ID '{$customId}' already exists."]);
        }
    }

    $newReviewer = [
        'id'          => $customId,
        'name'        => $name,
        'institution' => $institution,
        'keywords'    => $keywords
    ];

    $reviewers[] = $newReviewer;
    writeJsonFile($reviewersFile, $reviewers);

    sendJson(201, [
        'success' => true,
        'message' => 'Reviewer created successfully.',
        'data'    => $newReviewer
    ]);
}

if ($method === 'POST' && ($route === '/reviewers/delete' || $route === 'reviewers/delete')) {
    $id = trim((string)($payload['id'] ?? $_GET['id'] ?? ''));
    if ($id === '') {
        sendJson(400, ['success' => false, 'error' => 'Reviewer ID is required for deletion.']);
    }

    $reviewers = readJsonFile($reviewersFile);
    $filtered = array_values(array_filter($reviewers, fn($r) => ($r['id'] ?? '') !== $id));

    if (count($filtered) === count($reviewers)) {
        sendJson(404, ['success' => false, 'error' => "Reviewer ID '{$id}' not found."]);
    }

    writeJsonFile($reviewersFile, $filtered);

    $assignments = readJsonFile($assignmentsFile);
    $assignmentsFiltered = array_values(array_filter($assignments, fn($a) => ($a['reviewer_id'] ?? '') !== $id));
    writeJsonFile($assignmentsFile, $assignmentsFiltered);

    sendJson(200, [
        'success' => true,
        'message' => "Reviewer '{$id}' deleted successfully."
    ]);
}

if ($method === 'GET' && ($route === '/stats' || $route === 'stats')) {
    $articlesList = readJsonFile($articlesFile);
    $reviewersList = readJsonFile($reviewersFile);
    $assignments = readJsonFile($assignmentsFile);

    $conflicts = 0;
    foreach ($articlesList as $art) {
        $artUni = mb_strtolower(trim((string)($art['author']['institution'] ?? '')));
        if ($artUni === '') continue;
        foreach ($reviewersList as $rev) {
            $revUni = mb_strtolower(trim((string)($rev['institution'] ?? '')));
            if ($artUni === $revUni) {
                $conflicts++;
            }
        }
    }

    sendJson(200, [
        'success' => true,
        'stats'   => [
            'total_articles'    => count($articlesList),
            'total_reviewers'   => count($reviewersList),
            'assigned_articles' => count($assignments),
            'conflicts_count'   => $conflicts
        ]
    ]);
}

if ($method === 'POST' && ($route === '/assign' || $route === 'assign')) {
    $articleId  = trim((string)($payload['article_id'] ?? ''));
    $reviewerId = trim((string)($payload['reviewer_id'] ?? ''));

    if ($articleId === '' || $reviewerId === '') {
        sendJson(400, ['success' => false, 'error' => 'article_id and reviewer_id are required.']);
    }

    $articlesList = readJsonFile($articlesFile);
    $reviewersList = readJsonFile($reviewersFile);

    $targetArticle = null;
    foreach ($articlesList as $art) {
        if (($art['id'] ?? '') === $articleId) {
            $targetArticle = $art;
            break;
        }
    }

    if (!$targetArticle) {
        sendJson(404, ['success' => false, 'error' => "Article ID '{$articleId}' not found."]);
    }

    $targetReviewer = null;
    foreach ($reviewersList as $rev) {
        if (($rev['id'] ?? '') === $reviewerId) {
            $targetReviewer = $rev;
            break;
        }
    }

    if (!$targetReviewer) {
        sendJson(404, ['success' => false, 'error' => "Reviewer ID '{$reviewerId}' not found."]);
    }

    $authorInstitution   = trim((string)($targetArticle['author']['institution'] ?? ''));
    $reviewerInstitution = trim((string)($targetReviewer['institution'] ?? ''));

    $authorUniNormalized   = mb_strtolower($authorInstitution);
    $reviewerUniNormalized = mb_strtolower($reviewerInstitution);

    if ($authorUniNormalized !== '' && $authorUniNormalized === $reviewerUniNormalized) {
        sendJson(409, [
            'success'     => false,
            'status_code' => 409,
            'error'       => "Conflict of Interest: Author ({$targetArticle['author']['name']}) and Reviewer ({$targetReviewer['name']}) both belong to '{$authorInstitution}'."
        ]);
    }

    $assignments = readJsonFile($assignmentsFile);
    $updated = [];
    $replaced = false;

    $newAssignment = [
        'article_id'  => $articleId,
        'reviewer_id' => $reviewerId,
        'assigned_at' => date('c')
    ];

    foreach ($assignments as $item) {
        if (($item['article_id'] ?? null) === $articleId) {
            $updated[] = $newAssignment;
            $replaced = true;
        } else {
            $updated[] = $item;
        }
    }
    if (!$replaced) {
        $updated[] = $newAssignment;
    }

    writeJsonFile($assignmentsFile, $updated);

    sendJson(201, [
        'success'     => true,
        'status_code' => 201,
        'message'     => "Reviewer {$targetReviewer['name']} assigned to '{$targetArticle['title']}'.",
        'assignment'  => $newAssignment
    ]);
}

if ($method === 'POST' && ($route === '/reset' || $route === 'reset')) {
    writeJsonFile($assignmentsFile, []);

    if (file_exists($mockDataFile)) {
        $mockRaw = json_decode(file_get_contents($mockDataFile), true) ?? [];
        if (!empty($mockRaw['articles'])) {
            writeJsonFile($articlesFile, $mockRaw['articles']);
        }
        if (!empty($mockRaw['reviewers'])) {
            writeJsonFile($reviewersFile, $mockRaw['reviewers']);
        }
    }

    sendJson(200, ['success' => true, 'message' => 'Default mock JSON data restored successfully.']);
}

sendJson(404, ['success' => false, 'error' => "Endpoint not found: {$method} {$parsedPath}"]);
