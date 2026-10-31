#!/usr/bin/env python3
"""Creates tools/sample-data.json: realistic demo data (numbers taken from a real PC, personal details removed)."""
import json, random, datetime, pathlib
random.seed(7)
now = datetime.datetime(2026, 10, 31, 16, 35)
iso = lambda d: d.strftime('%Y-%m-%dT%H:%M:%S')

def ev(provider, id_, level, count, sample='', days_ago=2):
    return dict(provider=provider, id=id_, level=level, count=count, sample=sample, lastSeen=iso(now - datetime.timedelta(days=days_ago)))

sys_groups = [
 ev('nvlddmkm',153,'Error',466,'',28), ev('Microsoft-Windows-DistributedCOM',10016,'Warning',447,'The application-specific permission settings do not grant Local Activation permission for the COM Server application with CLSID',3),
 ev('Microsoft-Windows-DistributedCOM',10010,'Error',163,'The server did not register with DCOM within the required timeout.',3),
 ev('Microsoft-Windows-BitLocker-Driver',24641,'Error',95,'An unexpected error was encountered attempting to retrieve the BitLocker volume master key during restart.',3),
 ev('e2fexpress',27,'Warning',45,'Intel(R) Ethernet Controller (3) I225-V',3),
 ev('Service Control Manager',7034,'Error',39,'The MEmuSVC service terminated unexpectedly.  It has done this 1 time(s).',22),
 ev('Microsoft-Windows-Hyper-V-Hypervisor',167,'Warning',39,'The hypervisor did not enable mitigations for side channel vulnerabilities because HyperThreading is enabled.',3),
 ev('Tcpip',4266,'Warning',17,'A request to allocate an ephemeral port number from the global UDP port space has failed due to all such ports being in use.',20),
 ev('winsrvext',100,'Warning',16,'Process nvcontainer.exe is delaying system shutdown after 5172 milliseconds.',3),
 ev('Microsoft-Windows-DistributedCOM',10005,'Error',12,'DCOM got error "87" attempting to start the service GamingServices',4),
 ev('VMnetDHCP',1,'Warning',9,'dispatch: Timeout waiting for input data',3),
 ev('Microsoft-Windows-FilterManager',3,'Error',8,'Filter Manager failed to attach to volume. This volume will be unavailable for filtering until a reboot.',2),
 ev('Service Control Manager',7024,'Error',6,'The XboxService service terminated with a service-specific error.',3),
 ev('Tcpip',4231,'Warning',4,'A request to allocate an ephemeral port number from the global TCP port space has failed due to all such ports being in use.',20),
 ev('Microsoft-Windows-WindowsUpdateClient',20,'Error',2,'Installation Failure: Windows failed to install the following update with error 0x8024200B: LG Electronics Inc. - Extension',4),
 ev('Volsnap',36,'Error',1,'The shadow copies of volume C: were aborted because the shadow copy storage could not grow due to a user imposed limit.',25),
 ev('disk',153,'Warning',1,'The IO operation at logical block address was retried.',25),
]
app_groups = [
 ev('Microsoft-Windows-CAPI2',4176,'Error',443,"PFX operation failed as AuthSafes count doesn't lie in expected range. Maximum permissible value: 200. Erroneous value: 202.",24),
 ev('Microsoft-Windows-WMI',63,'Warning',117,'A provider, IntelMEProv, has been registered in the WMI namespace to use the LocalSystem account.',3),
 ev('Telemetry 3.0 x64',259,'Error',60,'Policy not available',3),
 ev('Application Error',1000,'Error',54,'Faulting application name: MemuService.exe',22),
 ev('Microsoft-Windows-Perflib',2003,'Warning',42,'The configuration information of the performance library perfts.dll does not match the trusted information.',3),
 ev('Microsoft-Windows-Search',10024,'Warning',40,'The filter host process did not respond and is being forcibly terminated.',3),
 ev('.NET Runtime',1022,'Error',36,'There was a failure initializing profiling API attach infrastructure.',22),
 ev('VSS',13,'Error',7,'The COM Server CEventSystem cannot be started. A system shutdown is in progress.',9),
 ev('Application Hang',1002,'Error',2,'The program dllhost.exe stopped interacting with Windows and was closed.',22),
]
def perday(total_err, spike_idx, spike):
    out = []
    for i in range(29, -1, -1):
        d = (now - datetime.timedelta(days=i)).strftime('%Y-%m-%d')
        e = random.randint(0, 6) if i % 7 else random.randint(8, 25)
        out.append(dict(date=d, errors=e + (spike if i == spike_idx else 0), warnings=random.randint(5, 40)))
    return out

