#!/usr/bin/env python3
"""
VEAGLE EYE - ζωντανή παρακολούθηση του υπολογιστή σου μέσα στον browser.

Τι κάνει:  διαβάζει στοιχεία του υπολογιστή (επεξεργαστής, μνήμη, δίσκοι, δίκτυο,
           προγράμματα) και τα δείχνει ζωντανά σε μια σελίδα στον browser σου.
Τι ΔΕΝ κάνει:  δεν αλλάζει τίποτα στον υπολογιστή, δεν στέλνει τίποτα στο
           διαδίκτυο, δεν ξεκινά μόνο του με τα Windows.

Ο μόνος εξωτερικός κώδικας που χρειάζεται είναι η βιβλιοθήκη "psutil".
Όλα τα υπόλοιπα είναι στην standard βιβλιοθήκη της Python.
"""

import argparse
import bisect
import collections
import concurrent.futures
import gzip
import re
import shutil
import subprocess
import struct
import ipaddress
import json
import mimetypes
import os
import platform
import secrets
import socket
import sys
import threading
import time
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import psutil

APP_NAME = "Veagle Eye"
APP_VERSION = "2211 2205"
HOST = "127.0.0.1"          # ΜΟΝΟ αυτός ο υπολογιστής. Κανείς άλλος στο δίκτυο δεν το βλέπει.
DEFAULT_PORT = 8765
SAMPLE_SECONDS = 1.0         # κάθε πότε διαβάζονται τα στοιχεία
TOP_PROCESSES = 40
MAX_CONNECTIONS = 300
HOME_CC = ""                 # προαιρετικά: χώρα του PC στον χάρτη (--home GR)
IS_WIN = os.name == "nt"
DEMO = os.environ.get("VEAGLE_EYE_DEMO") == "1"   # μόνο για δοκιμές εμφάνισης: ψεύτικα δεδομένα υλικού
HISTORY_SECONDS = 3600       # ιστορικό της τελευταίας ώρας: ΜΟΝΟ στη μνήμη, δεν γράφεται ποτέ στον δίσκο


def resource_dir() -> Path:
    """Φάκελος με τα αρχεία της σελίδας (δουλεύει και μέσα σε .exe της PyInstaller)."""
    base = getattr(sys, "_MEIPASS", None)
    return Path(base) / "static" if base else Path(__file__).resolve().parent / "static"


STATIC = resource_dir()

# Γνωστές θύρες, για να λέμε στον αρχάριο "τι είναι αυτό" χωρίς να ρωτάμε το διαδίκτυο.
PORT_NAMES = {
    20: "FTP (αρχεία)", 21: "FTP (αρχεία)", 22: "SSH (απομακρυσμένη σύνδεση)", 23: "Telnet",
    25: "Email (αποστολή)", 53: "DNS (μετατροπή ονομάτων)", 80: "Ιστοσελίδα (HTTP)",
    110: "Email (λήψη)", 123: "Ώρα (NTP)", 135: "Windows RPC", 137: "Windows NetBIOS",
    139: "Windows κοινή χρήση", 143: "Email (IMAP)", 389: "LDAP (κατάλογος)",
    443: "Ασφαλής ιστοσελίδα (HTTPS)", 445: "Windows κοινή χρήση αρχείων",
    465: "Email (ασφαλής)", 587: "Email (αποστολή)", 993: "Email (IMAP ασφαλές)",
    995: "Email (POP3 ασφαλές)", 1433: "Βάση δεδομένων SQL Server", 3306: "Βάση δεδομένων MySQL",
    3389: "Απομακρυσμένη επιφάνεια εργασίας", 5222: "Μηνύματα (XMPP)", 5353: "mDNS (εύρεση συσκευών)",
    5432: "Βάση δεδομένων PostgreSQL", 5900: "VNC (απομακρυσμένη οθόνη)", 8080: "Ιστοσελίδα (εναλλακτική)",
    8443: "Ασφαλής ιστοσελίδα (εναλλακτική)", 27015: "Παιχνίδια (Steam)",
}


class GeoDB:
    """Χώρα ανά διεύθυνση IPv4, από αρχείο που είναι ΜΕΣΑ στο πρόγραμμα (DB-IP Lite, CC BY 4.0).
    Δεν γίνεται κανένα ερώτημα στο διαδίκτυο: η αναζήτηση γίνεται τοπικά."""

    def __init__(self):
        self.starts, self.idx, self.ccs = [], b"", []
        try:
            raw = gzip.decompress((STATIC.parent / "geo" / "dbip-country-ipv4.bin.gz").read_bytes()) \
                if (STATIC.parent / "geo").exists() else gzip.decompress((STATIC / "geo" / "dbip-country-ipv4.bin.gz").read_bytes())
            n_cc, n = struct.unpack("<HI", raw[4:10])
            p = 10
            self.ccs = [raw[p + 2 * i:p + 2 * i + 2].decode() for i in range(n_cc)]
            p += 2 * n_cc
            self.starts = list(struct.unpack("<%dI" % n, raw[p:p + 4 * n]))
            self.idx = raw[p + 4 * n:p + 5 * n]
        except Exception:
            pass

    def country(self, ip: str) -> str:
        try:
            a = ipaddress.ip_address(ip.split("%")[0])
            if a.version != 4 or not self.starts:
                return ""
            i = bisect.bisect_right(self.starts, int(a)) - 1
            cc = self.ccs[self.idx[i]] if i >= 0 else ""
            return "" if cc == "ZZ" else cc
        except Exception:
            return ""


GEO = GeoDB()


def classify_address(ip: str) -> str:
    """Επιστρέφει: 'local' (αυτός ο υπολογιστής), 'lan' (το σπίτι/γραφείο σου), 'internet'."""
    try:
        a = ipaddress.ip_address(ip.split("%")[0])
    except ValueError:
        return "internet"
    if a.is_loopback or a.is_unspecified:
        return "local"
    if a.is_private or a.is_link_local or a.is_multicast:
        return "lan"
    return "internet"



# ----------------------------------------------------------------------------
#  ΒΟΗΘΗΤΙΚΑ: εντολές ΜΟΝΟ-ΑΝΑΓΝΩΣΗΣ του λειτουργικού (τίποτα δεν αλλάζει στον υπολογιστή)
# ----------------------------------------------------------------------------
def run_cmd(args, timeout: float = 12.0) -> str:
    """Τρέχει μια εντολή που ΜΟΝΟ διαβάζει πληροφορίες και επιστρέφει το κείμενό της (ή "" αν αποτύχει)."""
    try:
        kw = {"creationflags": 0x08000000} if IS_WIN else {}      # χωρίς να εμφανιστεί μαύρο παράθυρο
        r = subprocess.run(args, capture_output=True, timeout=timeout, **kw)
        return (r.stdout or b"").decode("utf-8", errors="replace")
    except Exception:
        return ""


