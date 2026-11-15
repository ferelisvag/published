"""Ελάχιστος ONVIF client χωρίς εξωτερικές βιβλιοθήκες.

- WS-Discovery: βρίσκει κάμερες στο τοπικό δίκτυο (UDP multicast 239.255.255.250:3702)
- GetCapabilities / GetProfiles / GetStreamUri με WS-Security (PasswordDigest)
  και, αν η κάμερα το ζητήσει, HTTP Digest/Basic auth.
"""
from __future__ import annotations

import base64
import datetime as _dt
import hashlib
import os
import re
import socket
import urllib.error
import urllib.parse
import urllib.request
import uuid
import xml.etree.ElementTree as ET

MCAST = ("239.255.255.250", 3702)

NS_TT = "http://www.onvif.org/ver10/schema"
NS_TDS = "http://www.onvif.org/ver10/device/wsdl"
NS_TRT = "http://www.onvif.org/ver10/media/wsdl"
NS_PTZ = "http://www.onvif.org/ver20/ptz/wsdl"


class OnvifError(Exception):
    pass


# ---------------------------------------------------------------- helpers

def _local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _find_all(root, name):
    return [el for el in root.iter() if _local(el.tag) == name]


def _find(root, name):
    for el in root.iter():
        if _local(el.tag) == name:
            return el
    return None


def _text(root, name, default=""):
    el = _find(root, name)
    return (el.text or "").strip() if el is not None and el.text else default


def local_ipv4s() -> list[str]:
    ips = set()
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ips.add(info[4][0])
    except OSError:
        pass
    # η διεύθυνση της προεπιλεγμένης διαδρομής
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ips.add(s.getsockname()[0])
        s.close()
    except OSError:
        pass
    return [ip for ip in ips if not ip.startswith("127.") and not ip.startswith("169.254.")]


# ---------------------------------------------------------------- discovery

_PROBE = """<?xml version="1.0" encoding="UTF-8"?>
<e:Envelope xmlns:e="http://www.w3.org/2003/05/soap-envelope"
 xmlns:w="http://schemas.xmlsoap.org/ws/2004/08/addressing"
 xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery"
 xmlns:dn="http://www.onvif.org/ver10/network/wsdl">
<e:Header>
<w:MessageID>uuid:{mid}</w:MessageID>
<w:To e:mustUnderstand="true">urn:schemas-xmlsoap-org:ws:2005:04:discovery</w:To>
<w:Action e:mustUnderstand="true">http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</w:Action>
</e:Header>
<e:Body><d:Probe><d:Types>dn:NetworkVideoTransmitter</d:Types></d:Probe></e:Body>
</e:Envelope>"""


def discover(timeout: float = 3.0) -> list[dict]:
    """Επιστρέφει λίστα από {'host','xaddr','name','model'}."""
    socks = []
    for ip in local_ipv4s() or ["0.0.0.0"]:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
            s.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, 2)
            s.bind((ip, 0))
            if ip != "0.0.0.0":
                s.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_IF, socket.inet_aton(ip))
            s.setblocking(False)
            socks.append(s)
        except OSError:
            pass

    for s in socks:
        msg = _PROBE.format(mid=uuid.uuid4()).encode()
        for _ in range(2):
            try:
                s.sendto(msg, MCAST)
            except OSError:
                pass
        # Unicast σε όλο το /24: οι απαντήσεις έρχονται από την IP που ρωτήσαμε,
        # οπότε περνούν από το Windows Firewall ακόμη κι αν κόβει το multicast.
        try:
            ip = s.getsockname()[0]
        except OSError:
            continue
        if ip.count(".") == 3 and ip != "0.0.0.0":
            base = ip.rsplit(".", 1)[0]
            for n in range(1, 255):
                try:
                    s.sendto(msg, (f"{base}.{n}", MCAST[1]))
                except OSError:
                    pass

    import select
    import time

    found: dict[str, dict] = {}
    end = time.time() + timeout
    while socks and time.time() < end:
        r, _, _ = select.select(socks, [], [], max(0.05, end - time.time()))
        for s in r:
            try:
                data, addr = s.recvfrom(65535)
            except OSError:
                continue
            try:
                root = ET.fromstring(data)
            except ET.ParseError:
                continue
            xaddrs = _text(root, "XAddrs").split()
            if not xaddrs:
                continue
            # προτίμησε IPv4 xaddr
            xaddr = next((x for x in xaddrs if re.match(r"https?://\d+\.\d+\.\d+\.\d+", x)), xaddrs[0])
            scopes = urllib.parse.unquote(_text(root, "Scopes"))
            name = _scope(scopes, "name")
            model = _scope(scopes, "hardware")
            host = urllib.parse.urlparse(xaddr).hostname or addr[0]
            found.setdefault(host, {"host": host, "xaddr": xaddr, "name": name, "model": model})
    for s in socks:
        s.close()
    return sorted(found.values(), key=lambda d: tuple(int(p) if p.isdigit() else 0 for p in d["host"].split(".")))