apps_all = ['@BIOS','ACDSee Free','Adobe Acrobat (64-bit)','AnyDesk','Bitdefender Total Security','Brave','Discord','EA app','Epic Games Launcher','FileZilla','GitHub Desktop','GOG GALAXY','Google Chrome','HandBrake 1.9.2','HWiNFO 64','Intel(R) Extreme Tuning Utility','MEmu','Microsoft Edge','Microsoft Office Professional Plus 2021','Microsoft OneDrive','NordVPN','Notepad++ (64-bit x64)','NVIDIA App','NVIDIA Graphics Driver','OpenVPN','PowerShell 7-x64','PowerToys (Preview)','RustDesk','Steam','SteelSeries GG','Ubisoft Connect','VLC media player','VMware Workstation','Viber','WinDirStat','WinRAR 7.10 (64-bit)','Wondershare Filmora 16']
apps_list = [dict(name=n, version='1.0', publisher='', sizeMB=random.choice([0, 20, 120, 540])) for n in apps_all]
outdated = [
 ('@BIOS','GIGABYTE.BIOS','4.24.0130.1','4.26.0930.1','winget'),('AnyDesk','AnyDesk.AnyDesk','ad 9.0.4','9.8.3','winget'),
 ('CapCut','XP9KN75RRB9NHS','9.1.0.3879','9.7.0.4153','msstore'),('EA app','ElectronicArts.EADesktop','13.700.0.6213','13.813.1.6327','winget'),
 ('Epic Games Launcher','XP99VR1BPSBQJ2','1.3.189.0','1.3.210.0','msstore'),('GitHub Desktop','GitHub.GitHubDesktop','3.6.7','3.6.10','winget'),
 ('HandBrake 1.9.2','HandBrake.HandBrake','1.9.2','1.11.2','winget'),('Ledger Wallet 2.133.0','LedgerHQ.LedgerLive','2.133.0','4.24.1','winget'),
 ('Microsoft Edge','Microsoft.Edge','156.0.4314.50','156.0.4314.58','winget'),('Notepad++ (64-bit x64)','Notepad++.Notepad++','8.7.8','8.9.8.1','winget'),
 ('OpenVPN 2.6.14-I001 amd64','OpenVPNTechnologies.OpenVPN','2.6.1401','2.7.701','winget'),('Windows Terminal','Microsoft.WindowsTerminal','1.24.11911.0','1.25.2733.0','winget'),
 ('WinRAR 7.10 (64-bit)','RARLab.WinRAR','7.10.0','7.23.0','winget'),('Viber','XPFM5P5KDWF0JP','28.2.0.0','29.1.0.0','msstore'),
] + [('Sample app %d'%i,'Vendor.App%d'%i,'1.%d'%i,'2.%d'%i,'winget') for i in range(17)]
startup_names = ['GoogleDriveFS','OneDrive','Discord','EpicGamesLauncher','CCXProcess','BraveSoftware Update','Adobe Acrobat Synchronizer','Agent Tray','ACDSeeCommanderFree','Wargaming.net Game Center','Studio.QuickLook','EADM','FilmoraTray','NVIDIA Broadcast','GogGalaxy','MicrosoftEdgeAutoLaunch','AnyDesk','SecurityHealth','RtkAudUService','SteelSeriesGG','Bdagent','ACFW02EN','BdVpnApp','Steam','Viber','Spotify','Zoom','Dropbox']
data = {
 'meta': dict(mode='full', tool='VEAGLE PC Check', version='0.2.0', generated=iso(now), isAdmin=True, psVersion='5.1.26100.9549', user='demo', computer='DEMO-PC', domain='DEMO-PC', durationSec=214, warnings=['winget: first run may be slow']),
 'system': dict(manufacturer='Gigabyte Technology Co., Ltd.', model='Z590 AORUS PRO AX', chassis='Desktop', isLaptop=False, firmware='UEFI',
   board=dict(manufacturer='Gigabyte Technology Co., Ltd.', product='Z590 AORUS PRO AX'),
   bios=dict(vendor='American Megatrends International, LLC.', version='ALASKA - 1072009', date='2025-06-10T00:00:00', smbios='3.4'),
   cpu=dict(name='11th Gen Intel(R) Core(TM) i7-11700K @ 3.60GHz', manufacturer='GenuineIntel', sockets=1, cores=8, threads=16, baseMHz=3600, currentMHz=3600, l2KB=4096, l3KB=16384, socket='U3E1', virtualizationEnabled=False, loadPercent=7),
   ram=dict(totalGB=31.9, freeGB=17.4, slots=4, maxGB=128, modules=[dict(slot='DIMM_A1',gb=16,speedMHz=3500,configuredMHz=3500,manufacturer='Crucial Technology',partNumber='',type='DDR4',formFactor='DIMM'),dict(slot='DIMM_B1',gb=16,speedMHz=3500,configuredMHz=3500,manufacturer='Crucial Technology',partNumber='',type='DDR4',formFactor='DIMM')]),
   os=dict(caption='Microsoft Windows 11 Pro', productName='Windows 11 Pro', edition='Professional', displayVersion='', version='10.0.26300', build=26300, ubr=9711, arch='64-bit', installDate='2026-06-22T16:44:15', lastBoot='2026-10-31T16:01:34', uptimeHours=0.6, language='el-GR', timeZone='GTB Standard Time')),
 'gpus': [dict(name='NVIDIA GeForce RTX 3070', vramGB=8, driverVersion='32.0.16.1088', driverFriendly='610.88', driverDate='2026-07-22T00:00:00', width=1920, height=1080, refreshHz=60, status='OK')],
 'disks': [dict(name='KINGSTON SFYRD2000G', mediaType='SSD', busType='NVMe', health='Healthy', status='OK', sizeGB=1863, firmware='', reliability=dict(temperatureC=38, wearPercent=0, powerOnHours=None, readErrors=None, writeErrors=None)),
           dict(name='Samsung SSD 860 EVO 1TB', mediaType='SSD', busType='SATA', health='Healthy', status='OK', sizeGB=932, firmware='', reliability=dict(temperatureC=51, wearPercent=0, powerOnHours=20797, readErrors=0, writeErrors=None)),
           dict(name='Msft Virtual Disk', mediaType='SSD', busType='File Backed Virtual', health='Healthy', status='OK', sizeGB=0, firmware='', reliability=None)],
 'volumes': [dict(letter='C:', label='', fs='NTFS', health='Healthy', driveType='Fixed', sizeGB=1862, freeGB=289, bitlocker=dict(protection='On', percent=100)),
             dict(letter='D:', label='', fs='NTFS', health='Healthy', driveType='Fixed', sizeGB=931, freeGB=213, bitlocker=dict(protection='On', percent=100))],
 'network': dict(adapters=[dict(name='Ethernet', description='Intel(R) Ethernet Controller (3) I225-V', status='Up', linkSpeed='1 Gbps', virtual=False),
   dict(name='vEthernet (Default Switch)', description='Hyper-V Virtual Ethernet Adapter', status='Up', linkSpeed='10 Gbps', virtual=True),
   dict(name='NordLynx', description='NordLynx Tunnel', status='Disconnected', linkSpeed='100 Gbps', virtual=True),
   dict(name='Wi-Fi', description='Intel(R) Wi-Fi 6 AX200 160MHz', status='Not Present', linkSpeed='0 bps', virtual=False)], dns=['1.1.1.1','8.8.8.8']),
 'security': dict(secureBoot=True, tpm=dict(present=True, ready=True, specVersion='2.0'), antivirus=[dict(name='Bitdefender Antivirus', enabled=True, upToDate=True), dict(name='Windows Defender', enabled=False, upToDate=True)],
   defender=dict(serviceEnabled=False, realTime=False, signaturesUpdated=None), firewall=dict(domain=True, private=True, public=True), uac=True, pendingReboot=False, rdpEnabled=False, localAdmins=2, memoryIntegrity=None, vbsStatus=2, hypervisorPresent=True,
   optionalFeatures=['Microsoft-Hyper-V-All','VirtualMachinePlatform','Microsoft-Windows-Subsystem-Linux']),
 'settings': dict(powerPlan='Balanced', fastStartup=True, hibernation=True, pagefileAuto=False, pagefiles=[dict(name='C:\\pagefile.sys', allocatedMB=35000, usedMB=32)], trim=True, gpuScheduling=None, gameMode=None, storageSense=True, tempMB=dict(user=797, windows=381), hasBattery=False),
 'updates': dict(hotfixes=[dict(id='KB5127648',description='Security Update',installedOn='2026-10-18T00:00:00'),dict(id='KB5127647',description='Security Update',installedOn='2026-10-16T00:00:00')], lastPatchDaysAgo=13),
 'crashDumps': dict(dumps=0, liveKernelReports=0),
 'events': dict(days=30, system=dict(total=1379, errors=700, warnings=679, groups=sys_groups, perDay=perday(0, 27, 466)), application=dict(total=871, errors=520, warnings=351, groups=app_groups, perDay=perday(0, 25, 443)),
   appCrashes=[dict(app='MemuService.exe',count=39),dict(app='OnScreen Control.exe',count=3),dict(app='nordvpn-service.exe',count=2),dict(app='vmware-vmx.exe',count=2),dict(app='GalaxyClient.exe',count=2)], appHangs=2),
 'boot': dict(history=[dict(time=iso(now-datetime.timedelta(days=i)),seconds=s) for i,s in enumerate([64.6,65.0,78.8,103.7,79.6,88.2,71.4,69.9])],
   slowStarters=[dict(name='Discord.exe',times=4),dict(name='Microsoft.CmdPal.UI.exe',times=4),dict(name='nvcontainer.exe',times=3),dict(name='bdservicehost.exe',times=3),dict(name='Agent.exe',times=3),dict(name='nordvpn-service.exe',times=2)]),
 'apps': dict(count=212, storeCount=60, list=apps_list, wingetAvailable=True, outdated=[dict(name=a,id=b,version=c,available=d,source=e) for a,b,c,d,e in outdated]),
 'startup': dict(items=[dict(name=n,command='C:\\Users\\demo\\AppData\\Local\\%s\\run.exe --background' % n,location='HKU\\S-1-5-21-1-2-3-1001\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run') for n in startup_names],
   thirdPartyServices=[dict(name=n,display=n+' Service',state='Running') for n in ['AnyDesk','Agent','BDAppSrv','BDAuxSrv','BDProtSrv','bdredline','bdvpnservice','nordvpn-service','OpenVPNService','VMAuthdService','NvContainerLocalSystem','WSLService']],
   failedAutoServices=[dict(name='MEmuSVC',display='MEmuSVC',exitCode=1067),dict(name='XboxService',display='Xbox Service',exitCode=1066)],
   scheduledTasks=[dict(name='Adobe Acrobat Update Task',state='Ready'),dict(name='GCC',state='Ready')],
   topRam=[dict(name='NVIDIA Broadcast',instances=2,ramMB=950,cpuSeconds=226),dict(name='Discord',instances=3,ramMB=923,cpuSeconds=1087),dict(name='Agent',instances=1,ramMB=737,cpuSeconds=972),dict(name='bdservicehost',instances=4,ramMB=737,cpuSeconds=84),dict(name='claude',instances=3,ramMB=1100,cpuSeconds=274),dict(name='steamwebhelper',instances=2,ramMB=717,cpuSeconds=40),dict(name='chrome',instances=14,ramMB=1260,cpuSeconds=65)], topCpu=[]),
 'drivers': dict(problemDevices=[dict(**{'class':'SoftwareComponent'},name='Intel(R) XTU Component Device',status='Degraded',problem='CM_PROB_NONE',disabled=False) for _ in range(15)]+[dict(**{'class':'Net'},name='VMware Virtual Ethernet Adapter for VMnet1',status='Error',problem='CM_PROB_DISABLED',disabled=True),dict(**{'class':'Net'},name='Intel(R) Wi-Fi 6 AX200 160MHz',status='Error',problem='CM_PROB_DISABLED',disabled=True)],
   oldDrivers=[dict(device='TP-LINK Wireless USB Adapter',provider='TP-LINK',version='2.0.0.62',date='2011-04-20T00:00:00'),dict(device='Wintun Userspace Tunnel',provider='WireGuard LLC',version='0.8.0.0',date='2019-12-10T00:00:00')]),
 'dism': dict(state='repairable', text='The component store is repairable. | The operation completed successfully.')
}
out = pathlib.Path(__file__).resolve().parent / 'tools'; out.mkdir(exist_ok=True)

