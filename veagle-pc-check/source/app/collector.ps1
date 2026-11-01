# VEAGLE PC Check - collector
# READ-ONLY: this script only reads system information. It does not change any setting,
# install anything or send your data anywhere. The only network actions: winget asks what is outdated,
# one ping to your own router, and one DNS lookup of www.microsoft.com.
# Output: Reports\<timestamp>\report.html, data.json and a raw\ folder with the exported files.
# -Quick skips the slow parts (msinfo32, winget, DISM, optional features, old drivers, folder sizes).

param([switch]$Quick, [switch]$NoOpen, [switch]$Notify)

$ErrorActionPreference = 'SilentlyContinue'
$ProgressPreference = 'SilentlyContinue'
$script:Version = '1.0.2'
$script:Warnings = New-Object System.Collections.ArrayList
$swTotal = [Diagnostics.Stopwatch]::StartNew()

$appDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $appDir

# ---------------------------------------------------------------- helpers
function Warn([string]$m) { [void]$script:Warnings.Add($m) }

function Step([int]$n, [int]$total, [string]$label) {
    $w = 20
    $f = [int][math]::Floor($w * ($n - 1) / $total)
    $bar = ('#' * $f) + ('-' * ($w - $f))
    $pct = [int][math]::Floor(100 * ($n - 1) / $total)
    $sec = [int]$swTotal.Elapsed.TotalSeconds
    try { $Host.UI.RawUI.WindowTitle = ('VEAGLE PC Check {0} - {1}% - {2} s' -f $script:Version, $pct, $sec) } catch { }
    Write-Host '  ' -NoNewline
    Write-Host ('[{0,2}/{1}] ' -f $n, $total) -NoNewline -ForegroundColor Cyan
    Write-Host $bar.Substring(0, $f) -NoNewline -ForegroundColor Red
    Write-Host $bar.Substring($f) -NoNewline -ForegroundColor DarkGray
    Write-Host ('  {0}' -f $label) -ForegroundColor White
}

function Iso($d) {
    if ($null -eq $d) { return $null }
    try { return ([datetime]$d).ToString('yyyy-MM-ddTHH:mm:ss') } catch { return $null }
}

function Round1($x) {
    if ($null -eq $x) { return $null }
    try { return [math]::Round([double]$x, 1) } catch { return $null }
}

function GB($bytes) {
    if ($null -eq $bytes) { return $null }
    try { return [math]::Round([double]$bytes / 1GB, 1) } catch { return $null }
}

function FirstLine($s, [int]$max = 220) {
    if (-not $s) { return '' }
    $l = ([string]$s -split "`r?`n")[0].Trim()
    if ($l.Length -gt $max) { $l = $l.Substring(0, $max) }
    return $l
}

function LevelName($n) {
    switch ([int]$n) { 1 { 'Critical' } 2 { 'Error' } 3 { 'Warning' } default { 'Info' } }
}

function Read-Reg([string]$path, [string]$name) {
    try { return (Get-ItemProperty -Path $path -ErrorAction Stop).$name } catch { return $null }
}

# Parses the text table printed by "winget upgrade" into objects.
function ConvertFrom-WingetUpgrade([string]$text) {
    $rows = @()
    if (-not $text) { return $rows }
    $lines = @($text -split "`r?`n")

    # Column positions come from the header line, because columns can touch each other.
    $cId = -1; $cVer = -1; $cAv = -1; $cSrc = -1
    foreach ($l in $lines) {
        if ($l -match '^\s*Name\s+Id\s+Version\s+Available\s+Source') {
            $cId = $l.IndexOf(' Id ') + 1; $cVer = $l.IndexOf(' Version ') + 1
            $cAv = $l.IndexOf(' Available ') + 1; $cSrc = $l.IndexOf(' Source') + 1
            break
        }
    }

    foreach ($line in $lines) {
        $t = $line.TrimEnd()
        if ($t.Length -lt 20 -or $t -match '^-+$') { continue }
        $row = $null
        if ($cSrc -gt 0 -and $t.Length -gt $cSrc) {
            $src = $t.Substring($cSrc).Trim()
            if ($src -eq 'winget' -or $src -eq 'msstore') {
                $row = [pscustomobject]@{
                    name      = $t.Substring(0, $cId).Trim()
                    id        = $t.Substring($cId, $cVer - $cId).Trim()
                    version   = $t.Substring($cVer, $cAv - $cVer).Trim()
                    available = $t.Substring($cAv, $cSrc - $cAv).Trim()
                    source    = $src
                }
            }
        }
        if (-not $row) {
            # fallback for unexpected layouts: split on two or more spaces
            $cols = @($t -split '\s{2,}')
            if ($cols.Count -ge 5) {
                $src2 = $cols[$cols.Count - 1].Trim()
                if ($src2 -eq 'winget' -or $src2 -eq 'msstore') {
                    $row = [pscustomobject]@{ name = $cols[0].Trim(); id = $cols[1].Trim(); version = $cols[2].Trim(); available = $cols[3].Trim(); source = $src2 }
                }
            }
        }
        if ($row -and $row.id -and $row.id -ne 'Id') { $rows += $row }
    }
    return $rows
}

# Reads one named field of an event (works in every Windows language, unlike parsing the message text).
function Get-EvData($ev, [string]$name) {
    try {
        $x = [xml]$ev.ToXml()
        $n = @($x.Event.EventData.Data | Where-Object { $_.Name -eq $name })[0]
        if ($n) { return [string]$n.'#text' }
    } catch { }
    return $null
}

# Turns the event list into: totals, top groups, per-day counts.
function Summarize-Events($events, [int]$Days, [int]$Top = 60) {
    $events = @($events)
    $cut1 = (Get-Date).AddDays(-1); $cut7 = (Get-Date).AddDays(-7); $cut30 = (Get-Date).AddDays(-30)
    $groups = @()
    if ($events.Count -gt 0) {
        $grouped = $events | Group-Object -Property { '{0}|{1}|{2}' -f $_.ProviderName, $_.Id, $_.Level }
        $groups = @($grouped | Sort-Object Count -Descending | Select-Object -First $Top | ForEach-Object {
            $first = $_.Group[0]
            $last = ($_.Group | Sort-Object TimeCreated -Descending | Select-Object -First 1).TimeCreated
            [pscustomobject]@{
                provider = [string]$first.ProviderName
                id       = [int]$first.Id
                level    = LevelName $first.Level
                count    = [int]$_.Count
                count1   = @($_.Group | Where-Object { $_.TimeCreated -ge $cut1 }).Count
                count7   = @($_.Group | Where-Object { $_.TimeCreated -ge $cut7 }).Count
                count30  = @($_.Group | Where-Object { $_.TimeCreated -ge $cut30 }).Count
                sample   = FirstLine $first.Message 220
                lastSeen = Iso $last
            }
        })
    }
    $perDay = @()
    $byDay = @{}
    foreach ($e in $events) {
        $k = $e.TimeCreated.ToString('yyyy-MM-dd')
        if (-not $byDay.ContainsKey($k)) { $byDay[$k] = @(0, 0) }
        if ($e.Level -le 2) { $byDay[$k][0]++ } else { $byDay[$k][1]++ }
    }
    for ($i = $Days - 1; $i -ge 0; $i--) {
        $d = (Get-Date).Date.AddDays(-$i).ToString('yyyy-MM-dd')
        $v = $byDay[$d]
        if ($null -eq $v) { $v = @(0, 0) }
        $perDay += [pscustomobject]@{ date = $d; errors = [int]$v[0]; warnings = [int]$v[1] }
    }
    $win = [ordered]@{}
    foreach ($wd in @(@('d1', $cut1), @('d7', $cut7), @('d30', $cut30))) {
        $we = @($events | Where-Object { $_.TimeCreated -ge $wd[1] })
        $win[$wd[0]] = [pscustomobject]@{ total = $we.Count; errors = @($we | Where-Object { $_.Level -le 2 }).Count; warnings = @($we | Where-Object { $_.Level -eq 3 }).Count }
    }
    return [pscustomobject]@{
        total    = $events.Count
        errors   = @($events | Where-Object { $_.Level -le 2 }).Count
        warnings = @($events | Where-Object { $_.Level -eq 3 }).Count
        win      = [pscustomobject]$win
        groups   = $groups
        perDay   = $perDay
    }
}

# ---------------------------------------------------------------- start
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

