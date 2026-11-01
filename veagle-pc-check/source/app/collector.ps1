# VEAGLE PC Check - collector
# READ-ONLY: this script only reads system information. It does not change any setting,
# install anything or send your data anywhere. The only network actions: winget asks what is outdated,
# one ping to your own router, and one DNS lookup of www.microsoft.com.
# Output: Reports\<timestamp>\report.html, data.json and a raw\ folder with the exported files.
# -Quick skips the slow parts (msinfo32, winget, DISM, optional features, old drivers, folder sizes).

param([switch]$Quick, [switch]$NoOpen)

$ErrorActionPreference = 'SilentlyContinue'
$ProgressPreference = 'SilentlyContinue'
$script:Version = '0.5.1'
$script:Warnings = New-Object System.Collections.ArrayList
$swTotal = [Diagnostics.Stopwatch]::StartNew()

$appDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $appDir

# ---------------------------------------------------------------- helpers
function Warn([string]$m) { [void]$script:Warnings.Add($m) }

function Step([int]$n, [int]$total, [string]$label) {
    Write-Host ("  [{0,2}/{1}] {2} ..." -f $n, $total, $label) -ForegroundColor White
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
    return [pscustomobject]@{
        total    = $events.Count
        errors   = @($events | Where-Object { $_.Level -le 2 }).Count
        warnings = @($events | Where-Object { $_.Level -eq 3 }).Count
        groups   = $groups
        perDay   = $perDay
    }
}

# ---------------------------------------------------------------- start
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

Write-Host ''
Write-Host '  =====================================' -ForegroundColor DarkRed
Write-Host '    V E A G L E   P C   C H E C K' -ForegroundColor Red
if ($Quick) { Write-Host '    QUICK scan, read-only, nothing is changed' -ForegroundColor Gray } else { Write-Host '    read-only scan, nothing is changed' -ForegroundColor Gray }
Write-Host '  =====================================' -ForegroundColor DarkRed
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

$TOTAL = 16

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
$days = 30
$since = (Get-Date).AddDays(-$days)
$sysEv = @(Get-WinEvent -FilterHashtable @{ LogName = 'System'; Level = 1, 2, 3; StartTime = $since } -ErrorAction SilentlyContinue)
$appEv = @(Get-WinEvent -FilterHashtable @{ LogName = 'Application'; Level = 1, 2, 3; StartTime = $since } -ErrorAction SilentlyContinue)

foreach ($pair in @(@('System', $sysEv), @('Application', $appEv))) {
    try {
        $pair[1] | Select-Object @{ n = 'Time'; e = { $_.TimeCreated.ToString('s') } }, Id, @{ n = 'Level'; e = { LevelName $_.Level } }, ProviderName, @{ n = 'Message'; e = { FirstLine $_.Message 300 } } |
            Export-Csv -NoTypeInformation -Encoding UTF8 -Path (Join-Path $raw ('events-' + $pair[0] + '-30d.csv'))
    } catch { Warn ('csv ' + $pair[0] + ': ' + $_.Exception.Message) }
}

$crashApps = @{}
$crashPaths = @{}
foreach ($e in $appEv) {
    if ($e.ProviderName -eq 'Application Error' -and $e.Id -eq 1000) {
        $n = ''
        try { $n = [string]$e.Properties[0].Value } catch { }
        if (-not $n -and $e.Message -match 'Faulting application name:\s*([^,\r\n]+)') { $n = $Matches[1].Trim() }
        if ($n) {
            $crashApps[$n] = 1 + [int]$crashApps[$n]
            if (-not $crashPaths.ContainsKey($n)) { $pp = ''; try { $pp = [string]$e.Properties[10].Value } catch { }; $crashPaths[$n] = $pp }
        }
    }
}
$crashList = @($crashApps.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 12 | ForEach-Object { $k = [string]$_.Key; $pth = [string]$crashPaths[$k]; $ex = $null
    if ($pth -and $pth -match '^[A-Za-z]:\\') { $ex = [bool](Test-Path -LiteralPath $pth -ErrorAction SilentlyContinue) }
    [pscustomobject]@{ app = $k; count = [int]$_.Value; path = $pth; exists = $ex } })
$hangCount = @($appEv | Where-Object { $_.ProviderName -eq 'Application Hang' }).Count

$events = [ordered]@{
    days        = $days
    system      = Summarize-Events $sysEv $days
    application = Summarize-Events $appEv $days
    appCrashes  = $crashList
    appHangs    = $hangCount
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
$timeline = @($tl | Sort-Object t -Descending | Select-Object -First 900 | Sort-Object t)
$extras | Add-Member -NotePropertyName dumps -NotePropertyValue $dumps -Force
$extras | Add-Member -NotePropertyName timeline -NotePropertyValue $timeline -Force

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
    $hl = [ordered]@{
        t = Iso (Get-Date); v = $script:Version; mode = $(if ($Quick) { 'quick' } else { 'full' })
        freeC = $(if ($cVol) { [double]$cVol.freeGB } else { $null }); bootS = $bootAvg
        sysErr = [int]$events.system.errors; appErr = [int]$events.application.errors; crashes = $crashTot
        patchDays = $lastPatchDays; startup = $startN; outdated = $(if ($Quick) { $null } else { @($outdated).Count })
        reliability = $relIndex; dumps = @($dumps).Count
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
Write-Host ('  Done in {0} s.' -f [int]$swTotal.Elapsed.TotalSeconds) -ForegroundColor Green
Write-Host ('  Report: ' + (Join-Path $out 'report.html')) -ForegroundColor White
if ($script:Warnings.Count -gt 0) { Write-Host ('  {0} non-critical warning(s) are listed inside the report.' -f $script:Warnings.Count) -ForegroundColor Yellow }
Write-Host '  Nothing was changed on this PC and nothing was uploaded.' -ForegroundColor Gray

if (-not $NoOpen -and (Test-Path (Join-Path $out 'report.html'))) { try { Start-Process (Join-Path $out 'report.html') } catch { } }
