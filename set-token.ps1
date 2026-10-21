# 把 GitHub Token 写进 js/config.js（自动转 Base64）
#
# 用法：右键“使用 PowerShell 运行”，或在项目目录执行
#   powershell -ExecutionPolicy Bypass -File .\set-token.ps1

param(
    [string]$Owner = '33-T-jf',
    [string]$Repo = 'my-ledger'
)

$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

Write-Host ''
Write-Host '粘贴你的 GitHub Token（细粒度，权限 Contents: Read and write）' -ForegroundColor Cyan
Write-Host '输入时不会显示，粘贴后按回车：' -ForegroundColor DarkGray
$secure = Read-Host -AsSecureString
$plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
)

if (-not $plain) {
    Write-Host '没有输入内容，已取消。' -ForegroundColor Red
    exit 1
}
$plain = $plain.Trim()

if ($plain.StartsWith('ghp_')) {
    Write-Host '提示：这是旧版 Classic Token，建议改用细粒度 Token 并限制到单个仓库。' -ForegroundColor Yellow
} elseif (-not $plain.StartsWith('github_pat_')) {
    Write-Host '警告：这不像是 GitHub Token（应以 github_pat_ 开头），已停止。' -ForegroundColor Red
    exit 1
}

$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($plain))
$configPath = Join-Path $PSScriptRoot 'js\config.js'
$text = [System.IO.File]::ReadAllText($configPath, [System.Text.Encoding]::UTF8)

$text = [regex]::Replace($text, "owner:\s*'[^']*'", "owner: '$Owner'")
$text = [regex]::Replace($text, "repo:\s*'[^']*'",  "repo: '$Repo'")
$text = [regex]::Replace($text, "tokenB64:\s*'[^']*'", "tokenB64: '$b64'")
[System.IO.File]::WriteAllText($configPath, $text, (New-Object System.Text.UTF8Encoding($false)))

Write-Host ''
Write-Host '  [OK] 已写入 js/config.js' -ForegroundColor Green
Write-Host ("  owner = $Owner    repo = $Repo") -ForegroundColor DarkGray
Write-Host ''
Write-Host '下一步：执行下面这行把改动推上去' -ForegroundColor Cyan
Write-Host '  powershell -ExecutionPolicy Bypass -File .\deploy-github.ps1 -Username ' + $Owner -ForegroundColor White
Write-Host ''