try {
    $Host.UI.RawUI.WindowTitle = ('VEAGLE PC Check ' + $script:Version)
    $sz = $Host.UI.RawUI.WindowSize
    if ($sz.Width -lt 92) {
        $bs = $Host.UI.RawUI.BufferSize; $bs.Width = 92; $Host.UI.RawUI.BufferSize = $bs
        $sz.Width = 92; $Host.UI.RawUI.WindowSize = $sz
    }
} catch { }
Write-Host ''
Write-Host '   __     _______    _    ____ _     _____' -ForegroundColor Red
Write-Host '   \ \   / | ____|  / \  / ___| |   | ____|' -ForegroundColor Red
Write-Host '    \ \ / /|  _|   / _ \| |  _| |   |  _|' -ForegroundColor Red
Write-Host '     \ V / | |___ / ___ | |_| | |___| |___' -ForegroundColor DarkRed
Write-Host '      \_/  |_____/_/   \_\____|_____|_____|' -ForegroundColor DarkRed
Write-Host ''
Write-Host '   P C   C H E C K' -NoNewline -ForegroundColor White
Write-Host ('   version ' + $script:Version) -NoNewline -ForegroundColor Yellow
Write-Host '   |   ferelis.gr' -ForegroundColor DarkGray
Write-Host '   ------------------------------------------------' -ForegroundColor DarkGray
if ($Quick) { Write-Host '   QUICK scan. Read-only: nothing is changed or sent.' -ForegroundColor Green } else { Write-Host '   Read-only scan: nothing is changed or sent.' -ForegroundColor Green }
Write-Host '   Please wait. It takes 2-3 minutes. You can keep working.' -ForegroundColor Gray
Write-Host '   ------------------------------------------------' -ForegroundColor DarkGray
Write-Host ''
if (-not $isAdmin) {
    Write-Host '  Not running as Administrator: some checks (BitLocker, SMART, DISM) will be skipped.' -ForegroundColor Yellow
    Write-Host '  Tip: start VEAGLE-PC-Check.bat instead, it asks for the rights automatically.' -ForegroundColor Yellow
    Write-Host ''
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$out = Join-Path $root ('Reports\' + $stamp)
try { New-Item -ItemType Directory -Force -Path $out -ErrorAction Stop | Out-Null }
catch {
    $out = Join-Path $env:USERPROFILE ('Documents\VEAGLE-PCCheck\' + $stamp)
    New-Item -ItemType Directory -Force -Path $out | Out-Null
}
$raw = Join-Path $out 'raw'
New-Item -ItemType Directory -Force -Path $raw | Out-Null

$TOTAL = 18

# msinfo32 takes a minute or two, so it starts in the background and is collected at the end.
$msinfoProc = $null
if (-not $Quick) { try {
    $msinfoProc = Start-Process -FilePath (Join-Path $env:windir 'System32\msinfo32.exe') -ArgumentList ('/report "' + (Join-Path $raw 'msinfo32.txt') + '"') -PassThru -WindowStyle Hidden -ErrorAction Stop
} catch { Warn ('msinfo32: ' + $_.Exception.Message) } }

# ---------------------------------------------------------------- 1. system
Step 1 $TOTAL 'System, CPU, memory, board'
$os = Get-CimInstance Win32_OperatingSystem
$cs = Get-CimInstance Win32_ComputerSystem
$bios = Get-CimInstance Win32_BIOS
$bb = Get-CimInstance Win32_BaseBoard
$cpus = @(Get-CimInstance Win32_Processor)
$enc = Get-CimInstance Win32_SystemEnclosure
$cv = 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion'

$chassisNames = @{ 3 = 'Desktop'; 4 = 'Low Profile Desktop'; 5 = 'Pizza Box'; 6 = 'Mini Tower'; 7 = 'Tower'; 8 = 'Portable'; 9 = 'Laptop'; 10 = 'Notebook'; 11 = 'Handheld'; 13 = 'All in One'; 14 = 'Sub Notebook'; 15 = 'Space Saving'; 16 = 'Lunch Box'; 23 = 'Rack Mount'; 24 = 'Sealed-Case PC'; 30 = 'Tablet'; 31 = 'Convertible'; 32 = 'Detachable'; 35 = 'Mini PC'; 36 = 'Stick PC' }
$chassisId = 0
if ($enc -and $enc.ChassisTypes) { $chassisId = [int]@($enc.ChassisTypes)[0] }
$chassisName = $chassisNames[$chassisId]
if (-not $chassisName) { $chassisName = 'Unknown' }
$isLaptop = @(8, 9, 10, 11, 14, 30, 31, 32) -contains $chassisId

$peType = Read-Reg 'HKLM:\SYSTEM\CurrentControlSet\Control' 'PEFirmwareType'
$firmware = ''
if ($peType -eq 2) { $firmware = 'UEFI' } elseif ($peType -eq 1) { $firmware = 'BIOS' }

$build = [int]$os.BuildNumber
$productName = [string](Read-Reg $cv 'ProductName')
if ($build -ge 22000 -and $productName -like 'Windows 10*') { $productName = $productName -replace 'Windows 10', 'Windows 11' }

$uptimeHours = $null
if ($os.LastBootUpTime) { $uptimeHours = Round1 (((Get-Date) - $os.LastBootUpTime).TotalHours) }

$memArray = Get-CimInstance Win32_PhysicalMemoryArray | Select-Object -First 1
$memTypeNames = @{ 20 = 'DDR'; 21 = 'DDR2'; 24 = 'DDR3'; 26 = 'DDR4'; 34 = 'DDR5'; 35 = 'LPDDR5' }
$modules = @(Get-CimInstance Win32_PhysicalMemory | ForEach-Object {
    $t = $memTypeNames[[int]$_.SMBIOSMemoryType]
    if (-not $t) { $t = '' }
    [pscustomobject]@{
        slot         = [string]$_.DeviceLocator
        gb           = GB $_.Capacity
        speedMHz     = [int]$_.Speed
        configuredMHz = [int]$_.ConfiguredClockSpeed
        manufacturer = ([string]$_.Manufacturer).Trim()
        partNumber   = ([string]$_.PartNumber).Trim()
        type         = $t
        formFactor   = $(if ([int]$_.FormFactor -eq 12) { 'SODIMM' } elseif ([int]$_.FormFactor -eq 8) { 'DIMM' } else { '' })
    }
})

$cpuObj = $null
if ($cpus.Count -gt 0) {
    $c0 = $cpus[0]
    $cpuObj = [pscustomobject]@{
        name        = ([string]$c0.Name).Trim()
        manufacturer = [string]$c0.Manufacturer
        sockets     = $cpus.Count
        cores       = [int](($cpus | Measure-Object NumberOfCores -Sum).Sum)
        threads     = [int](($cpus | Measure-Object NumberOfLogicalProcessors -Sum).Sum)
        baseMHz     = [int]$c0.MaxClockSpeed
        currentMHz  = [int]$c0.CurrentClockSpeed
        l2KB        = [int]$c0.L2CacheSize
        l3KB        = [int]$c0.L3CacheSize
        socket      = [string]$c0.SocketDesignation
        virtualizationEnabled = [bool]$c0.VirtualizationFirmwareEnabled
        loadPercent = [int]$c0.LoadPercentage
    }
}

$system = [ordered]@{
    manufacturer = [string]$cs.Manufacturer
    model        = [string]$cs.Model
    chassis      = $chassisName
    isLaptop     = $isLaptop
    firmware     = $firmware
    board        = [pscustomobject]@{ manufacturer = [string]$bb.Manufacturer; product = [string]$bb.Product }
    bios         = [pscustomobject]@{ vendor = [string]$bios.Manufacturer; version = [string]$bios.SMBIOSBIOSVersion; date = Iso $bios.ReleaseDate; smbios = [string]$bios.SMBIOSMajorVersion + '.' + [string]$bios.SMBIOSMinorVersion }
    cpu          = $cpuObj
    ram          = [pscustomobject]@{
        totalGB   = Round1 ($os.TotalVisibleMemorySize / 1MB)
        freeGB    = Round1 ($os.FreePhysicalMemory / 1MB)
        slots     = [int]$memArray.MemoryDevices
        maxGB     = $(if ($memArray.MaxCapacity) { [int]($memArray.MaxCapacity / 1MB) } else { $null })
        modules   = $modules
    }
    os           = [pscustomobject]@{
        caption     = ([string]$os.Caption).Trim()
        productName = $productName
        edition     = [string](Read-Reg $cv 'EditionID')
        displayVersion = [string](Read-Reg $cv 'DisplayVersion')
        version     = [string]$os.Version
        build       = $build
        ubr         = [int](Read-Reg $cv 'UBR')
        arch        = [string]$os.OSArchitecture
        installDate = Iso $os.InstallDate
        lastBoot    = Iso $os.LastBootUpTime
        uptimeHours = $uptimeHours
        language    = (Get-Culture).Name
        timeZone    = (Get-TimeZone).Id
    }
}

# ---------------------------------------------------------------- 2. gpu & display
Step 2 $TOTAL 'Graphics and display'
$vram = @{}
try {
    $gk = 'HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}'
    Get-ChildItem $gk -ErrorAction SilentlyContinue | ForEach-Object {
        $p = Get-ItemProperty $_.PSPath -ErrorAction SilentlyContinue
        $q = $p.'HardwareInformation.qwMemorySize'
        if ($p.DriverDesc -and $q -is [long]) { $vram[[string]$p.DriverDesc] = GB $q }
    }
} catch { Warn ('vram: ' + $_.Exception.Message) }

$gpus = @(Get-CimInstance Win32_VideoController | ForEach-Object {
    $drv = [string]$_.DriverVersion
    $friendly = $drv
    if ($_.Name -match 'NVIDIA' -and $drv -match '^\d+\.\d+\.(\d+)\.(\d+)$') {
        $digits = ($Matches[1] + $Matches[2])
        if ($digits.Length -ge 5) { $d5 = $digits.Substring($digits.Length - 5); $friendly = $d5.Substring(0, 3) + '.' + $d5.Substring(3) }
    }
    $v = $vram[[string]$_.Name]
    if ($null -eq $v) { $v = GB $_.AdapterRAM }
    [pscustomobject]@{
        name          = ([string]$_.Name).Trim()
        vramGB        = $v
        driverVersion = $drv
        driverFriendly = $friendly
        driverDate    = Iso $_.DriverDateAsDate
        width         = [int]$_.CurrentHorizontalResolution
        height        = [int]$_.CurrentVerticalResolution
        refreshHz     = [int]$_.CurrentRefreshRate
        status        = [string]$_.Status
    }
})
if ($gpus.Count -eq 0) { $gpus = @(Get-CimInstance Win32_VideoController) | Out-Null; $gpus = @() }

# ---------------------------------------------------------------- 3. storage
Step 3 $TOTAL 'Storage'
$relMap = @{}
try {
    foreach ($pd in @(Get-PhysicalDisk)) {
        $rc = $pd | Get-StorageReliabilityCounter -ErrorAction SilentlyContinue
        if ($rc) {
            $relMap[[string]$pd.DeviceId] = [pscustomobject]@{
                temperatureC = $(if ($rc.Temperature) { [int]$rc.Temperature } else { $null })
                wearPercent  = $(if ($null -ne $rc.Wear) { [int]$rc.Wear } else { $null })
                powerOnHours = $(if ($rc.PowerOnHours) { [int]$rc.PowerOnHours } else { $null })
                readErrors   = $(if ($null -ne $rc.ReadErrorsTotal) { [int]$rc.ReadErrorsTotal } else { $null })
                writeErrors  = $(if ($null -ne $rc.WriteErrorsTotal) { [int]$rc.WriteErrorsTotal } else { $null })
            }
        }
    }
} catch { Warn ('smart: ' + $_.Exception.Message) }

$disks = @(Get-PhysicalDisk | ForEach-Object {
    [pscustomobject]@{
        name        = ([string]$_.FriendlyName).Trim()
        mediaType   = [string]$_.MediaType
        busType     = [string]$_.BusType
        health      = [string]$_.HealthStatus
        status      = [string]$_.OperationalStatus
        sizeGB      = [int](GB $_.Size)
        firmware    = [string]$_.FirmwareVersion
        reliability = $relMap[[string]$_.DeviceId]
    }
})

$blMap = @{}
try {
    foreach ($b in @(Get-BitLockerVolume -ErrorAction Stop)) {
        $blMap[[string]$b.MountPoint] = [pscustomobject]@{ protection = [string]$b.ProtectionStatus; percent = [int]$b.EncryptionPercentage }
    }
} catch { if ($isAdmin) { Warn ('bitlocker: ' + $_.Exception.Message) } }

$volumes = @(Get-Volume | Where-Object { $_.DriveLetter } | ForEach-Object {
    $mp = ([string]$_.DriveLetter) + ':'
    [pscustomobject]@{
        letter   = $mp
        label    = [string]$_.FileSystemLabel
        fs       = [string]$_.FileSystem
        health   = [string]$_.HealthStatus
        driveType = [string]$_.DriveType
        sizeGB   = Round1 ($_.Size / 1GB)
        freeGB   = Round1 ($_.SizeRemaining / 1GB)
        bitlocker = $blMap[$mp]
    }
})
$trim = $null
try {
    $t = (& fsutil behavior query DisableDeleteNotify 2>&1 | Out-String)
    if ($t -match 'NTFS\s+DisableDeleteNotify\s*=\s*(\d)') { $trim = ($Matches[1] -eq '0') }
} catch { }

# ---------------------------------------------------------------- 4. network
Step 4 $TOTAL 'Network adapters'
$adapters = @(Get-NetAdapter | ForEach-Object {
    [pscustomobject]@{
        name        = [string]$_.Name
        description = [string]$_.InterfaceDescription
        status      = [string]$_.Status
        linkSpeed   = [string]$_.LinkSpeed
        virtual     = [bool]$_.Virtual
    }
})
$dns = @()
try { $dns = @(Get-DnsClientServerAddress -AddressFamily IPv4 | Where-Object { $_.ServerAddresses } | ForEach-Object { $_.ServerAddresses } | Select-Object -Unique) } catch { }

# ---------------------------------------------------------------- 5. security
Step 5 $TOTAL 'Security settings'
$secureBoot = $null
try { $secureBoot = [bool](Confirm-SecureBootUEFI -ErrorAction Stop) } catch { $secureBoot = $null }
$tpm = $null
try {
    $tp = Get-Tpm -ErrorAction Stop
    $spec = ''
    try { $spec = ([string](Get-CimInstance -Namespace 'root\cimv2\security\microsofttpm' -ClassName Win32_Tpm -ErrorAction Stop).SpecVersion -split ',')[0].Trim() } catch { }
    $tpm = [pscustomobject]@{ present = [bool]$tp.TpmPresent; ready = [bool]$tp.TpmReady; specVersion = $spec }
} catch { }

$av = @()
try {
    $av = @(Get-CimInstance -Namespace 'root\SecurityCenter2' -ClassName AntivirusProduct -ErrorAction Stop | ForEach-Object {
        $hex = ([Convert]::ToString([int]$_.productState, 16)).PadLeft(6, '0')
        [pscustomobject]@{
            name     = [string]$_.displayName
            enabled  = (@('10', '11') -contains $hex.Substring(2, 2))
            upToDate = ($hex.Substring(4, 2) -eq '00')
        }
    })
} catch { }

$defender = $null
try {
    $mp = Get-MpComputerStatus -ErrorAction Stop
    $defender = [pscustomobject]@{ serviceEnabled = [bool]$mp.AMServiceEnabled; realTime = [bool]$mp.RealTimeProtectionEnabled; signaturesUpdated = Iso $mp.AntivirusSignatureLastUpdated }
} catch { }

$fw = @{}
try { foreach ($p in @(Get-NetFirewallProfile)) { $fw[[string]$p.Name] = [bool]$p.Enabled } } catch { }

$pending = $false
if (Test-Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired') { $pending = $true }
if (Test-Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending') { $pending = $true }

$features = @()
if ($isAdmin -and -not $Quick) {
    try {
        $features = @(Get-WindowsOptionalFeature -Online -ErrorAction Stop | Where-Object { $_.State -eq 'Enabled' -and $_.FeatureName -match 'Hyper-V$|HypervisorPlatform|VirtualMachinePlatform|Linux|Sandbox|Containers|SMB1|TelnetClient|TFTP' } | ForEach-Object { [string]$_.FeatureName })
    } catch { Warn ('features: ' + $_.Exception.Message) }
}

$rdp = $null
$deny = Read-Reg 'HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server' 'fDenyTSConnections'
if ($null -ne $deny) { $rdp = ([int]$deny -eq 0) }
$adminCount = $null
try { $adminCount = @(Get-LocalGroupMember -SID 'S-1-5-32-544' -ErrorAction Stop).Count } catch { }

$hvci = Read-Reg 'HKLM:\SYSTEM\CurrentControlSet\Control\DeviceGuard\Scenarios\HypervisorEnforcedCodeIntegrity' 'Enabled'
$vbsStatus = $null
try { $vbsStatus = [int](Get-CimInstance -Namespace 'root\Microsoft\Windows\DeviceGuard' -ClassName Win32_DeviceGuard -ErrorAction Stop).VirtualizationBasedSecurityStatus } catch { }

$security = [ordered]@{
    secureBoot   = $secureBoot
    tpm          = $tpm
    antivirus    = $av
    defender     = $defender
    firewall     = [pscustomobject]@{ domain = $fw['Domain']; private = $fw['Private']; public = $fw['Public'] }
    uac          = $(if ($null -ne (Read-Reg 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System' 'EnableLUA')) { ([int](Read-Reg 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System' 'EnableLUA') -eq 1) } else { $null })
    pendingReboot = $pending
    rdpEnabled   = $rdp
    localAdmins  = $adminCount
    memoryIntegrity = $(if ($null -ne $hvci) { ([int]$hvci -eq 1) } else { $null })
    vbsStatus    = $vbsStatus
    hypervisorPresent = [bool]$cs.HypervisorPresent
    optionalFeatures = $features
}

# ---------------------------------------------------------------- 6. settings
Step 6 $TOTAL 'Power, performance settings, updates'
$planName = ''
$planKind = ''
try {
    $pl = (& powercfg /getactivescheme 2>&1 | Out-String)
    if ($pl -match '\(([^)]+)\)') { $planName = $Matches[1] }
    $pg = [regex]::Match($pl, '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}')
    if ($pg.Success) {
        switch ($pg.Value.ToLower()) {
            '381b4222-f694-41f0-9685-ff5bb260df2e' { $planKind = 'balanced' }
            '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c' { $planKind = 'high' }
            'a1841308-3541-4fab-bc81-f71556f20b4a' { $planKind = 'saver' }
            'e9a42b02-d5df-448d-aa00-03f14749eb61' { $planKind = 'ultimate' }
            default { $planKind = 'other' }
        }
    }
} catch { }
$pf = @(Get-CimInstance Win32_PageFileUsage | ForEach-Object { [pscustomobject]@{ name = [string]$_.Name; allocatedMB = [int]$_.AllocatedBaseSize; usedMB = [int]$_.CurrentUsage } })

function Folder-MB([string]$p) {
    try {
        if (-not (Test-Path $p)) { return $null }
        $s = (Get-ChildItem $p -Recurse -Force -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
        return [int]([double]$s / 1MB)
    } catch { return $null }
}

$hotfixes = @(Get-HotFix | Sort-Object InstalledOn -Descending | Select-Object -First 12 | ForEach-Object {
    [pscustomobject]@{ id = [string]$_.HotFixID; description = [string]$_.Description; installedOn = Iso $_.InstalledOn }
})
$lastPatchDays = $null
if ($hotfixes.Count -gt 0 -and $hotfixes[0].installedOn) { $lastPatchDays = [int]((Get-Date) - [datetime]$hotfixes[0].installedOn).TotalDays }

$dumpCount = 0
$dumpCount += @(Get-ChildItem (Join-Path $env:windir 'Minidump') -Filter *.dmp -ErrorAction SilentlyContinue).Count
if (Test-Path (Join-Path $env:windir 'MEMORY.DMP')) { $dumpCount++ }
$liveKernel = @(Get-ChildItem (Join-Path $env:windir 'LiveKernelReports') -Directory -ErrorAction SilentlyContinue | ForEach-Object { @(Get-ChildItem $_.FullName -Filter *.dmp -ErrorAction SilentlyContinue).Count } | Measure-Object -Sum).Sum

$settings = [ordered]@{
    powerPlan    = $planName
    powerPlanKind = $planKind
    fastStartup  = $(if ($null -ne (Read-Reg 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power' 'HiberbootEnabled')) { ([int](Read-Reg 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power' 'HiberbootEnabled') -eq 1) } else { $null })
    hibernation  = [bool](Test-Path (Join-Path $env:SystemDrive 'hiberfil.sys') -ErrorAction SilentlyContinue) -or ($null -ne (Read-Reg 'HKLM:\SYSTEM\CurrentControlSet\Control\Power' 'HibernateEnabled'))
    pagefileAuto = [bool]$cs.AutomaticManagedPagefile
    pagefiles    = $pf
    trim         = $trim
    gpuScheduling = $(if ($null -ne (Read-Reg 'HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers' 'HwSchMode')) { ([int](Read-Reg 'HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers' 'HwSchMode') -eq 2) } else { $null })
    gameMode     = $(if ($null -ne (Read-Reg 'HKCU:\Software\Microsoft\GameBar' 'AutoGameModeEnabled')) { ([int](Read-Reg 'HKCU:\Software\Microsoft\GameBar' 'AutoGameModeEnabled') -eq 1) } else { $null })
    storageSense = $(if ($null -ne (Read-Reg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\StorageSense\Parameters\StoragePolicy' '01')) { ([int](Read-Reg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\StorageSense\Parameters\StoragePolicy' '01') -eq 1) } else { $null })
    tempMB       = $(if ($Quick) { [pscustomobject]@{ user = $null; windows = $null } } else { [pscustomobject]@{ user = Folder-MB $env:TEMP; windows = Folder-MB (Join-Path $env:windir 'Temp') } })
    hasBattery   = [bool](Get-CimInstance Win32_Battery)
}
$battery = $null
try {
    if ($isLaptop -or $settings.hasBattery) {
        $bf = Join-Path $raw 'battery-report.xml'
        & powercfg.exe /batteryreport /output "$bf" /xml 2>&1 | Out-Null
        if (Test-Path $bf) {
            [xml]$bx = Get-Content -LiteralPath $bf -Raw
            $b0 = @($bx.BatteryReport.Batteries.Battery)[0]
            if ($b0) {
                $design = [double]$b0.DesignCapacity
                $full = [double]$b0.FullChargeCapacity
                $cyc = $null
                if ("$($b0.CycleCount)" -ne '') { $cyc = [int]$b0.CycleCount }
                $wear = $null
                if ($design -gt 0) { $wear = [int][math]::Round((1 - ($full / $design)) * 100, 0) }
                $battery = [pscustomobject]@{
                    present = $true; designMWh = [int]$design; fullChargeMWh = [int]$full
                    cycleCount = $cyc; chemistry = [string]$b0.Chemistry; wearPercent = $wear
                }
            }
        }
    }
} catch { Warn ('battery: ' + $_.Exception.Message) }
$updates = [ordered]@{ hotfixes = $hotfixes; lastPatchDaysAgo = $lastPatchDays }
$crashDumps = [pscustomobject]@{ dumps = [int]$dumpCount; liveKernelReports = [int]$liveKernel }

# ---------------------------------------------------------------- 7. events
Step 7 $TOTAL 'Event Viewer, last 30 days (System and Application)'
$days = 60
$since = (Get-Date).AddDays(-$days)
$sysEv = @(Get-WinEvent -FilterHashtable @{ LogName = 'System'; Level = 1, 2, 3; StartTime = $since } -ErrorAction SilentlyContinue)
$appEv = @(Get-WinEvent -FilterHashtable @{ LogName = 'Application'; Level = 1, 2, 3; StartTime = $since } -ErrorAction SilentlyContinue)

foreach ($pair in @(@('System', $sysEv), @('Application', $appEv))) {
    try {
        $pair[1] | Select-Object @{ n = 'Time'; e = { $_.TimeCreated.ToString('s') } }, Id, @{ n = 'Level'; e = { LevelName $_.Level } }, ProviderName, @{ n = 'Message'; e = { FirstLine $_.Message 300 } } |
            Export-Csv -NoTypeInformation -Encoding UTF8 -Path (Join-Path $raw ('events-' + $pair[0] + '-60d.csv'))
    } catch { Warn ('csv ' + $pair[0] + ': ' + $_.Exception.Message) }
}

$crashApps = @{}
$crashApps1 = @{}
$crashApps7 = @{}
$crashApps30 = @{}
$cut1c = (Get-Date).AddDays(-1); $cut7c = (Get-Date).AddDays(-7); $cut30c = (Get-Date).AddDays(-30)
$crashPaths = @{}
foreach ($e in $appEv) {
    if ($e.ProviderName -eq 'Application Error' -and $e.Id -eq 1000) {
        $n = ''
        try { $n = [string]$e.Properties[0].Value } catch { }
        if (-not $n -and $e.Message -match 'Faulting application name:\s*([^,\r\n]+)') { $n = $Matches[1].Trim() }
        if ($n) {
            $crashApps[$n] = 1 + [int]$crashApps[$n]
            if ($e.TimeCreated -ge $cut1c) { $crashApps1[$n] = 1 + [int]$crashApps1[$n] }
            if ($e.TimeCreated -ge $cut7c) { $crashApps7[$n] = 1 + [int]$crashApps7[$n] }
            if ($e.TimeCreated -ge $cut30c) { $crashApps30[$n] = 1 + [int]$crashApps30[$n] }
            if (-not $crashPaths.ContainsKey($n)) { $pp = ''; try { $pp = [string]$e.Properties[10].Value } catch { }; $crashPaths[$n] = $pp }
        }
    }
}
$crashList = @($crashApps.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 12 | ForEach-Object { $k = [string]$_.Key; $pth = [string]$crashPaths[$k]; $ex = $null
    if ($pth -and $pth -match '^[A-Za-z]:\\') { $ex = [bool](Test-Path -LiteralPath $pth -ErrorAction SilentlyContinue) }
    [pscustomobject]@{ app = $k; count = [int]$_.Value; count1 = [int]$crashApps1[$k]; count7 = [int]$crashApps7[$k]; count30 = [int]$crashApps30[$k]; path = $pth; exists = $ex } })
$hangCount = @($appEv | Where-Object { $_.ProviderName -eq 'Application Hang' }).Count
$hang1 = @($appEv | Where-Object { $_.ProviderName -eq 'Application Hang' -and $_.TimeCreated -ge $cut1c }).Count
$hang7 = @($appEv | Where-Object { $_.ProviderName -eq 'Application Hang' -and $_.TimeCreated -ge $cut7c }).Count
$hang30 = @($appEv | Where-Object { $_.ProviderName -eq 'Application Hang' -and $_.TimeCreated -ge $cut30c }).Count

$events = [ordered]@{
    days        = $days
    system      = Summarize-Events $sysEv $days
    application = Summarize-Events $appEv $days
    appCrashes  = $crashList
    appHangs    = $hangCount
    appHangs1   = $hang1
    appHangs7   = $hang7
    appHangs30  = $hang30
}

# ---------------------------------------------------------------- 8. boot
Step 8 $TOTAL 'Boot history'
$boots = @()
try {
    $bev = @(Get-WinEvent -FilterHashtable @{ LogName = 'Microsoft-Windows-Diagnostics-Performance/Operational'; Id = 100; StartTime = (Get-Date).AddDays(-90) } -MaxEvents 20 -ErrorAction Stop)
    foreach ($b in $bev) {
        $ms = Get-EvData $b 'BootTime'
        if (-not $ms) { $mm = [regex]::Match([string]$b.Message, '(\d+)\s*ms'); if ($mm.Success) { $ms = $mm.Groups[1].Value } }
        if ($ms -match '^\d+$') { $boots += [pscustomobject]@{ time = Iso $b.TimeCreated; seconds = [math]::Round([double]$ms / 1000, 1) } }
    }
} catch { }
$slowStart = @{}
try {
    $sev = @(Get-WinEvent -FilterHashtable @{ LogName = 'Microsoft-Windows-Diagnostics-Performance/Operational'; Id = 101; StartTime = (Get-Date).AddDays(-90) } -MaxEvents 120 -ErrorAction Stop)
    foreach ($s in $sev) {
        $k = Get-EvData $s 'FileName'
        if (-not $k) { $k = Get-EvData $s 'FriendlyName' }
        if (-not $k) { $k = Get-EvData $s 'Name' }
        if (-not $k) { $m = [regex]::Match([string]$s.Message, 'File Name\s*:\s*(\S+)'); if ($m.Success) { $k = $m.Groups[1].Value } }
        if ($k) { $slowStart[$k] = 1 + [int]$slowStart[$k] }
    }
} catch { }
$slowList = @($slowStart.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 12 | ForEach-Object { [pscustomobject]@{ name = [string]$_.Key; times = [int]$_.Value } })
$bootObj = [ordered]@{ history = $boots; slowStarters = $slowList }

# ---------------------------------------------------------------- 9. installed apps
Step 9 $TOTAL 'Installed applications'
$uninstallPaths = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*', 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*', 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*'
$apps = @(Get-ItemProperty $uninstallPaths -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -and -not $_.SystemComponent -and -not $_.ParentKeyName } | ForEach-Object {
    [pscustomobject]@{
        name      = ([string]$_.DisplayName).Trim()
        version   = [string]$_.DisplayVersion
        publisher = [string]$_.Publisher
        sizeMB    = [int]([double]$_.EstimatedSize / 1024)
        installDate = [string]$_.InstallDate
    }
} | Sort-Object name, version -Unique)
try { $apps | Export-Csv -NoTypeInformation -Encoding UTF8 -Path (Join-Path $raw 'installed-apps.csv') } catch { }
$storeCount = 0
try { $storeCount = @(Get-AppxPackage | Where-Object { -not $_.IsFramework -and $_.SignatureKind -ne 'System' }).Count } catch { }

# ---------------------------------------------------------------- 10. winget
if ($Quick) { Step 10 $TOTAL 'Outdated applications (skipped in quick scan)' } else { Step 10 $TOTAL 'Outdated applications (winget)' }
$wingetText = $null
$wingetAvailable = [bool](Get-Command winget -ErrorAction SilentlyContinue)
if ($wingetAvailable -and -not $Quick) {
    try {
        $job = Start-Job -ScriptBlock {
            [Console]::OutputEncoding = [Text.Encoding]::UTF8
            & winget upgrade --include-unknown --accept-source-agreements --disable-interactivity 2>&1 | Out-String -Width 250
        }
        if (Wait-Job $job -Timeout 150) { $wingetText = [string](Receive-Job $job) } else { Warn 'winget: timed out after 150 s'; Stop-Job $job }
        Remove-Job $job -Force
    } catch { Warn ('winget: ' + $_.Exception.Message) }
}
$outdated = @(ConvertFrom-WingetUpgrade $wingetText)
if ($wingetText) { try { $wingetText | Out-File -Encoding UTF8 -FilePath (Join-Path $raw 'winget-outdated.txt') } catch { } }

# ---------------------------------------------------------------- 11. startup / services / processes
Step 11 $TOTAL 'Startup items, services, running processes'
$startupItems = @(Get-CimInstance Win32_StartupCommand | Select-Object Name, Command, Location | Sort-Object Name, Command -Unique | ForEach-Object {
    [pscustomobject]@{ name = [string]$_.Name; command = [string]$_.Command; location = [string]$_.Location }
})
$svc = @(Get-CimInstance Win32_Service)
$svcThird = @($svc | Where-Object { $_.StartMode -eq 'Auto' -and $_.PathName -notmatch '(?i)\\windows\\|system32|svchost' } | ForEach-Object {
    [pscustomobject]@{ name = [string]$_.Name; display = [string]$_.DisplayName; state = [string]$_.State }
})
$svcFailed = @($svc | Where-Object { $_.StartMode -eq 'Auto' -and $_.State -ne 'Running' -and [int]$_.ExitCode -ne 0 } | ForEach-Object {
    [pscustomobject]@{ name = [string]$_.Name; display = [string]$_.DisplayName; exitCode = [int]$_.ExitCode }
})
$tasks = @()
try {
    $tasks = @(Get-ScheduledTask -ErrorAction Stop | Where-Object { $_.TaskPath -notlike '\Microsoft\*' -and $_.State -ne 'Disabled' } | Select-Object -First 80 | ForEach-Object { [pscustomobject]@{ name = [string]$_.TaskName; state = [string]$_.State } })
} catch { }
$procs = @(Get-Process | Group-Object Name | ForEach-Object {
    [pscustomobject]@{ name = [string]$_.Name; instances = [int]$_.Count; ramMB = [int](($_.Group | Measure-Object WorkingSet64 -Sum).Sum / 1MB); cpuSeconds = [int](($_.Group | Measure-Object CPU -Sum).Sum) }
})
$topRam = @($procs | Sort-Object ramMB -Descending | Select-Object -First 12)
$topCpu = @($procs | Sort-Object cpuSeconds -Descending | Select-Object -First 8)
try { $startupItems | Export-Csv -NoTypeInformation -Encoding UTF8 -Path (Join-Path $raw 'startup-items.csv') } catch { }
$startup = [ordered]@{
    items = $startupItems; thirdPartyServices = $svcThird; failedAutoServices = $svcFailed
    scheduledTasks = $tasks; topRam = $topRam; topCpu = $topCpu
}

# ---------------------------------------------------------------- 12. drivers
Step 12 $TOTAL 'Drivers and devices'
$problemDevices = @(Get-PnpDevice -PresentOnly | Where-Object { $_.Status -ne 'OK' } | ForEach-Object {
    [pscustomobject]@{
        class    = [string]$_.Class
        name     = [string]$_.FriendlyName
        status   = [string]$_.Status
        problem  = [string]$_.Problem
        disabled = ([string]$_.Problem -match 'DISABLED')
    }
})
$oldDrivers = @()
if (-not $Quick) { $oldDrivers = @(Get-CimInstance Win32_PnPSignedDriver | Where-Object {
    $_.DriverProviderName -and $_.DriverProviderName -ne 'Microsoft' -and $_.DriverDate -and $_.DriverDate.Year -ge 2000 -and $_.DriverDate -lt (Get-Date).AddYears(-4) -and $_.DeviceName
} | Sort-Object DriverDate | Select-Object -First 25 | ForEach-Object {
    [pscustomobject]@{ device = [string]$_.DeviceName; provider = [string]$_.DriverProviderName; version = [string]$_.DriverVersion; date = Iso $_.DriverDate }
}) }
$drivers = [ordered]@{ problemDevices = $problemDevices; oldDrivers = $oldDrivers }

# ---------------------------------------------------------------- 13. image health
Step 13 $TOTAL 'Windows image health (DISM CheckHealth)'
$dism = [pscustomobject]@{ state = 'skipped'; text = '' }
if ($isAdmin -and -not $Quick) {
    try {
        $rw = $null
        try { $rw = Repair-WindowsImage -Online -CheckHealth -ErrorAction Stop } catch { }
        if ($rw -and $rw.ImageHealthState) {
            $hs = [string]$rw.ImageHealthState
            $st0 = 'unknown'
            if ($hs -eq 'Healthy') { $st0 = 'healthy' } elseif ($hs -eq 'Repairable') { $st0 = 'repairable' } elseif ($hs -eq 'NonRepairable') { $st0 = 'corrupt' }
            $dism = [pscustomobject]@{ state = $st0; text = 'ImageHealthState: ' + $hs }
        }
    } catch { }
    if ($dism.state -eq 'skipped') { try {
        $dt = (& dism.exe /Online /Cleanup-Image /CheckHealth 2>&1 | Out-String)
        $st = 'unknown'
        if ($dt -match 'not repairable') { $st = 'corrupt' }
        elseif ($dt -match 'repairable') { $st = 'repairable' }
        elseif ($dt -match 'No component store corruption') { $st = 'healthy' }
        $dism = [pscustomobject]@{ state = $st; text = (($dt -split "`r?`n" | Where-Object { $_.Trim() }) | Select-Object -Last 4) -join ' | ' }
    } catch { Warn ('dism: ' + $_.Exception.Message) } }
}

# ---------------------------------------------------------------- 14. extras
Step 14 $TOTAL 'Reliability, security details, network test, backups'

# --- reliability (stability index, blue screen codes)
$relIndex = $null; $relLatest = $null
try {
    $rm = @(Get-CimInstance -ClassName Win32_ReliabilityStabilityMetrics -ErrorAction Stop | Sort-Object TimeGenerated -Descending | Select-Object -First 7)
    if ($rm.Count -gt 0) {
        $relLatest = [math]::Round([double]$rm[0].SystemStabilityIndex, 1)
        $relIndex = [math]::Round((($rm | Measure-Object -Property SystemStabilityIndex -Average).Average), 1)
    }
} catch { }
$bugchecks = @()
try {
    $bugchecks = @($sysEv | Where-Object { $_.Id -eq 1001 -and $_.ProviderName -match 'WER-SystemErrorReporting|BugCheck' } | Select-Object -First 10 | ForEach-Object {
        $code = ''
        $bsrc = [string]$_.Message
        try { $bsrc = [string]$_.Properties[0].Value + ' ' + $bsrc } catch { }
        $bm = [regex]::Match($bsrc, '0x[0-9a-fA-F]{2,8}')
        if ($bm.Success) { $code = $bm.Value.ToLower() }
        [pscustomobject]@{ time = Iso $_.TimeCreated; code = $code }
    })
} catch { }
$reliability = [pscustomobject]@{ stabilityIndex = $relIndex; stabilityLatest = $relLatest; bugchecks = $bugchecks }

# --- security details
$defExtra = $null
try {
    $mp2 = Get-MpComputerStatus -ErrorAction Stop
    $threats = 0; $lastThreat = $null
    try {
        $td = @(Get-MpThreatDetection -ErrorAction Stop | Where-Object { $_.InitialDetectionTime -gt $since })
        $threats = $td.Count
        if ($td.Count -gt 0) { $lastThreat = Iso ($td | Sort-Object InitialDetectionTime -Descending | Select-Object -First 1).InitialDetectionTime }
    } catch { }
    $defExtra = [pscustomobject]@{
        signatureAgeDays = $(if ($mp2.AntivirusSignatureAge -ge 0 -and $mp2.AntivirusSignatureAge -lt 9999) { [int]$mp2.AntivirusSignatureAge } else { $null })
        quickScanAgeDays = $(if ($mp2.QuickScanAge -ge 0 -and $mp2.QuickScanAge -lt 99999) { [int]$mp2.QuickScanAge } else { $null })
        fullScanAgeDays  = $(if ($mp2.FullScanAge -ge 0 -and $mp2.FullScanAge -lt 99999) { [int]$mp2.FullScanAge } else { $null })
        tamperProtected  = [bool]$mp2.IsTamperProtected
        threats30d       = $threats
        lastThreat       = $lastThreat
    }
} catch { }

$nla = Read-Reg 'HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server\WinStations\RDP-Tcp' 'UserAuthentication'
$autoLogon = Read-Reg 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon' 'AutoAdminLogon'
$uacPrompt = Read-Reg 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System' 'ConsentPromptBehaviorAdmin'
$smb1 = $null
try { $smb1 = [bool](Get-SmbServerConfiguration -ErrorAction Stop).EnableSMB1Protocol } catch { }
$adminNames = @()
try { $adminNames = @(Get-LocalGroupMember -SID 'S-1-5-32-544' -ErrorAction Stop | ForEach-Object { [string]$_.Name }) } catch { }
$shares = @()
try { $shares = @(Get-SmbShare -ErrorAction Stop | Where-Object { $_.Name -notmatch '\$$' } | ForEach-Object { [pscustomobject]@{ name = [string]$_.Name; path = [string]$_.Path } }) } catch { }
$listening = @()
try {
    $procMap = @{}
    foreach ($pp in @(Get-Process)) { $procMap[[int]$pp.Id] = [string]$pp.ProcessName }
    $seen = @{}
    foreach ($c in @(Get-NetTCPConnection -State Listen -ErrorAction Stop)) {
        if ($c.LocalAddress -eq '127.0.0.1' -or $c.LocalAddress -eq '::1') { continue }
        $pn = [string]$procMap[[int]$c.OwningProcess]
        $k = [string]$c.LocalPort + '|' + $pn
        if (-not $seen.ContainsKey($k)) {
            $seen[$k] = 1
            $listening += [pscustomobject]@{ port = [int]$c.LocalPort; process = $pn; allInterfaces = ($c.LocalAddress -eq '0.0.0.0' -or $c.LocalAddress -eq '::') }
        }
    }
    $listening = @($listening | Sort-Object port | Select-Object -First 40)
} catch { }
$activation = $null
try {
    $lic = @(Get-CimInstance -ClassName SoftwareLicensingProduct -Filter "PartialProductKey IS NOT NULL AND ApplicationId='55c92734-d682-4d71-983e-d6ec3f16059f'" -ErrorAction Stop | Select-Object -First 1)
    if ($lic.Count -gt 0) { $activation = [int]$lic[0].LicenseStatus }
} catch { }
$unsigned = @()
if (-not $Quick) {
    try { $unsigned = @(Get-CimInstance Win32_PnPSignedDriver -ErrorAction Stop | Where-Object { $_.IsSigned -eq $false -and $_.DeviceName } | Select-Object -First 15 | ForEach-Object { [pscustomobject]@{ device = [string]$_.DeviceName; provider = [string]$_.DriverProviderName } }) } catch { }
}
$securityMore = [pscustomobject]@{
    defender = $defExtra; nlaRequired = $(if ($null -ne $nla) { ([int]$nla -eq 1) } else { $null })
    autoLogon = $(if ($null -ne $autoLogon) { ([string]$autoLogon -eq '1') } else { $null })
    uacPromptLevel = $(if ($null -ne $uacPrompt) { [int]$uacPrompt } else { $null })
    smb1Enabled = $smb1; adminNames = $adminNames; shares = $shares; listening = $listening
    activation = $activation; unsignedDrivers = $unsigned
}

# --- network test: ping the router, one DNS lookup, time sync, Wi-Fi, proxy, hosts file
$gateway = ''
try { $gateway = [string](@(Get-NetIPConfiguration -ErrorAction Stop | Where-Object { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq 'Up' } | Select-Object -First 1).IPv4DefaultGateway.NextHop) } catch { }
$ping = $null
if ($gateway) {
    try {
        $png = New-Object System.Net.NetworkInformation.Ping
        $ms = @(); $lost = 0
        for ($i = 0; $i -lt 5; $i++) {
            $r = $png.Send($gateway, 1500)
            if ($r.Status -eq 'Success') { $ms += [double]$r.RoundtripTime } else { $lost++ }
        }
        $avg = $null; if ($ms.Count -gt 0) { $avg = [math]::Round((($ms | Measure-Object -Average).Average), 1) }
        $ping = [pscustomobject]@{ target = 'router'; sent = 5; lost = $lost; avgMs = $avg }
    } catch { }
}
$dnsTest = $null
try {
    $sw = [Diagnostics.Stopwatch]::StartNew()
    $ips = @([System.Net.Dns]::GetHostAddresses('www.microsoft.com'))
    $sw.Stop()
    $dnsTest = [pscustomobject]@{ ok = ($ips.Count -gt 0); ms = [int]$sw.ElapsedMilliseconds }
} catch { $dnsTest = [pscustomobject]@{ ok = $false; ms = $null } }
$timeSync = $null
try {
    $w32 = Get-Service -Name w32time -ErrorAction Stop
    $tp = [string](Read-Reg 'HKLM:\SYSTEM\CurrentControlSet\Services\W32Time\Parameters' 'Type')
    $srv = [string](Read-Reg 'HKLM:\SYSTEM\CurrentControlSet\Services\W32Time\Parameters' 'NtpServer')
    $timeSync = [pscustomobject]@{ serviceRunning = ([string]$w32.Status -eq 'Running'); type = $tp; source = $(if ($srv) { $srv } else { $tp }); local = ($tp -eq 'NoSync') }
} catch { }
$wifi = $null
try {
    $wl = (& netsh.exe wlan show interfaces 2>&1 | Out-String)
    $sg = [regex]::Match($wl, '(?m)^\s*[^:\r\n]+:\s*(\d{1,3})%\s*$')
    if ($sg.Success) {
        $bnd = [regex]::Match($wl, '([2-7](?:\.\d)?)\s*GHz')
        $rad = [regex]::Match($wl, '802\.11[a-z]{1,2}')
        $wifi = [pscustomobject]@{ signalPct = [int]$sg.Groups[1].Value; band = $(if ($bnd.Success) { $bnd.Value } else { '' }); radio = $rad.Value }
    }
} catch { }
$ie = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings'
$proxyOn = $null; $pe = Read-Reg $ie 'ProxyEnable'; if ($null -ne $pe) { $proxyOn = ([int]$pe -eq 1) }
$pac = [string](Read-Reg $ie 'AutoConfigURL')
$hostsExtra = @()
try {
    $hostsExtra = @(Get-Content -Path (Join-Path $env:windir 'System32\drivers\etc\hosts') -ErrorAction Stop | ForEach-Object { $_.Trim() } | Where-Object { $_ -and -not $_.StartsWith('#') -and $_ -notmatch '^\S+\s+localhost\s*$' } | Select-Object -First 10)
} catch { }
$networkTest = [pscustomobject]@{ gateway = [bool]$gateway; ping = $ping; dns = $dnsTest; timeSync = $timeSync; wifi = $wifi; proxyEnabled = $proxyOn; pacUrl = [bool]$pac; hostsEntries = $hostsExtra }

# --- backups and recovery
$restore = [pscustomobject]@{ readable = $false; count = 0; lastDaysAgo = $null }
if ($isAdmin) {
    try {
        $rp = @(Get-ComputerRestorePoint -ErrorAction Stop)
        $last = $null; if ($rp.Count -gt 0) { $last = [int]((Get-Date) - [Management.ManagementDateTimeConverter]::ToDateTime($rp[$rp.Count - 1].CreationTime)).TotalDays }
        $restore = [pscustomobject]@{ readable = $true; count = $rp.Count; lastDaysAgo = $last }
    } catch { }
}
$fileHistory = $false
try { $fileHistory = (Test-Path (Join-Path $env:LOCALAPPDATA 'Microsoft\Windows\FileHistory\Configuration\Config1.xml')) } catch { }
$oneDrive = [pscustomobject]@{ documents = $false; desktop = $false; pictures = $false }
try {
    $oneDrive = [pscustomobject]@{
        documents = ([Environment]::GetFolderPath('MyDocuments') -match 'OneDrive')
        desktop   = ([Environment]::GetFolderPath('Desktop') -match 'OneDrive')
        pictures  = ([Environment]::GetFolderPath('MyPictures') -match 'OneDrive')
    }
} catch { }
$winre = $null
if ($isAdmin) {
    try {
        $re = (& reagentc.exe /info 2>&1 | Out-String)
        if ($re -match 'harddisk\d+\\partition\d+' -or $re -match '(?im)Windows RE status:\s*Enabled') { $winre = $true }
        elseif ($re -match '00000000-0000-0000-0000-000000000000' -or $re -match '(?im)Windows RE status:\s*Disabled') { $winre = $false }
    } catch { }
}
$backup = [pscustomobject]@{ restorePoints = $restore; fileHistory = $fileHistory; oneDriveFolders = $oneDrive; winRE = $winre }

$extras = [pscustomobject]@{ reliability = $reliability; securityMore = $securityMore; networkTest = $networkTest; backup = $backup }

# ---------------------------------------------------------------- 15. where the disk space went
Step 15 $TOTAL 'Where the disk space went (read-only, can take a few minutes)'
$spaceInfo = $null
$gaming = [pscustomobject]@{ gameDvr = $null; gameMode = $settings.gameMode; hags = $settings.gpuScheduling }
try { $gd = Read-Reg 'HKCU:\System\GameConfigStore' 'GameDVR_Enabled'; if ($null -ne $gd) { $gaming.gameDvr = ([int]$gd -eq 1) } } catch { }
if (-not $Quick) {
    try {
        $script:bigFiles = New-Object System.Collections.ArrayList
        function Measure-Dir([string]$p, [int]$maxSec, [bool]$trackBig) {
            $sw = [Diagnostics.Stopwatch]::StartNew(); $sum = [long]0; $partial = $false
            try {
                $stack = New-Object System.Collections.Stack; $stack.Push($p)
                while ($stack.Count -gt 0) {
                    if ($sw.Elapsed.TotalSeconds -gt $maxSec) { $partial = $true; break }
                    $d = [string]$stack.Pop()
                    try {
                        foreach ($f in [IO.Directory]::EnumerateFiles($d)) {
                            try {
                                $fi = New-Object IO.FileInfo $f
                                $sum += $fi.Length
                                if ($trackBig -and $fi.Length -gt 300MB) { [void]$script:bigFiles.Add([pscustomobject]@{ path = $f; mb = [int]($fi.Length / 1MB); modified = Iso $fi.LastWriteTime }) }
                            } catch { }
                        }
                    } catch { }
                    try {
                        foreach ($s in [IO.Directory]::EnumerateDirectories($d)) {
                            try { $a = [IO.File]::GetAttributes($s); if (($a -band [IO.FileAttributes]::ReparsePoint) -eq 0) { $stack.Push($s) } } catch { }
                        }
                    } catch { }
                }
            } catch { }
            return [pscustomobject]@{ mb = [int]($sum / 1MB); partial = $partial }
        }
        $up = $env:USERPROFILE
        $targets = @(
            @('Downloads', (Join-Path $up 'Downloads'), $true), @('Documents', (Join-Path $up 'Documents'), $true), @('Desktop', (Join-Path $up 'Desktop'), $true),
            @('Pictures', (Join-Path $up 'Pictures'), $false), @('Videos', (Join-Path $up 'Videos'), $true), @('Music', (Join-Path $up 'Music'), $false),
            @('OneDrive', (Join-Path $up 'OneDrive'), $false), @('AppData Local', (Join-Path $up 'AppData\Local'), $false),
            @('Temp (user)', $env:TEMP, $false), @('Temp (Windows)', (Join-Path $env:windir 'Temp'), $false),
            @('Windows Update downloads', (Join-Path $env:windir 'SoftwareDistribution\Download'), $false),
            @('Windows.old', (Join-Path $env:SystemDrive 'Windows.old'), $false),
            @('Program Files', $env:ProgramFiles, $false), @('ProgramData', $env:ProgramData, $false)
        )
        $folders = @(); $swAll = [Diagnostics.Stopwatch]::StartNew()
        foreach ($t in $targets) {
            if (-not (Test-Path -LiteralPath $t[1])) { continue }
            if ($swAll.Elapsed.TotalSeconds -gt 240) { Warn 'space analysis stopped early (time limit)'; break }
            $m = Measure-Dir $t[1] 30 $t[2]
            $folders += [pscustomobject]@{ name = [string]$t[0]; path = [string]$t[1]; mb = $m.mb; partial = $m.partial }
        }
        $sys = @()
        foreach ($n in @('hiberfil.sys', 'pagefile.sys', 'swapfile.sys')) {
            try { $fi = Get-Item -LiteralPath (Join-Path $env:SystemDrive $n) -Force -ErrorAction Stop; $sys += [pscustomobject]@{ name = $n; mb = [int]($fi.Length / 1MB) } } catch { }
        }
        $installers = [pscustomobject]@{ count = 0; mb = 0 }
        try {
            $old = @(Get-ChildItem -LiteralPath (Join-Path $up 'Downloads') -File -Force -ErrorAction Stop | Where-Object { $_.Extension -match '^\.(exe|msi|iso|zip|7z|rar|msix)$' -and $_.LastWriteTime -lt (Get-Date).AddDays(-60) })
            $installers = [pscustomobject]@{ count = $old.Count; mb = [int](($old | Measure-Object Length -Sum).Sum / 1MB) }
        } catch { }
        $recycle = $null
        try { $rb = Measure-Dir (Join-Path $env:SystemDrive '$Recycle.Bin') 20 $false; $recycle = $rb.mb } catch { }
        $spaceInfo = [pscustomobject]@{
            folders = @($folders | Sort-Object mb -Descending)
            systemFiles = $sys
            bigFiles = @($script:bigFiles | Sort-Object mb -Descending | Select-Object -First 10)
            oldInstallers = $installers
            recycleBinMB = $recycle
        }
    } catch { Warn ('space analysis: ' + $_.Exception.Message) }
}
$extras | Add-Member -NotePropertyName storage -NotePropertyValue $spaceInfo -Force
$extras | Add-Member -NotePropertyName gaming -NotePropertyValue $gaming -Force

# ---------------------------------------------------------------- 16. crash dump codes and the event timeline
Step 16 $TOTAL 'Crash dump files and the timeline of events'
$dumps = @()
try {
    $dfiles = @(Get-ChildItem -LiteralPath (Join-Path $env:windir 'Minidump') -Filter *.dmp -File -ErrorAction Stop | Sort-Object LastWriteTime -Descending | Select-Object -First 10)
    $mem = Join-Path $env:windir 'MEMORY.DMP'
    if (Test-Path -LiteralPath $mem) { $dfiles += Get-Item -LiteralPath $mem -Force }
    foreach ($f in $dfiles) {
        $dcode = $null; $dpar = @()
        try {
            $fs = [IO.File]::Open($f.FullName, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::ReadWrite)
            try { $buf = New-Object byte[] 128; [void]$fs.Read($buf, 0, 128) } finally { $fs.Close() }
            if ([Text.Encoding]::ASCII.GetString($buf, 0, 8) -eq 'PAGEDU64') {
                $dcode = '0x{0:x8}' -f [BitConverter]::ToUInt32($buf, 56)
                for ($i = 0; $i -lt 4; $i++) { $dpar += ('0x{0:x}' -f [BitConverter]::ToUInt64($buf, 64 + 8 * $i)) }
            }
        } catch { }
        $dumps += [pscustomobject]@{ file = [string]$f.Name; time = Iso $f.LastWriteTime; sizeMB = [int]($f.Length / 1MB); code = $dcode; params = $dpar }
    }
} catch { }

$tl = New-Object System.Collections.ArrayList
function Add-Tl($ev, [string]$kind, [string]$x) {
    if ($x.Length -gt 70) { $x = $x.Substring(0, 70) }
    [void]$tl.Add([pscustomobject]@{ t = Iso $ev.TimeCreated; k = $kind; x = $x })
}
function Ev-Prop($ev, [int]$i) { try { return [string]$ev.Properties[$i].Value } catch { return '' } }
try {
    foreach ($e in $sysEv) {
        $pr = [string]$e.ProviderName; $id = [int]$e.Id
        if ($pr -match 'Kernel-Power' -and $id -eq 41) { Add-Tl $e 'unclean' '' }
        elseif ($pr -match 'WER-SystemErrorReporting' -and $id -eq 1001) { Add-Tl $e 'bsod' '' }
        elseif ($pr -eq 'EventLog' -and $id -eq 6008) { Add-Tl $e 'unclean' 'dirty shutdown' }
        elseif ($pr -match 'WHEA-Logger') { Add-Tl $e 'whea' ('id ' + $id) }
        elseif ($pr -match '^(disk|Ntfs|stornvme|storahci|volmgr|nvme)$' -and (@(7, 11, 15, 51, 55, 98, 129, 153, 157) -contains $id)) { Add-Tl $e 'disk' ($pr + ' ' + $id) }
        elseif ($pr -match '^(nvlddmkm|amdkmdag|atikmpag|Display)$') { Add-Tl $e 'gpu' ($pr + ' ' + $id) }
        elseif ($pr -eq 'Service Control Manager' -and (@(7031, 7034) -contains $id)) { Add-Tl $e 'svc' (Ev-Prop $e 0) }
        elseif ($pr -eq 'Tcpip' -and (@(4266, 4231) -contains $id)) { Add-Tl $e 'ports' '' }
        elseif ($pr -match 'WindowsUpdateClient' -and $id -eq 20) { Add-Tl $e 'updfail' (FirstLine $e.Message 70) }
    }
    foreach ($e in $appEv) {
        if ($e.ProviderName -eq 'Application Error' -and $e.Id -eq 1000) { Add-Tl $e 'crash' (Ev-Prop $e 0) }
        elseif ($e.ProviderName -eq 'Application Hang') { Add-Tl $e 'hang' (Ev-Prop $e 0) }
    }
    $infoSys = @(Get-WinEvent -FilterHashtable @{ LogName = 'System'; Id = 19, 1074, 7045, 42, 107; StartTime = $since } -MaxEvents 700 -ErrorAction SilentlyContinue)
    foreach ($e in $infoSys) {
        $pr = [string]$e.ProviderName; $id = [int]$e.Id
        if ($pr -match 'WindowsUpdateClient' -and $id -eq 19) { $ut = Ev-Prop $e 0; if (-not $ut) { $ut = FirstLine $e.Message 70 }; Add-Tl $e 'update' $ut }
        elseif ($pr -eq 'User32' -and $id -eq 1074) { $pn = Ev-Prop $e 0; if ($pn -match '[\\/]') { $pn = Split-Path -Leaf $pn }; Add-Tl $e 'shutdown' ((Ev-Prop $e 4) + ' ' + $pn) }
        elseif ($pr -eq 'Service Control Manager' -and $id -eq 7045) { Add-Tl $e 'svcinst' (Ev-Prop $e 0) }
        elseif ($pr -match 'Kernel-Power' -and $id -eq 42) { Add-Tl $e 'sleep' '' }
        elseif ($pr -match 'Kernel-Power' -and $id -eq 107) { Add-Tl $e 'wake' '' }
    }
    $infoApp = @(Get-WinEvent -FilterHashtable @{ LogName = 'Application'; ProviderName = 'MsiInstaller'; Id = 11707, 11724; StartTime = $since } -MaxEvents 300 -ErrorAction SilentlyContinue)
    foreach ($e in $infoApp) {
        $pn = ''; $m1 = [regex]::Match([string]$e.Message, '(?i)(?:Product|Produkt|:)\s*([^-\r\n]{3,60})\s*--')
        if ($m1.Success) { $pn = $m1.Groups[1].Value.Trim() } else { $pn = FirstLine $e.Message 60 }
        if ($e.Id -eq 11707) { Add-Tl $e 'install' $pn } else { Add-Tl $e 'uninstall' $pn }
    }
    foreach ($b in $boots) { [void]$tl.Add([pscustomobject]@{ t = [string]$b.time; k = 'boot'; x = [string]$b.seconds }) }
} catch { Warn ('timeline: ' + $_.Exception.Message) }
$timeline = @($tl | Sort-Object t -Descending | Select-Object -First 1500 | Sort-Object t)
$extras | Add-Member -NotePropertyName dumps -NotePropertyValue $dumps -Force
$extras | Add-Member -NotePropertyName timeline -NotePropertyValue $timeline -Force

# ---------------------------------------------------------------- 17. accounts, signatures, browser add-ons, licences, certificates, updates, network, temperature
Step 17 $TOTAL 'Accounts, signatures, add-ons, licences, updates, network, temperature'

function Get-ExePath([string]$cmd) {
    if (-not $cmd) { return $null }
    $c = [Environment]::ExpandEnvironmentVariables($cmd.Trim())
    if ($c.StartsWith('"')) { $e = $c.IndexOf('"', 1); if ($e -gt 1) { return $c.Substring(1, $e - 1) } }
    $m = [regex]::Match($c, '(?i)^(.+?\.(exe|bat|cmd|com|scr|ps1|vbs|js|dll))(\s|$)')
    if ($m.Success) { return $m.Groups[1].Value }
    return $null
}
function CnOf([string]$subject) {
    $m = [regex]::Match([string]$subject, 'CN=([^,]+)')
    if ($m.Success) { return $m.Groups[1].Value.Trim('"') }
    return [string]$subject
}

# --- local accounts
$accounts = @()
try {
    $accounts = @(Get-LocalUser -ErrorAction Stop | Select-Object -First 20 | ForEach-Object {
        $ll = $null; if ($_.LastLogon) { $ll = [int]((Get-Date) - $_.LastLogon).TotalDays }
        [pscustomobject]@{
            name = [string]$_.Name; enabled = [bool]$_.Enabled
            noPassword = (-not [bool]$_.PasswordRequired); neverExpires = ($null -eq $_.PasswordExpires)
            lastLogonDays = $ll; isGuest = ([string]$_.SID.Value -like '*-501'); isBuiltinAdmin = ([string]$_.SID.Value -like '*-500')
            isAdmin = $false
        }
    })
} catch { }
try {
    foreach ($a in $accounts) { $a.isAdmin = (@($adminNames | Where-Object { $_ -eq $a.name -or $_ -like ('*\' + $a.name) }).Count -gt 0) }
} catch { }

# --- digital signatures of start-up programs and non-Microsoft scheduled tasks (read-only)
$sigChecked = 0; $sigFlags = @()
if (-not $Quick) {
    try {
        $paths = @{}
        foreach ($si in @($startup.items)) { $p = Get-ExePath $si.command; if ($p) { $paths[$p.ToLower()] = @{ path = $p; name = [string]$si.name } } }
        try {
            foreach ($t in @(Get-ScheduledTask -ErrorAction Stop | Where-Object { $_.TaskPath -notlike '\Microsoft\*' -and $_.State -ne 'Disabled' } | Select-Object -First 60)) {
                foreach ($ac in @($t.Actions)) { $p = Get-ExePath ([string]$ac.Execute); if ($p) { $paths[$p.ToLower()] = @{ path = $p; name = [string]$t.TaskName } } }
            }
        } catch { }
        foreach ($k in @($paths.Keys | Select-Object -First 45)) {
            $it = $paths[$k]
            if (-not (Test-Path -LiteralPath $it.path)) { continue }
            if ($it.path -match '(?i)\.(dll|js|vbs)$') { continue }
            $sigChecked++
            $st = 'Unknown'; $sn = ''
            try { $sg = Get-AuthenticodeSignature -LiteralPath $it.path -ErrorAction Stop; $st = [string]$sg.Status; if ($sg.SignerCertificate) { $sn = CnOf $sg.SignerCertificate.Subject } } catch { }
            $odd = ($it.path -match '(?i)\\Temp\\|\\Downloads\\|\\Users\\Public\\|\\AppData\\Local\\Temp')
            if ($st -ne 'Valid' -or $odd) { $sigFlags += [pscustomobject]@{ name = $it.name; file = (Split-Path -Leaf $it.path); folder = (Split-Path -Parent $it.path); status = $st; signer = $sn; oddFolder = $odd } }
        }
    } catch { Warn ('signatures: ' + $_.Exception.Message) }
}

# --- Wi-Fi networks saved on this PC (only name and security type, never the passwords)
$wifiSaved = @()
try {
    foreach ($f in @(Get-ChildItem -Path (Join-Path $env:ProgramData 'Microsoft\Wlansvc\Profiles\Interfaces') -Recurse -Filter *.xml -ErrorAction Stop)) {
        $tx = [IO.File]::ReadAllText($f.FullName)
        $nm = [regex]::Match($tx, '<name>([^<]*)</name>'); $au = [regex]::Match($tx, '<authentication>([^<]*)</authentication>'); $en = [regex]::Match($tx, '<encryption>([^<]*)</encryption>')
        if ($nm.Success) { $wifiSaved += [pscustomobject]@{ name = $nm.Groups[1].Value; auth = $au.Groups[1].Value; enc = $en.Groups[1].Value } }
    }
    $wifiSaved = @($wifiSaved | Select-Object -First 60)
} catch { }

# --- browser add-ons (name and the permissions they ask for)
$riskyPerms = @('webRequest', 'webRequestBlocking', 'cookies', 'history', 'tabs', 'nativeMessaging', 'proxy', 'debugger', 'clipboardRead', 'management', 'browsingData', 'privacy', 'downloads')
$browserExt = @()
function Get-ChromiumExt([string]$label, [string]$base) {
    $res = @()
    if (-not (Test-Path -LiteralPath $base)) { return $res }
    $seenIds = @{}
    foreach ($prof in @(Get-ChildItem -LiteralPath $base -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -eq 'Default' -or $_.Name -like 'Profile *' })) {
        $ed = Join-Path $prof.FullName 'Extensions'
        if (-not (Test-Path -LiteralPath $ed)) { continue }
        foreach ($ext in @(Get-ChildItem -LiteralPath $ed -Directory -ErrorAction SilentlyContinue)) {
            if ($seenIds.ContainsKey($ext.Name)) { continue }
            $vd = @(Get-ChildItem -LiteralPath $ext.FullName -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending | Select-Object -First 1)
            if ($vd.Count -eq 0) { continue }
            $mf = Join-Path $vd[0].FullName 'manifest.json'
            if (-not (Test-Path -LiteralPath $mf)) { continue }
            try {
                $j = [IO.File]::ReadAllText($mf) | ConvertFrom-Json -ErrorAction Stop
                $nm = [string]$j.name
                if ($nm -like '__MSG_*') {
                    $key = $nm.Substring(6).TrimEnd('_'); $found = $null
                    $dl = [string]$j.default_locale; if (-not $dl) { $dl = 'en' }
                    foreach ($loc in @($dl, 'en', 'en_US')) {
                        $mp = Join-Path $vd[0].FullName ('_locales\' + $loc + '\messages.json')
                        if (Test-Path -LiteralPath $mp) {
                            try { $mj = [IO.File]::ReadAllText($mp) | ConvertFrom-Json; $pr = $mj.PSObject.Properties | Where-Object { $_.Name -ieq $key } | Select-Object -First 1; if ($pr) { $found = [string]$pr.Value.message; break } } catch { }
                        }
                    }
                    if ($found) { $nm = $found } else { $nm = $ext.Name }
                }
                $perms = @(); foreach ($pm in @($j.permissions)) { if ($pm -is [string]) { $perms += $pm } }
                $hosts = @(); foreach ($hm in @($j.host_permissions)) { $hosts += [string]$hm }
                foreach ($pm in @($j.permissions)) { if ($pm -is [string] -and ($pm -match '://' -or $pm -eq '<all_urls>')) { $hosts += $pm } }
                $allUrls = (@($hosts | Where-Object { $_ -eq '<all_urls>' -or $_ -match '^\*://\*/\*$|^https?://\*/\*$' }).Count -gt 0)
                $risk = @($perms | Where-Object { $riskyPerms -contains $_ } | Select-Object -Unique)
                $seenIds[$ext.Name] = 1
                $res += [pscustomobject]@{ browser = $label; id = [string]$ext.Name; name = $nm; version = [string]$j.version; risky = $risk; allUrls = $allUrls }
            } catch { }
        }
    }
    return @($res | Select-Object -First 60)
}
try {
    $browserExt += Get-ChromiumExt 'Chrome' (Join-Path $env:LOCALAPPDATA 'Google\Chrome\User Data')
    $browserExt += Get-ChromiumExt 'Edge' (Join-Path $env:LOCALAPPDATA 'Microsoft\Edge\User Data')
    $browserExt += Get-ChromiumExt 'Brave' (Join-Path $env:LOCALAPPDATA 'BraveSoftware\Brave-Browser\User Data')
    $ffRoot = Join-Path $env:APPDATA 'Mozilla\Firefox\Profiles'
    if (Test-Path -LiteralPath $ffRoot) {
        foreach ($pf in @(Get-ChildItem -LiteralPath $ffRoot -Directory -ErrorAction SilentlyContinue)) {
            $ej = Join-Path $pf.FullName 'extensions.json'
            if (-not (Test-Path -LiteralPath $ej)) { continue }
            try {
                $fj = [IO.File]::ReadAllText($ej) | ConvertFrom-Json
                foreach ($ad in @($fj.addons | Where-Object { $_.type -eq 'extension' -and $_.location -eq 'app-profile' -and $_.active })) {
                    $perms = @(@($ad.userPermissions.permissions) | Where-Object { $_ })
                    $orig = @(@($ad.userPermissions.origins) | Where-Object { $_ })
                    $browserExt += [pscustomobject]@{ browser = 'Firefox'; id = [string]$ad.id; name = [string]$ad.defaultLocale.name; version = [string]$ad.version
                        risky = @($perms | Where-Object { $riskyPerms -contains $_ } | Select-Object -Unique); allUrls = (@($orig | Where-Object { $_ -eq '<all_urls>' -or $_ -match '^\*://\*/\*$' }).Count -gt 0) }
                }
            } catch { }
        }
    }
} catch { Warn ('browser add-ons: ' + $_.Exception.Message) }

# --- screen lock
$lockInfo = $null
try {
    $ssA = Read-Reg 'HKCU:\Control Panel\Desktop' 'ScreenSaveActive'; $ssS = Read-Reg 'HKCU:\Control Panel\Desktop' 'ScreenSaverIsSecure'; $ssT = Read-Reg 'HKCU:\Control Panel\Desktop' 'ScreenSaveTimeOut'
    $inact = Read-Reg 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System' 'InactivityTimeoutSecs'
    $lw = $null
    try {
        $pq = (& powercfg /query SCHEME_CURRENT SUB_NONE CONSOLELOCK 2>&1 | Out-String)
        $hx = @([regex]::Matches($pq, '0x[0-9a-fA-F]{8}') | ForEach-Object { [Convert]::ToInt32($_.Value.Substring(2), 16) })
        if ($hx.Count -ge 2) { $lw = [pscustomobject]@{ ac = ($hx[$hx.Count - 2] -eq 1); dc = ($hx[$hx.Count - 1] -eq 1) } }
    } catch { }
    $lockInfo = [pscustomobject]@{
        screensaverOn = $(if ($null -ne $ssA) { ([string]$ssA -eq '1') } else { $false })
        screensaverSecure = $(if ($null -ne $ssS) { ([string]$ssS -eq '1') } else { $false })
        screensaverSec = $(if ($null -ne $ssT) { [int]$ssT } else { $null })
        inactivityLimitSec = $(if ($null -ne $inact) { [int]$inact } else { $null })
        lockOnWake = $lw
    }
} catch { }

# --- BitLocker: only whether a recovery key exists (we never read the key itself)
$blKeys = @()
if ($isAdmin) {
    try { $blKeys = @(Get-BitLockerVolume -ErrorAction Stop | Where-Object { [string]$_.ProtectionStatus -match 'On|1' } | ForEach-Object { [pscustomobject]@{ letter = [string]$_.MountPoint; hasRecoveryKey = (@($_.KeyProtector | Where-Object { [string]$_.KeyProtectorType -eq 'RecoveryPassword' }).Count -gt 0) } }) } catch { }
}

# --- temperature and slow-down events
$thermal = [pscustomobject]@{ tempC = $null; throttleEvents30d = 0; clockMHz = $null; maxClockMHz = $null }
try {
    $tc = $null
    try { $tz = @(Get-CimInstance -ClassName Win32_PerfFormattedData_Counters_ThermalZoneInformation -ErrorAction Stop); if ($tz.Count -gt 0) { $tc = [math]::Round((($tz | ForEach-Object { [double]$_.Temperature } | Measure-Object -Maximum).Maximum) - 273.15, 0) } } catch { }
    if ($null -eq $tc -and $isAdmin) { try { $tz2 = @(Get-CimInstance -Namespace root/wmi -ClassName MSAcpi_ThermalZoneTemperature -ErrorAction Stop); if ($tz2.Count -gt 0) { $tc = [math]::Round((($tz2 | ForEach-Object { [double]$_.CurrentTemperature } | Measure-Object -Maximum).Maximum) / 10 - 273.15, 0) } } catch { } }
    if ($null -ne $tc -and ($tc -lt 10 -or $tc -gt 130)) { $tc = $null }
    $thr = @($sysEv | Where-Object { $_.Id -eq 37 -and $_.ProviderName -match 'Kernel-Processor-Power' }).Count
    $pc0 = Get-CimInstance Win32_Processor | Select-Object -First 1
    $thermal = [pscustomobject]@{ tempC = $tc; throttleEvents30d = $thr; clockMHz = $(if ($pc0) { [int]$pc0.CurrentClockSpeed } else { $null }); maxClockMHz = $(if ($pc0) { [int]$pc0.MaxClockSpeed } else { $null }) }
} catch { }

# --- inventory (the serial number stays on this PC: it is removed from the AI package and from the share-safe copy)
$inventory = $null
try {
    $snum = [string]$bios.SerialNumber; if ($snum -match '(?i)default string|to be filled|system serial|not specified|o\.e\.m|^none$|^0+$|^n/a$') { $snum = '' }
    $inventory = [pscustomobject]@{ serial = $snum; maker = [string]$cs.Manufacturer; model = [string]$cs.Model; biosDate = Iso $bios.ReleaseDate; osInstall = Iso $os.InstallDate }
} catch { }

# --- Office and licences
$office = [pscustomobject]@{ installed = $false; subscription = $false; releaseIds = ''; version = ''; channel = ''; licences = @() }
try {
    $c2r = 'HKLM:\SOFTWARE\Microsoft\Office\ClickToRun\Configuration'
    $rid = [string](Read-Reg $c2r 'ProductReleaseIds'); $ver = [string](Read-Reg $c2r 'VersionToReport')
    $inst = ($rid -ne '')
    if (-not $inst) { foreach ($ov in '16.0', '15.0', '14.0') { foreach ($hk in 'HKLM:\SOFTWARE\Microsoft\Office\', 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Office\') { if (Read-Reg ($hk + $ov + '\Common\InstallRoot') 'Path') { $inst = $true; if (-not $ver) { $ver = $ov } } } } }
    $lics = @()
    try { $lics = @(Get-CimInstance -ClassName SoftwareLicensingProduct -Filter "ApplicationId='0ff1ce15-a989-479d-af46-f275c6370663' AND PartialProductKey IS NOT NULL" -ErrorAction Stop | Select-Object -First 8 | ForEach-Object { [pscustomobject]@{ name = [string]$_.Name; status = [int]$_.LicenseStatus } }) } catch { }
    $office = [pscustomobject]@{ installed = $inst; subscription = ($rid -match '(?i)O365|Microsoft365'); releaseIds = $rid; version = $ver; channel = [string](Read-Reg $c2r 'UpdateChannel'); licences = $lics }
} catch { }

# --- certificates that expire (personal and machine stores)
$certs = @()
try {
    foreach ($store in 'Cert:\LocalMachine\My', 'Cert:\CurrentUser\My') {
        foreach ($ct in @(Get-ChildItem -Path $store -ErrorAction SilentlyContinue)) {
            $dl = [int]($ct.NotAfter - (Get-Date)).TotalDays
            if ($dl -le 45 -and $dl -ge -365) { $certs += [pscustomobject]@{ store = $(if ($store -like '*Machine*') { 'computer' } else { 'user' }); name = (CnOf $ct.Subject); days = $dl; hasKey = [bool]$ct.HasPrivateKey } }
        }
    }
    $certs = @($certs | Sort-Object days | Select-Object -First 15)
} catch { }

# --- Windows Update history (read from the local history, nothing is downloaded)
$wuInfo = $null
try {
    $us = New-Object -ComObject Microsoft.Update.Session
    $se = $us.CreateUpdateSearcher()
    $cnt = [int]$se.GetTotalHistoryCount()
    $hist = @(); if ($cnt -gt 0) { $hist = @($se.QueryHistory(0, [math]::Min($cnt, 100))) }
    $lastOk = $null; $failed = @()
    foreach ($h in $hist) {
        if ([int]$h.ResultCode -eq 2 -and -not $lastOk) { $lastOk = [int]((Get-Date) - $h.Date).TotalDays }
        if ([int]$h.ResultCode -eq 4 -and (((Get-Date) - $h.Date).TotalDays -le 30)) { $failed += [string]$h.Title }
    }
    $svcWu = $null; try { $svcWu = [string](Get-Service -Name wuauserv -ErrorAction Stop).StartType } catch { }
    $pause = [string](Read-Reg 'HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings' 'PauseUpdatesExpiryTime')
    $paused = $false; if ($pause) { try { $paused = ([datetime]$pause -gt (Get-Date)) } catch { } }
    $noAuto = Read-Reg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU' 'NoAutoUpdate'
    $rbp = ((Test-Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired') -or (Test-Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending'))
    $wuInfo = [pscustomobject]@{ lastSuccessDays = $lastOk; failed30 = @($failed | Select-Object -Unique | Select-Object -First 6); serviceDisabled = ($svcWu -eq 'Disabled'); paused = $paused; policyOff = ($null -ne $noAuto -and [int]$noAuto -eq 1); restartPending = $rbp }
} catch { }

# --- OneDrive
$oneDriveInfo = $null
try {
    $odp = 'HKCU:\Software\Microsoft\OneDrive\Accounts'
    $accs = @(); if (Test-Path $odp) { $accs = @(Get-ChildItem $odp -ErrorAction SilentlyContinue) }
    $oneDriveInfo = [pscustomobject]@{ installed = ((Test-Path (Join-Path $env:LOCALAPPDATA 'Microsoft\OneDrive')) -or $accs.Count -gt 0); signedIn = ($accs.Count -gt 0); running = [bool](Get-Process OneDrive -ErrorAction SilentlyContinue) }
} catch { }

# --- what slows down the start-up (Windows' own measurements, last 60 days)
$slowStart = @()
try {
    $se2 = @(Get-WinEvent -FilterHashtable @{ LogName = 'Microsoft-Windows-Diagnostics-Performance/Operational'; Id = 101, 102, 103; StartTime = (Get-Date).AddDays(-60) } -MaxEvents 300 -ErrorAction Stop)
    $grp = @{}
    foreach ($e in $se2) {
        try {
            $xm = [xml]$e.ToXml(); $d = @{}
            foreach ($n in @($xm.Event.EventData.Data)) { $d[[string]$n.Name] = [string]$n.'#text' }
            $nm = $d['FriendlyName']; if (-not $nm) { $nm = $d['Name'] }; if (-not $nm) { $nm = $d['FileName'] }; if (-not $nm) { continue }
            if ($nm -match '^vmmem') { continue }
            $kind = 'app'; if ($e.Id -eq 102) { $kind = 'driver' } elseif ($e.Id -eq 103) { $kind = 'service' }
            $tm = 0; try { $tm = [int]$d['TotalTime'] } catch { }
            $k = $kind + '|' + $nm
            if (-not $grp.ContainsKey($k)) { $grp[$k] = [pscustomobject]@{ kind = $kind; name = $nm; n = 0; totalMs = 0 } }
            $grp[$k].n++; $grp[$k].totalMs += $tm
        } catch { }
    }
    $slowStart = @($grp.Values | ForEach-Object { [pscustomobject]@{ kind = $_.kind; name = $_.name; n = $_.n; avgSec = [math]::Round(($_.totalMs / [math]::Max(1, $_.n)) / 1000, 1) } } | Sort-Object avgSec -Descending | Select-Object -First 12)
} catch { }

# --- DNS speed: the DNS of this PC against three well-known public ones (12 small lookups, full scan only)
$dnsSpeed = @()
if (-not $Quick) {
    try {
        $cur = [string](@(Get-DnsClientServerAddress -AddressFamily IPv4 | Where-Object { $_.ServerAddresses } | ForEach-Object { $_.ServerAddresses } | Select-Object -First 1))
        $cands = @(); if ($cur) { $cands += , @('This PC', $cur) }
        foreach ($pub in @(@('Cloudflare', '1.1.1.1'), @('Google', '8.8.8.8'), @('Quad9', '9.9.9.9'))) { if ($pub[1] -ne $cur) { $cands += , $pub } }
        foreach ($c in $cands) {
            $tot = 0; $ok = 0
            foreach ($nmx in 'www.microsoft.com', 'www.wikipedia.org', 'www.bbc.com') {
                try { $sw2 = [Diagnostics.Stopwatch]::StartNew(); [void](Resolve-DnsName -Name $nmx -Server $c[1] -Type A -DnsOnly -QuickTimeout -ErrorAction Stop); $sw2.Stop(); $tot += $sw2.ElapsedMilliseconds; $ok++ } catch { }
            }
            if ($ok -gt 0) { $dnsSpeed += [pscustomobject]@{ label = $c[0]; ip = $c[1]; ms = [int]($tot / $ok) } }
        }
    } catch { }
}

# --- which programs talk to the internet right now (addresses of your own network are left out)
$conns = @()
try {
    $pm2 = @{}; foreach ($pp in @(Get-Process)) { $pm2[[int]$pp.Id] = [string]$pp.ProcessName }
    $byP = @{}
    foreach ($c in @(Get-NetTCPConnection -State Established -ErrorAction Stop)) {
        $ra = [string]$c.RemoteAddress
        if ($ra -match '^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|::1|fe80|fc|fd)') { continue }
        $pn = [string]$pm2[[int]$c.OwningProcess]; if (-not $pn) { $pn = 'unknown' }
        if (-not $byP.ContainsKey($pn)) { $byP[$pn] = New-Object System.Collections.ArrayList }
        [void]$byP[$pn].Add($ra + ':' + $c.RemotePort)
    }
    $conns = @($byP.Keys | ForEach-Object { [pscustomobject]@{ process = $_; n = $byP[$_].Count; remotes = @($byP[$_] | Select-Object -Unique | Select-Object -First 3) } } | Sort-Object n -Descending | Select-Object -First 25)
} catch { }

$extras | Add-Member -NotePropertyName more -NotePropertyValue ([pscustomobject]@{
    accounts = $accounts; signatures = [pscustomobject]@{ checked = $sigChecked; flagged = $sigFlags }; wifiSaved = $wifiSaved; browserExt = $browserExt
    lock = $lockInfo; bitlockerKeys = $blKeys; thermal = $thermal; inventory = $inventory; office = $office; certs = $certs; wu = $wuInfo
    oneDrive = $oneDriveInfo; slowStart = $slowStart; dnsSpeed = $dnsSpeed; connections = $conns
}) -Force

# ---------------------------------------------------------------- 18. inventory details, performance sample, hardening, privacy (all read-only)
Step 18 $TOTAL 'Equipment, hardening, privacy, performance sample'

# --- monitors (what each screen reports about itself)
$monitors = @()
try {
    $ids = @(Get-CimInstance -Namespace root/wmi -ClassName WmiMonitorID -ErrorAction Stop)
    $bps = @(Get-CimInstance -Namespace root/wmi -ClassName WmiMonitorBasicDisplayParams -ErrorAction SilentlyContinue)
    foreach ($m in $ids) {
        $mk = (-join @($m.ManufacturerName | Where-Object { $_ -gt 0 } | ForEach-Object { [char]$_ })).Trim()
        $md = (-join @($m.UserFriendlyName | Where-Object { $_ -gt 0 } | ForEach-Object { [char]$_ })).Trim()
        $sn = (-join @($m.SerialNumberID | Where-Object { $_ -gt 0 } | ForEach-Object { [char]$_ })).Trim()
        $bp = $bps | Where-Object { $_.InstanceName -eq $m.InstanceName } | Select-Object -First 1
        $inch = $null; if ($bp -and $bp.MaxHorizontalImageSize -gt 0 -and $bp.MaxVerticalImageSize -gt 0) { $inch = [math]::Round([math]::Sqrt([math]::Pow($bp.MaxHorizontalImageSize, 2) + [math]::Pow($bp.MaxVerticalImageSize, 2)) / 2.54, 0) }
        $monitors += [pscustomobject]@{ maker = $mk; model = $md; serial = $sn; year = [int]$m.YearOfManufacture; inches = $inch }
    }
} catch { }

# --- printers (virtual ones are left out)
$printers = @()
try {
    $printers = @(Get-CimInstance Win32_Printer -ErrorAction Stop | Where-Object { $_.Name -notmatch '(?i)PDF|XPS|OneNote|Fax|Snagit|Send To|Print to|RustDesk|AnyDesk|TeamViewer|Parsec|Splashtop|Zoom|Webex|Remote' } | Select-Object -First 20 | ForEach-Object {
        [pscustomobject]@{ name = [string]$_.Name; driver = [string]$_.DriverName; port = [string]$_.PortName; isDefault = [bool]$_.Default; network = [bool]$_.Network; shared = [bool]$_.Shared; offline = [bool]$_.WorkOffline }
    })
} catch { }

# --- peripherals connected now
$periph = @()
try {
    $periph = @(Get-PnpDevice -PresentOnly -ErrorAction Stop | Where-Object { $_.Class -match '^(Keyboard|Mouse|Camera|Image|Bluetooth|WPD|Printer|Biometric|SmartCardReader)$' -and $_.FriendlyName -and $_.FriendlyName -notmatch '(?i)HID-compliant|Root|Virtual|Composite|Generic|Enumerator|Radio|Transport|Protocol|Microsoft Bluetooth|Intel\(R\) Wireless Bluetooth$' } | Select-Object -First 40 | ForEach-Object {
        [pscustomobject]@{ class = [string]$_.Class; name = [string]$_.FriendlyName; status = [string]$_.Status }
    })
    $audio = @(Get-PnpDevice -PresentOnly -Class AudioEndpoint -ErrorAction SilentlyContinue | Where-Object { $_.FriendlyName } | Select-Object -First 12 | ForEach-Object { [pscustomobject]@{ class = 'Audio'; name = [string]$_.FriendlyName; status = [string]$_.Status } })
    $periph = @($periph + $audio)
    $usbd = @(Get-CimInstance Win32_DiskDrive -ErrorAction SilentlyContinue | Where-Object { $_.InterfaceType -eq 'USB' } | ForEach-Object { [pscustomobject]@{ class = 'USB drive'; name = [string]$_.Model; status = 'OK' } })
    $periph = @($periph + $usbd)
} catch { }

# --- who manages this PC (domain, Entra ID / Azure AD, Intune)
$mgmt = $null
try {
    $csx = Get-CimInstance Win32_ComputerSystem
    $ds = (& dsregcmd.exe /status 2>&1 | Out-String)
    $aad = ($ds -match '(?im)AzureAdJoined\s*:\s*YES'); $wp = ($ds -match '(?im)WorkplaceJoined\s*:\s*YES')
    $tn = ''; $tm = [regex]::Match($ds, '(?im)TenantName\s*:\s*(.+)'); if ($tm.Success) { $tn = $tm.Groups[1].Value.Trim() }
    $mdm = $false
    try { foreach ($en in @(Get-ChildItem 'HKLM:\SOFTWARE\Microsoft\Enrollments' -ErrorAction Stop)) { if ([string](Get-ItemProperty $en.PSPath).ProviderID -match 'MS DM Server') { $mdm = $true } } } catch { }
    $mgmt = [pscustomobject]@{ domainJoined = [bool]$csx.PartOfDomain; domain = $(if ($csx.PartOfDomain) { [string]$csx.Domain } else { '' }); workgroup = $(if (-not $csx.PartOfDomain) { [string]$csx.Domain } else { '' }); entraJoined = $aad; workplaceJoined = $wp; tenant = $tn; intune = $mdm }
} catch { }

# --- licences (only the last 5 characters of a key, never the whole key)
$winLic = $null
try {
    $wl = @(Get-CimInstance -ClassName SoftwareLicensingProduct -Filter "PartialProductKey IS NOT NULL AND ApplicationId='55c92734-d682-4d71-983e-d6ec3f16059f'" -ErrorAction Stop | Select-Object -First 1)
    $biosKey = $false; try { $biosKey = -not [string]::IsNullOrEmpty([string](Get-CimInstance SoftwareLicensingService).OA3xOriginalProductKey) } catch { }
    if ($wl.Count -gt 0) { $winLic = [pscustomobject]@{ name = [string]$wl[0].Name; channel = [string]$wl[0].ProductKeyChannel; partialKey = [string]$wl[0].PartialProductKey; status = [int]$wl[0].LicenseStatus; keyInBios = $biosKey } }
} catch { }

# --- mapped network drives and VPN connections (names only, never passwords)
$mapped = @(); $vpns = @()
try { $mapped = @(Get-SmbMapping -ErrorAction Stop | Select-Object -First 20 | ForEach-Object { [pscustomobject]@{ local = [string]$_.LocalPath; remote = [string]$_.RemotePath; status = [string]$_.Status } }) } catch { }
try { $vpns = @(@(Get-VpnConnection -ErrorAction Stop) + @(Get-VpnConnection -AllUserConnection -ErrorAction SilentlyContinue) | Select-Object -First 10 | ForEach-Object { [pscustomobject]@{ name = [string]$_.Name; server = [string]$_.ServerAddress; type = [string]$_.TunnelType } }) } catch { }

# --- neighbours the PC already knows about (only reads the PC's own ARP memory, nothing is scanned)
$neighbours = @()
try {
    $neighbours = @(Get-NetNeighbor -AddressFamily IPv4 -ErrorAction Stop | Where-Object { [string]$_.State -match '^(Reachable|Stale|Delay|Probe)$' -and [string]$_.LinkLayerAddress -ne '00-00-00-00-00-00' -and [string]$_.LinkLayerAddress -match '^[0-9A-Fa-f]{2}(-[0-9A-Fa-f]{2}){5}$' -and [string]$_.IPAddress -notmatch '^(224\.|239\.|255\.|169\.254\.)' -and [string]$_.LinkLayerAddress -ne 'FF-FF-FF-FF-FF-FF' } | Select-Object -First 40 | ForEach-Object {
        [pscustomobject]@{ ip = [string]$_.IPAddress; mac = ([string]$_.LinkLayerAddress).ToUpper(); state = [string]$_.State }
    })
} catch { }

# --- board, enclosure, last user, browsers
$board = $null
try { $enc = Get-CimInstance Win32_SystemEnclosure | Select-Object -First 1; $jk = '(?i)default string|to be filled|system serial|not specified|o\.e\.m|^none$|^0+$|^n/a$'; $at = $(if ($enc) { ([string]$enc.SMBIOSAssetTag).Trim() } else { '' }); $cs2 = $(if ($enc) { ([string]$enc.SerialNumber).Trim() } else { '' }); if ($at -match $jk) { $at = '' }; if ($cs2 -match $jk) { $cs2 = '' }; $board = [pscustomobject]@{ assetTag = $at; chassisSerial = $cs2 } } catch { }
$lastUser = $null
try { $lastUser = [pscustomobject]@{ user = [string](Read-Reg 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Authentication\LogonUI' 'LastLoggedOnUser'); display = [string](Read-Reg 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Authentication\LogonUI' 'LastLoggedOnDisplayName') } } catch { }
$browsers = @()
try {
    foreach ($bw in @(@('Chrome', 'chrome.exe'), @('Edge', 'msedge.exe'), @('Firefox', 'firefox.exe'), @('Brave', 'brave.exe'), @('Opera', 'opera.exe'))) {
        $ap = [string](Read-Reg ('HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\' + $bw[1]) '(default)')
        if (-not $ap) { $ap = [string](Read-Reg ('HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\' + $bw[1]) '(default)') }
        $ap = $ap.Trim('"')
        if ($ap -and (Test-Path -LiteralPath $ap)) { $fi = Get-Item -LiteralPath $ap; $browsers += [pscustomobject]@{ name = $bw[0]; version = [string]$fi.VersionInfo.ProductVersion; fileDays = [int]((Get-Date) - $fi.LastWriteTime).TotalDays } }
    }
} catch { }
$defBrowser = ''
try { $defBrowser = [string](Read-Reg 'HKCU:\Software\Microsoft\Windows\Shell\Associations\UrlAssociations\https\UserChoice' 'ProgId') } catch { }

# --- 10-second performance sample (CIM counters, so it works on every Windows language)
$perf = $null
if (-not $Quick) {
    try {
        $cpuS = @(); $dskS = @(); $qS = @(); $netS = @(); $memS = @()
        for ($i = 0; $i -lt 10; $i++) {
            $c1 = Get-CimInstance Win32_PerfFormattedData_PerfOS_Processor -Filter "Name='_Total'" -ErrorAction Stop; $cpuS += [int]$c1.PercentProcessorTime
            $d1 = Get-CimInstance Win32_PerfFormattedData_PerfDisk_PhysicalDisk -Filter "Name='_Total'" -ErrorAction Stop; $dskS += [int]$d1.PercentDiskTime; $qS += [double]$d1.CurrentDiskQueueLength
            $n1 = @(Get-CimInstance Win32_PerfFormattedData_Tcpip_NetworkInterface -ErrorAction SilentlyContinue); $netS += [int](($n1 | Measure-Object -Property BytesTotalPersec -Sum).Sum / 1024)
            $o1 = Get-CimInstance Win32_OperatingSystem; $memS += [int](100 * ($o1.TotalVisibleMemorySize - $o1.FreePhysicalMemory) / $o1.TotalVisibleMemorySize)
            Start-Sleep -Milliseconds 900
        }
        $perf = [pscustomobject]@{ cpu = $cpuS; disk = $dskS; queue = $qS; netKBs = $netS; mem = $memS }
    } catch { }
}

# --- NVIDIA graphics card details (only if the driver already installed nvidia-smi)
$gpuSmi = @()
try {
    $smi = $null
    foreach ($sp in @((Join-Path $env:windir 'System32\nvidia-smi.exe'), (Join-Path $env:ProgramFiles 'NVIDIA Corporation\NVSMI\nvidia-smi.exe'))) { if (Test-Path -LiteralPath $sp) { $smi = $sp; break } }
    if ($smi) {
        $o = (& $smi --query-gpu=name,temperature.gpu,memory.used,memory.total,power.draw,fan.speed,utilization.gpu --format=csv,noheader,nounits 2>&1 | Out-String)
        foreach ($ln in @($o -split "`r?`n" | Where-Object { $_ -match ',' })) {
            $p = @($ln -split ',' | ForEach-Object { $_.Trim() })
            if ($p.Count -ge 7) { $gpuSmi += [pscustomobject]@{ name = $p[0]; tempC = $(if ($p[1] -match '^\d+$') { [int]$p[1] } else { $null }); memUsedMB = $(if ($p[2] -match '^\d+$') { [int]$p[2] } else { $null }); memTotalMB = $(if ($p[3] -match '^\d+$') { [int]$p[3] } else { $null }); powerW = $(if ($p[4] -match '^[\d.]+$') { [double]$p[4] } else { $null }); fanPct = $(if ($p[5] -match '^\d+$') { [int]$p[5] } else { $null }); loadPct = $(if ($p[6] -match '^\d+$') { [int]$p[6] } else { $null }) } }
        }
    }
} catch { }

# --- all the places where something can start by itself (and what is unusual)
$persist = [pscustomobject]@{ items = @(); unusual = @() }
try {
    $pi = @(); $un = @()
    foreach ($rk in @('HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run', 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce', 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Run', 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run', 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce')) {
        try { $ip = Get-ItemProperty -LiteralPath $rk -ErrorAction Stop; foreach ($pr in $ip.PSObject.Properties) { if ($pr.Name -notmatch '^PS') { $pi += [pscustomobject]@{ where = $rk.Replace('HKLM:\SOFTWARE\', 'HKLM\').Replace('HKCU:\SOFTWARE\', 'HKCU\'); name = [string]$pr.Name; command = [string]$pr.Value } } } } catch { }
    }
    foreach ($sf in @((Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Startup'), (Join-Path $env:ProgramData 'Microsoft\Windows\Start Menu\Programs\StartUp'))) {
        try { foreach ($f in @(Get-ChildItem -LiteralPath $sf -File -ErrorAction Stop | Where-Object { $_.Name -ne 'desktop.ini' })) { $pi += [pscustomobject]@{ where = 'Startup folder'; name = [string]$f.Name; command = [string]$f.FullName } } } catch { }
    }
    $wl2 = 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon'
    $sh = [string](Read-Reg $wl2 'Shell'); if ($sh -and $sh -ne 'explorer.exe') { $un += [pscustomobject]@{ kind = 'winlogon-shell'; detail = $sh } }
    $ui = [string](Read-Reg $wl2 'Userinit'); if ($ui -and $ui.TrimEnd(',').ToLower() -ne 'c:\windows\system32\userinit.exe') { $un += [pscustomobject]@{ kind = 'winlogon-userinit'; detail = $ui } }
    try { foreach ($ik in @(Get-ChildItem 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options' -ErrorAction Stop)) { $dbg = [string](Get-ItemProperty -LiteralPath $ik.PSPath -ErrorAction SilentlyContinue).Debugger; if ($dbg) { $un += [pscustomobject]@{ kind = 'ifeo-debugger'; detail = ($ik.PSChildName + ' -> ' + $dbg) } } } } catch { }
    $aid = [string](Read-Reg 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Windows' 'AppInit_DLLs'); if ($aid.Trim()) { $un += [pscustomobject]@{ kind = 'appinit-dlls'; detail = $aid } }
    $be = @(Read-Reg 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager' 'BootExecute'); if ($be.Count -gt 0 -and (($be -join ' ').Trim() -ne 'autocheck autochk *')) { $un += [pscustomobject]@{ kind = 'bootexecute'; detail = ($be -join ' ') } }
    try { foreach ($cs in @(Get-CimInstance -Namespace root/subscription -ClassName __EventConsumer -ErrorAction Stop | Where-Object { $_.Name -ne 'SCM Event Log Consumer' })) { $un += [pscustomobject]@{ kind = 'wmi-consumer'; detail = [string]$cs.Name } } } catch { }
    # digital signatures of the run entries (full scan only)
    if (-not $Quick) {
        $seenP = @{}
        foreach ($it in @($pi | Select-Object -First 50)) {
            $px = Get-ExePath $it.command
            $st = ''; $sg2 = ''
            if ($px -and (Test-Path -LiteralPath $px) -and -not $seenP.ContainsKey($px.ToLower())) {
                $seenP[$px.ToLower()] = 1
                try { $sx = Get-AuthenticodeSignature -LiteralPath $px -ErrorAction Stop; $st = [string]$sx.Status; if ($sx.SignerCertificate) { $sg2 = CnOf $sx.SignerCertificate.Subject } } catch { }
                $it | Add-Member -NotePropertyName signature -NotePropertyValue $st -Force; $it | Add-Member -NotePropertyName signer -NotePropertyValue $sg2 -Force
            }
        }
    }
    $persist = [pscustomobject]@{ items = @($pi | Select-Object -First 60); unusual = @($un | Select-Object -First 20) }
} catch { }

# --- hardening checks (only reading settings; the report explains each one)
$hard = [ordered]@{}
try {
    $sec = @{}
    if ($isAdmin) {
        try {
            $sf2 = Join-Path $raw 'secpol.cfg'
            & secedit.exe /export /cfg $sf2 /quiet 2>&1 | Out-Null
            foreach ($ln in @(Get-Content -LiteralPath $sf2 -ErrorAction Stop)) { $mm = [regex]::Match($ln, '^\s*(MinimumPasswordLength|PasswordComplexity|MaximumPasswordAge|LockoutBadCount)\s*=\s*(-?\d+)'); if ($mm.Success) { $sec[$mm.Groups[1].Value] = [int]$mm.Groups[2].Value } }
            Remove-Item -LiteralPath $sf2 -Force -ErrorAction SilentlyContinue
        } catch { }
    }
    $hard['pwLen'] = $(if ($sec.ContainsKey('MinimumPasswordLength')) { $sec['MinimumPasswordLength'] } else { $null })
    $hard['pwComplex'] = $(if ($sec.ContainsKey('PasswordComplexity')) { $sec['PasswordComplexity'] } else { $null })
    $hard['lockout'] = $(if ($sec.ContainsKey('LockoutBadCount')) { $sec['LockoutBadCount'] } else { $null })
    $ss1 = [string](Read-Reg 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer' 'SmartScreenEnabled'); $ss2 = Read-Reg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\System' 'EnableSmartScreen'
    $hard['smartscreen'] = $(if ($ss2 -ne $null) { ([int]$ss2 -ne 0) } elseif ($ss1) { ($ss1 -ne 'Off') } else { $null })
    $ppl = Read-Reg 'HKLM:\SYSTEM\CurrentControlSet\Control\Lsa' 'RunAsPPL'; $hard['lsaPpl'] = $(if ($null -ne $ppl) { ([int]$ppl -ge 1) } else { $false })
    $wd = Read-Reg 'HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\WDigest' 'UseLogonCredential'; $hard['wdigestOff'] = $(if ($null -ne $wd) { ([int]$wd -eq 0) } else { $true })
    $llm = Read-Reg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\DNSClient' 'EnableMulticast'; $hard['llmnrOff'] = $(if ($null -ne $llm) { ([int]$llm -eq 0) } else { $false })
    try { $nb = @(Get-CimInstance Win32_NetworkAdapterConfiguration -Filter "IPEnabled=True" -ErrorAction Stop); $hard['netbiosOff'] = $(if ($nb.Count -gt 0) { (@($nb | Where-Object { $_.TcpipNetbiosOptions -ne 2 }).Count -eq 0) } else { $null }) } catch { $hard['netbiosOff'] = $null }
    try { $hard['smbSign'] = [bool](Get-SmbServerConfiguration -ErrorAction Stop).RequireSecuritySignature } catch { $hard['smbSign'] = $null }
    $sbl = Read-Reg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\PowerShell\ScriptBlockLogging' 'EnableScriptBlockLogging'; $hard['psLogging'] = $(if ($null -ne $sbl) { ([int]$sbl -eq 1) } else { $false })
    try { $dg = Get-CimInstance -Namespace root/Microsoft/Windows/DeviceGuard -ClassName Win32_DeviceGuard -ErrorAction Stop; $hard['vbs'] = ([int]$dg.VirtualizationBasedSecurityStatus -eq 2); $hard['credGuard'] = (@($dg.SecurityServicesRunning) -contains 1) } catch { $hard['vbs'] = $null; $hard['credGuard'] = $null }
    try { $mp = Get-MpPreference -ErrorAction Stop; $hard['asrRules'] = @($mp.AttackSurfaceReductionRules_Ids).Count; $hard['cfa'] = ([int]$mp.EnableControlledFolderAccess -ge 1); $hard['cloudProt'] = ([int]$mp.MAPSReporting -ge 1); $hard['puaProt'] = ([int]$mp.PUAProtection -ge 1); $hard['netProt'] = ([int]$mp.EnableNetworkProtection -ge 1) } catch { $hard['asrRules'] = $null; $hard['cfa'] = $null; $hard['cloudProt'] = $null; $hard['puaProt'] = $null; $hard['netProt'] = $null }
    $ar = Read-Reg 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Explorer' 'NoDriveTypeAutoRun'; $hard['autorunOff'] = $(if ($null -ne $ar) { ([int]$ar -ge 255) } else { $false })
    $ra = Read-Reg 'HKLM:\SYSTEM\CurrentControlSet\Control\Remote Assistance' 'fAllowToGetHelp'; $hard['remoteAssistOff'] = $(if ($null -ne $ra) { ([int]$ra -eq 0) } else { $false })
    $lm = Read-Reg 'HKLM:\SYSTEM\CurrentControlSet\Control\Lsa' 'LmCompatibilityLevel'; $hard['ntlmV2'] = $(if ($null -ne $lm) { ([int]$lm -ge 3) } else { $true })
    $rsa = Read-Reg 'HKLM:\SYSTEM\CurrentControlSet\Control\Lsa' 'RestrictAnonymous'; $hard['anonRestricted'] = $(if ($null -ne $rsa) { ([int]$rsa -ge 1) } else { $false })
    try { $spl = Get-Service -Name Spooler -ErrorAction Stop; $hard['spoolerOff'] = ([string]$spl.Status -ne 'Running'); $hard['spoolerHasPrinters'] = (@($printers).Count -gt 0) } catch { $hard['spoolerOff'] = $null }
    try { $rr = Get-Service -Name RemoteRegistry -ErrorAction Stop; $hard['remoteRegOff'] = ([string]$rr.Status -ne 'Running') } catch { $hard['remoteRegOff'] = $null }
} catch { }

# --- privacy settings (status only, nothing is changed)
$priv = [ordered]@{}
try {
    $tl = Read-Reg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection' 'AllowTelemetry'; if ($null -eq $tl) { $tl = Read-Reg 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\DataCollection' 'AllowTelemetry' }
    $priv['telemetry'] = $tl
    $priv['adId'] = Read-Reg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\AdvertisingInfo' 'Enabled'
    $priv['location'] = [string](Read-Reg 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\location' 'Value')
    $priv['microphone'] = [string](Read-Reg 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\microphone' 'Value')
    $priv['camera'] = [string](Read-Reg 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\webcam' 'Value')
    $priv['activityHistory'] = Read-Reg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\System' 'PublishUserActivities'
    $priv['copilotOff'] = Read-Reg 'HKCU:\Software\Policies\Microsoft\Windows\WindowsCopilot' 'TurnOffWindowsCopilot'
    $priv['tailored'] = Read-Reg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Privacy' 'TailoredExperiencesWithDiagnosticDataEnabled'
    $priv['clipboardHistory'] = Read-Reg 'HKCU:\Software\Microsoft\Clipboard' 'EnableClipboardHistory'
    $priv['bingSearch'] = Read-Reg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Search' 'BingSearchEnabled'
    $rc2 = $null; try { $rf = Get-WindowsOptionalFeature -Online -FeatureName Recall -ErrorAction Stop; $rc2 = [string]$rf.State } catch { }
    $priv['recall'] = $rc2
} catch { }

# --- temporary files and caches (sizes only; the report points to Windows' own cleaner)
$caches = @()
if (-not $Quick -and (Get-Command Measure-Dir -ErrorAction SilentlyContinue)) {
    try {
        $la = $env:LOCALAPPDATA
        $cl = @(
            @('Chrome cache', (Join-Path $la 'Google\Chrome\User Data\Default\Cache')), @('Edge cache', (Join-Path $la 'Microsoft\Edge\User Data\Default\Cache')),
            @('Windows shader cache', (Join-Path $la 'D3DSCache')), @('NVIDIA shader cache', (Join-Path $la 'NVIDIA\DXCache')),
            @('Delivery Optimization', (Join-Path $env:windir 'ServiceProfiles\NetworkService\AppData\Local\Microsoft\Windows\DeliveryOptimization\Cache')),
            @('Windows error reports', (Join-Path $env:ProgramData 'Microsoft\Windows\WER')), @('Crash dumps (Minidump)', (Join-Path $env:windir 'Minidump')),
            @('Thumbnail cache', (Join-Path $la 'Microsoft\Windows\Explorer'))
        )
        foreach ($c in $cl) { if (Test-Path -LiteralPath $c[1]) { $r = Measure-Dir $c[1] 8 $false; if ($r.mb -gt 0) { $caches += [pscustomobject]@{ name = $c[0]; mb = $r.mb; partial = [bool]$r.partial } } } }
    } catch { }
}

# --- USB storage devices that were connected in the past (names only)
$usbHist = @()
try {
    foreach ($k1 in @(Get-ChildItem 'HKLM:\SYSTEM\CurrentControlSet\Enum\USBSTOR' -ErrorAction Stop)) {
        foreach ($k2 in @(Get-ChildItem -LiteralPath $k1.PSPath -ErrorAction SilentlyContinue)) {
            $fn = [string](Get-ItemProperty -LiteralPath $k2.PSPath -ErrorAction SilentlyContinue).FriendlyName
            if (-not $fn) { $fn = ($k1.PSChildName -replace '^(Disk|CdRom)&Ven_', '' -replace '&Prod_', ' ' -replace '&Rev_.*$', '' -replace '_', ' ') }
            $usbHist += [pscustomobject]@{ name = $fn }
        }
    }
    $usbHist = @($usbHist | Sort-Object name -Unique | Select-Object -First 40)
} catch { }

# --- Prefetch: programs that ran recently (used only for a hint about unused programs)
$ran = @()
try { $ran = @(Get-ChildItem -LiteralPath (Join-Path $env:windir 'Prefetch') -Filter *.pf -ErrorAction Stop | ForEach-Object { [pscustomobject]@{ exe = ($_.Name -replace '-[0-9A-F]{8}\.pf$', '').ToLower(); days = [int]((Get-Date) - $_.LastWriteTime).TotalDays } } | Sort-Object days | Select-Object -First 500) } catch { }

$extras | Add-Member -NotePropertyName more2 -NotePropertyValue ([pscustomobject]@{
    monitors = $monitors; printers = $printers; peripherals = $periph; management = $mgmt; windowsLicence = $winLic; mappedDrives = $mapped; vpn = $vpns
    neighbours = $neighbours; board = $board; lastUser = $lastUser; browsers = $browsers; defaultBrowser = $defBrowser; perf = $perf; gpuSmi = $gpuSmi
    usbHistory = $usbHist; persistence = $persist; hardening = [pscustomobject]$hard; privacy = [pscustomobject]$priv; caches = $caches; recentRuns = $ran
}) -Force

# ---------------------------------------------------------------- finish
if (-not $Quick) { try { (& systeminfo 2>&1 | Out-String) | Out-File -Encoding UTF8 -FilePath (Join-Path $raw 'systeminfo.txt') } catch { } }

if ($msinfoProc) {
    Write-Host '  Waiting for the msinfo32 export to finish (up to 3 minutes) ...' -ForegroundColor Gray
    try { [void]$msinfoProc.WaitForExit(180000) } catch { }
    try { if (-not $msinfoProc.HasExited) { Stop-Process -Id $msinfoProc.Id -Force; Warn 'msinfo32 export did not finish in time' } } catch { }
}

$meta = [ordered]@{
    tool       = 'VEAGLE PC Check'
    version    = $script:Version
    generated  = Iso (Get-Date)
    mode       = $(if ($Quick) { 'quick' } else { 'full' })
    isAdmin    = $isAdmin
    psVersion  = $PSVersionTable.PSVersion.ToString()
    user       = $env:USERNAME
    computer   = $env:COMPUTERNAME
    domain     = $env:USERDOMAIN
    root       = $root
    durationSec = [int]$swTotal.Elapsed.TotalSeconds
    warnings   = @($script:Warnings)
}

$data = [ordered]@{
    meta     = $meta
    system   = $system
    gpus     = $gpus
    disks    = $disks
    volumes  = $volumes
    network  = [pscustomobject]@{ adapters = $adapters; dns = $dns }
    security = $security
    settings = $settings
    battery  = $battery
    updates  = $updates
    crashDumps = $crashDumps
    events   = $events
    boot     = $bootObj
    apps     = [pscustomobject]@{ count = $apps.Count; storeCount = $storeCount; list = $apps; wingetAvailable = $wingetAvailable; wingetSkipped = [bool]$Quick; outdated = $outdated }
    startup  = $startup
    drivers  = $drivers
    dism     = $dism
    extras   = $extras
}

# History: one line per scan in Reports\history.jsonl (only numbers, nothing personal). The report draws trends from it.
$trendRaw = '[]'
try {
    $repDir0 = Split-Path -Parent $out
    $hp = Join-Path $repDir0 'history.jsonl'
    $cVol = @($volumes | Where-Object { $_.letter -eq ($env:SystemDrive) })[0]
    $bootAvg = $null; if (@($boots).Count -gt 0) { $bootAvg = [math]::Round((@($boots | Select-Object -First 5 | ForEach-Object { [double]$_.seconds }) | Measure-Object -Average).Average, 1) }
    $crashTot = 0; foreach ($cc in $crashList) { $crashTot += [int]$cc.count }
    $startN = $null; try { $startN = @($startup.items | ForEach-Object { $_.name } | Select-Object -Unique).Count } catch { }
    $ssdWear = $null; try { $ww = @($disks | Where-Object { $null -ne $_.wearPercent } | ForEach-Object { [int]$_.wearPercent }); if ($ww.Count -gt 0) { $ssdWear = ($ww | Measure-Object -Maximum).Maximum } } catch { }
    $batWear = $null; try { if ($battery -and $battery.present) { $batWear = $battery.wearPercent } } catch { }
    $tempMax = $null; try { $tempMax = $extras.more.thermal.tempC } catch { }
    $hl = [ordered]@{
        t = Iso (Get-Date); v = $script:Version; mode = $(if ($Quick) { 'quick' } else { 'full' })
        freeC = $(if ($cVol) { [double]$cVol.freeGB } else { $null }); bootS = $bootAvg
        sysErr = [int]$events.system.errors; appErr = [int]$events.application.errors; crashes = $crashTot
        patchDays = $lastPatchDays; startup = $startN; outdated = $(if ($Quick) { $null } else { @($outdated).Count })
        reliability = $relIndex; dumps = @($dumps).Count
        ssdWear = $ssdWear; batWear = $batWear; tempMax = $tempMax
    }
    $line = ($hl | ConvertTo-Json -Compress)
    $u8 = New-Object System.Text.UTF8Encoding($false)
    $old = @(); if (Test-Path -LiteralPath $hp) { $old = @([IO.File]::ReadAllLines($hp, $u8) | Where-Object { $_.Trim().StartsWith('{') }) }
    $all = @($old + $line)
    if ($all.Count -gt 60) { $all = @($all | Select-Object -Last 60) }
    [IO.File]::WriteAllText($hp, (($all -join "`n") + "`n"), $u8)
    $trendRaw = '[' + ($all -join ',') + ']'
} catch { Warn ('history: ' + $_.Exception.Message) }

$json = $data | ConvertTo-Json -Depth 9 -Compress
$json = $json.Substring(0, $json.Length - 1) + ',"trend":' + $trendRaw + '}'
$json = $json.Replace('</', '<\/')
$utf8 = New-Object System.Text.UTF8Encoding($false)
[IO.File]::WriteAllText((Join-Path $out 'data.json'), $json, $utf8)

# The report also carries your PREVIOUS scan (as raw text, so dates stay intact) to show what changed. data.json stays without it.
$jsonHtml = $json
try {
    $repDir = Split-Path -Parent $out
    foreach ($c in @(Get-ChildItem -LiteralPath $repDir -Directory -ErrorAction Stop | Where-Object { $_.Name -ne $stamp } | Sort-Object Name -Descending)) {
        $pj = Join-Path $c.FullName 'data.json'
        if (Test-Path -LiteralPath $pj) {
            $prev = [IO.File]::ReadAllText($pj, $utf8).TrimStart([char]0xFEFF).Trim()
            if ($prev.StartsWith('{') -and $prev.EndsWith('}') -and $prev.Length -lt 3MB) { $jsonHtml = $json.Substring(0, $json.Length - 1) + ',"previous":' + $prev.Replace('</', '<\/') + '}' }
            break
        }
    }
} catch { }

$templatePath = Join-Path $appDir 'template.html'
if (Test-Path $templatePath) {
    $tpl = [IO.File]::ReadAllText($templatePath, $utf8)
    $html = $tpl.Replace('/*__PCDATA__*/null', $jsonHtml)
    [IO.File]::WriteAllText((Join-Path $out 'report.html'), $html, $utf8)
} else {
    Write-Host '  template.html is missing next to collector.ps1 - report not built.' -ForegroundColor Red
}

Write-Host ''
Write-Host ('  [{0}/{0}] ' -f $TOTAL) -NoNewline -ForegroundColor Cyan
Write-Host ('#' * 20) -NoNewline -ForegroundColor Green
Write-Host '  Finished' -ForegroundColor White
try { $Host.UI.RawUI.WindowTitle = ('VEAGLE PC Check ' + $script:Version + ' - done') } catch { }
Write-Host ''
Write-Host '   ================================================' -ForegroundColor Green
Write-Host ('    DONE in {0} s   |   VEAGLE PC Check {1}' -f [int]$swTotal.Elapsed.TotalSeconds, $script:Version) -ForegroundColor Green
Write-Host '   ================================================' -ForegroundColor Green
Write-Host ('   Report: ' + (Join-Path $out 'report.html')) -ForegroundColor White
if ($script:Warnings.Count -gt 0) { Write-Host ('   {0} small warning(s) are listed inside the report.' -f $script:Warnings.Count) -ForegroundColor Yellow }
Write-Host '   Nothing was changed on this PC and nothing was uploaded.' -ForegroundColor Gray
Write-Host '   The report opens in your browser now.' -ForegroundColor Gray

if (-not $NoOpen -and (Test-Path (Join-Path $out 'report.html'))) { try { Start-Process (Join-Path $out 'report.html') } catch { } }
# Only when you asked for it in the scheduled command: a small message that asks (and only asks) if you want to open the report.
if ($Notify -and (Test-Path (Join-Path $out 'report.html'))) {
    try {
        Add-Type -AssemblyName PresentationFramework
        $ans = [System.Windows.MessageBox]::Show("Your scheduled VEAGLE PC Check has finished.`nOpen the report now?", 'VEAGLE PC Check', 'YesNo', 'Information')
        if ($ans -eq 'Yes') { Start-Process (Join-Path $out 'report.html') }
    } catch { }
}
