<#!
Restores the banks removed in the second cleanup operation from the local
10 September backup. It transfers only the rows attached to the requested
banks, preserving their original primary keys and relationships.
#>

$ErrorActionPreference = 'Stop'

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$backupFile = Join-Path $PSScriptRoot 'backups/matchia_backup.dump'
$stagingDatabase = 'matchia_restore_staging'
$targetDatabase = 'matchiaSaaS'
$psql = 'C:\Program Files\PostgreSQL\18\bin\psql.exe'

if (-not (Test-Path -LiteralPath $backupFile)) {
    throw "Sauvegarde introuvable : $backupFile"
}

$properties = Get-Content (Join-Path $PSScriptRoot 'MatchiaBackend/src/main/resources/application.properties')
$passwordValue = (($properties | Where-Object { $_ -match '^spring\.datasource\.password=' } | Select-Object -First 1) -split '=', 2)[1]
if ($passwordValue -match '^\$\{([^:}]+):([^}]*)\}$') {
    $configuredValue = [Environment]::GetEnvironmentVariable($Matches[1])
    $databasePassword = if ($configuredValue) { $configuredValue } else { $Matches[2] }
} else {
    $databasePassword = $passwordValue
}
$env:PGPASSWORD = $databasePassword

$targetNames = @(
    'yassine bank', 'hhhhh', 'najaa', 'test12', 'aziz bank',
    'yasssssssss', 'banque09', 'test bank09', 'ebri bank', 'sttt bank',
    'banque zitouna'
)
$namesSql = ($targetNames | ForEach-Object { "'$_'" }) -join ', '

$scope = @"
WITH target_banks AS (
    SELECT id FROM bank WHERE lower(trim(name)) IN ($namesSql)
), target_marketplaces AS (
    SELECT id FROM marketplace WHERE bank_id IN (SELECT id FROM target_banks)
), target_users AS (
    SELECT id FROM users WHERE bank_id IN (SELECT id FROM target_banks)
), target_requests AS (
    SELECT id FROM request WHERE bank_id IN (SELECT id FROM target_banks)
), target_subscriptions AS (
    SELECT id FROM subscription WHERE marketplace_id IN (SELECT id FROM target_marketplaces)
), target_marketplace_stores AS (
    SELECT id FROM marketplace_store WHERE marketplace_id IN (SELECT id FROM target_marketplaces)
), target_request_store_selections AS (
    SELECT id FROM request_store_selection WHERE request_id IN (SELECT id FROM target_requests)
), target_products AS (
    SELECT id FROM product WHERE bank_id IN (SELECT id FROM target_banks)
), target_financing_requests AS (
    SELECT id FROM financing_request
     WHERE bank_id IN (SELECT id FROM target_banks)
        OR product_id IN (SELECT id FROM target_products)
        OR client_id IN (SELECT id FROM target_users)
        OR processed_by_id IN (SELECT id FROM target_users)
), target_partnerships AS (
    SELECT id FROM dealer_bank_partnership WHERE bank_id IN (SELECT id FROM target_banks)
), target_certificates AS (
    SELECT id FROM certificates
     WHERE bank_id IN (SELECT id FROM target_banks)
        OR marketplace_id IN (SELECT id FROM target_marketplaces)
)
"@