def ps_json(script: str, timeout: float = 25.0):
    """Windows: τρέχει μια εντολή PowerShell που ΜΟΝΟ διαβάζει και επιστρέφει λίστα από αντικείμενα."""
    if not IS_WIN:
        return None
    full = ("[Console]::OutputEncoding=[System.Text.Encoding]::UTF8;$ProgressPreference='SilentlyContinue';"
            + script + " | ConvertTo-Json -Compress -Depth 3")
    out = run_cmd(["powershell", "-NoProfile", "-NonInteractive", "-Command", full], timeout).strip()
    if not out:
        return None
    try:
        v = json.loads(out)
    except Exception:
        return None
    return v if isinstance(v, list) else [v]


def own_ipv4() -> list:
    ips = []
    try:
        for addrs in psutil.net_if_addrs().values():
            for a in addrs:
                if a.family == socket.AF_INET and not a.address.startswith("127.") and not a.address.startswith("169.254."):
                    ips.append(a.address)
    except Exception:
        pass
    return ips


SUSPICIOUS_DIRS = ("\\temp\\", "/tmp/", "\\appdata\\local\\temp", "\\downloads\\", "/downloads/", "\\$recycle.bin", "\\users\\public\\")
VPN_WORDS = re.compile(r"vpn|\btap\b|tap-|\btun\d|wireguard|\bwg\d|openvpn|nord|proton|expressvpn|pptp|l2tp|ikev2|zerotier|tailscale|hamachi|cisco anyconnect|forticlient|globalprotect", re.I)


def demo_extra() -> dict:
    """Ψεύτικα δεδομένα ΜΟΝΟ για δοκιμή της εμφάνισης (VEAGLE_EYE_DEMO=1). Δεν χρησιμοποιείται στο κανονικό πρόγραμμα."""
    return {
        "gpu": [{"name": "NVIDIA GeForce RTX 4060", "util": 37, "mem_used": 2210, "mem_total": 8188, "temp": 58, "fan": 34}],
        "temps": [{"name": "Επεξεργαστής", "label": "CPU Package", "c": 56.0, "high": 95.0},
                  {"name": "Επεξεργαστής", "label": "Core 0", "c": 53.0, "high": 95.0},
                  {"name": "NVMe δίσκος", "label": "Composite", "c": 41.0, "high": 75.0}],
        "fans": [{"label": "CPU Fan", "rpm": 1180}, {"label": "Case Fan", "rpm": 860}],
        "lan": [{"ip": "192.168.1.1", "mac": "A4-2B-B0-11-22-33", "state": "reachable"},
                {"ip": "192.168.1.14", "mac": "3C-22-FB-44-55-66", "state": "stale"},
                {"ip": "192.168.1.23", "mac": "F0-18-98-77-88-99", "state": "stale"},
                {"ip": "192.168.1.40", "mac": "B8-27-EB-AA-BB-CC", "state": "reachable"}],
        "wifi": {"ssid": "HOME-WIFI", "signal": 78, "auth": "WPA2-Personal", "radio": "802.11ac", "channel": "44", "rx": "433", "tx": "433"},
        "firewall": [{"name": "Domain", "on": True}, {"name": "Private", "on": True}, {"name": "Public", "on": False}],
        "dns": [{"iface": "Wi-Fi", "servers": ["192.168.1.1", "1.1.1.1"]}],
        "vpn": {"adapters": [], "connections": []},
        "gateway": "192.168.1.1",
        "disks_health": [{"name": "Samsung SSD 980 1TB", "media": "SSD", "health": "Healthy", "status": "OK", "size": 1000204886016},
                         {"name": "WDC WD20EZAZ", "media": "HDD", "health": "Healthy", "status": "OK", "size": 2000398934016}],
        "monitors": [{"name": "NVIDIA GeForce RTX 4060", "w": 2560, "h": 1440, "hz": 144}],
        "usb": [{"name": "USB Composite Device", "cls": "USB"}, {"name": "Logitech USB Receiver", "cls": "HIDClass"}, {"name": "USB Mass Storage Device", "cls": "USB"}],
        "startup": [{"name": "OneDrive", "cmd": "C:\\Program Files\\Microsoft OneDrive\\OneDrive.exe /background", "where": "HKCU\\...\\Run"},
                    {"name": "Steam", "cmd": "C:\\Program Files (x86)\\Steam\\steam.exe -silent", "where": "HKCU\\...\\Run"},
                    {"name": "Discord", "cmd": "C:\\Users\\you\\AppData\\Local\\Discord\\Update.exe --processStart Discord.exe", "where": "HKCU\\...\\Run"}],
        "demo": True,
    }