import copy
# --- timeline and trend for the demo (v0.5)
def _tl():
    rnd = random.Random(11)
    T = []
    def add(dt, k, x=''): T.append(dict(t=iso(dt), k=k, x=x))
    d0 = now - datetime.timedelta(days=12, hours=-5)
    add(d0, 'update', '2026-10 Cumulative Update for Windows 11 (KB5044284)')
    add(d0 + datetime.timedelta(hours=9, minutes=20), 'install', 'NVIDIA Graphics Driver 566.14')
    for i in range(30):
        add(now - datetime.timedelta(days=30) + datetime.timedelta(hours=i * 23 + rnd.randint(0, 5)), 'boot', str(round(rnd.uniform(40, 52), 1)) if i < 12 else str(round(rnd.uniform(70, 95), 1)))
    T = [e for e in T if not (e['k'] == 'boot' and e['t'] > iso(d0) and False)]
    start = d0 + datetime.timedelta(hours=10)
    for i in range(14):
        t = start + datetime.timedelta(hours=i * 20 + rnd.randint(0, 6))
        if t > now: break
        add(t - datetime.timedelta(minutes=2), 'gpu', 'nvlddmkm 153')
        add(t, 'crash', rnd.choice(['MemuService.exe', 'chrome.exe', 'nvcontainer.exe']))
    for i, dd in enumerate([6, 9, 11]):
        t = now - datetime.timedelta(days=dd, hours=2)
        add(t - datetime.timedelta(minutes=7), 'sleep'); add(t - datetime.timedelta(minutes=4), 'wake'); add(t, 'unclean')
        if i < 2: add(t - datetime.timedelta(minutes=3), 'disk', 'disk 153')
    for dd in (2, 15):
        t = now - datetime.timedelta(days=dd, hours=1)
        add(t, 'unclean', 'dirty shutdown')
    add(now - datetime.timedelta(days=4), 'install', 'VLC media player'); add(now - datetime.timedelta(days=20), 'uninstall', 'Old tool')
    T.sort(key=lambda e: e['t'])
    return T