$tableQueries = [ordered]@{
    bank = "$scope SELECT * FROM bank WHERE id IN (SELECT id FROM target_banks)"
    marketplace = "$scope SELECT * FROM marketplace WHERE id IN (SELECT id FROM target_marketplaces)"
    users = "$scope SELECT * FROM users WHERE id IN (SELECT id FROM target_users)"
    certificates = "$scope SELECT * FROM certificates WHERE id IN (SELECT id FROM target_certificates)"
    certificate_history = "$scope SELECT * FROM certificate_history WHERE certificate_id IN (SELECT id FROM target_certificates)"
    client_registration_verifications = "$scope SELECT * FROM client_registration_verifications WHERE bank_id IN (SELECT id FROM target_banks)"
    dealer_bank_partnership = "$scope SELECT * FROM dealer_bank_partnership WHERE id IN (SELECT id FROM target_partnerships)"
    partnership_contract = "$scope SELECT * FROM partnership_contract WHERE bank_id IN (SELECT id FROM target_banks) OR partnership_id IN (SELECT id FROM target_partnerships)"
    product = "$scope SELECT * FROM product WHERE id IN (SELECT id FROM target_products)"
    product_parameter_value = "$scope SELECT * FROM product_parameter_value WHERE product_id IN (SELECT id FROM target_products)"
    financing_request = "$scope SELECT * FROM financing_request WHERE id IN (SELECT id FROM target_financing_requests)"
    financing_request_document = "$scope SELECT * FROM financing_request_document WHERE financing_request_id IN (SELECT id FROM target_financing_requests)"
    required_financing_document = "$scope SELECT * FROM required_financing_document WHERE bank_id IN (SELECT id FROM target_banks)"
    product_publication_request = "$scope SELECT * FROM product_publication_request WHERE bank_id IN (SELECT id FROM target_banks) OR marketplace_id IN (SELECT id FROM target_marketplaces) OR partnership_id IN (SELECT id FROM target_partnerships)"
    marketplace_content = "$scope SELECT * FROM marketplace_content WHERE marketplace_id IN (SELECT id FROM target_marketplaces)"
    content_visibility = "$scope SELECT * FROM content_visibility WHERE marketplace_id IN (SELECT id FROM target_marketplaces) OR content_id IN (SELECT id FROM marketplace_content WHERE marketplace_id IN (SELECT id FROM target_marketplaces))"
    marketplace_store = "$scope SELECT * FROM marketplace_store WHERE id IN (SELECT id FROM target_marketplace_stores)"
    marketplace_store_module = "$scope SELECT * FROM marketplace_store_module WHERE marketplace_store_id IN (SELECT id FROM target_marketplace_stores)"
    marketplace_store_banner = "$scope SELECT * FROM marketplace_store_banner WHERE marketplace_store_id IN (SELECT id FROM target_marketplace_stores)"
    request = "$scope SELECT * FROM request WHERE id IN (SELECT id FROM target_requests)"
    request_module = "$scope SELECT * FROM request_module WHERE request_id IN (SELECT id FROM target_requests)"
    request_store = "$scope SELECT * FROM request_store WHERE request_id IN (SELECT id FROM target_requests)"
    request_store_selection = "$scope SELECT * FROM request_store_selection WHERE id IN (SELECT id FROM target_request_store_selections)"
    request_module_selection = "$scope SELECT * FROM request_module_selection WHERE request_store_id IN (SELECT id FROM target_request_store_selections)"
    subscription = "$scope SELECT * FROM subscription WHERE id IN (SELECT id FROM target_subscriptions)"
    payment = "$scope SELECT * FROM payment WHERE subscription_id IN (SELECT id FROM target_subscriptions) OR request_id IN (SELECT id FROM target_requests) OR renewal_request_id IN (SELECT id FROM target_requests)"
    password_reset_tokens = "$scope SELECT * FROM password_reset_tokens WHERE user_id IN (SELECT id FROM target_users)"
    refresh_tokens = "$scope SELECT * FROM refresh_tokens WHERE user_id IN (SELECT id FROM target_users)"
}

$scratchDirectory = Join-Path ([System.IO.Path]::GetTempPath()) ('matchia-bank-restore-' + [guid]::NewGuid())
New-Item -ItemType Directory -Path $scratchDirectory | Out-Null

try {
    foreach ($entry in $tableQueries.GetEnumerator()) {
        $csvPath = (Join-Path $scratchDirectory ($entry.Key + '.csv')).Replace('\', '/')
        $copyCommand = "\copy ($($entry.Value)) TO '$csvPath' WITH (FORMAT csv)"
        & $psql -X -v ON_ERROR_STOP=1 -h localhost -U yasmine -d $stagingDatabase -c $copyCommand
        if ($LASTEXITCODE -ne 0) { throw "Export impossible pour $($entry.Key)" }
    }

    $restoreScriptPath = Join-Path $scratchDirectory 'restore.sql'
    $restoreLines = @('BEGIN;')
    foreach ($tableName in $tableQueries.Keys) {
        $csvPath = (Join-Path $scratchDirectory ($tableName + '.csv')).Replace('\', '/')
        $restoreLines += "\copy public.$tableName FROM '$csvPath' WITH (FORMAT csv)"
    }
    foreach ($tableName in @('bank', 'marketplace', 'users', 'certificates', 'certificate_history', 'client_registration_verifications', 'dealer_bank_partnership', 'partnership_contract', 'product', 'product_parameter_value', 'financing_request', 'financing_request_document', 'required_financing_document', 'product_publication_request', 'marketplace_content', 'content_visibility', 'marketplace_store', 'marketplace_store_module', 'marketplace_store_banner', 'request', 'request_store_selection', 'request_module_selection', 'subscription', 'payment', 'password_reset_tokens', 'refresh_tokens')) {
        $restoreLines += "SELECT setval(pg_get_serial_sequence('public.$tableName', 'id'), COALESCE((SELECT max(id) FROM public.$tableName), 1), true) WHERE pg_get_serial_sequence('public.$tableName', 'id') IS NOT NULL;"
    }
    $restoreLines += 'COMMIT;'
    [System.IO.File]::WriteAllLines($restoreScriptPath, $restoreLines, [System.Text.UTF8Encoding]::new($false))

    & $psql -X -v ON_ERROR_STOP=1 -h localhost -U yasmine -d $targetDatabase -f $restoreScriptPath
    if ($LASTEXITCODE -ne 0) { throw "La restauration a ete annulee : aucune modification partielle n'a ete validee." }
} finally {
    Remove-Item -LiteralPath $scratchDirectory -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}