class Extras(threading.Thread):
    """Αργή συλλογή στο παρασκήνιο: υλικό, Wi-Fi, τείχος προστασίας, εκκίνηση κ.λπ.
    Όλα είναι εντολές ΜΟΝΟ-ΑΝΑΓΝΩΣΗΣ. Αν κάτι δεν υπάρχει στον υπολογιστή σου, απλώς λείπει από τη σελίδα."""

    def __init__(self) -> None:
        super().__init__(daemon=True)
        self.lock = threading.Lock()
        self.data: dict = {}
        self.sig: dict = {}                  # διαδρομή αρχείου -> "signed" / "unsigned" / "invalid"
        self.want_sig: set = set()
        self.ok_scan = threading.Event()
        self.memtrend: dict = {}

    # --- μικρές εργασίες (κάθε μία σε try: αν αποτύχει, δεν επηρεάζει τις άλλες)
    @staticmethod
    def t_gpu():
        exe = shutil.which("nvidia-smi")
        if not exe:
            return None
        out = run_cmd([exe, "--query-gpu=name,utilization.gpu,memory.used,memory.total,temperature.gpu,fan.speed",
                       "--format=csv,noheader,nounits"], 6)
        res = []
        for line in out.strip().splitlines():
            parts = [x.strip() for x in line.split(",")]
            if len(parts) < 6:
                continue

            def num(x):
                try:
                    return float(x)
                except ValueError:
                    return None
            res.append({"name": parts[0], "util": num(parts[1]), "mem_used": num(parts[2]), "mem_total": num(parts[3]),
                        "temp": num(parts[4]), "fan": num(parts[5])})
        return res or None

    @staticmethod
    def t_temps():
        res = []
        try:
            st = psutil.sensors_temperatures()          # Linux και λίγα άλλα συστήματα
            for name, arr in (st or {}).items():
                for e in arr[:4]:
                    res.append({"name": name, "label": e.label or name, "c": round(e.current, 1),
                                "high": e.high if e.high else None})
        except Exception:
            pass
        if not res and IS_WIN:
            rows = ps_json("Get-CimInstance -Namespace root/wmi -ClassName MSAcpi_ThermalZoneTemperature -ErrorAction SilentlyContinue | Select-Object InstanceName,CurrentTemperature", 15)
            for r in rows or []:
                try:
                    c = round(float(r.get("CurrentTemperature")) / 10.0 - 273.15, 1)
                    if -20 < c < 150:
                        res.append({"name": "ACPI", "label": str(r.get("InstanceName", "ACPI")).split("\\")[-1], "c": c, "high": None})
                except (TypeError, ValueError):
                    pass
        return res or None

    @staticmethod
    def t_fans():
        try:
            st = psutil.sensors_fans()
        except Exception:
            return None
        res = [{"label": e.label or name, "rpm": e.current} for name, arr in (st or {}).items() for e in arr]
        return res or None

    @staticmethod
    def t_lan():
        out = run_cmd(["arp", "-a"], 8) if IS_WIN else (run_cmd(["ip", "neigh"], 6) or run_cmd(["arp", "-an"], 6))
        res = []
        for line in out.splitlines():
            m = re.search(r"(\d{1,3}(?:\.\d{1,3}){3})\s+(?:dev \S+ lladdr\s+)?([0-9a-fA-F]{2}[-:][0-9a-fA-F]{2}[-:][0-9a-fA-F]{2}[-:][0-9a-fA-F]{2}[-:][0-9a-fA-F]{2}[-:][0-9a-fA-F]{2})", line) \
                or re.search(r"\((\d{1,3}(?:\.\d{1,3}){3})\) at ([0-9a-fA-F:]{17})", line)
            if not m:
                continue
            ip, mac = m.group(1), m.group(2).upper().replace(":", "-")
            try:
                a = ipaddress.ip_address(ip)
            except ValueError:
                continue
            if not a.is_private or a.is_multicast or ip.endswith(".255") or mac.startswith("FF-FF") or mac.startswith("01-00-5E"):
                continue
            state = "dynamic" if re.search(r"dynamic|δυναμ", line, re.I) else ""
            for w in ("REACHABLE", "STALE", "DELAY", "PROBE"):
                if w in line:
                    state = w.lower()
            res.append({"ip": ip, "mac": mac, "state": state})
        uniq = {r["ip"]: r for r in res}
        return sorted(uniq.values(), key=lambda r: tuple(int(x) for x in r["ip"].split("."))) or None

    @staticmethod
    def t_wifi():
        if IS_WIN:
            out = run_cmd(["netsh", "wlan", "show", "interfaces"], 8)
            vals, started = [], False
            for line in out.splitlines():
                if ":" not in line:
                    continue
                k, v = line.split(":", 1)
                k, v = k.strip(), v.strip()
                if not started:
                    if re.fullmatch(r"SSID(\s+\d+)?", k):      # «SSID» είναι ίδιο σε κάθε γλώσσα των Windows
                        started = True
                        vals.append(v)
                    continue
                if k.upper().startswith("BSSID"):
                    continue
                vals.append(v)
            # σειρά πεδίων: ssid, network type, radio type, authentication, cipher, connection mode, channel, rx, tx, signal
            if len(vals) >= 10:
                sig = next((int(re.sub(r"\D", "", x)) for x in vals if x.endswith("%") and re.sub(r"\D", "", x)), None)
                return {"ssid": vals[0], "radio": vals[2], "auth": vals[3], "channel": vals[6], "rx": vals[7], "tx": vals[8], "signal": sig}
            return None
        out = run_cmd(["nmcli", "-t", "-f", "ACTIVE,SSID,SIGNAL,SECURITY", "dev", "wifi"], 6) if shutil.which("nmcli") else ""
        for line in out.splitlines():
            parts = line.split(":")
            if parts and parts[0] == "yes" and len(parts) >= 4:
                try:
                    sg = int(parts[2])
                except ValueError:
                    sg = None
                return {"ssid": parts[1], "signal": sg, "auth": parts[3], "radio": "", "channel": "", "rx": "", "tx": ""}
        return None

    @staticmethod
    def t_firewall():
        rows = ps_json("Get-NetFirewallProfile | Select-Object Name,Enabled", 15)
        if not rows:
            return None
        res = []
        for r in rows:
            en = r.get("Enabled")
            res.append({"name": str(r.get("Name")), "on": bool(en) if not isinstance(en, str) else en.lower() in ("true", "1")})
        return res

    @staticmethod
    def t_dns():
        rows = ps_json("Get-DnsClientServerAddress -AddressFamily IPv4 | Where-Object { $_.ServerAddresses } | Select-Object InterfaceAlias,ServerAddresses", 15)
        if rows:
            return [{"iface": str(r.get("InterfaceAlias")), "servers": r["ServerAddresses"] if isinstance(r.get("ServerAddresses"), list) else [str(r.get("ServerAddresses"))]} for r in rows]
        if not IS_WIN:
            try:
                ns = [l.split()[1] for l in open("/etc/resolv.conf", encoding="utf-8").read().splitlines() if l.startswith("nameserver") and len(l.split()) > 1]
                return [{"iface": "system", "servers": ns}] if ns else None
            except Exception:
                return None
        return None

    @staticmethod
    def t_vpn():
        adapters = []
        try:
            stats = psutil.net_if_stats()
            for name, st in stats.items():
                if st.isup and VPN_WORDS.search(name):
                    adapters.append(name)
        except Exception:
            pass
        conns = []
        rows = ps_json("Get-VpnConnection -ErrorAction SilentlyContinue | Select-Object Name,ServerAddress,ConnectionStatus", 15)
        for r in rows or []:
            conns.append({"name": str(r.get("Name")), "server": str(r.get("ServerAddress")), "status": str(r.get("ConnectionStatus"))})
        return {"adapters": adapters, "connections": conns}

    @staticmethod
    def t_gateway():
        if IS_WIN:
            rows = ps_json("Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue | Sort-Object RouteMetric | Select-Object -First 1 NextHop", 12)
            return str(rows[0].get("NextHop")) if rows and rows[0].get("NextHop") not in (None, "0.0.0.0") else None
        m = re.search(r"default via (\d+\.\d+\.\d+\.\d+)", run_cmd(["ip", "route"], 5))
        return m.group(1) if m else None

    @staticmethod
    def t_disks_health():
        rows = ps_json("Get-PhysicalDisk -ErrorAction SilentlyContinue | Select-Object FriendlyName,MediaType,HealthStatus,OperationalStatus,Size", 20)
        if not rows:
            return None
        return [{"name": str(r.get("FriendlyName")), "media": str(r.get("MediaType")), "health": str(r.get("HealthStatus")),
                 "status": str(r.get("OperationalStatus")), "size": r.get("Size")} for r in rows]

    @staticmethod
    def t_monitors():
        rows = ps_json("Get-CimInstance Win32_VideoController | Select-Object Name,CurrentHorizontalResolution,CurrentVerticalResolution,CurrentRefreshRate", 20)
        if not rows:
            return None
        return [{"name": str(r.get("Name")), "w": r.get("CurrentHorizontalResolution"), "h": r.get("CurrentVerticalResolution"),
                 "hz": r.get("CurrentRefreshRate")} for r in rows if r.get("CurrentHorizontalResolution")]

    @staticmethod
    def t_usb():
        rows = ps_json("Get-PnpDevice -PresentOnly -ErrorAction SilentlyContinue | Where-Object { $_.InstanceId -like 'USB\\*' } | Select-Object -First 40 FriendlyName,Class", 25)
        if not rows:
            return None
        return [{"name": str(r.get("FriendlyName") or "?"), "cls": str(r.get("Class") or "")} for r in rows]

    @staticmethod
    def t_startup():
        rows = ps_json("Get-CimInstance Win32_StartupCommand | Select-Object Name,Command,Location", 20)
        if not rows:
            return None
        return [{"name": str(r.get("Name")), "cmd": str(r.get("Command"))[:200], "where": str(r.get("Location"))} for r in rows]

    def t_signatures(self):
        if not IS_WIN:
            return
        todo = [x for x in list(self.want_sig) if x not in self.sig][:25]
        if not todo:
            return
        arr = ",".join("'" + x.replace("'", "''") + "'" for x in todo)
        rows = ps_json("@(" + arr + ") | ForEach-Object { [pscustomobject]@{ p = $_; s = (Get-AuthenticodeSignature -LiteralPath $_ -ErrorAction SilentlyContinue).Status.ToString() } }", 60)
        got = {}
        for r in rows or []:
            st = str(r.get("s"))
            got[str(r.get("p"))] = "signed" if st == "Valid" else ("unsigned" if st == "NotSigned" else "invalid")
        for x in todo:
            self.sig[x] = got.get(x, "unknown")

    def _put(self, key, fn):
        try:
            v = fn()
        except Exception:
            v = None
        with self.lock:
            self.data[key] = v

    def run(self) -> None:
        if DEMO:
            with self.lock:
                self.data.update(demo_extra())
        n = 0
        while True:
            started = time.time()
            if not DEMO:
                if n % 5 == 0:                                   # κάθε ~5 δευτερόλεπτα
                    self._put("gpu", self.t_gpu)
                    self._put("temps", self.t_temps)
                    self._put("fans", self.t_fans)
                if n % 20 == 0:                                  # κάθε ~20 δευτερόλεπτα
                    for key, fn in (("lan", self.t_lan), ("wifi", self.t_wifi), ("firewall", self.t_firewall), ("dns", self.t_dns),
                                    ("vpn", self.t_vpn), ("gateway", self.t_gateway), ("disks_health", self.t_disks_health),
                                    ("monitors", self.t_monitors), ("usb", self.t_usb), ("startup", self.t_startup)):
                        self._put(key, fn)
                try:
                    self.t_signatures()
                except Exception:
                    pass
            n += 1
            time.sleep(max(0.2, 1.0 - (time.time() - started)))

    def snapshot(self) -> dict:
        with self.lock:
            d = dict(self.data)
        d["sig_count"] = len(self.sig)
        d["memtrend"] = {k: list(v) for k, v in self.memtrend.items()}
        return d

