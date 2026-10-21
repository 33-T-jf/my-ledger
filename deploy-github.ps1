# 小墨账本 —— 一键推送到 GitHub
#
# 用法（在项目文件夹里打开 PowerShell 后执行）：
#   .\deploy-github.ps1 -Username 你的GitHub用户名
#   .\deploy-github.ps1 -Username yourname -Repo my-ledger -Email you@example.com
#
# 前提：先装好 Git（https://git-scm.com/download/win），并在 GitHub 上建好同名空仓库。

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Username,

    [string]$Repo = 'my-ledger',
    [string]$Email,
    [string]$Branch = 'main'
)

$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

function Step($m) { Write-Host "`n> $m" -ForegroundColor Cyan }
function Ok($m)   { Write-Host "  [OK] $m" -ForegroundColor Green }
function Warn($m) { Write-Host "  [!!] $m" -ForegroundColor Yellow }

# ---- 1. 检查 Git ----
Step '检查 Git'
# 便携版 Git 不会写 PATH，这里额外找几个常见位置
$gitExe = (Get-Command git.exe -ErrorAction SilentlyContinue).Source
if (-not $gitExe) {
    $candidates = @(
        "$env:ProgramFiles\Git\cmd\git.exe",
        "${env:ProgramFiles(x86)}\Git\cmd\git.exe",
        "$env:LOCALAPPDATA\Programs\Git\cmd\git.exe",
        (Join-Path ([Environment]::GetFolderPath('Desktop')) 'Git\cmd\git.exe')
    )
    foreach ($c in $candidates) {
        if (Test-Path -LiteralPath $c) { $gitExe = $c; break }
    }
}
if (-not $gitExe) {
    Write-Host '  未找到 git 命令。请先安装 Git for Windows：' -ForegroundColor Red
    Write-Host '    https://git-scm.com/download/win' -ForegroundColor Red
    Write-Host '  安装后请关闭并重新打开 PowerShell，再运行本脚本。' -ForegroundColor Red
    exit 1
}
# 让后面的 git 调用都能找到它
$env:Path = (Split-Path -Parent $gitExe) + ';' + $env:Path
Ok ("Git " + (git --version) + "  [" + $gitExe + "]")

# ---- 2. 初始化仓库 ----
Step '初始化仓库'
if (-not (Test-Path (Join-Path $PSScriptRoot '.git'))) {
    git init -q
    git symbolic-ref HEAD "refs/heads/$Branch"
    Ok "已初始化，主分支为 $Branch"
} else {
    Ok '仓库已存在，跳过初始化'
}

# ---- 3. 提交者信息（只写入本仓库，不影响全局配置）----
Step '设置提交者信息'
if (-not $Email) { $Email = "$Username@users.noreply.github.com" }
git config user.name  $Username
git config user.email $Email
Ok "$Username <$Email>"

# ---- 4. 暂存并提交 ----
Step '提交文件'
git add -A
if (git status --porcelain) {
    git rev-parse --verify HEAD 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        git commit -q -m '更新账本配置与数据'
        Ok '已创建提交'
    } else {
        git commit -q -m '初始提交：小墨账本'
        Ok '已创建提交'
    }
} else {
    Warn '没有需要提交的改动'
}

# ---- 5. 关联远程仓库 ----
Step '关联远程仓库'
$url = "https://github.com/$Username/$Repo.git"
$remotes = @(git remote)
if ($remotes -contains 'origin') {
    git remote set-url origin $url
    Ok "已更新 origin -> $url"
} else {
    git remote add origin $url
    Ok "已添加 origin -> $url"
}

# ---- 6. 推送 ----
Step '推送到 GitHub'
Write-Host '  如果弹出浏览器要求登录 GitHub，正常登录并授权即可。' -ForegroundColor DarkGray
git push -u origin $Branch
if ($LASTEXITCODE -ne 0) {
    Write-Host '`n推送失败，常见原因：' -ForegroundColor Red
    Write-Host "  1. GitHub 上还没有 $Repo 这个仓库" -ForegroundColor Red
    Write-Host "  2. 仓库名或用户名写错（当前：$Username/$Repo）" -ForegroundColor Red
    Write-Host '  3. 登录授权未完成' -ForegroundColor Red
    exit 1
}
Ok '推送完成'

# ---- 7. 后续提示 ----
Write-Host "`n全部完成！接下来开启网页托管：" -ForegroundColor Cyan
Write-Host "  1. 打开 https://github.com/$Username/$Repo/settings/pages" -ForegroundColor White
Write-Host '  2. Source 选择 Deploy from a branch' -ForegroundColor White
Write-Host "  3. 分支选 $Branch，目录选 / (root)，点 Save" -ForegroundColor White
Write-Host '  4. 等 1~2 分钟，访问：' -ForegroundColor White
Write-Host "     https://$Username.github.io/$Repo/" -ForegroundColor Green
