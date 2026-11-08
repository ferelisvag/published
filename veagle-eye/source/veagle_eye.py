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
import gzip
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
APP_VERSION = "0.2.0"
HOST = "127.0.0.1"          # ΜΟΝΟ αυτός ο υπολογιστής. Κανείς άλλος στο δίκτυο δεν το βλέπει.
DEFAULT_PORT = 8765
SAMPLE_SECONDS = 1.0         # κάθε πότε διαβάζονται τα στοιχεία
TOP_PROCESSES = 40
MAX_CONNECTIONS = 300
HOME_CC = ""                 # προαιρετικά: χώρα του PC στον χάρτη (--home GR)


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
        for p in psutil.process_iter(["pid", "name", "memory_info", "num_threads"]):
            try:
                cpu = p.cpu_percent(None)
                mi = p.info["memory_info"]
                procs.append({
                    "pid": p.info["pid"],
                    "name": p.info["name"] or "?",
                    "cpu": round(cpu / max(1, psutil.cpu_count(logical=True)), 1),
                    "mem": mi.rss if mi else 0,
                    "threads": p.info["num_threads"] or 0,
                })
            except (psutil.Error, OSError):
                continue
        total_procs = len(procs)
        procs.sort(key=lambda x: (x["cpu"], x["mem"]), reverse=True)
        procs = procs[:TOP_PROCESSES]

        # ---- συνδέσεις δικτύου (ποιο πρόγραμμα μιλά με ποιον)
        conns = []
        try:
            names = self._pid_names()
            for c in psutil.net_connections(kind="inet"):
                if not c.raddr:
                    continue                       # μόνο ενεργές συνδέσεις προς κάποιον
                rip, rport = c.raddr.ip, c.raddr.port
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
            conn_note = ""
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
            "battery": battery,
        }

    def run(self) -> None:
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