# ----------------------------------------------------------------------------
#  ΣΥΛΛΟΓΗ ΣΤΟΙΧΕΙΩΝ
# ----------------------------------------------------------------------------
class Collector(threading.Thread):
    """Τρέχει στο παρασκήνιο και ετοιμάζει νέο στιγμιότυπο δεδομένων κάθε δευτερόλεπτο."""

    def __init__(self) -> None:
        super().__init__(daemon=True)
        self.cond = threading.Condition()
        self.seq = 0
        self.snapshot_json = b"{}"
        self._last_net = None
        self._last_net_nic = {}
        self._last_disk = None
        self._last_t = None
        self.extras = Extras()
        self.history = collections.deque(maxlen=HISTORY_SECONDS)     # μόνο στη μνήμη
        self.events = collections.deque(maxlen=200)                  # νέες συνδέσεις
        self._prev_keys = None
        self._last_io = {}
        self._exe = {}
        self.known_ips = set()
        self._tick = 0
        self._static_info = self._read_static_info()
        # η πρώτη κλήση "ζεσταίνει" τους μετρητές CPU
        psutil.cpu_percent(percpu=True)
        for p in psutil.process_iter():
            try:
                p.cpu_percent(None)
            except (psutil.Error, OSError):
                pass

    # -- στοιχεία που δεν αλλάζουν
    @staticmethod
    def _read_static_info() -> dict:
        info = {
            "hostname": socket.gethostname(),
            "home": HOME_CC,
            "os": f"{platform.system()} {platform.release()}",
            "os_version": platform.version(),
            "machine": platform.machine(),
            "processor": platform.processor() or platform.machine(),
            "cores_physical": psutil.cpu_count(logical=False),
            "cores_logical": psutil.cpu_count(logical=True),
            "boot_time": psutil.boot_time(),
            "python": platform.python_version(),
        }
        return info

    def _exe_path(self, pid: int) -> str:
        if pid in self._exe:
            return self._exe[pid]
        path = ""
        try:
            path = psutil.Process(pid).exe() or ""
        except (psutil.Error, OSError):
            path = ""
        if len(self._exe) > 4000:
            self._exe.clear()
        self._exe[pid] = path
        return path

    def _pid_names(self) -> dict:
        names = {}
        for p in psutil.process_iter(["pid", "name"]):
            names[p.info["pid"]] = p.info["name"] or "?"
        return names

    def _sample(self) -> dict:
        now = time.time()
        dt = (now - self._last_t) if self._last_t else None
        self._last_t = now

        # ---- επεξεργαστής
        per_core = psutil.cpu_percent(percpu=True)
        cpu_total = sum(per_core) / len(per_core) if per_core else 0.0
        try:
            freq = psutil.cpu_freq()
            freq_mhz = round(freq.current) if freq else None
        except Exception:
            freq_mhz = None

        # ---- μνήμη
        vm = psutil.virtual_memory()
        sw = psutil.swap_memory()

        # ---- δίσκοι (χώρος)
        disks = []
        for part in psutil.disk_partitions(all=False):
            opts = set(part.opts.lower().split(","))
            if "cdrom" in opts or part.fstype == "" or "ro" in opts \
                    or part.fstype.lower() in ("squashfs", "iso9660", "udf", "tmpfs", "devtmpfs", "overlay"):
                continue
            try:
                u = psutil.disk_usage(part.mountpoint)
            except (PermissionError, OSError):
                continue
            disks.append({
                "mount": part.mountpoint, "fs": part.fstype,
                "total": u.total, "used": u.used, "percent": u.percent,
            })

        # ---- δίσκοι (ταχύτητα)
        disk_read = disk_write = 0.0
        try:
            dio = psutil.disk_io_counters()
            if dio and self._last_disk and dt:
                disk_read = max(0.0, (dio.read_bytes - self._last_disk.read_bytes) / dt)
                disk_write = max(0.0, (dio.write_bytes - self._last_disk.write_bytes) / dt)
            self._last_disk = dio
        except Exception:
            pass

        # ---- δίκτυο (ταχύτητα συνολικά και ανά κάρτα)
        net_down = net_up = 0.0
        nics = []
        try:
            tot = psutil.net_io_counters()
            if self._last_net and dt:
                net_down = max(0.0, (tot.bytes_recv - self._last_net.bytes_recv) / dt)
                net_up = max(0.0, (tot.bytes_sent - self._last_net.bytes_sent) / dt)
            self._last_net = tot
            per = psutil.net_io_counters(pernic=True)
            stats = psutil.net_if_stats()
            for name, c in per.items():
                st = stats.get(name)
                if st is None or not st.isup:
                    continue
                last = self._last_net_nic.get(name)
                d = u_ = 0.0
                if last and dt:
                    d = max(0.0, (c.bytes_recv - last.bytes_recv) / dt)
                    u_ = max(0.0, (c.bytes_sent - last.bytes_sent) / dt)
                nics.append({"name": name, "down": d, "up": u_, "speed_mbps": st.speed})
            self._last_net_nic = per
        except Exception:
            pass

        # ---- διεργασίες
        procs = []
        io_now = {}
        for p in psutil.process_iter(["pid", "name", "memory_info", "num_threads", "io_counters"]):
            try:
                cpu = p.cpu_percent(None)
                mi = p.info["memory_info"]
                pid = p.info["pid"]
                rd = wr = 0.0
                ioc = p.info.get("io_counters")
                if ioc is not None:
                    io_now[pid] = (ioc.read_bytes, ioc.write_bytes)
                    last = self._last_io.get(pid)
                    if last and dt:
                        rd = max(0.0, (ioc.read_bytes - last[0]) / dt)
                        wr = max(0.0, (ioc.write_bytes - last[1]) / dt)
                procs.append({
                    "pid": pid,
                    "name": p.info["name"] or "?",
                    "cpu": round(cpu / max(1, psutil.cpu_count(logical=True)), 1),
                    "mem": mi.rss if mi else 0,
                    "threads": p.info["num_threads"] or 0,
                    "rd": rd, "wr": wr,
                })
            except (psutil.Error, OSError):
                continue
        self._last_io = io_now
        total_procs = len(procs)
        # ποια προγράμματα γράφουν/διαβάζουν περισσότερο στον δίσκο (ανεξάρτητα από τον επεξεργαστή)
        io_group = {}
        for x in procs:
            g = io_group.setdefault(x["name"], [0.0, 0.0])
            g[0] += x["rd"]
            g[1] += x["wr"]
        io_top = sorted(({"name": k, "rd": v[0], "wr": v[1]} for k, v in io_group.items() if v[0] + v[1] > 1024),
                        key=lambda x: x["rd"] + x["wr"], reverse=True)[:8]
        # μνήμη ανά πρόγραμμα με ιστορικό: κάθε 5 δευτερόλεπτα (για να φαίνεται ποιο «διογκώνεται»)
        if self._tick % 5 == 0:
            mem_group = {}
            for x in procs:
                mem_group[x["name"]] = mem_group.get(x["name"], 0) + x["mem"]
            for name, val in sorted(mem_group.items(), key=lambda kv: kv[1], reverse=True)[:12]:
                dq = self.extras.memtrend.setdefault(name, collections.deque(maxlen=120))
                dq.append(val)
        procs.sort(key=lambda x: (x["cpu"], x["mem"]), reverse=True)
        procs = procs[:TOP_PROCESSES]
        for x in procs:                                   # πού βρίσκεται το αρχείο κάθε προγράμματος
            x["exe"] = self._exe_path(x["pid"])

        # ---- συνδέσεις δικτύου (ποιο πρόγραμμα μιλά με ποιον) + θύρες που «ακούνε»
        conns, listen, states, top3, conn_note = [], [], {}, [], ""
        try:
            names = self._pid_names()
            allc = psutil.net_connections(kind="inet")
            per_pid = {}
            lmerge = {}
            keys_now = set()
            for c in allc:
                if c.type == socket.SOCK_STREAM:
                    states[c.status] = states.get(c.status, 0) + 1
                # θύρες που ακούνε: TCP LISTEN ή UDP χωρίς συγκεκριμένο συνομιλητή
                if c.laddr and ((c.type == socket.SOCK_STREAM and c.status == "LISTEN") or (c.type == socket.SOCK_DGRAM and not c.raddr)):
                    ip = c.laddr.ip
                    exposed = ip not in ("127.0.0.1", "::1")
                    lk = (c.pid or 0, "TCP" if c.type == socket.SOCK_STREAM else "UDP", c.laddr.port)
                    if lk in lmerge:
                        lmerge[lk]["exposed"] = lmerge[lk]["exposed"] or exposed
                    else:
                        lmerge[lk] = {"pid": lk[0], "name": names.get(c.pid, "—") if c.pid else "—", "proto": lk[1], "port": lk[2],
                                      "addr": ip, "exposed": exposed, "what": PORT_NAMES.get(lk[2], ""),
                                      "exe": self._exe_path(c.pid) if c.pid else ""}
                if not c.raddr:
                    continue                       # μόνο ενεργές συνδέσεις προς κάποιον
                rip, rport = c.raddr.ip, c.raddr.port
                per_pid[c.pid or 0] = per_pid.get(c.pid or 0, 0) + 1
                keys_now.add((c.pid or 0, "TCP" if c.type == socket.SOCK_STREAM else "UDP", rip, rport))
                conns.append({
                    "pid": c.pid or 0,
                    "name": names.get(c.pid, "—") if c.pid else "—",
                    "proto": "TCP" if c.type == socket.SOCK_STREAM else "UDP",
                    "lport": c.laddr.port if c.laddr else 0,
                    "raddr": rip, "rport": rport,
                    "status": c.status,
                    "scope": classify_address(rip),
                    "what": PORT_NAMES.get(rport, ""),
                    "cc": "",
                })
                if conns[-1]["scope"] == "internet":
                    conns[-1]["cc"] = GEO.country(rip)
            merged = {}
            for c in conns:
                key = (c["pid"], c["proto"], c["raddr"], c["rport"])
                if key in merged:
                    merged[key]["count"] += 1
                else:
                    c["count"] = 1
                    merged[key] = c
            conns = list(merged.values())
            conns.sort(key=lambda x: ({"internet": 0, "lan": 1, "local": 2}[x["scope"]], x["name"].lower()))
            conns = conns[:MAX_CONNECTIONS]
            for c in conns:                                    # αρχείο προγράμματος και πιθανά «κόκκινα σημάδια»
                exe = self._exe_path(c["pid"]) if c["pid"] else ""
                c["exe"] = exe
                low = exe.lower()
                c["susp"] = bool(exe) and any(w in low for w in SUSPICIOUS_DIRS)
                c["sig"] = self.extras.sig.get(exe, "") if exe else ""
                if exe and c["scope"] == "internet":
                    self.extras.want_sig.add(exe)
            self.known_ips = {c["raddr"] for c in conns}
            # νέες συνδέσεις από το προηγούμενο δευτερόλεπτο (ζωντανή ροή)
            if self._prev_keys is not None:
                info = {(c["pid"], c["proto"], c["raddr"], c["rport"]): c for c in conns}
                for k in keys_now - self._prev_keys:
                    c = info.get(k)
                    if c:
                        self.events.append({"t": now, "name": c["name"], "pid": c["pid"], "proto": c["proto"], "raddr": c["raddr"],
                                            "rport": c["rport"], "scope": c["scope"], "cc": c["cc"], "what": c["what"]})
            self._prev_keys = keys_now
            listen = sorted(lmerge.values(), key=lambda x: (not x["exposed"], x["port"]))[:200]
            top3 = [{"pid": pid, "name": names.get(pid, "—") if pid else "—", "count": n}
                    for pid, n in sorted(per_pid.items(), key=lambda kv: kv[1], reverse=True)[:3]]
        except (psutil.AccessDenied, PermissionError):
            conn_note = "denied"
        except Exception:
            conn_note = "error"

        # ---- μπαταρία
        battery = None
        try:
            b = psutil.sensors_battery()
            if b is not None:
                battery = {"percent": round(b.percent), "plugged": bool(b.power_plugged),
                           "secs_left": b.secsleft if isinstance(b.secsleft, int) and b.secsleft >= 0 else None}
        except Exception:
            pass

        self._tick += 1
        self.history.append({"t": round(now), "cpu": round(cpu_total, 1), "mem": vm.percent, "down": round(net_down), "up": round(net_up),
                             "conns": len(conns), "dio": round(disk_read + disk_write)})
        return {
            "t": now,
            "info": self._static_info,
            "uptime": now - self._static_info["boot_time"],
            "cpu": {"total": round(cpu_total, 1), "cores": [round(x, 1) for x in per_core], "mhz": freq_mhz},
            "mem": {"total": vm.total, "used": vm.total - vm.available, "percent": vm.percent,
                    "swap_total": sw.total, "swap_used": sw.used, "swap_percent": sw.percent},
            "disks": disks,
            "disk_io": {"read": disk_read, "write": disk_write},
            "net": {"down": net_down, "up": net_up, "nics": nics},
            "procs": procs, "proc_count": total_procs,
            "conns": conns, "conn_note": conn_note,
            "listen": listen, "states": states, "top3": top3, "io_top": io_top,
            "events": list(self.events)[-60:],
            "battery": battery,
        }

    def run(self) -> None:
        self.extras.start()
        while True:
            started = time.time()
            try:
                data = json.dumps(self._sample(), ensure_ascii=False).encode("utf-8")
                with self.cond:
                    self.snapshot_json = data
                    self.seq += 1
                    self.cond.notify_all()
            except Exception as exc:  # δεν πρέπει ποτέ να σταματήσει η συλλογή
                print(f"[Veagle Eye] προσωρινό σφάλμα / temporary error: {exc}", file=sys.stderr)
            time.sleep(max(0.05, SAMPLE_SECONDS - (time.time() - started)))


