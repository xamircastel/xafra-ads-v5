# Script: Apply Migration - Change id_product to VARCHAR(255)
# Date: 2025-01-02
# Description: Alters id_product column in staging.conversions from BIGINT to VARCHAR(255)

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  MIGRATION: Change id_product to VARCHAR" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Database connection
$DB_HOST = "34.28.245.62"
$DB_PORT = "5432"
$DB_NAME = "xafra-ads"
$DB_SCHEMA = "staging"
$DB_USER = "staging_user"

Write-Host "📋 Database:" -ForegroundColor Yellow
Write-Host "   Host: $DB_HOST" -ForegroundColor White
Write-Host "   Database: $DB_NAME" -ForegroundColor White
Write-Host "   Schema: $DB_SCHEMA" -ForegroundColor White
Write-Host ""

# Check if psql is available
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlPath) {
    Write-Host "❌ psql command not found. Please install PostgreSQL client." -ForegroundColor Red
    Write-Host "   Download from: https://www.postgresql.org/download/" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ PostgreSQL client found: $($psqlPath.Source)" -ForegroundColor Green
Write-Host ""

# Read SQL migration file
$migrationFile = Join-Path $PSScriptRoot "alter-conversion-id-product-to-string.sql"
if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ Migration file not found: $migrationFile" -ForegroundColor Red
    exit 1
}

Write-Host "📄 Migration file: $migrationFile" -ForegroundColor Green
Write-Host ""

# Prompt for password
Write-Host "🔐 Enter database password for user '$DB_USER':" -ForegroundColor Yellow
$securePassword = Read-Host -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
$DB_PASSWORD = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

# Set PGPASSWORD environment variable
$env:PGPASSWORD = $DB_PASSWORD

Write-Host ""
Write-Host "🚀 Applying migration..." -ForegroundColor Cyan
Write-Host ""

# Execute migration
try {
    $result = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $migrationFile 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Migration applied successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📊 Result:" -ForegroundColor Yellow
        Write-Host $result -ForegroundColor White
    } else {
        Write-Host ""
        Write-Host "❌ Migration failed!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Error:" -ForegroundColor Red
        Write-Host $result -ForegroundColor White
        exit 1
    }
} finally {
    # Clear password from environment
    $env:PGPASSWORD = ""
}

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  MIGRATION COMPLETED" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Rebuild core-service: npm run build" -ForegroundColor White
Write-Host "2. Redeploy to staging: gcloud builds submit --config=cloudbuild-core-stg.yaml ." -ForegroundColor White
Write-Host "3. Test POST endpoint with JSON body" -ForegroundColor White
Write-Host ""