SAMPLE_TL = _tl()
SAMPLE_TREND = [dict(t=iso(now - datetime.timedelta(days=7 * (7 - i))), v='0.4.1', mode='full', freeC=round(180 - i * 6.5 + (3 if i % 3 == 0 else 0), 1), bootS=round(44 + i * 5.2, 1), sysErr=300 + i * 90, appErr=40 + i * 12, crashes=2 + i * 6, patchDays=14 + (i % 4) * 9, startup=14 + i, outdated=3 + i, reliability=round(9 - i * 0.6, 1), dumps=i // 3) for i in range(8)]

# --- v0.3 extras (mild for the desktop demo, heavy for the old laptop)
data['meta']['version'] = '0.5.0'
data['extras'] = dict(
  reliability=dict(stabilityIndex=6.8, stabilityLatest=7.4, bugchecks=[dict(time=iso(now - datetime.timedelta(days=19)), code='0x00000116')]),
  securityMore=dict(defender=dict(signatureAgeDays=2, quickScanAgeDays=3, fullScanAgeDays=30, tamperProtected=True, threats30d=0, lastThreat=None),
    nlaRequired=True, autoLogon=False, uacPromptLevel=5, smb1Enabled=False, adminNames=['DEMO-PC\\demo', 'DEMO-PC\\Administrator'],
    shares=[dict(name='Photos', path='D:\\Photos')],
    listening=[dict(port=135, process='svchost', allInterfaces=True), dict(port=445, process='System', allInterfaces=True), dict(port=49664, process='lsass', allInterfaces=True)],
    activation=1, unsignedDrivers=[]),
  networkTest=dict(gateway=True, ping=dict(target='router', sent=5, lost=0, avgMs=2.1), dns=dict(ok=True, ms=38), timeSync=dict(source='time.windows.com', local=False), wifi=None, proxyEnabled=False, pacUrl=False, hostsEntries=[]),
  backup=dict(restorePoints=dict(readable=True, count=2, lastDaysAgo=20), fileHistory=False, oneDriveFolders=dict(documents=True, desktop=True, pictures=False), winRE=True),
  storage=dict(folders=[dict(name='Downloads', path='C:\\Users\\demo\\Downloads', mb=48210, partial=False), dict(name='Videos', path='C:\\Users\\demo\\Videos', mb=31800, partial=False), dict(name='AppData Local', path='C:\\Users\\demo\\AppData\\Local', mb=22400, partial=False), dict(name='Windows Update downloads', path='C:\\Windows\\SoftwareDistribution\\Download', mb=3100, partial=False), dict(name='Documents', path='C:\\Users\\demo\\Documents', mb=9100, partial=False), dict(name='Temp (user)', path='C:\\Users\\demo\\AppData\\Local\\Temp', mb=1200, partial=False)],
    systemFiles=[dict(name='hiberfil.sys', mb=12800), dict(name='pagefile.sys', mb=4096)],
    bigFiles=[dict(path='C:\\Users\\demo\\Downloads\\Win11_Setup.iso', mb=5400, modified='2026-02-11T10:12:00'), dict(path='C:\\Users\\demo\\Videos\\trip2025.mp4', mb=3900, modified='2025-08-20T21:40:00')],
    oldInstallers=dict(count=23, mb=7400), recycleBinMB=1850),
  gaming=dict(gameDvr=True, gameMode=False, hags=False),
  dumps=[dict(file='101926-9812-01.dmp', time=iso(now - datetime.timedelta(days=6, hours=2)), sizeMB=1, code='0x00000133', params=['0x0','0x501','0x500','0x0']), dict(file='101326-8750-01.dmp', time=iso(now - datetime.timedelta(days=9, hours=5)), sizeMB=1, code='0x00000116', params=['0xffff','0x0','0x0','0x4']), dict(file='100526-8421-01.dmp', time=iso(now - datetime.timedelta(days=11, hours=1)), sizeMB=1, code='0x00000133', params=['0x0','0x501','0x500','0x0'])],
  timeline=SAMPLE_TL)
data['trend'] = SAMPLE_TREND
for v in data['network']['adapters']:
    if not v.get('virtual') and 'ethernet' in (v['name'] + v['description']).lower(): v['linkSpeed'] = '100 Mbps'
(out / 'sample-data.json').write_text(json.dumps(data, indent=1), encoding='utf-8')

# --- variant: Windows 10 laptop, quick scan
w = copy.deepcopy(data)
w['meta'].update(mode='quick', computer='DEMO-LAPTOP', domain='DEMO-LAPTOP', durationSec=41)
sy = w['system']; sy.update(model='ThinkBook demo', manufacturer='Demo Corp', chassis='Laptop', isLaptop=True, firmware='BIOS')
sy['cpu'].update(name='Intel(R) Core(TM) i5-7200U CPU @ 2.50GHz', cores=2, threads=4, baseMHz=2500, l2KB=512, l3KB=3072, virtualizationEnabled=True)
sy['ram'].update(totalGB=7.9, freeGB=2.1, slots=2, modules=[dict(slot='SODIMM1',gb=8,speedMHz=2133,configuredMHz=2133,manufacturer='Samsung',partNumber='',type='DDR4',formFactor='SODIMM')])
sy['os'].update(caption='Microsoft Windows 10 Pro', productName='Windows 10 Pro', displayVersion='22H2', build=19045, ubr=6456, version='10.0.19045')
w['gpus'] = [dict(name='Intel(R) HD Graphics 620', vramGB=1, driverVersion='27.20.100.9466', driverFriendly='27.20.100.9466', driverDate='2021-03-01T00:00:00', width=1920, height=1080, refreshHz=60, status='OK')]
w['disks'] = [dict(name='SAMSUNG MZNLN256', mediaType='SSD', busType='SATA', health='Healthy', status='OK', sizeGB=238, firmware='', reliability=None)]
w['volumes'] = [dict(letter='C:', label='', fs='NTFS', health='Healthy', driveType='Fixed', sizeGB=238, freeGB=31, bitlocker=None)]
w['security'].update(secureBoot=False, tpm=dict(present=True, ready=True, specVersion='1.2'), optionalFeatures=[], hypervisorPresent=False)
w['settings'].update(hasBattery=True, fastStartup=True)
w['battery'] = dict(present=True, designMWh=48000, fullChargeMWh=27800, cycleCount=612, chemistry='LION', wearPercent=42)
w['apps']['outdated'] = []; w['apps']['wingetSkipped'] = True
w['dism'] = dict(state='skipped', text='')
w['drivers']['oldDrivers'] = []
# --- v0.3 extras (reliability, security details, network test, backups)
w['meta']['version'] = '0.5.0'
w['extras'] = dict(
  reliability=dict(stabilityIndex=4.2, stabilityLatest=3.1, bugchecks=[dict(time=iso(now - datetime.timedelta(days=6)), code='0x00000133'), dict(time=iso(now - datetime.timedelta(days=9)), code='0x00000116'), dict(time=iso(now - datetime.timedelta(days=12)), code='0x00000133')]),
  securityMore=dict(defender=dict(signatureAgeDays=9, quickScanAgeDays=41, fullScanAgeDays=None, tamperProtected=False, threats30d=2, lastThreat=iso(now - datetime.timedelta(days=5))),
    nlaRequired=False, autoLogon=True, uacPromptLevel=5, smb1Enabled=False, adminNames=['DEMO-PC\\demo', 'DEMO-PC\\Administrator', 'DEMO-PC\\guest-admin'],
    shares=[dict(name='Photos', path='D:\\Photos'), dict(name='Scans', path='C:\\Scans')],
    listening=[dict(port=135, process='svchost', allInterfaces=True), dict(port=445, process='System', allInterfaces=True), dict(port=3389, process='svchost', allInterfaces=True), dict(port=5900, process='tvnserver', allInterfaces=True), dict(port=49664, process='lsass', allInterfaces=True)],
    activation=1, unsignedDrivers=[dict(device='Virtual Audio Cable', provider='Unknown')]),
  networkTest=dict(gateway=True, ping=dict(target='router', sent=5, lost=1, avgMs=38.4), dns=dict(ok=True, ms=1240), timeSync=dict(source='Local CMOS Clock', local=True), wifi=dict(signalPct=42, band='2.4 GHz', radio='802.11n'), proxyEnabled=True, pacUrl=False, hostsEntries=['0.0.0.0 ads.example.com']),
  backup=dict(restorePoints=dict(readable=True, count=0, lastDaysAgo=None), fileHistory=False, oneDriveFolders=dict(documents=False, desktop=False, pictures=False), winRE=False))
for v in w['network']['adapters']:
    if not v.get('virtual') and 'ethernet' in (v['name'] + v['description']).lower(): v['linkSpeed'] = '100 Mbps'
(out / 'sample-win10-laptop.json').write_text(json.dumps(w, indent=1), encoding='utf-8')

# --- variant: an older, worse scan of the desktop (for Compare)
o = copy.deepcopy(data)
o['meta']['generated'] = iso(now - datetime.timedelta(days=21))
o['volumes'][0]['freeGB'] = 120
o['apps']['outdated'] = o['apps']['outdated'] + [dict(name='Old app %d'%i, id='V.Old%d'%i, version='1', available='2', source='winget') for i in range(9)]
o['startup']['items'] = o['startup']['items'] + [dict(name='Extra%d'%i, command='x', location='Run') for i in range(6)]
o['dism'] = dict(state='repairable', text='x')
o['updates']['lastPatchDaysAgo'] = 75
o['security']['antivirus'] = [dict(name='Bitdefender Antivirus', enabled=False, upToDate=False), dict(name='Windows Defender', enabled=False, upToDate=True)]
o['security']['defender'] = dict(serviceEnabled=False, realTime=False, signaturesUpdated=None)
(out / 'sample-older.json').write_text(json.dumps(o, indent=1), encoding='utf-8')
print('samples written')