# ----------------------------------------------------------------------------
#  ΤΟΠΙΚΟΣ SERVER
# ----------------------------------------------------------------------------

# ----------------------------------------------------------------------------
#  ΠΡΟΑΙΡΕΤΙΚΑ ΕΡΓΑΛΕΙΑ (τρέχουν ΜΟΝΟ όταν πατήσεις εσύ το αντίστοιχο κουμπί)
# ----------------------------------------------------------------------------
COMMON_PORTS = sorted(set(list(PORT_NAMES) + [21, 22, 23, 25, 53, 69, 80, 88, 110, 111, 113, 119, 135, 137, 138, 139, 143, 161, 179, 389, 427, 443,
                       445, 465, 500, 514, 515, 543, 548, 554, 587, 631, 636, 873, 902, 989, 990, 993, 995, 1080, 1194, 1433, 1521,
                       1701, 1723, 1900, 2049, 2082, 2083, 2181, 2375, 2376, 3000, 3128, 3306, 3389, 3690, 4000, 4444, 4567, 5000,
                       5060, 5357, 5432, 5555, 5672, 5900, 5985, 5986, 6000, 6379, 6443, 7000, 7070, 8000, 8008, 8080, 8081, 8088,
                       8443, 8888, 9000, 9090, 9200, 9300, 10000, 11211, 15672, 27017, 27015, 49152]))