def _scope(scopes: str, key: str) -> str:
    m = re.search(r"onvif://www\.onvif\.org/%s/(\S+)" % key, scopes)
    return m.group(1).replace("_", " ") if m else ""


# ---------------------------------------------------------------- SOAP

class OnvifCamera:
    def __init__(self, address: str, user: str = "", password: str = "", timeout: float = 6.0):
        address = address.strip()
        if not address.lower().startswith("http"):
            address = "http://" + address
        u = urllib.parse.urlparse(address)
        if u.path in ("", "/"):
            address = f"{u.scheme}://{u.netloc}/onvif/device_service"
        self.device_url = address
        self.host = u.hostname or ""
        self.user = user
        self.password = password
        self.timeout = timeout
        self.time_offset = _dt.timedelta(0)
        self.media_url = None

        pm = urllib.request.HTTPPasswordMgrWithDefaultRealm()
        if user:
            pm.add_password(None, f"{u.scheme}://{u.netloc}/", user, password)
        self._opener = urllib.request.build_opener(
            urllib.request.HTTPDigestAuthHandler(pm), urllib.request.HTTPBasicAuthHandler(pm)
        )

    # ---- low level
    def _security(self) -> str:
        if not self.user:
            return ""
        nonce = os.urandom(16)
        created = (_dt.datetime.now(_dt.timezone.utc) + self.time_offset).strftime("%Y-%m-%dT%H:%M:%S.000Z")
        digest = base64.b64encode(hashlib.sha1(nonce + created.encode() + self.password.encode()).digest()).decode()
        return (
            '<Security s:mustUnderstand="1" xmlns="http://docs.oasis-open.org/wss/2004/01/'
            'oasis-200401-wss-wssecurity-secext-1.0.xsd"><UsernameToken>'
            f"<Username>{_esc(self.user)}</Username>"
            '<Password Type="http://docs.oasis-open.org/wss/2004/01/'
            f'oasis-200401-wss-username-token-profile-1.0#PasswordDigest">{digest}</Password>'
            '<Nonce EncodingType="http://docs.oasis-open.org/wss/2004/01/'
            f'oasis-200401-wss-soap-message-security-1.0#Base64Binary">{base64.b64encode(nonce).decode()}</Nonce>'
            '<Created xmlns="http://docs.oasis-open.org/wss/2004/01/'
            f'oasis-200401-wss-wssecurity-utility-1.0.xsd">{created}</Created>'
            "</UsernameToken></Security>"
        )

    def _call(self, url: str, body: str, auth: bool = True):
        env = (
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" '
            f'xmlns:tt="{NS_TT}" xmlns:tds="{NS_TDS}" xmlns:trt="{NS_TRT}" xmlns:tptz="{NS_PTZ}">'
            f"<s:Header>{self._security() if auth else ''}</s:Header>"
            f"<s:Body>{body}</s:Body></s:Envelope>"
        ).encode("utf-8")
        req = urllib.request.Request(url, data=env, headers={"Content-Type": "application/soap+xml; charset=utf-8"})
        try:
            with self._opener.open(req, timeout=self.timeout) as r:
                data = r.read()
        except urllib.error.HTTPError as e:
            data = e.read()
            if e.code in (401, 403):
                raise OnvifError("Λάθος χρήστης ή κωδικός (HTTP %d)" % e.code)
            if not data:
                raise OnvifError("HTTP %d από την κάμερα" % e.code)
        except (urllib.error.URLError, OSError) as e:
            raise OnvifError(f"Δεν απαντά η κάμερα: {getattr(e, 'reason', e)}")
        try:
            root = ET.fromstring(data)
        except ET.ParseError:
            raise OnvifError("Μη έγκυρη απάντηση ONVIF")
        fault = _find(root, "Fault")
        if fault is not None:
            reason = _text(fault, "Text") or _text(fault, "Value") or "SOAP Fault"
            if any(k in reason.lower() for k in ("auth", "sender not authorized", "notauthorized", "password")):
                raise OnvifError("Λάθος χρήστης ή κωδικός (" + reason + ")")
            raise OnvifError(reason)
        return root

    # ---- high level
    def sync_time(self):
        try:
            root = self._call(self.device_url, "<tds:GetSystemDateAndTime/>", auth=False)
            utc = _find(root, "UTCDateTime")
            if utc is None:
                return
            d, t = _find(utc, "Date"), _find(utc, "Time")
            cam = _dt.datetime(
                int(_text(d, "Year")), int(_text(d, "Month")), int(_text(d, "Day")),
                int(_text(t, "Hour")), int(_text(t, "Minute")), int(_text(t, "Second")),
                tzinfo=_dt.timezone.utc,
            )
            self.time_offset = cam - _dt.datetime.now(_dt.timezone.utc)
        except Exception:
            self.time_offset = _dt.timedelta(0)

    def info(self) -> dict:
        try:
            root = self._call(self.device_url, "<tds:GetDeviceInformation/>")
            return {"manufacturer": _text(root, "Manufacturer"), "model": _text(root, "Model")}
        except OnvifError:
            return {}

    def _fix_host(self, x: str) -> str:
        # κάποιες κάμερες δίνουν εσωτερική IP· κράτα το host που ξέρουμε
        if not x:
            return x
        mu = urllib.parse.urlparse(x)
        du = urllib.parse.urlparse(self.device_url)
        return mu._replace(netloc=du.netloc).geturl()

    def _caps(self):
        if getattr(self, "_caps_cache", None) is None:
            try:
                root = self._call(self.device_url,
                                  "<tds:GetCapabilities><tds:Category>All</tds:Category></tds:GetCapabilities>")
                media, ptz = _find(root, "Media"), _find(root, "PTZ")
                self._caps_cache = {
                    "media": self._fix_host(_text(media, "XAddr")) if media is not None else "",
                    "ptz": self._fix_host(_text(ptz, "XAddr")) if ptz is not None else "",
                }
            except OnvifError as e:
                if "κωδικός" in str(e):
                    raise
                self._caps_cache = {"media": "", "ptz": ""}
        return self._caps_cache

    def _media(self) -> str:
        if not self.media_url:
            self.media_url = self._caps()["media"] or self.device_url
        return self.media_url

    # ---- PTZ
    def ptz_info(self) -> dict | None:
        """{'xaddr','token'} αν η κάμερα γυρίζει (pan/tilt), αλλιώς None."""
        self.sync_time()
        xaddr = self._caps()["ptz"]
        if not xaddr:
            return None
        root = self._call(self._media(), "<trt:GetProfiles/>")
        for p in _find_all(root, "Profiles"):
            if p.get("token") and _find(p, "PTZConfiguration") is not None:
                return {"xaddr": xaddr, "token": p.get("token")}
        return None

    def ptz_move(self, xaddr: str, token: str, x: float, y: float):
        body = (
            f"<tptz:ContinuousMove><tptz:ProfileToken>{_esc(token)}</tptz:ProfileToken>"
            f'<tptz:Velocity><tt:PanTilt x="{x:.2f}" y="{y:.2f}"/></tptz:Velocity></tptz:ContinuousMove>'
        )
        try:
            self._call(xaddr, body)
        except OnvifError:
            # κάποιες κάμερες δέχονται μόνο βηματική κίνηση
            body = (
                f"<tptz:RelativeMove><tptz:ProfileToken>{_esc(token)}</tptz:ProfileToken>"
                f'<tptz:Translation><tt:PanTilt x="{x * 0.2:.2f}" y="{y * 0.2:.2f}"/></tptz:Translation>'
                "</tptz:RelativeMove>"
            )
            self._call(xaddr, body)

    def ptz_stop(self, xaddr: str, token: str):
        try:
            self._call(xaddr, f"<tptz:Stop><tptz:ProfileToken>{_esc(token)}</tptz:ProfileToken>"
                              "<tptz:PanTilt>true</tptz:PanTilt><tptz:Zoom>false</tptz:Zoom></tptz:Stop>")
        except OnvifError:
            pass

    def profiles(self) -> list[dict]:
        root = self._call(self._media(), "<trt:GetProfiles/>")
        out = []
        for p in _find_all(root, "Profiles"):
            tok = p.get("token")
            if not tok:
                continue
            venc = _find(p, "VideoEncoderConfiguration")
            w = h = 0
            enc = ""
            if venc is not None:
                res = _find(venc, "Resolution")
                if res is not None:
                    w = int(_text(res, "Width", "0") or 0)
                    h = int(_text(res, "Height", "0") or 0)
                enc = _text(venc, "Encoding")
            out.append({"token": tok, "name": _text(p, "Name") or tok, "width": w, "height": h, "encoding": enc})
        return out

    def stream_uri(self, token: str) -> str:
        body = (
            "<trt:GetStreamUri><trt:StreamSetup><tt:Stream>RTP-Unicast</tt:Stream>"
            "<tt:Transport><tt:Protocol>RTSP</tt:Protocol></tt:Transport></trt:StreamSetup>"
            f"<trt:ProfileToken>{_esc(token)}</trt:ProfileToken></trt:GetStreamUri>"
        )
        root = self._call(self._media(), body)
        uri = _text(root, "Uri")
        if not uri:
            raise OnvifError("Η κάμερα δεν έδωσε RTSP διεύθυνση")
        # αντικατάσταση host αν η κάμερα δηλώνει λάθος/εσωτερική IP
        u = urllib.parse.urlparse(uri)
        if self.host and u.hostname and u.hostname != self.host:
            netloc = self.host + (f":{u.port}" if u.port else "")
            uri = u._replace(netloc=netloc).geturl()
        return uri

    def get_streams(self) -> tuple[str, str, list[dict]]:
        """(main_uri, sub_uri, profiles). sub_uri = η μικρότερη ανάλυση."""
        self.sync_time()
        profs = self.profiles()
        if not profs:
            raise OnvifError("Δεν βρέθηκαν προφίλ βίντεο")
        for p in profs:
            try:
                p["uri"] = self.stream_uri(p["token"])
            except OnvifError:
                p["uri"] = ""
        good = [p for p in profs if p["uri"]]
        if not good:
            raise OnvifError("Δεν βρέθηκε RTSP stream")
        by_size = sorted(good, key=lambda p: p["width"] * p["height"], reverse=True)
        main = by_size[0]["uri"]
        sub = by_size[-1]["uri"] if len(by_size) > 1 and by_size[-1]["uri"] != main else ""
        return main, sub, good


def _esc(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def with_credentials(rtsp: str, user: str, password: str) -> str:
    """Βάζει user:pass στο RTSP URL αν δεν υπάρχουν ήδη."""
    if not rtsp or not user:
        return rtsp
    u = urllib.parse.urlparse(rtsp)
    if u.username:
        return rtsp
    cred = urllib.parse.quote(user, safe="") + ":" + urllib.parse.quote(password, safe="")
    return u._replace(netloc=f"{cred}@{u.netloc}").geturl()


def mask(url: str) -> str:
    return re.sub(r"(://[^:/@]+:)[^@]*@", r"\1***@", url)
