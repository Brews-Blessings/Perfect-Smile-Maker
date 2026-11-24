
$ErrorActionPreference = "Stop"

# ==========================================
# PERFECT SMILE MAKER - AUTOMATED DB BACKUP
# ==========================================

# 1. Configuration
$Container = "psm-mysql"
$Database = "psm_db"

$DockerPath = "C:\Users\Emmanuel\AppData\Local\Programs\DockerDesktop\resources\bin\docker.exe"
$SevenZip = "C:\Program Files\7-Zip\7z.exe"

$BackupFolder = "C:\Users\Emmanuel\Documents\PSM_Automated_Backups"
$TempFolder = Join-Path $env:TEMP "PSM_Backup_Temp"
$PasswordFile = Join-Path $env:APPDATA "psm-backup-password.txt"

# 2. Initialize sensitive resources
$Pointer = [IntPtr]::Zero
$Password = $null
$SqlFile = $null
$Archive = $null

try {
    Write-Host "Starting PSM database backup..."

    # 3. Check required applications
    if (!(Test-Path $DockerPath)) {
        throw "Docker executable not found."
    }

    if (!(Test-Path $SevenZip)) {
        throw "7-Zip executable not found."
    }

    if (!(Test-Path $PasswordFile)) {
        throw "Encrypted backup password file not found."
    }

    # 4. Check MySQL container
    $ContainerStatus = & $DockerPath inspect --format '{{.State.Running}}' $Container

    if ($LASTEXITCODE -ne 0 -or $ContainerStatus.Trim() -ne "true") {
        throw "MySQL container is not running."
    }

    # 5. Prepare folders
    New-Item -ItemType Directory -Force -Path $BackupFolder | Out-Null
    New-Item -ItemType Directory -Force -Path $TempFolder | Out-Null

    # 6. Load Windows-encrypted backup password
    $SecurePassword = Get-Content $PasswordFile | ConvertTo-SecureString
    $Pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePassword)
    $Password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($Pointer)

    if ([string]::IsNullOrWhiteSpace($Password)) {
        throw "Backup password is empty."
    }

    # 7. Generate unique filenames
    $Timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"

    $SqlFile = Join-Path $TempFolder "psm_db_backup_$Timestamp.sql"
    $Archive = Join-Path $BackupFolder "psm_db_backup_$Timestamp.7z"

    # 8. Export MySQL database
    Write-Host "Exporting MySQL database..."

    $DumpCommand = 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqldump -uroot --single-transaction --routines --triggers ' + $Database

    $DumpOutput = & $DockerPath exec $Container sh -c $DumpCommand

    if ($LASTEXITCODE -ne 0) {
        throw "MySQL database export failed."
    }

    if (!$DumpOutput -or $DumpOutput.Count -eq 0) {
        throw "Database export produced no output."
    }

    # Save SQL without UTF-8 BOM
    $SqlContent = ($DumpOutput -join "`n") + "`n"

    [System.IO.File]::WriteAllText(
        $SqlFile,
        $SqlContent,
        [System.Text.UTF8Encoding]::new($false)
    )

    if (!(Test-Path $SqlFile) -or (Get-Item $SqlFile).Length -eq 0) {
        throw "SQL backup file is empty."
    }

    Write-Host "Database export successful."

    # 9. Encrypt SQL backup using 7-Zip AES-256
    Write-Host "Encrypting database backup..."

    $SevenZipArgs = @(
        "a",
        "-t7z",
        "-mx=5",
        "-mhe=on",
        "-p$Password",
        $Archive,
        $SqlFile
    )

    & $SevenZip @SevenZipArgs

    if ($LASTEXITCODE -ne 0) {
        throw "7-Zip encryption failed."
    }

    if (!(Test-Path $Archive) -or (Get-Item $Archive).Length -eq 0) {
        throw "Encrypted archive was not created correctly."
    }

    Write-Host "Encryption successful."

    # 10. Verify encrypted archive
    Write-Host "Verifying encrypted archive..."

    & $SevenZip t "-p$Password" $Archive

    if ($LASTEXITCODE -ne 0) {
        throw "Archive verification failed."
    }

    Write-Host "Archive verification successful."

    # 11. Seven-day retention policy
    # Only remove archives older than seven days.
    # This runs only after the new archive passes verification.
    Write-Host "Checking seven-day backup retention..."

    $CutoffDate = (Get-Date).AddDays(-7)

    $OldBackups = @(
        Get-ChildItem -Path $BackupFolder -Filter "psm_db_backup_*.7z" -File |
        Where-Object {
            $_.FullName -ne $Archive -and
            $_.LastWriteTime -lt $CutoffDate
        }
    )

    foreach ($OldBackup in $OldBackups) {
        Remove-Item -LiteralPath $OldBackup.FullName -Force
        Write-Host "Removed expired backup: $($OldBackup.Name)"
    }

    Write-Host "Seven-day retention check completed."
    Write-Host "Expired backups removed: $($OldBackups.Count)"

    # 12. Remove unencrypted temporary SQL
    Remove-Item -LiteralPath $SqlFile -Force
    $SqlFile = $null

    Write-Host "Temporary SQL file removed."

    # 13. Finish
    Write-Host ""
    Write-Host "=========================================="
    Write-Host "PSM DATABASE BACKUP COMPLETED SUCCESSFULLY"
    Write-Host "=========================================="
    Write-Host "Backup: $Archive"
    Write-Host "MEGA folder: $BackupFolder"
}
catch {
    Write-Host ""
    Write-Host "BACKUP FAILED: $($_.Exception.Message)" -ForegroundColor Red
    throw
}
finally {
    # Clean up temporary unencrypted SQL
    if ($SqlFile -and (Test-Path $SqlFile)) {
        Remove-Item -LiteralPath $SqlFile -Force -ErrorAction SilentlyContinue
    }

    # Clear sensitive password from unmanaged memory
    if ($Pointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($Pointer)
    }

    Remove-Variable Password -ErrorAction SilentlyContinue
}