def scan_own_device(full: bool) -> dict:
    """Σαρώνει ΜΟΝΟ τον ίδιο τον υπολογιστή (127.0.0.1 και τις δικές του διευθύνσεις). Ποτέ άλλη συσκευή."""
    targets = ["127.0.0.1"] + own_ipv4()
    ports = list(range(1, 1025)) if full else COMMON_PORTS
    t0 = time.time()
    out = []

    def probe(args):
        ip, port = args
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sck:
            sck.settimeout(0.35)
            return port if sck.connect_ex((ip, port)) == 0 else None

    with concurrent.futures.ThreadPoolExecutor(max_workers=96) as ex:
        for ip in targets[:4]:
            found = [r for r in ex.map(probe, [(ip, pt) for pt in ports]) if r]
            out.append({"ip": ip, "open": [{"port": pt, "what": PORT_NAMES.get(pt, "")} for pt in found]})
    return {"targets": out, "tested": len(ports), "full": full, "secs": round(time.time() - t0, 1)}


def reverse_dns(ip: str) -> dict:
    """Ρωτά τον DNS του υπολογιστή σου «ποιο όνομα έχει αυτή η διεύθυνση;». ΜΟΝΟ για IP που ήδη επικοινωνεί μαζί σου."""
    res = {"ip": ip, "name": ""}

    def work():
        try:
            res["name"] = socket.gethostbyaddr(ip)[0]
        except Exception:
            res["name"] = ""
    th = threading.Thread(target=work, daemon=True)
    th.start()
    th.join(3.0)
    return res


def ping_gateway(gw: str) -> dict:
    """Στέλνει 4 μικρά ping ΜΟΝΟ στο router του σπιτιού/γραφείου σου και δίνει τους χρόνους."""
    if not gw:
        return {"error": "nogw"}
    try:
        ipaddress.ip_address(gw)
    except ValueError:
        return {"error": "nogw"}
    cmd = ["ping", "-n", "4", "-w", "1500", gw] if IS_WIN else ["ping", "-c", "4", "-W", "2", gw]
    out = run_cmd(cmd, 15)
    times = [float(x) for line in out.splitlines() if "TTL" in line.upper() or "ttl" in line for x in re.findall(r"[=<]\s*([\d.]+)\s*ms", line)]
    return {"gw": gw, "times": times, "sent": 4}


class Handler(BaseHTTPRequestHandler):
    server_version = "VeagleEye"
    protocol_version = "HTTP/1.1"

    collector: Collector
    token: str
    port: int

    def log_message(self, fmt, *args):  # σιωπηλός server
        pass

    # --- ασφάλεια: μόνο από τον ίδιο υπολογιστή, με σωστό κωδικό
    def _host_ok(self) -> bool:
        host = (self.headers.get("Host") or "").lower()
        return host in (f"127.0.0.1:{self.port}", f"localhost:{self.port}")

    def _token_ok(self, query: dict) -> bool:
        given = (query.get("t") or [""])[0]
        cookie = self.headers.get("Cookie") or ""
        in_cookie = any(c.strip() == f"veagleeye={self.token}" for c in cookie.split(";"))
        return secrets.compare_digest(given, self.token) or in_cookie

    def _send(self, code: int, body: bytes, ctype: str = "text/plain; charset=utf-8", extra=None) -> None:
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        # Η σελίδα δεν επιτρέπεται να φορτώσει ΟΤΙΔΗΠΟΤΕ από το διαδίκτυο.
        self.send_header("Content-Security-Policy",
                         "default-src 'none'; script-src 'self' 'unsafe-inline'; "
                         "style-src 'self' 'unsafe-inline'; img-src 'self' data:; "
                         "font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; "
                         "frame-ancestors 'self' https://ferelis.gr https://www.ferelis.gr https://ferelisvag.github.io")
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):  # noqa: N802
        url = urlparse(self.path)
        query = parse_qs(url.query)
        if not self._host_ok():
            return self._send(403, "Μη επιτρεπτή διεύθυνση.".encode())
        # Είσοδος και με τον κωδικό μέσα στη διαδρομή (/<κωδικός>/): χρειάζεται όταν η σελίδα
        # ανοίγει μέσα σε παράθυρο του Veagle OS (άλλο site, άρα τα cookies δεν περνούν).
        path = url.path
        prefix = f"/{self.token}"
        by_path = path == prefix or path.startswith(prefix + "/")
        if path == prefix:
            return self._send(301, b"", "text/plain", {"Location": prefix + "/"})
        if by_path:
            path = path[len(prefix):]
        if not (by_path or self._token_ok(query)):
            return self._send(403, "Λείπει ο κωδικός. Άνοιξε τη σελίδα από το εικονίδιο του Veagle Eye.".encode())

        cookie_hdr = {"Set-Cookie": f"veagleeye={self.token}; Path=/; HttpOnly; SameSite=Strict"}

        if path == "/stream":
            return self._stream()
        if path == "/api/snapshot":
            return self._send(200, self.collector.snapshot_json, "application/json; charset=utf-8")
        jt = "application/json; charset=utf-8"
        if path == "/api/extra":
            return self._send(200, json.dumps(self.collector.extras.snapshot(), ensure_ascii=False).encode("utf-8"), jt)
        if path == "/api/history":
            return self._send(200, json.dumps(list(self.collector.history)).encode("utf-8"), jt)
        if path == "/api/scan":
            full = (query.get("range") or [""])[0] == "full"
            return self._send(200, json.dumps(scan_own_device(full)).encode("utf-8"), jt)
        if path == "/api/rdns":
            ip = (query.get("ip") or [""])[0]
            if ip not in self.collector.known_ips:          # μόνο διευθύνσεις που ήδη μιλούν με τον υπολογιστή σου
                return self._send(400, b"{}", jt)
            return self._send(200, json.dumps(reverse_dns(ip)).encode("utf-8"), jt)
        if path == "/api/ping":
            gw = (self.collector.extras.snapshot().get("gateway") or "")
            return self._send(200, json.dumps(ping_gateway(gw)).encode("utf-8"), jt)

        rel = "index.html" if path in ("/", "") else path.lstrip("/")
        target = (STATIC / rel).resolve()
        try:
            target.relative_to(STATIC.resolve())
        except ValueError:
            return self._send(404, b"404")
        if not target.is_file():
            return self._send(404, b"404")
        ctype = mimetypes.guess_type(target.name)[0] or "application/octet-stream"
        if target.suffix == ".woff2":
            ctype = "font/woff2"
        if ctype.startswith("text/") or ctype in ("application/javascript", "application/json"):
            ctype += "; charset=utf-8"
        self._send(200, target.read_bytes(), ctype, cookie_hdr)

    def _stream(self) -> None:
        """Ζωντανή ροή δεδομένων (Server-Sent Events). Ο browser την ανανεώνει μόνος του."""
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Connection", "keep-alive")
        self.end_headers()
        last = -1
        try:
            while True:
                with self.collector.cond:
                    self.collector.cond.wait_for(lambda: self.collector.seq != last, timeout=15)
                    seq, data = self.collector.seq, self.collector.snapshot_json
                if seq == last:
                    self.wfile.write(b": keepalive\n\n")
                else:
                    last = seq
                    self.wfile.write(b"data: " + data + b"\n\n")
                self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError, OSError):
            return


class QuietServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = False

    def handle_error(self, request, client_address):  # δεν γεμίζουμε το παράθυρο με σφάλματα σύνδεσης
        pass


def find_free_port(preferred: int) -> int:
    for port in range(preferred, preferred + 50):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind((HOST, port))
                return port
            except OSError:
                continue
    raise RuntimeError("Δεν βρέθηκε ελεύθερη θύρα.")


# ----------------------------------------------------------------------------
#  ΕΙΚΟΝΙΔΙΟ ΣΤΗΝ ΠΕΡΙΟΧΗ ΕΙΔΟΠΟΙΗΣΕΩΝ (προαιρετικό)
# ----------------------------------------------------------------------------
def run_tray(url: str, stop_event: threading.Event) -> bool:
    """Δείχνει εικονίδιο με 'Άνοιγμα' και 'Έξοδος'. Αν λείπουν οι βιβλιοθήκες, επιστρέφει False."""
    try:
        import pystray
        from PIL import Image
    except Exception:
        return False
    try:
        icon_img = Image.open(STATIC / "eagle-white.png").convert("RGBA").resize((64, 64))
        bg = Image.new("RGBA", (64, 64), (0, 0, 0, 255))
        bg.alpha_composite(icon_img)

        def open_page(icon=None, item=None):
            webbrowser.open(url)

        def quit_app(icon, item):
            stop_event.set()
            icon.stop()

        menu = pystray.Menu(
            pystray.MenuItem("Άνοιγμα Veagle Eye", open_page, default=True),
            pystray.MenuItem("Έξοδος", quit_app),
        )
        pystray.Icon("veagleeye", bg, "Veagle Eye", menu).run()
        return True
    except Exception:
        return False


def _fix_console() -> None:
    """Ώστε τα ελληνικά να μην προκαλούν σφάλμα σε κονσόλες των Windows με παλιά κωδικοποίηση."""
    if os.name == "nt":
        try:
            import ctypes
            ctypes.windll.kernel32.SetConsoleOutputCP(65001)
        except Exception:
            pass
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass


def main() -> int:
    _fix_console()
    ap = argparse.ArgumentParser(description=f"{APP_NAME} {APP_VERSION}")
    ap.add_argument("--port", type=int, default=DEFAULT_PORT, help="θύρα (προεπιλογή 8765)")
    ap.add_argument("--no-browser", action="store_true", help="να μην ανοίξει μόνο του ο browser")
    ap.add_argument("--no-tray", action="store_true", help="χωρίς εικονίδιο στην περιοχή ειδοποιήσεων")
    ap.add_argument("--home", default="", metavar="ΚΩΔΙΚΟΣ",
                    help="προαιρετικά: η χώρα σου στον χάρτη, με 2 γράμματα, π.χ. GR, DE, US. Χωρίς αυτό, το PC μπαίνει στη θάλασσα")
    args = ap.parse_args()
    global HOME_CC
    HOME_CC = args.home.strip().upper()[:2] if args.home.strip().isalpha() else ""

    port = find_free_port(args.port)
    token = secrets.token_urlsafe(18)

    collector = Collector()
    collector.start()

    Handler.collector, Handler.token, Handler.port = collector, token, port
    server = QuietServer((HOST, port), Handler)
    url = f"http://127.0.0.1:{port}/?t={token}"

    threading.Thread(target=server.serve_forever, daemon=True).start()

    line = "=" * 64
    print(line, flush=True)
    print(f"  {APP_NAME} {APP_VERSION}", flush=True)
    print(f"  Διεύθυνση / Address: {url}", flush=True)
    print(line, flush=True)
    print("  ΕΛΛΗΝΙΚΑ", flush=True)
    print("  Αυτό το μαύρο παράθυρο είναι ο «κινητήρας» του Veagle Eye. Η σελίδα με τα", flush=True)
    print("  γραφήματα ανοίγει στον browser σου. Αν δεν άνοιξε, αντίγραψε τη διεύθυνση", flush=True)
    print("  παραπάνω στον browser. ΜΗΝ το κλείσεις όσο θέλεις να βλέπεις τη σελίδα.", flush=True)
    print("  Για έξοδο: κλείσε αυτό το παράθυρο (ή πάτα Ctrl+C).", flush=True)
    print("  Όλα τρέχουν τοπικά στον υπολογιστή σου. Τίποτα δεν φεύγει εκτός υπολογιστή,", flush=True)
    print("  και δεν αλλάζει τίποτα στον υπολογιστή σου.", flush=True)
    print("", flush=True)
    print("  ENGLISH", flush=True)
    print("  This black window is the engine of Veagle Eye. The page with the charts", flush=True)
    print("  opens in your browser. If it did not open, copy the address above into", flush=True)
    print("  your browser. DO NOT close this window while you want to see the page.", flush=True)
    print("  To quit: close this window (or press Ctrl+C).", flush=True)
    print("  Everything runs locally on your computer. Nothing ever leaves your computer,", flush=True)
    print("  and nothing on your computer is changed.", flush=True)
    print(line, flush=True)

    if not args.no_browser:
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()

    stop = threading.Event()
    try:
        if args.no_tray or not run_tray(url, stop):
            while not stop.is_set():
                time.sleep(0.5)
    except KeyboardInterrupt:
        pass
    server.shutdown()
    return 0


if __name__ == "__main__":
    sys.exit(main())
