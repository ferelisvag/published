"""Veagle Argos (Panoptis) — φορητό πρόγραμμα προβολής καμερών ONVIF / RTSP.

Τρέχει από στικάκι: οι ρυθμίσεις (argos_config.json), τα στιγμιότυπα (snapshots\\)
και οι εγγραφές (recordings\\) αποθηκεύονται δίπλα στο .exe.

v2: ήχος ανά κάμερα, ένταση, ψηφιακό ζουμ/μετακίνηση, HD/SD ανά πλαίσιο, PTZ,
εγγραφή, αυτόματη εναλλαγή, ώρα στην εικόνα, αλλαγή σειράς με σύρσιμο.
"""
from __future__ import annotations

import collections
import json
import os
import queue
import sys
import threading
import time
import uuid
from fractions import Fraction

import tkinter as tk
from tkinter import messagebox, ttk

import av
import numpy as np
from PIL import Image, ImageTk

try:
    import sounddevice as sd
except Exception:  # χωρίς κάρτα ήχου / PortAudio: το πρόγραμμα δουλεύει χωρίς ήχο
    sd = None

import onvif_lite as onvif

PRODUCT = "Argos"              # το όνομα μετά το VEAGLE (αλλάζει μόνο εδώ)
TAGLINE = "Panoptis"           # ο Άργος ο Πανόπτης, ο φύλακας με τα εκατό μάτια
APP_NAME = f"Veagle {PRODUCT}"
APP_VERSION = "3.0"
TEST_BUILD = False            # δοκιμαστική έκδοση: γράφεται στον τίτλο του παραθύρου
# ανίχνευση κίνησης: ποσοστό εικονοστοιχείων που άλλαξαν (σε μικρή γκρι εικόνα 64x36)
MOTION_LEVELS = ("off", "low", "med", "high")
MOTION_THRESH = {"low": 0.06, "med": 0.03, "high": 0.012}
MOTION_LABEL = {"off": "ΚΙΝ ✕", "low": "ΚΙΝ 1", "med": "ΚΙΝ 2", "high": "ΚΙΝ 3"}
BRAND = "VEAGLE - ferelis.gr"
SITE_URL = "https://ferelis.gr"
MYTH_URL = "https://mythoi.org/argos-panoptis/"

if getattr(sys, "frozen", False):
    APP_DIR = os.path.dirname(os.path.abspath(sys.executable))
    RES_DIR = getattr(sys, "_MEIPASS", APP_DIR)
else:
    APP_DIR = os.path.dirname(os.path.abspath(__file__))
    RES_DIR = APP_DIR
CONFIG_PATH = os.path.join(APP_DIR, "argos_config.json")
SNAP_DIR = os.path.join(APP_DIR, "snapshots")
REC_DIR = os.path.join(APP_DIR, "recordings")

LAYOUTS = {"1x1": (1, 1), "1x2": (1, 2), "2x2": (2, 2)}
QUALITIES = ("auto", "hd", "sd")
MAX_ZOOM = 8.0

# χρώματα
BG = "#0d1117"
PANEL = "#161b22"
PANEL2 = "#21262d"
FG = "#e6edf3"
DIM = "#8b949e"
ACCENT = "#e02b2b"      # το κόκκινο του VEAGLE
ACCENT_HOVER = "#f04444"
OK = "#3fb950"
WARN = "#d29922"
BAD = "#f85149"


# ====================================================================== config

def load_config() -> dict:
    cfg = {"cameras": [], "layout": "2x2", "page": 0, "use_sub": True, "geometry": "1280x780",
           "volume": 70, "muted": False, "cycle_seconds": 10, "show_clock": False, "start_fullscreen": False}
    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            cfg.update(json.load(f))
    except FileNotFoundError:
        pass
    except Exception as e:  # χαλασμένο αρχείο: κράτα αντίγραφο, ξεκίνα καθαρά
        try:
            os.replace(CONFIG_PATH, CONFIG_PATH + ".bad")
        except OSError:
            pass
        print("config error:", e)
    if cfg.get("layout") not in LAYOUTS:
        cfg["layout"] = "2x2"
    for c in cfg["cameras"]:
        c.setdefault("id", uuid.uuid4().hex[:8])
        if c.get("quality") not in QUALITIES:
            c["quality"] = "auto"
    return cfg


def save_config(cfg: dict) -> str | None:
    try:
        tmp = CONFIG_PATH + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(cfg, f, ensure_ascii=False, indent=2)
        os.replace(tmp, CONFIG_PATH)
        return None
    except OSError as e:
        return str(e)


def safe_name(s: str) -> str:
    return "".join(ch if ch.isalnum() or ch in "-_" else "_" for ch in (s or "cam"))


def friendly_error(e: Exception) -> str:
    m = str(e)
    low = m.lower()
    if "401" in m or "unauthorized" in low or "403" in m:
        return "Λάθος χρήστης ή κωδικός"
    if "404" in m or "not found" in low:
        return "Λάθος διεύθυνση ροής (404)"
    if "timed out" in low or "timeout" in low or "10060" in m:
        return "Δεν απαντά η κάμερα"
    if "refused" in low or "10061" in m:
        return "Η κάμερα αρνήθηκε τη σύνδεση"
    if "no such file" in low:
        return "Δεν βρέθηκε η ροή"
    return "Δεν συνδέεται"


# ====================================================================== audio

class AudioOut:
    """Μία έξοδος ήχου για όλη την εφαρμογή: παίζει μόνο την επιλεγμένη κάμερα."""

    RATE = 48000

    def __init__(self):
        self.lock = threading.Lock()
        self.buf: collections.deque = collections.deque()
        self.count = 0
        self.source = None
        self.volume = 0.7
        self.muted = False
        self.stream = None
        self.error = None

    def _ensure(self) -> bool:
        if self.stream is not None:
            return True
        if sd is None:
            self.error = "Δεν βρέθηκε σύστημα ήχου"
            return False
        try:
            self.stream = sd.OutputStream(samplerate=self.RATE, channels=1, dtype="int16",
                                          callback=self._cb, latency="low")
            self.stream.start()
            return True
        except Exception as e:  # noqa: BLE001
            self.stream = None
            self.error = f"Δεν άνοιξε η κάρτα ήχου: {e}"
            return False

    def set_source(self, src) -> bool:
        with self.lock:
            self.source = src
            self.buf.clear()
            self.count = 0
        return self._ensure() if src is not None else True

    def push(self, src, samples: np.ndarray):
        with self.lock:
            if src is not self.source:
                return
            self.buf.append(samples)
            self.count += len(samples)
            # κράτα την καθυστέρηση κάτω από ~0.4 s
            while self.count > self.RATE * 0.4 and self.buf:
                self.count -= len(self.buf.popleft())

    def _cb(self, outdata, frames, _time, _status):
        out = np.zeros(frames, dtype=np.int16)
        pos = 0
        with self.lock:
            while pos < frames and self.buf:
                chunk = self.buf[0]
                n = min(frames - pos, len(chunk))
                out[pos:pos + n] = chunk[:n]
                pos += n
                if n < len(chunk):
                    self.buf[0] = chunk[n:]
                else:
                    self.buf.popleft()
                self.count -= n
            gain = 0.0 if self.muted else self.volume
        if gain != 1.0:
            out = np.clip(out.astype(np.float32) * gain, -32768, 32767).astype(np.int16)
        outdata[:, 0] = out

    def close(self):
        if self.stream is not None:
            try:
                self.stream.stop()
                self.stream.close()
            except Exception:
                pass
            self.stream = None


# ====================================================================== recording

class Recorder:
    """Γράφει τη ροή σε .mp4 χωρίς επανακωδικοποίηση της εικόνας (ελάχιστη CPU).
    Ο ήχος μετατρέπεται σε AAC ώστε το αρχείο να παίζει παντού.
    Νέο αρχείο κάθε μία ώρα. Fragmented MP4: παίζει ακόμη κι αν κοπεί το ρεύμα."""

    SPLIT_SECONDS = 3600

    def __init__(self, cam_name: str):
        self.cam_name = cam_name
        self.lock = threading.Lock()
        self.closed = False
        self.out = None
        self.error = None
        self.t_start = time.time()
        self.files: list[str] = []

    def _new_path(self) -> str:
        os.makedirs(REC_DIR, exist_ok=True)
        return os.path.join(REC_DIR, f"{safe_name(self.cam_name)}_{time.strftime('%Y-%m-%d_%H-%M-%S')}.mp4")

    def _open(self, pkt, vs, as_):
        path = self._new_path()
        self.out = av.open(path, "w", format="mp4",
                           options={"movflags": "frag_keyframe+empty_moov+default_base_moof"})
        self.ovs = self.out.add_stream_from_template(vs)
        self.oas = None
        if as_ is not None:
            try:
                self.oas = self.out.add_stream("aac", rate=48000, layout="mono")
                self.ares = av.AudioResampler(format="fltp", layout="mono", rate=48000)
            except Exception:
                self.oas = None
        self.vbase = pkt.dts if pkt.dts is not None else pkt.pts
        self.t0 = float(self.vbase * pkt.time_base) if pkt.time_base else 0.0
        self.apos = None
        self.last_dts = None
        self.src_vs = vs
        self.part_start = time.time()
        self.files.append(path)

    def _finish(self):
        if self.out is None:
            return
        try:
            if self.oas is not None:
                for p in self.oas.encode(None):
                    self.out.mux(p)
        except Exception:
            pass
        try:
            self.out.close()
        except Exception:
            pass
        self.out = None

    def video_packet(self, pkt, vs, as_):
        with self.lock:
            if self.closed:
                return
            if self.out is not None and pkt.is_keyframe and time.time() - self.part_start > self.SPLIT_SECONDS:
                self._finish()
            if self.out is None:
                if not pkt.is_keyframe or (pkt.dts is None and pkt.pts is None):
                    return
                try:
                    self._open(pkt, vs, as_)
                except Exception as e:  # noqa: BLE001
                    self.error = str(e)
                    self.closed = True
                    return
            dts = pkt.dts if pkt.dts is not None else pkt.pts
            if dts is None:
                return
            if vs is not self.src_vs:
                # επανασύνδεση: νέα ροή με χρόνους από την αρχή → συνέχισε στο ίδιο αρχείο από keyframe
                if not pkt.is_keyframe:
                    return
                self.src_vs = vs
                step = max(1, int(round(1 / (float(vs.time_base) * float(vs.average_rate or 25)))))
                self.vbase = dts - ((self.last_dts or 0) + step)
                out_t = float(((self.last_dts or 0) + step) * vs.time_base)
                self.apos = max(self.apos or 0, int(out_t * 48000))   # ο ήχος συνεχίζει μετά την εικόνα
            dts -= self.vbase
            pts = (pkt.pts - self.vbase) if pkt.pts is not None else dts
            if dts < 0 or (self.last_dts is not None and dts <= self.last_dts):
                return
            self.last_dts = dts
            pkt.dts, pkt.pts = dts, max(pts, dts)
            pkt.stream = self.ovs
            try:
                self.out.mux(pkt)
            except Exception as e:  # noqa: BLE001
                self.error = str(e)

    def audio_frame(self, f):
        with self.lock:
            if self.closed or self.out is None or self.oas is None or f.time is None:
                return
            if self.apos is None:
                off = f.time - self.t0
                self.apos = int(off * 48000) if 0 <= off < 5 else 0
            try:
                for rf in self.ares.resample(f):
                    rf.pts = self.apos
                    rf.time_base = Fraction(1, 48000)
                    self.apos += rf.samples
                    for p in self.oas.encode(rf):
                        self.out.mux(p)
            except Exception:
                pass

    def close(self):
        with self.lock:
            if self.closed and self.out is None:
                return
            self.closed = True
            self._finish()

    @property
    def elapsed(self) -> str:
        s = int(time.time() - self.t_start)
        return f"{s // 3600:d}:{s // 60 % 60:02d}:{s % 60:02d}" if s >= 3600 else f"{s // 60:02d}:{s % 60:02d}"


# ====================================================================== streams

class Stream:
    """Μία ροή (RTSP ή αρχείο) σε δικό της νήμα. Κρατά πάντα το πιο πρόσφατο καρέ."""

    def __init__(self, url: str, audio: AudioOut):
        self.url = url
        self.audio = audio
        self.audio_on = False
        self.recorder: Recorder | None = None
        self.display = True
        self.stop_evt = threading.Event()
        self.lock = threading.Lock()
        self.last_frame = None       # τελευταίο av.VideoFrame (πλήρης ανάλυση)
        self.view = None             # έτοιμο RGB για την οθόνη
        self.view_id = 0
        self.last_frame_t = 0.0
        self.status = "Σύνδεση…"
        self.target = (640, 360)
        self.view_rect = (0.0, 0.0, 1.0, 1.0)
        self.has_audio: bool | None = None
        self.info = ""
        self._fps_n = 0
        self._fps_t = time.time()
        self.fps = 0.0
        self.motion_level = "off"
        self.motion_t = 0.0
        self._bg = None
        self._mcount = 0
        self.unused_since: float | None = None
        self.thread = threading.Thread(target=self._run, daemon=True)
        self.thread.start()

    def stop(self):
        self.stop_evt.set()

    def _run(self):
        backoff = 1.0
        live = "://" in self.url
        opts = {"rtsp_transport": "tcp", "fflags": "nobuffer", "flags": "low_delay", "max_delay": "500000"} if live else {}
        while not self.stop_evt.is_set():
            self.status = "Σύνδεση…"
            try:
                c = av.open(self.url, options=opts, timeout=(8.0, 8.0))
            except Exception as e:  # noqa: BLE001
                self.status = f"{friendly_error(e)} — νέα προσπάθεια σε λίγο"
                self.stop_evt.wait(backoff)
                backoff = min(backoff * 2, 15)
                continue
            try:
                if not c.streams.video:
                    raise RuntimeError("Η ροή δεν έχει εικόνα")
                vs = c.streams.video[0]
                vs.thread_type = "AUTO"
                as_ = c.streams.audio[0] if c.streams.audio else None
                self.has_audio = as_ is not None
                acodec = as_.codec_context.name if as_ is not None else ""
                self.info = vs.codec_context.name.upper().replace("HEVC", "H.265").replace("H264", "H.264")
                if acodec:
                    self.info += " · ήχος"
                resampler = av.AudioResampler(format="s16", layout="mono", rate=AudioOut.RATE) if as_ else None
                backoff = 1.0
                t0 = w0 = None
                for pkt in c.demux(*([vs] + ([as_] if as_ is not None else []))):
                    if self.stop_evt.is_set():
                        break
                    if pkt.size == 0:
                        continue
                    rec = self.recorder
                    if pkt.stream is vs:
                        try:
                            frames = pkt.decode()
                        except Exception:
                            frames = []
                        for f in frames:
                            if not live and f.time is not None:   # αρχεία: παίξε σε κανονική ταχύτητα
                                if t0 is None:
                                    t0, w0 = f.time, time.monotonic()
                                d = (f.time - t0) - (time.monotonic() - w0)
                                if d > 0:
                                    self.stop_evt.wait(min(d, 1.0))
                            self._publish(f)
                        if rec is not None:
                            rec.video_packet(pkt, vs, as_)
                    elif as_ is not None and (self.audio_on or rec is not None):
                        try:
                            frames = pkt.decode()
                        except Exception:
                            frames = []
                        for f in frames:
                            if rec is not None:
                                rec.audio_frame(f)
                            if self.audio_on:
                                for rf in resampler.resample(f):
                                    self.audio.push(self, rf.to_ndarray().reshape(-1).astype(np.int16, copy=False))
            except Exception as e:  # noqa: BLE001
                self.status = f"{friendly_error(e)}"
            finally:
                try:
                    c.close()
                except Exception:
                    pass
            if not self.stop_evt.is_set():
                if live:
                    self.status = "Χάθηκε το σήμα — επανασύνδεση…"
                self.stop_evt.wait(1.0 if live else 0.05)

    def _publish(self, f):
        now = time.time()
        self._fps_n += 1
        if now - self._fps_t >= 2:
            self.fps = self._fps_n / (now - self._fps_t)
            self._fps_n, self._fps_t = 0, now
        self._detect_motion(f, now)
        if not self.display:
            with self.lock:
                self.last_frame = f
                self.last_frame_t = now
                self.status = ""
            return
        tw, th = self.target
        x0, y0, x1, y1 = self.view_rect
        W, H = f.width, f.height
        if (x0, y0, x1, y1) == (0.0, 0.0, 1.0, 1.0):
            s = min(tw / W, th / H)
            nw, nh = max(2, int(W * s)) & ~1, max(2, int(H * s)) & ~1
            arr = f.reformat(width=nw, height=nh, format="rgb24", interpolation="BILINEAR").to_ndarray()
        else:
            full = f.to_ndarray(format="rgb24")
            cx0, cy0 = int(x0 * W), int(y0 * H)
            cx1, cy1 = max(cx0 + 2, int(x1 * W)), max(cy0 + 2, int(y1 * H))
            crop = full[cy0:cy1, cx0:cx1]
            ch, cw = crop.shape[:2]
            s = min(tw / cw, th / ch)
            arr = np.asarray(Image.fromarray(crop).resize((max(2, int(cw * s)), max(2, int(ch * s))), Image.BILINEAR))
        with self.lock:
            self.last_frame = f
            self.view = arr
            self.view_id += 1
            self.last_frame_t = now
            self.status = ""
            self.resolution = f"{W}x{H}"

    def _detect_motion(self, f, now):
        """Σύγκριση με αργά μεταβαλλόμενο «φόντο» σε μικρή γκρι εικόνα, κάθε 3ο καρέ."""
        level = self.motion_level
        if level == "off":
            self._bg = None
            return
        self._mcount += 1
        if self._mcount % 3:
            return
        try:
            g = f.reformat(width=64, height=36, format="gray").to_ndarray().astype(np.float32)
        except Exception:
            return
        if self._bg is None or self._bg.shape != g.shape:
            self._bg = g
            return
        frac = float((np.abs(g - self._bg) > 22).mean())
        self._bg += (g - self._bg) * 0.08
        if frac > MOTION_THRESH.get(level, 1.0):
            self.motion_t = now

    def snapshot_image(self) -> Image.Image | None:
        with self.lock:
            f = self.last_frame
        return f.to_image() if f is not None else None


class StreamPool:
    """Ανοίγει/κλείνει ροές ανάλογα με το τι φαίνεται ή γράφεται. Οι αχρησιμοποίητες
    μένουν ανοιχτές λίγα δευτερόλεπτα ώστε η εναλλαγή διάταξης να είναι άμεση."""

    GRACE = 20.0

    def __init__(self, audio: AudioOut):
        self.audio = audio
        self.streams: dict[str, Stream] = {}

    def want(self, display, extra=()):
        now = time.time()
        display = {u for u in display if u}
        need = display | {u for u in extra if u}
        for u in need:
            st = self.streams.get(u)
            if st is None:
                st = self.streams[u] = Stream(u, self.audio)
            st.unused_since = None
            st.display = u in display
        for u, st in self.streams.items():
            if u not in need and st.unused_since is None:
                st.unused_since = now
                st.display = False

    def reap(self):
        now = time.time()
        for u in list(self.streams):
            st = self.streams[u]
            if st.unused_since is not None and now - st.unused_since > self.GRACE and st.recorder is None:
                st.stop()
                del self.streams[u]

    def get(self, url) -> Stream | None:
        return self.streams.get(url)

    def close(self):
        for u in list(self.streams):
            self.streams.pop(u).stop()


# ====================================================================== helpers

def run_bg(widget: tk.Misc, fn, done):
    """Τρέχει fn() σε νήμα και καλεί done(result, error) στο νήμα του UI."""
    q: queue.Queue = queue.Queue()

    def worker():
        try:
            q.put((fn(), None))
        except Exception as e:  # noqa: BLE001
            q.put((None, e))

    threading.Thread(target=worker, daemon=True).start()

    def poll():
        try:
            res, err = q.get_nowait()
        except queue.Empty:
            if widget.winfo_exists():
                widget.after(100, poll)
            return
        if widget.winfo_exists():
            done(res, err)

    widget.after(100, poll)


def asset(name: str, height: int | None = None) -> Image.Image | None:
    """Φορτώνει εικόνα από assets\\ (μέσα στο .exe ή δίπλα στο script)."""
    try:
        img = Image.open(os.path.join(RES_DIR, "assets", name)).convert("RGBA")
    except OSError:
        return None
    if height and img.height != height:
        img = img.resize((max(1, round(img.width * height / img.height)), height), Image.LANCZOS)
    return img


def open_url(url):
    import webbrowser
    webbrowser.open(url)


def open_site(_=None):
    open_url(SITE_URL)


def open_folder(path):
    os.makedirs(path, exist_ok=True)
    try:
        os.startfile(path)  # type: ignore[attr-defined]
    except Exception:
        pass


def flat_button(parent, text, cmd, width=None, bg=PANEL2, padx=12):
    b = tk.Button(
        parent, text=text, command=cmd, bg=bg, fg=FG, activebackground=ACCENT, activeforeground="white",
        relief="flat", bd=0, padx=padx, pady=6, font=("Segoe UI", 10), cursor="hand2", highlightthickness=0,
    )
    if width:
        b.configure(width=width)
    b._base_bg = bg  # type: ignore[attr-defined]

    def hover_bg():
        return ACCENT_HOVER if b._base_bg == ACCENT else "#30363d"

    b.bind("<Enter>", lambda e: b.configure(bg=hover_bg()))
    b.bind("<Leave>", lambda e: b.configure(bg=b._base_bg))
    return b


def set_button_bg(b, bg):
    b._base_bg = bg
    b.configure(bg=bg)


def tooltip(widget, text):
    tip = {"w": None}

    def show(_):
        if tip["w"]:
            return
        t = tk.Toplevel(widget)
        t.wm_overrideredirect(True)
        tk.Label(t, text=text if not callable(text) else text(), bg="#30363d", fg=FG,
                 font=("Segoe UI", 9), padx=8, pady=4).pack()
        t.update_idletasks()
        x = widget.winfo_rootx() + widget.winfo_width() - t.winfo_reqwidth()
        t.wm_geometry(f"+{max(0, x)}+{widget.winfo_rooty() + widget.winfo_height() + 4}")
        tip["w"] = t

    def hide(_):
        if tip["w"]:
            tip["w"].destroy()
            tip["w"] = None

    widget.bind("<Enter>", show, add="+")
    widget.bind("<Leave>", hide, add="+")
    widget.bind("<ButtonPress>", hide, add="+")


def setup_style(root):
    st = ttk.Style(root)
    try:
        st.theme_use("clam")
    except tk.TclError:
        pass
    st.configure(".", background=PANEL, foreground=FG, fieldbackground=PANEL2, font=("Segoe UI", 10))
    st.configure("TFrame", background=PANEL)
    st.configure("TLabel", background=PANEL, foreground=FG)
    st.configure("Dim.TLabel", background=PANEL, foreground=DIM)
    st.configure("TEntry", fieldbackground=PANEL2, foreground=FG, insertcolor=FG, bordercolor="#30363d",
                 lightcolor="#30363d", darkcolor="#30363d")
    st.map("TEntry", bordercolor=[("focus", ACCENT)])
    st.configure("TSpinbox", fieldbackground=PANEL2, foreground=FG, arrowcolor=FG, bordercolor="#30363d",
                 lightcolor="#30363d", darkcolor="#30363d", background=PANEL2)
    st.configure("TCheckbutton", background=PANEL, foreground=FG)
    st.map("TCheckbutton", background=[("active", PANEL)])
    st.configure("Treeview", background=PANEL2, fieldbackground=PANEL2, foreground=FG, rowheight=26,
                 bordercolor="#30363d")
    st.map("Treeview", background=[("selected", ACCENT)], foreground=[("selected", "white")])
    st.configure("Treeview.Heading", background=PANEL, foreground=DIM, relief="flat")
    st.map("Treeview.Heading", background=[("active", PANEL2)])
    st.configure("Vol.Horizontal.TScale", background=DIM, troughcolor="#30363d", bordercolor=PANEL,
                 lightcolor=DIM, darkcolor=DIM, sliderthickness=12, sliderlength=12, troughrelief="flat")
    st.map("Vol.Horizontal.TScale", background=[("active", FG)])


def center_on(win: tk.Toplevel, parent: tk.Misc):
    win.update_idletasks()
    pw, ph = parent.winfo_width(), parent.winfo_height()
    px, py = parent.winfo_rootx(), parent.winfo_rooty()
    w, h = win.winfo_reqwidth(), win.winfo_reqheight()
    win.geometry(f"+{max(0, px + (pw - w) // 2)}+{max(0, py + (ph - h) // 3)}")


# ====================================================================== tiles

PTZ_DIRS = (("▲", 0, -1, 0, 1), ("▼", 0, 1, 0, -1), ("◀", -1, 0, -1, 0), ("▶", 1, 0, 1, 0))


class Tile:
    def __init__(self, app: "App", parent, slot: int):
        self.app = app
        self.slot = slot
        self.cam_index: int | None = None
        self.cam: dict | None = None
        self.url = ""
        self.photo: ImageTk.PhotoImage | None = None
        self.last_id = -1
        self.zoom = 1.0
        self.cx = self.cy = 0.5
        self.hover = False
        self._consumed = False
        self._press = None
        self._mode = None          # None / "pan" / "reorder"
        self._click_job = None
        self._ptz_active = False

        cv = self.cv = tk.Canvas(parent, bg="black", highlightthickness=2, highlightbackground=BG, bd=0,
                                 cursor="hand2")
        self.img_item = cv.create_image(0, 0, anchor="center")
        self.status_item = cv.create_text(0, 0, text="", fill=DIM, font=("Segoe UI", 12), justify="center")
        self.name_shadow = cv.create_text(13, 13, text="", fill="black", anchor="nw", font=("Segoe UI Semibold", 11))
        self.name_item = cv.create_text(12, 12, text="", fill=FG, anchor="nw", font=("Segoe UI Semibold", 11))
        self.icons = cv.create_text(0, 12, text="", fill=FG, anchor="nw", font=("Segoe UI Semibold", 10))
        self.dot = cv.create_oval(0, 0, 0, 0, fill=DIM, outline="")
        # κουμπί ποιότητας
        self.q_bg = cv.create_rectangle(0, 0, 0, 0, fill="#000000", outline="#484f58", stipple="gray75")
        self.q_txt = cv.create_text(0, 0, text="", fill=FG, font=("Segoe UI Semibold", 8))
        for it in (self.q_bg, self.q_txt):
            cv.tag_bind(it, "<ButtonPress-1>", self._on_quality)
            cv.tag_bind(it, "<Enter>", lambda e: cv.configure(cursor="hand2"))
        # κουμπί ανίχνευσης κίνησης + ειδοποίηση
        self.m_bg = cv.create_rectangle(0, 0, 0, 0, fill="#000000", outline="#484f58", stipple="gray75")
        self.m_txt = cv.create_text(0, 0, text="", fill=FG, font=("Segoe UI Semibold", 8))
        for it in (self.m_bg, self.m_txt):
            cv.tag_bind(it, "<ButtonPress-1>", self._on_motion_btn)
        self.alert_txt = cv.create_text(0, 0, text="", fill=BAD, font=("Segoe UI Semibold", 11))
        self._alert_on = False
        # κάτω γραμμή
        self.zoom_txt = cv.create_text(0, 0, text="", fill=FG, anchor="sw", font=("Segoe UI Semibold", 9))
        self.info_txt = cv.create_text(0, 0, text="", fill=DIM, anchor="sw", font=("Segoe UI", 8))
        self.clock_shadow = cv.create_text(0, 0, text="", fill="black", anchor="ne", font=("Consolas", 10))
        self.clock_txt = cv.create_text(0, 0, text="", fill=FG, anchor="ne", font=("Consolas", 10))
        # PTZ
        self.ptz_items = []
        for sym, dx, dy, *_ in PTZ_DIRS:
            o = cv.create_oval(0, 0, 0, 0, fill="#000000", outline="#8b949e", stipple="gray75", state="hidden")
            t = cv.create_text(0, 0, text=sym, fill=FG, font=("Segoe UI", 10), state="hidden")
            for it in (o, t):
                cv.tag_bind(it, "<ButtonPress-1>", lambda e, dx=dx, dy=dy: self._ptz_press(dx, dy))
            self.ptz_items.append((o, t))

        cv.bind("<Configure>", self._on_resize)
        cv.bind("<ButtonPress-1>", self._on_press)
        cv.bind("<B1-Motion>", self._on_motion)
        cv.bind("<ButtonRelease-1>", self._on_release)
        cv.bind("<Double-Button-1>", self._on_double)
        cv.bind("<Button-3>", lambda e: self.reset_zoom())
        cv.bind("<MouseWheel>", self._on_wheel)
        cv.bind("<Enter>", lambda e: self._set_hover(True))
        cv.bind("<Leave>", lambda e: self._set_hover(False))

    # ---------------------------------------------------------------- data
    def assign(self, cam_index, cam, url):
        self.cam_index = cam_index
        self.cam = cam
        self.url = url
        # το ζουμ κάθε κάμερας επιβιώνει από αλλαγές διάταξης/ποιότητας
        self.zoom, self.cx, self.cy = self.app.zoom_state.get((cam or {}).get("id"), (1.0, 0.5, 0.5))
        self.last_id = -1
        self.photo = None
        self.cv.itemconfigure(self.img_item, image="")
        name = (cam or {}).get("name", "")
        self.cv.itemconfigure(self.name_item, text=name)
        self.cv.itemconfigure(self.name_shadow, text=name)
        if cam is None:
            self.cv.itemconfigure(self.status_item, text="Κενή θέση", fill="#484f58")
            for it in (self.q_bg, self.q_txt, self.m_bg, self.m_txt):
                self.cv.itemconfigure(it, state="hidden")
        elif not url:
            self.cv.itemconfigure(self.status_item, text="Δεν έχει οριστεί RTSP διεύθυνση", fill=WARN)
        else:
            self.cv.itemconfigure(self.status_item, text="Σύνδεση…", fill=DIM)
        self._layout_items()
        self._push_view()

    @property
    def cam_id(self):
        return (self.cam or {}).get("id")

    # ---------------------------------------------------------------- geometry
    def _on_resize(self, e):
        self._layout_items()

    def _layout_items(self):
        cv = self.cv
        w, h = max(cv.winfo_width(), 50), max(cv.winfo_height(), 50)
        cv.coords(self.img_item, w // 2, h // 2)
        cv.coords(self.status_item, w // 2, h // 2)
        cv.itemconfigure(self.status_item, width=max(100, w - 40))
        cv.coords(self.dot, w - 20, 12, w - 10, 22)
        cv.coords(self.q_bg, w - 64, 9, w - 28, 25)
        cv.coords(self.q_txt, w - 46, 17)
        cv.coords(self.m_bg, w - 122, 9, w - 70, 25)
        cv.coords(self.m_txt, w - 96, 17)
        cv.coords(self.alert_txt, w // 2, 46)
        cv.coords(self.zoom_txt, 12, h - 10)
        cv.coords(self.info_txt, 12, h - 28)
        cv.coords(self.clock_txt, w - 12, h - 26)
        cv.coords(self.clock_shadow, w - 11, h - 25)
        # PTZ σταυρός κάτω δεξιά
        r, gap = 14, 30
        cx, cy = w - 56, h - 74
        for (o, t), (_, dx, dy, *_r) in zip(self.ptz_items, PTZ_DIRS):
            x, y = cx + dx * gap, cy + dy * gap
            cv.coords(o, x - r, y - r, x + r, y + r)
            cv.coords(t, x, y)
        self._place_icons()

    def _place_icons(self):
        bbox = self.cv.bbox(self.name_item)
        x = (bbox[2] + 10) if bbox and self.cv.itemcget(self.name_item, "text") else 12
        self.cv.coords(self.icons, x, 13)

    def _image_rect(self):
        w, h = self.cv.winfo_width(), self.cv.winfo_height()
        if self.photo is None:
            return 0, 0, w, h
        pw, ph = self.photo.width(), self.photo.height()
        return (w - pw) / 2, (h - ph) / 2, pw, ph

    def view_rect(self):
        half = 0.5 / self.zoom
        self.cx = min(max(self.cx, half), 1 - half)
        self.cy = min(max(self.cy, half), 1 - half)
        if self.zoom <= 1.0001:
            return (0.0, 0.0, 1.0, 1.0)
        return (self.cx - half, self.cy - half, self.cx + half, self.cy + half)

    def _push_view(self):
        if self.cam_id:
            self.view_rect()   # clamp
            self.app.zoom_state[self.cam_id] = (self.zoom, self.cx, self.cy)
        st = self.app.pool.get(self.url)
        if st is not None:
            st.view_rect = self.view_rect()
            st.target = (max(16, self.cv.winfo_width() - 4), max(16, self.cv.winfo_height() - 4))

    def reset_zoom(self):
        self.zoom, self.cx, self.cy = 1.0, 0.5, 0.5
        self._push_view()

    # ---------------------------------------------------------------- mouse
    def _on_wheel(self, e):
        if not self.url:
            return
        ix, iy, pw, ph = self._image_rect()
        u = min(max((e.x - ix) / max(pw, 1), 0), 1)
        v = min(max((e.y - iy) / max(ph, 1), 0), 1)
        x0, y0, x1, y1 = self.view_rect()
        ax, ay = x0 + u * (x1 - x0), y0 + v * (y1 - y0)
        z = self.zoom * (1.25 if e.delta > 0 else 0.8)
        z = min(max(z, 1.0), MAX_ZOOM)
        if abs(z - 1.0) < 0.05:
            z = 1.0
        half = 0.5 / z
        self.zoom = z
        self.cx = ax - u * 2 * half + half
        self.cy = ay - v * 2 * half + half
        self._push_view()

    def _on_press(self, e):
        if self._consumed:
            self._consumed = False
            self._press = None
            return
        self._press = (e.x, e.y, self.cx, self.cy)
        self._mode = None

    def _on_motion(self, e):
        if not self._press:
            return
        px, py, cx0, cy0 = self._press
        dx, dy = e.x - px, e.y - py
        if self._mode is None and abs(dx) + abs(dy) > 6:
            self._mode = "pan" if self.zoom > 1.0001 else ("reorder" if self.cam is not None else "none")
            self.cv.configure(cursor="fleur")
        if self._mode == "pan":
            _, _, pw, ph = self._image_rect()
            self.cx = cx0 - dx / max(pw, 1) / self.zoom
            self.cy = cy0 - dy / max(ph, 1) / self.zoom
            self._push_view()
        elif self._mode == "reorder":
            self.app.reorder_hover(self, e.x_root, e.y_root)

    def _on_release(self, e):
        if self._ptz_active:
            self._ptz_active = False
            self.app.ptz_stop(self.cam)
        if not self._press:
            return
        mode = self._mode
        self._press, self._mode = None, None
        self.cv.configure(cursor="hand2")
        if mode == "reorder":
            self.app.reorder_drop(self, e.x_root, e.y_root)
        elif mode is None:
            if self._click_job:
                self.cv.after_cancel(self._click_job)
            self._click_job = self.cv.after(260, self._single_click)

    def _single_click(self):
        self._click_job = None
        self.app.toggle_select(self)

    def _on_double(self, e):
        if self._click_job:
            self.cv.after_cancel(self._click_job)
            self._click_job = None
        if self._consumed:
            self._consumed = False
            return
        self.app.toggle_single(self)

    def _on_quality(self, e):
        self._consumed = True
        if self.cam is not None:
            self.app.cycle_quality(self.cam)

    def _on_motion_btn(self, e):
        self._consumed = True
        if self.cam is not None:
            self.app.cycle_motion(self.cam)

    def _ptz_press(self, dx, dy):
        self._consumed = True
        if self.cam is not None:
            self._ptz_active = True
            self.app.ptz_start(self.cam, dx, -dy)

    def _set_hover(self, on):
        self.hover = on

    # ---------------------------------------------------------------- render
    def refresh(self, now: float):
        cv = self.cv
        has_cam = self.cam is not None
        app = self.app
        # PTZ / ποιότητα / πληροφορίες
        ptz = has_cam and bool(self.cam.get("ptz")) and self.hover
        for o, t in self.ptz_items:
            cv.itemconfigure(o, state="normal" if ptz else "hidden")
            cv.itemconfigure(t, state="normal" if ptz else "hidden")
        if has_cam:
            q = self.cam.get("quality", "auto")
            cv.itemconfigure(self.q_txt, text={"auto": "AUTO", "hd": "HD", "sd": "SD"}[q],
                             fill=OK if q == "hd" else (FG if q == "auto" else WARN), state="normal")
            cv.itemconfigure(self.q_bg, state="normal")
            ml = self.cam.get("motion", "off")
            cv.itemconfigure(self.m_txt, text=MOTION_LABEL.get(ml, "ΚΙΝ ✕"), fill=DIM if ml == "off" else WARN, state="normal")
            cv.itemconfigure(self.m_bg, state="normal")
        icons = []
        if has_cam and app.selected_id == self.cam_id:
            icons.append("🔇" if (app.audio.muted or app.audio_unavailable) else "🔊")
        rec = app.recordings.get(self.cam_id) if has_cam else None
        if rec:
            icons.append(f"⏺ REC {rec.elapsed}")
        cv.itemconfigure(self.icons, text="   ".join(icons), fill=BAD if rec else FG)
        self._place_icons()
        cv.itemconfigure(self.zoom_txt, text=f"🔍 {self.zoom:.1f}×  (δεξί κλικ: επαναφορά)" if self.zoom > 1.0001 else "")
        cv.itemconfigure(self.clock_txt, text=time.strftime("%d/%m/%Y  %H:%M:%S") if app.cfg.get("show_clock") and has_cam else "")
        cv.itemconfigure(self.clock_shadow, text=cv.itemcget(self.clock_txt, "text"))

        if not self.url:
            cv.itemconfigure(self.dot, state="hidden")
            cv.itemconfigure(self.info_txt, text="")
            return
        st = app.pool.get(self.url)
        if st is None:
            return
        tw, th = max(16, cv.winfo_width() - 4), max(16, cv.winfo_height() - 4)
        if st.target != (tw, th):
            st.target = (tw, th)
        vr = self.view_rect()
        if st.view_rect != vr:
            st.view_rect = vr
        if st.view_id != self.last_id and st.view is not None:
            with st.lock:
                arr = st.view
                self.last_id = st.view_id
            img = Image.fromarray(arr)
            if self.photo is None or self.photo.width() != img.width or self.photo.height() != img.height:
                self.photo = ImageTk.PhotoImage(img)
                cv.itemconfigure(self.img_item, image=self.photo)
            else:
                self.photo.paste(img)
        live = st.last_frame_t and now - st.last_frame_t < 3
        if live:
            cv.itemconfigure(self.status_item, text="")
            cv.itemconfigure(self.dot, fill=OK, state="normal")
        else:
            msg = st.status or "Αναμονή εικόνας…"
            cv.itemconfigure(self.status_item, text=msg, fill=WARN if self.photo else DIM)
            bad = any(k in msg for k in ("Δεν", "Χάθηκε", "Λάθος", "αρνήθηκε"))
            cv.itemconfigure(self.dot, fill=BAD if bad else WARN, state="normal")
        # ανίχνευση κίνησης
        lvl = self.cam.get("motion", "off") if has_cam else "off"
        st.motion_level = lvl
        recent = lvl != "off" and st.motion_t and now - st.motion_t < 3
        if recent:
            flash = int(now * 3) % 2 == 0
            cv.configure(highlightthickness=4, highlightbackground=BAD if flash else "#7a1520")
            cv.itemconfigure(self.alert_txt, fill=BAD,
                             text="⚠ ΚΙΝΗΣΗ " + time.strftime("%H:%M:%S", time.localtime(st.motion_t)))
            self._alert_on = True
        else:
            if self._alert_on:
                self._alert_on = False
                cv.configure(highlightthickness=2)
                self.set_selected(self.cam_id is not None and app.selected_id == self.cam_id)
            if lvl != "off" and st.motion_t and now - st.motion_t < 600:
                cv.itemconfigure(self.alert_txt, fill=DIM,
                                 text="τελευταία κίνηση " + time.strftime("%H:%M:%S", time.localtime(st.motion_t)))
            else:
                cv.itemconfigure(self.alert_txt, text="")
        if self.hover and live:
            res = getattr(st, "resolution", "")
            cv.itemconfigure(self.info_txt, text=f"{res} · {st.fps:.0f} fps · {st.info}")
        else:
            cv.itemconfigure(self.info_txt, text="")
        cv.tag_raise(self.status_item)
        for it in (self.name_shadow, self.name_item, self.icons, self.dot, self.q_bg, self.q_txt, self.zoom_txt,
                   self.m_bg, self.m_txt, self.alert_txt,
                   self.info_txt, self.clock_shadow, self.clock_txt):
            cv.tag_raise(it)
        for o, t in self.ptz_items:
            cv.tag_raise(o)
            cv.tag_raise(t)

    def set_selected(self, sel: bool):
        self.cv.configure(highlightbackground=ACCENT if sel else BG)

    def set_drop_target(self, on: bool):
        self.cv.configure(highlightbackground=WARN if on else (ACCENT if self.app.selected_id == self.cam_id
                                                              and self.cam_id else BG))


# ====================================================================== app

class App:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.cfg = load_config()
        self.audio = AudioOut()
        self.audio.volume = (self.cfg.get("volume", 70) / 100) ** 2
        self.audio.muted = bool(self.cfg.get("muted"))
        self.audio_unavailable = False
        self.pool = StreamPool(self.audio)
        self.tiles: list[Tile] = []
        self.selected_id: str | None = None
        self.single_return: tuple[str, int] | None = None
        self.fullscreen = False
        self.recordings: dict[str, Recorder] = {}
        self.rec_urls: dict[str, str] = {}
        self.zoom_state: dict[str, tuple[float, float, float]] = {}
        self.cycle_on = False
        self.next_cycle = 0.0
        self._drop_tile: Tile | None = None
        self._onvif_cache: dict[str, onvif.OnvifCamera] = {}
        self._ptz_q: queue.Queue = queue.Queue()
        self._ui_q: queue.Queue = queue.Queue()
        threading.Thread(target=self._ptz_worker, daemon=True).start()

        root.title(APP_NAME + (f" {APP_VERSION} · δοκιμαστική έκδοση" if TEST_BUILD else ""))
        root.configure(bg=BG)
        root.minsize(760, 440)
        try:
            root.geometry(self.cfg.get("geometry") or "1280x780")
        except tk.TclError:
            root.geometry("1280x780")
        self.images = {}
        icon = asset("icon-512.png", 64)
        if icon:
            self.images["icon"] = ImageTk.PhotoImage(icon)
            root.iconphoto(True, self.images["icon"])
        for key, name, h in (("eagle_sm", "eagle-white.png", 28), ("eagle_lg", "eagle-white.png", 120),
                             ("wordmark", "veagle-systems-dark.png", 90)):
            img = asset(name, h)
            if img:
                self.images[key] = ImageTk.PhotoImage(img)
        setup_style(root)

        # ---- toolbar
        self.bar = tk.Frame(root, bg=PANEL, height=48)
        self.bar.pack(side="top", fill="x")
        brand = tk.Frame(self.bar, bg=PANEL, cursor="hand2")
        brand.pack(side="left", padx=(12, 14))
        if "eagle_sm" in self.images:
            tk.Label(brand, image=self.images["eagle_sm"], bg=PANEL).pack(side="left", padx=(0, 8))
        tk.Label(brand, text="VEAGLE", fg=FG, bg=PANEL, font=("Segoe UI Black", 12)).pack(side="left")
        tk.Label(brand, text=" " + PRODUCT, fg=ACCENT, bg=PANEL, font=("Segoe UI Semibold", 12)).pack(side="left")
        tk.Label(brand, text=TAGLINE.upper(), fg=DIM, bg=PANEL, font=("Segoe UI", 7)).pack(
            side="left", padx=(6, 0), pady=(7, 0))
        for w in (brand, *brand.winfo_children()):
            w.bind("<Button-1>", lambda e: AboutDialog(self))

        P = 7  # εσωτερικό περιθώριο κουμπιών της γραμμής
        self.layout_btns = {}
        for key, label in (("1x1", "1×1"), ("1x2", "1×2"), ("2x2", "2×2")):
            b = flat_button(self.bar, label, lambda k=key: self.set_layout(k), width=3, padx=P)
            b.pack(side="left", padx=1, pady=8)
            self.layout_btns[key] = b

        tk.Frame(self.bar, bg="#30363d", width=1).pack(side="left", fill="y", padx=8, pady=10)
        flat_button(self.bar, "◀", lambda: self.change_page(-1), width=1, padx=P).pack(side="left", padx=1, pady=8)
        self.page_lbl = tk.Label(self.bar, text="", fg=DIM, bg=PANEL, font=("Segoe UI", 9), width=10)
        self.page_lbl.pack(side="left")
        flat_button(self.bar, "▶", lambda: self.change_page(1), width=1, padx=P).pack(side="left", padx=1, pady=8)
        self.cycle_btn = flat_button(self.bar, "⟳", self.toggle_cycle, width=1, padx=P)
        self.cycle_btn.pack(side="left", padx=(4, 1), pady=8)
        tooltip(self.cycle_btn, lambda: f"Αυτόματη εναλλαγή κάθε {self.cfg.get('cycle_seconds', 10)} δευτ. (C)")

        self.site_lbl = site = tk.Label(self.bar, text="ferelis.gr", fg=DIM, bg=PANEL,
                                        font=("Segoe UI", 9, "underline"), cursor="hand2")
        site.pack(side="right", padx=(4, 12))
        site.bind("<Button-1>", open_site)
        site.bind("<Enter>", lambda e: site.configure(fg=FG))
        site.bind("<Leave>", lambda e: site.configure(fg=DIM))
        for text, cmd, tip in (("ⓘ", lambda: AboutDialog(self), "Σχετικά"),
                               ("⛶", self.toggle_fullscreen, "Πλήρης οθόνη (F11)"),
                               ("📷", self.snapshot, "Στιγμιότυπο επιλεγμένης κάμερας (S)")):
            btn = flat_button(self.bar, text, cmd, width=1, padx=P)
            btn.pack(side="right", padx=1, pady=8)
            tooltip(btn, tip)
        self.rec_btn = flat_button(self.bar, "⏺", self.toggle_record, width=1, padx=P)
        self.rec_btn.pack(side="right", padx=1, pady=8)
        tooltip(self.rec_btn, "Εγγραφή επιλεγμένης κάμερας σε HD (R)")

        self.vol = tk.DoubleVar(value=self.cfg.get("volume", 70))
        vol = ttk.Scale(self.bar, from_=0, to=100, orient="horizontal", length=70, variable=self.vol,
                        command=self._on_volume, style="Vol.Horizontal.TScale")
        vol.pack(side="right", padx=(0, 8), pady=8)
        tooltip(vol, lambda: f"Ένταση {int(self.vol.get())}%")
        self.mute_btn = flat_button(self.bar, "🔊", self.toggle_mute, width=1, padx=P)
        self.mute_btn.pack(side="right", padx=(8, 2), pady=8)
        tooltip(self.mute_btn, "Σίγαση / ήχος (M) — ο ήχος παίζει από την επιλεγμένη κάμερα")
        flat_button(self.bar, "⚙ Κάμερες", self.open_manager, bg=ACCENT, padx=10).pack(side="right", padx=1, pady=8)
        self._update_mute_btn()
        # Το παράθυρο δεν στενεύει τόσο ώστε να κρυφτούν κουμπιά της γραμμής.
        self.bar.update_idletasks()
        root.minsize(self.bar.winfo_reqwidth(), 440)

        # ---- wall
        self.wall = tk.Frame(root, bg=BG)
        self.wall.pack(side="top", fill="both", expand=True, padx=4, pady=4)

        self.toast = tk.Label(root, text="", bg="#30363d", fg=FG, font=("Segoe UI", 10), padx=14, pady=6)
        self._toast_job = None

        # Πλήκτρα με βάση τη φυσική θέση (keycode), ώστε να δουλεύουν και με ελληνικό πληκτρολόγιο.
        root.bind("<Key>", self.on_key)
        root.protocol("WM_DELETE_WINDOW", self.on_close)

        self.build_wall()
        self.probe_ptz_all()
        if self.cfg.get("start_fullscreen"):
            root.after(300, self.toggle_fullscreen)
        self.tick()

    # ---------------------------------------------------------------- keys
    def on_key(self, e):
        if e.widget.winfo_toplevel() is not self.root:
            return
        actions = {
            0x31: lambda: self.set_layout("1x1"), 0x61: lambda: self.set_layout("1x1"),   # 1 / Num1
            0x32: lambda: self.set_layout("1x2"), 0x62: lambda: self.set_layout("1x2"),   # 2 / Num2
            0x34: lambda: self.set_layout("2x2"), 0x64: lambda: self.set_layout("2x2"),   # 4 / Num4
            0x25: lambda: self.change_page(-1), 0x27: lambda: self.change_page(1),       # ← →
            0x7A: self.toggle_fullscreen, 0x46: self.toggle_fullscreen,                  # F11 / F
            0x1B: lambda: self.toggle_fullscreen() if self.fullscreen else None,         # Esc
            0x53: self.snapshot,                                                         # S
            0x52: self.toggle_record,                                                    # R
            0x4D: self.toggle_mute,                                                      # M
            0x43: self.toggle_cycle,                                                     # C
        }
        if sys.platform == "win32":
            fn = actions.get(e.keycode)
        else:
            fn = {"1": actions[0x31], "2": actions[0x32], "4": actions[0x34], "Left": actions[0x25],
                  "Right": actions[0x27], "F11": actions[0x7A], "Escape": actions[0x1B], "s": actions[0x53],
                  "r": actions[0x52], "m": actions[0x4D], "c": actions[0x43]}.get(e.keysym)
        if fn:
            fn()

    # ---------------------------------------------------------------- layout
    @property
    def cams(self) -> list[dict]:
        return self.cfg["cameras"]

    def cam_by_id(self, cid) -> dict | None:
        return next((c for c in self.cams if c.get("id") == cid), None)

    def per_page(self) -> int:
        r, c = LAYOUTS[self.cfg["layout"]]
        return r * c

    def pages(self) -> int:
        return max(1, -(-len(self.cams) // self.per_page()))

    @staticmethod
    def full_url(cam: dict, which: str) -> str:
        return onvif.with_credentials((cam.get(which) or "").strip(), cam.get("user", ""), cam.get("password", ""))

    def url_for(self, cam: dict, layout: str) -> str:
        q = cam.get("quality", "auto")
        use_sub = bool(cam.get("sub")) and (q == "sd" or (q == "auto" and layout != "1x1" and self.cfg.get("use_sub", True)))
        return self.full_url(cam, "sub" if use_sub else "main")

    def build_wall(self):
        for t in self.tiles:
            t.cv.destroy()
        self.tiles = []
        for w in self.wall.winfo_children():
            w.destroy()
        for i in range(3):
            self.wall.grid_rowconfigure(i, weight=0, uniform="")
            self.wall.grid_columnconfigure(i, weight=0, uniform="")

        layout = self.cfg["layout"]
        for k, b in self.layout_btns.items():
            set_button_bg(b, ACCENT if k == layout else PANEL2)
        self.cfg["page"] = min(max(0, self.cfg.get("page", 0)), self.pages() - 1)

        if not self.cams:
            self.pool.want([], self.rec_urls.values())
            box = tk.Frame(self.wall, bg=BG)
            box.place(relx=0.5, rely=0.45, anchor="center")
            if "eagle_lg" in self.images:
                tk.Label(box, image=self.images["eagle_lg"], bg=BG).pack(pady=(0, 18))
            tk.Label(box, text="Δεν υπάρχουν κάμερες ακόμα", fg=FG, bg=BG, font=("Segoe UI Semibold", 16)).pack()
            tk.Label(box, text="Πρόσθεσε τις κάμερες του σπιτιού: αυτόματη αναζήτηση ONVIF ή RTSP διεύθυνση.",
                     fg=DIM, bg=BG, font=("Segoe UI", 10)).pack(pady=(6, 14))
            flat_button(box, "⚙  Προσθήκη καμερών", self.open_manager, bg=ACCENT).pack()
            link = tk.Label(box, text=BRAND, fg=DIM, bg=BG, font=("Segoe UI", 9), cursor="hand2")
            link.pack(pady=(28, 0))
            link.bind("<Button-1>", open_site)
            self.page_lbl.configure(text="")
            return

        rows, cols = LAYOUTS[layout]
        for r in range(rows):
            self.wall.grid_rowconfigure(r, weight=1, uniform="r")
        for c in range(cols):
            self.wall.grid_columnconfigure(c, weight=1, uniform="c")

        start = self.cfg["page"] * self.per_page()
        urls = []
        assignments = []
        for slot in range(rows * cols):
            idx = start + slot
            if idx < len(self.cams):
                cam = self.cams[idx]
                url = self.url_for(cam, layout)
                urls.append(url)
                assignments.append((idx, cam, url))
            else:
                assignments.append((None, None, ""))
        self.pool.want(urls, self.rec_urls.values())
        for slot, (idx, cam, url) in enumerate(assignments):
            t = Tile(self, self.wall, slot)
            t.cv.grid(row=slot // cols, column=slot % cols, sticky="nsew", padx=2, pady=2)
            t.assign(idx, cam, url)
            self.tiles.append(t)
        self.refresh_selection()

        what = "Κάμερα" if layout == "1x1" else "Σελίδα"
        self.page_lbl.configure(text=f"{what} {self.cfg['page'] + 1}/{self.pages()}")

    def refresh_selection(self):
        for t in self.tiles:
            t.set_selected(t.cam_id is not None and t.cam_id == self.selected_id)
        self.apply_audio()

    def set_layout(self, key: str):
        self.single_return = None
        if key == self.cfg["layout"]:
            return
        # κράτα ορατή την επιλεγμένη κάμερα
        sel = next((i for i, c in enumerate(self.cams) if c.get("id") == self.selected_id), None)
        if sel is None:
            sel = self.cfg["page"] * self.per_page()
        self.cfg["layout"] = key
        self.cfg["page"] = sel // self.per_page()
        self.build_wall()
        save_config(self.cfg)

    def change_page(self, d: int, from_cycle=False):
        if not self.cams:
            return
        if not from_cycle:
            self.single_return = None
            self.next_cycle = time.time() + self.cfg.get("cycle_seconds", 10)
        self.cfg["page"] = (self.cfg["page"] + d) % self.pages()
        self.build_wall()

    def toggle_select(self, tile: Tile):
        if tile.cam is None:
            return
        self.selected_id = None if self.selected_id == tile.cam_id else tile.cam_id
        self.refresh_selection()
        if self.selected_id:
            st = self.pool.get(tile.url)
            if st is not None and st.has_audio is False:
                self.show_toast("Αυτή η κάμερα δεν στέλνει ήχο (έλεγξε ότι το μικρόφωνο είναι ενεργό)")

    def apply_audio(self):
        """Ήχος μόνο από την επιλεγμένη κάμερα, από τη ροή που φαίνεται."""
        target = None
        for t in self.tiles:
            if t.cam_id and t.cam_id == self.selected_id:
                target = self.pool.get(t.url)
                break
        for st in self.pool.streams.values():
            st.audio_on = st is target
        if not self.audio.set_source(target):
            if not self.audio_unavailable:
                self.show_toast(self.audio.error or "Ο ήχος δεν είναι διαθέσιμος")
            self.audio_unavailable = True

    def toggle_single(self, tile: Tile):
        if tile.cam_index is None:
            return
        if self.cfg["layout"] == "1x1":
            if self.single_return:
                layout, page = self.single_return
                self.single_return = None
                self.cfg["layout"], self.cfg["page"] = layout, page
                self.build_wall()
            return
        self.single_return = (self.cfg["layout"], self.cfg["page"])
        self.cfg["layout"] = "1x1"
        self.cfg["page"] = tile.cam_index
        self.build_wall()

    def cycle_quality(self, cam: dict):
        q = cam.get("quality", "auto")
        nq = QUALITIES[(QUALITIES.index(q) + 1) % len(QUALITIES)]
        if nq in ("hd", "sd") and not cam.get("sub"):
            nq = "auto"
            self.show_toast("Αυτή η κάμερα έχει μόνο μία ροή (δεν έχει οριστεί SD)")
        cam["quality"] = nq
        save_config(self.cfg)
        self.build_wall()
        self.show_toast({"auto": "AUTO: SD στο πλέγμα, HD στο 1×1", "hd": "Πάντα HD (υψηλή ανάλυση)",
                         "sd": "Πάντα SD (ελαφριά ροή)"}[nq] + f" — {cam.get('name', '')}", 2500)

    def cycle_motion(self, cam: dict):
        m = cam.get("motion", "off")
        nm = MOTION_LEVELS[(MOTION_LEVELS.index(m) + 1) % len(MOTION_LEVELS)] if m in MOTION_LEVELS else "low"
        cam["motion"] = nm
        save_config(self.cfg)
        self.show_toast({"off": "Ανίχνευση κίνησης: κλειστή", "low": "Ανίχνευση κίνησης: χαμηλή ευαισθησία",
                         "med": "Ανίχνευση κίνησης: μεσαία ευαισθησία", "high": "Ανίχνευση κίνησης: υψηλή ευαισθησία"}[nm]
                        + f" — {cam.get('name', '')}", 2500)

    def toggle_fullscreen(self):
        self.fullscreen = not self.fullscreen
        self.root.attributes("-fullscreen", self.fullscreen)
        if self.fullscreen:
            self.bar.pack_forget()
            self.show_toast("Πλήρης οθόνη — Esc για έξοδο · 1 / 2 / 4 διάταξη · ◀ ▶ σελίδα")
        else:
            self.bar.pack(side="top", fill="x", before=self.wall)

    def toggle_cycle(self):
        if not self.cams:
            return
        self.cycle_on = not self.cycle_on
        set_button_bg(self.cycle_btn, ACCENT if self.cycle_on else PANEL2)
        if self.cycle_on:
            self.next_cycle = time.time() + self.cfg.get("cycle_seconds", 10)
            if self.pages() == 1:
                self.show_toast("Όλες οι κάμερες χωράνε σε μία σελίδα — διάλεξε 1×1 ή 1×2 για εναλλαγή")
            else:
                self.show_toast(f"Αυτόματη εναλλαγή κάθε {self.cfg.get('cycle_seconds', 10)} δευτ.")

    # ---------------------------------------------------------------- reorder
    def _tile_at(self, x_root, y_root) -> Tile | None:
        w = self.root.winfo_containing(x_root, y_root)
        return next((t for t in self.tiles if t.cv is w), None)

    def reorder_hover(self, src: Tile, x_root, y_root):
        t = self._tile_at(x_root, y_root)
        t = t if t is not src else None
        if t is not self._drop_tile:
            if self._drop_tile:
                self._drop_tile.set_drop_target(False)
            if t:
                t.set_drop_target(True)
            self._drop_tile = t

    def reorder_drop(self, src: Tile, x_root, y_root):
        if self._drop_tile:
            self._drop_tile.set_drop_target(False)
            self._drop_tile = None
        dst = self._tile_at(x_root, y_root)
        if dst is None or dst is src or src.cam_index is None:
            return
        i = src.cam_index
        j = dst.cam_index if dst.cam_index is not None else len(self.cams) - 1
        c = self.cams
        c[i], c[j] = c[j], c[i]
        save_config(self.cfg)
        self.build_wall()
        self.show_toast("Άλλαξε η σειρά των καμερών", 1800)

    # ---------------------------------------------------------------- volume
    def _on_volume(self, _=None):
        v = float(self.vol.get())
        self.cfg["volume"] = int(v)
        self.audio.volume = (v / 100) ** 2
        if v > 0 and self.audio.muted:
            self.audio.muted = False
            self.cfg["muted"] = False
            self._update_mute_btn()

    def toggle_mute(self):
        self.audio.muted = not self.audio.muted
        self.cfg["muted"] = self.audio.muted
        self._update_mute_btn()

    def _update_mute_btn(self):
        self.mute_btn.configure(text="🔇" if self.audio.muted else "🔊")

    # ---------------------------------------------------------------- PTZ
    def _onvif_for(self, cam) -> onvif.OnvifCamera:
        key = f"{cam.get('address')}|{cam.get('user')}|{cam.get('password')}"
        oc = self._onvif_cache.get(key)
        if oc is None:
            oc = self._onvif_cache[key] = onvif.OnvifCamera(cam["address"], cam.get("user", ""), cam.get("password", ""))
            oc.sync_time()
        return oc

    def probe_ptz_all(self):
        for cam in self.cams:
            if cam.get("address") and "ptz" not in cam:
                self._ptz_q.put(("probe", cam, 0, 0))

    def ptz_start(self, cam, x, y):
        if cam.get("ptz"):
            self._ptz_q.put(("move", cam, x * 0.5, y * 0.5))

    def ptz_stop(self, cam):
        if cam and cam.get("ptz"):
            self._ptz_q.put(("stop", cam, 0, 0))

    def _ptz_worker(self):
        while True:
            op, cam, x, y = self._ptz_q.get()
            try:
                if op == "probe":
                    info = self._onvif_for(cam).ptz_info()
                    self._ui_q.put(("ptz_info", cam, info or False))
                    continue
                info = cam["ptz"]
                oc = self._onvif_for(cam)
                if op == "move":
                    oc.ptz_move(info["xaddr"], info["token"], x, y)
                else:
                    oc.ptz_stop(info["xaddr"], info["token"])
            except Exception as e:  # noqa: BLE001
                if op != "probe":
                    self._ui_q.put(("toast", None, f"PTZ: {e}"))

    # ---------------------------------------------------------------- loop
    def tick(self):
        now = time.time()
        while True:
            try:
                kind, cam, val = self._ui_q.get_nowait()
            except queue.Empty:
                break
            if kind == "toast":
                self.show_toast(val)
            elif kind == "ptz_info" and cam in self.cams:
                cam["ptz"] = val
                save_config(self.cfg)
        for t in self.tiles:
            t.refresh(now)
        # εγγραφές
        for cid, rec in list(self.recordings.items()):
            if rec.error and rec.closed:
                self.show_toast(f"Η εγγραφή σταμάτησε: {rec.error}")
                self.stop_record(cid)
        # το κουμπί κοκκινίζει όσο γράφει κάποια κάμερα (ο χρόνος φαίνεται πάνω στο πλαίσιο)
        recording = bool(self.recordings)
        if recording != getattr(self, "_rec_state", None):
            self._rec_state = recording
            set_button_bg(self.rec_btn, ACCENT if recording else PANEL2)
        if self.cycle_on and now >= self.next_cycle:
            self.next_cycle = now + self.cfg.get("cycle_seconds", 10)
            if self.pages() > 1:
                self.change_page(1, from_cycle=True)
        self.pool.reap()
        self.root.after(30, self.tick)

    def show_toast(self, text: str, ms=3500):
        self.toast.configure(text=text)
        self.toast.place(relx=0.5, rely=1.0, y=-24, anchor="s")
        self.toast.lift()
        if self._toast_job:
            self.root.after_cancel(self._toast_job)
        self._toast_job = self.root.after(ms, self.toast.place_forget)

    # ---------------------------------------------------------------- actions
    def _target_cam(self) -> dict | None:
        cam = self.cam_by_id(self.selected_id) if self.selected_id else None
        if cam is None and len(self.tiles) == 1:
            cam = self.tiles[0].cam
        if cam is None:
            self.show_toast("Κάνε πρώτα κλικ σε μια κάμερα για να την επιλέξεις")
        return cam

    def snapshot(self):
        cam = self._target_cam()
        if cam is None:
            return
        img = None
        for url in (self.full_url(cam, "main"), *(t.url for t in self.tiles if t.cam is cam)):
            st = self.pool.get(url)
            if st is not None and st.last_frame is not None:
                img = st.snapshot_image()
                break
        if img is None:
            self.show_toast("Δεν υπάρχει ακόμα εικόνα από αυτή την κάμερα")
            return
        name = f"{safe_name(cam.get('name'))}_{time.strftime('%Y-%m-%d_%H-%M-%S')}.jpg"
        try:
            os.makedirs(SNAP_DIR, exist_ok=True)
            img.save(os.path.join(SNAP_DIR, name), quality=92)
            self.show_toast(f"Αποθηκεύτηκε: snapshots\\{name}")
        except OSError as e:
            self.show_toast(f"Αποτυχία αποθήκευσης: {e}")

    def toggle_record(self):
        cam = self._target_cam()
        if cam is None:
            return
        cid = cam["id"]
        if cid in self.recordings:
            self.stop_record(cid)
            return
        url = self.full_url(cam, "main")
        if not url:
            return
        rec = Recorder(cam.get("name", "cam"))
        self.recordings[cid] = rec
        self.rec_urls[cid] = url
        self.pool.want([t.url for t in self.tiles], self.rec_urls.values())
        st = self.pool.get(url)
        st.recorder = rec
        self.show_toast(f"⏺ Εγγραφή σε HD: {cam.get('name')} → recordings\\")

    def stop_record(self, cid):
        rec = self.recordings.pop(cid, None)
        url = self.rec_urls.pop(cid, None)
        if rec is None:
            return
        st = self.pool.get(url) if url else None
        if st is not None and st.recorder is rec:
            st.recorder = None
        threading.Thread(target=rec.close, daemon=True).start()
        self.pool.want([t.url for t in self.tiles], self.rec_urls.values())
        if rec.files:
            self.show_toast(f"Η εγγραφή σταμάτησε ({rec.elapsed}) — recordings\\{os.path.basename(rec.files[-1])}")

    def stop_all_records(self):
        for cid in list(self.recordings):
            self.stop_record(cid)

    def open_manager(self):
        ManagerDialog(self)

    def cameras_changed(self):
        err = save_config(self.cfg)
        if err:
            messagebox.showwarning(APP_NAME, f"Δεν αποθηκεύτηκαν οι ρυθμίσεις:\n{err}", parent=self.root)
        if self.selected_id and not self.cam_by_id(self.selected_id):
            self.selected_id = None
        self.stop_all_records()
        self.pool.close()  # νέες διευθύνσεις/κωδικοί → καθαρή επανασύνδεση
        self.build_wall()
        self.probe_ptz_all()

    def on_close(self):
        if not self.fullscreen:
            self.cfg["geometry"] = self.root.geometry()
        save_config(self.cfg)
        recs = list(self.recordings.values())
        self.recordings.clear()
        for r in recs:
            r.close()
        self.audio.close()
        self.pool.close()
        self.root.destroy()


# ====================================================================== dialogs

class Dialog(tk.Toplevel):
    def __init__(self, parent, title):
        super().__init__(parent)
        self.withdraw()
        self.title(title)
        self.configure(bg=PANEL)
        self.transient(parent)
        self.resizable(False, False)
        self.body = ttk.Frame(self, padding=18)
        self.body.pack(fill="both", expand=True)
        self.bind("<Escape>", lambda e: self.destroy())

    def show(self, parent):
        center_on(self, parent)
        self.deiconify()
        self.grab_set()
        self.focus_set()


ABOUT_BG = "#141414"

MYTH_TEXT = (
    "«Ο Άργος Πανόπτης αποτελεί μία από τις πιο εμβληματικές μορφές της αρχαίας ελληνικής μυθολογίας. "
    "Γνωστός ως ο γίγαντας με τα εκατό μάτια, ο Άργος προσωποποιεί την απόλυτη εγρήγορση, την αδιάκοπη "
    "επιτήρηση και την πανταχού παρούσα γνώση. Το προσωνύμιό του, Πανόπτης (αυτός που βλέπει τα πάντα), "
    "δεν είναι απλώς περιγραφικό· είναι ο πυρήνας της μυθικής του ταυτότητας.»"
)

DISCLAIMER_TEXT = (
    "Το Veagle Argos παρέχεται «ως έχει», δωρεάν και χωρίς καμία εγγύηση λειτουργίας, διαθεσιμότητας "
    "ή καταλληλότητας για συγκεκριμένο σκοπό. Ο δημιουργός δεν ευθύνεται για οποιαδήποτε ζημία, απώλεια "
    "δεδομένων ή εικόνας, ή για γεγονότα που δεν καταγράφηκαν.\n\n"
    "Είναι εργαλείο προβολής για προσωπική, οικιακή χρήση. Δεν αντικαθιστά επαγγελματικό σύστημα "
    "ασφαλείας ή συναγερμού.\n\n"
    "Ο χρήστης είναι αποκλειστικά υπεύθυνος για τη νόμιμη χρήση των καμερών και των εγγραφών, και για τον "
    "σεβασμό της ιδιωτικότητας τρίτων (ΓΚΠΔ / GDPR): όχι λήψη δημόσιων χώρων, γειτόνων ή προσώπων χωρίς "
    "ενημέρωση, και κατάλληλη ειδοποίηση όπου απαιτείται.\n\n"
    "Δεν στέλνονται δεδομένα στο διαδίκτυο. Οι ρυθμίσεις και οι κωδικοί των καμερών αποθηκεύονται μόνο "
    "τοπικά, στο αρχείο argos_config.json δίπλα στο πρόγραμμα, σε απλό κείμενο: φύλαξε το στικάκι.\n\n"
    "Τα ONVIF, TP-Link και Tapo είναι εμπορικά σήματα των κατόχων τους. Το κείμενο για τον Άργο Πανόπτη "
    "παρατίθεται με αναφορά στην πηγή του (mythoi.org)."
)


class AboutDialog(Dialog):
    def __init__(self, app: App):
        super().__init__(app.root, f"Σχετικά με το {APP_NAME}")
        self.app = app
        self.configure(bg=ABOUT_BG)
        self.body.destroy()
        b = tk.Frame(self, bg=ABOUT_BG, padx=30, pady=22)
        b.pack(fill="both", expand=True)
        if "wordmark" in app.images:
            tk.Label(b, image=app.images["wordmark"], bg=ABOUT_BG).pack()
        tk.Label(b, text=PRODUCT, fg=FG, bg=ABOUT_BG, font=("Segoe UI Semibold", 20)).pack(pady=(10, 0))
        tk.Label(b, text=f"{TAGLINE.upper()}  ·  v{APP_VERSION}", fg=DIM, bg=ABOUT_BG,
                 font=("Segoe UI", 8)).pack(pady=(0, 10))

        tabs = tk.Frame(b, bg=ABOUT_BG)
        tabs.pack(pady=(0, 10))
        self.page = tk.Frame(b, bg=ABOUT_BG, width=540, height=300)
        self.page.pack(fill="both")
        self.page.pack_propagate(False)
        self.tab_btns = {}
        for key, label in (("about", "Το πρόγραμμα"), ("myth", "Ο Άργος Πανόπτης"), ("terms", "Όροι χρήσης")):
            btn = flat_button(tabs, label, lambda k=key: self.show_tab(k))
            btn.pack(side="left", padx=3)
            self.tab_btns[key] = btn

        link = tk.Label(b, text=BRAND, fg=ACCENT, bg=ABOUT_BG, font=("Segoe UI Semibold", 11, "underline"),
                        cursor="hand2")
        link.pack(pady=(12, 0))
        link.bind("<Button-1>", open_site)
        tk.Label(b, text="built with Claude", fg="#6e7681", bg=ABOUT_BG, font=("Segoe UI", 8)).pack(pady=(4, 14))
        flat_button(b, "Κλείσιμο", self.destroy).pack()
        self.show_tab("about")
        self.show(app.root)

    def _text(self, text, **kw):
        opts = dict(fg=DIM, bg=ABOUT_BG, font=("Segoe UI", 10), justify="left", wraplength=530, anchor="w")
        opts.update(kw)
        lbl = tk.Label(self.page, text=text, **opts)
        lbl.pack(fill="x", pady=(0, 8))
        return lbl

    def show_tab(self, key):
        for k, b in self.tab_btns.items():
            set_button_bg(b, ACCENT if k == key else PANEL2)
        for w in self.page.winfo_children():
            w.destroy()
        if key == "about":
            self._text("Φορητό πρόγραμμα προβολής καμερών ONVIF / RTSP για το σπίτι. Χωρίς εγκατάσταση, "
                       "χωρίς cloud: όλα μένουν στο τοπικό δίκτυο.", fg=FG)
            self._text(
                "1 / 2 / 4   διάταξη 1×1 · 1×2 · 2×2          ← →   σελίδα ή κάμερα\n"
                "κλικ   επιλογή κάμερας + ήχος (ξανά κλικ: αποεπιλογή)\n"
                "διπλό κλικ   μεγέθυνση σε 1×1 και πίσω\n"
                "ροδέλα   ζουμ · σύρσιμο   μετακίνηση εικόνας · δεξί κλικ   επαναφορά\n"
                "σύρσιμο χωρίς ζουμ   αλλαγή σειράς καμερών\n"
                "AUTO / HD / SD   ποιότητα ανά κάμερα (πάνω δεξιά σε κάθε πλαίσιο)\n"
                "βελάκια στο πλαίσιο   περιστροφή κάμερας (PTZ)\n"
                "S στιγμιότυπο · R εγγραφή · M σίγαση · C εναλλαγή · F11 πλήρης οθόνη",
                font=("Segoe UI", 9))
            row = tk.Frame(self.page, bg=ABOUT_BG)
            row.pack(anchor="w", pady=(4, 0))
            flat_button(row, "📁  Στιγμιότυπα", lambda: open_folder(SNAP_DIR)).pack(side="left", padx=(0, 6))
            flat_button(row, "📁  Εγγραφές", lambda: open_folder(REC_DIR)).pack(side="left")
        elif key == "myth":
            self._text(MYTH_TEXT, fg=FG, font=("Georgia", 11, "italic"))
            src = tk.Label(self.page, text="Πηγή: mythoi.org — Άργος Πανόπτης", fg=ACCENT, bg=ABOUT_BG,
                           font=("Segoe UI", 9, "underline"), cursor="hand2", anchor="e")
            src.pack(fill="x")
            src.bind("<Button-1>", lambda e: open_url(MYTH_URL))
            self._text("\nΓι' αυτό το όνομα: ένα πρόγραμμα που βλέπει από πολλά μάτια μαζί, χωρίς να κοιμάται.",
                       font=("Segoe UI", 9))
        else:
            txt = tk.Text(self.page, bg=ABOUT_BG, fg=DIM, font=("Segoe UI", 9), wrap="word", relief="flat",
                          highlightthickness=0, bd=0, height=14, padx=2)
            sb = ttk.Scrollbar(self.page, orient="vertical", command=txt.yview)
            txt.configure(yscrollcommand=sb.set)
            txt.insert("1.0", DISCLAIMER_TEXT)
            txt.configure(state="disabled")
            sb.pack(side="right", fill="y")
            txt.pack(side="left", fill="both", expand=True)


class ManagerDialog(Dialog):
    def __init__(self, app: App):
        super().__init__(app.root, "Κάμερες")
        self.app = app
        b = self.body
        ttk.Label(b, text="Οι κάμερές μου", font=("Segoe UI Semibold", 13)).grid(row=0, column=0, sticky="w")
        ttk.Label(b, text="Η σειρά εδώ είναι η σειρά στο πλέγμα (ή σύρε τα πλαίσια). Διπλό κλικ για επεξεργασία.",
                  style="Dim.TLabel").grid(row=1, column=0, columnspan=2, sticky="w", pady=(2, 10))

        self.tree = ttk.Treeview(b, columns=("name", "addr", "streams", "ptz"), show="headings", height=8,
                                 selectmode="browse")
        for col, txt, w in (("name", "Όνομα", 160), ("addr", "Διεύθυνση", 210), ("streams", "Ροές", 90),
                            ("ptz", "PTZ", 50)):
            self.tree.heading(col, text=txt)
            self.tree.column(col, width=w)
        self.tree.grid(row=2, column=0, sticky="nsew")
        self.tree.bind("<Double-1>", lambda e: self.edit())

        side = ttk.Frame(b)
        side.grid(row=2, column=1, sticky="n", padx=(12, 0))
        for text, cmd, bg in (
            ("🔍  Αναζήτηση στο δίκτυο", self.discover, ACCENT),
            ("＋  Προσθήκη χειροκίνητα", self.add, PANEL2),
            ("✎  Επεξεργασία", self.edit, PANEL2),
            ("▲  Πάνω", lambda: self.move(-1), PANEL2),
            ("▼  Κάτω", lambda: self.move(1), PANEL2),
            ("✕  Διαγραφή", self.delete, PANEL2),
        ):
            flat_button(side, text, cmd, bg=bg).pack(fill="x", pady=2)

        opts = ttk.Frame(b)
        opts.grid(row=3, column=0, columnspan=2, sticky="w", pady=(12, 0))
        self.use_sub = tk.BooleanVar(value=app.cfg.get("use_sub", True))
        self.show_clock = tk.BooleanVar(value=app.cfg.get("show_clock", False))
        self.start_fs = tk.BooleanVar(value=app.cfg.get("start_fullscreen", False))
        self.cycle = tk.StringVar(value=str(app.cfg.get("cycle_seconds", 10)))
        ttk.Checkbutton(opts, text="AUTO: ελαφριά ροή (SD) στο πλέγμα, HD μόνο στο 1×1",
                        variable=self.use_sub, command=self.save_opts).grid(row=0, column=0, columnspan=3, sticky="w")
        ttk.Checkbutton(opts, text="Ώρα και ημερομηνία πάνω σε κάθε κάμερα",
                        variable=self.show_clock, command=self.save_opts).grid(row=1, column=0, columnspan=3, sticky="w")
        ttk.Checkbutton(opts, text="Άνοιγμα κατευθείαν σε πλήρη οθόνη",
                        variable=self.start_fs, command=self.save_opts).grid(row=2, column=0, columnspan=3, sticky="w")
        ttk.Label(opts, text="Αυτόματη εναλλαγή κάθε").grid(row=3, column=0, sticky="w", pady=(6, 0))
        sp = ttk.Spinbox(opts, from_=3, to=300, width=5, textvariable=self.cycle, command=self.save_opts)
        sp.grid(row=3, column=1, sticky="w", padx=6, pady=(6, 0))
        sp.bind("<FocusOut>", lambda e: self.save_opts())
        ttk.Label(opts, text="δευτερόλεπτα").grid(row=3, column=2, sticky="w", pady=(6, 0))

        ttk.Label(b, text=f"Ρυθμίσεις: {CONFIG_PATH}", style="Dim.TLabel", font=("Segoe UI", 8)).grid(
            row=4, column=0, columnspan=2, sticky="w", pady=(10, 0))
        flat_button(b, "Κλείσιμο", self.close).grid(row=5, column=1, sticky="e", pady=(12, 0))
        self.protocol("WM_DELETE_WINDOW", self.close)
        self.fill()
        self.show(app.root)

    def close(self):
        self.save_opts()
        self.destroy()

    def fill(self, select: int | None = None):
        self.tree.delete(*self.tree.get_children())
        for i, c in enumerate(self.app.cams):
            streams = ("HD" if c.get("main") else "—") + (" + SD" if c.get("sub") else "")
            ptz = "✓" if c.get("ptz") else ("…" if c.get("address") and "ptz" not in c else "")
            self.tree.insert("", "end", iid=str(i), values=(c.get("name", ""), c.get("address", "") or
                             onvif.mask(c.get("main", "")), streams, ptz))
        if select is not None and 0 <= select < len(self.app.cams):
            self.tree.selection_set(str(select))
            self.tree.see(str(select))

    def current(self) -> int | None:
        sel = self.tree.selection()
        return int(sel[0]) if sel else None

    def save(self, select=None):
        self.app.cameras_changed()
        self.fill(select)

    def save_opts(self):
        cfg = self.app.cfg
        try:
            cyc = max(3, min(300, int(self.cycle.get())))
        except ValueError:
            cyc = cfg.get("cycle_seconds", 10)
        changed_sub = cfg.get("use_sub", True) != self.use_sub.get()
        cfg.update(use_sub=self.use_sub.get(), show_clock=self.show_clock.get(),
                   start_fullscreen=self.start_fs.get(), cycle_seconds=cyc)
        save_config(cfg)
        if changed_sub:
            self.app.build_wall()

    def add(self, preset: dict | None = None):
        def done(cam):
            cam.setdefault("id", uuid.uuid4().hex[:8])
            self.app.cams.append(cam)
            self.save(len(self.app.cams) - 1)
        CameraDialog(self, preset or {"name": f"Κάμερα {len(self.app.cams) + 1}"}, done)

    def edit(self):
        i = self.current()
        if i is None:
            return

        def done(cam):
            self.app.cams[i] = cam
            self.save(i)
        CameraDialog(self, dict(self.app.cams[i]), done)

    def move(self, d):
        i = self.current()
        if i is None:
            return
        j = i + d
        if 0 <= j < len(self.app.cams):
            c = self.app.cams
            c[i], c[j] = c[j], c[i]
            self.save(j)

    def delete(self):
        i = self.current()
        if i is None:
            return
        name = self.app.cams[i].get("name", "")
        if messagebox.askyesno("Διαγραφή", f"Να αφαιρεθεί η κάμερα «{name}»;", parent=self):
            del self.app.cams[i]
            self.save(min(i, len(self.app.cams) - 1))

    def discover(self):
        DiscoverDialog(self)


class DiscoverDialog(Dialog):
    def __init__(self, mgr: ManagerDialog):
        super().__init__(mgr, "Αναζήτηση ONVIF")
        self.mgr = mgr
        b = self.body
        ttk.Label(b, text="Κάμερες στο δίκτυο", font=("Segoe UI Semibold", 13)).grid(row=0, column=0, sticky="w")
        self.status = ttk.Label(b, text="", style="Dim.TLabel", wraplength=560)
        self.status.grid(row=1, column=0, columnspan=2, sticky="w", pady=(2, 10))
        self.tree = ttk.Treeview(b, columns=("ip", "name", "model", "have"), show="headings", height=8,
                                 selectmode="browse")
        for col, txt, w in (("ip", "IP", 120), ("name", "Όνομα", 160), ("model", "Μοντέλο", 160), ("have", "", 90)):
            self.tree.heading(col, text=txt)
            self.tree.column(col, width=w)
        self.tree.grid(row=2, column=0, columnspan=2, sticky="nsew")
        self.tree.bind("<Double-1>", lambda e: self.pick())
        row = ttk.Frame(b)
        row.grid(row=3, column=0, columnspan=2, sticky="e", pady=(12, 0))
        flat_button(row, "↻  Ξανά", self.scan).pack(side="left", padx=4)
        flat_button(row, "＋  Προσθήκη επιλεγμένης", self.pick, bg=ACCENT).pack(side="left", padx=4)
        flat_button(row, "Κλείσιμο", self.destroy).pack(side="left", padx=4)
        self.found: list[dict] = []
        self.show(mgr)
        self.scan()

    def scan(self):
        self.status.configure(text="Αναζήτηση… (3 δευτερόλεπτα)")
        self.tree.delete(*self.tree.get_children())
        run_bg(self, lambda: onvif.discover(3.0), self._done)

    def _done(self, res, err):
        if err:
            self.status.configure(text=f"Σφάλμα: {err}")
            return
        self.found = res or []
        import urllib.parse
        have = set()
        for c in self.mgr.app.cams:
            for key in ("address", "main"):
                v = c.get(key, "")
                if v:
                    have.add(urllib.parse.urlparse(v if "://" in v else "http://" + v).hostname)
        for i, d in enumerate(self.found):
            self.tree.insert("", "end", iid=str(i),
                             values=(d["host"], d["name"], d["model"], "✓ υπάρχει" if d["host"] in have else ""))
        if self.found:
            self.status.configure(text=f"Βρέθηκαν {len(self.found)}. Διάλεξε μία και πάτα «Προσθήκη».")
        else:
            self.status.configure(text="Δεν βρέθηκε καμία. Έλεγξε ότι είσαι στο ίδιο δίκτυο, ότι το ONVIF είναι "
                                       "ενεργό στην κάμερα και ότι το Windows Firewall επιτρέπει το πρόγραμμα. "
                                       "Μπορείς και χειροκίνητα με την IP.")

    def pick(self):
        sel = self.tree.selection()
        if not sel:
            return
        d = self.found[int(sel[0])]
        preset = {"name": d["name"] or f"Κάμερα {len(self.mgr.app.cams) + 1}", "address": d["xaddr"]}
        self.destroy()
        self.mgr.add(preset)


class CameraDialog(Dialog):
    def __init__(self, parent, cam: dict, on_save):
        super().__init__(parent, "Κάμερα")
        self.on_save = on_save
        self.cam = cam
        self.orig = {k: cam.get(k, "") for k in ("address", "user", "password")}
        b = self.body
        self.vars = {}
        rows = (
            ("name", "Όνομα", ""),
            ("address", "IP ή ONVIF διεύθυνση", "π.χ. 192.168.1.50 ή 192.168.1.50:2020 (Tapo)"),
            ("user", "Χρήστης", ""),
            ("password", "Κωδικός", ""),
            ("main", "RTSP κύρια ροή (HD)", ""),
            ("sub", "RTSP δευτερεύουσα (SD)", "προαιρετικό, για το πλέγμα"),
        )
        r = 0
        for key, label, hint in rows:
            ttk.Label(b, text=label).grid(row=r, column=0, sticky="w", pady=4, padx=(0, 12))
            v = tk.StringVar(value=cam.get(key, ""))
            e = ttk.Entry(b, textvariable=v, width=52, show="•" if key == "password" else "")
            e.grid(row=r, column=1, sticky="we", pady=4)
            self.vars[key] = v
            if key == "name":
                e.focus_set()
            if hint:
                r += 1
                ttk.Label(b, text=hint, style="Dim.TLabel", font=("Segoe UI", 8)).grid(row=r, column=1, sticky="w")
            r += 1
            if key == "password":
                row = ttk.Frame(b)
                row.grid(row=r, column=1, sticky="w", pady=(6, 10))
                flat_button(row, "⟳  Ανάκτηση ροών μέσω ONVIF", self.fetch, bg=ACCENT).pack(side="left")
                r += 1

        self.status = ttk.Label(b, text="Συμπλήρωσε IP, χρήστη, κωδικό και πάτα «Ανάκτηση», ή γράψε απευθείας RTSP.",
                                style="Dim.TLabel", wraplength=520, justify="left")
        self.status.grid(row=r, column=0, columnspan=2, sticky="w", pady=(10, 0))
        r += 1
        row = ttk.Frame(b)
        row.grid(row=r, column=0, columnspan=2, sticky="e", pady=(14, 0))
        flat_button(row, "▶  Δοκιμή", self.test).pack(side="left", padx=4)
        flat_button(row, "Αποθήκευση", self.save, bg=ACCENT).pack(side="left", padx=4)
        flat_button(row, "Άκυρο", self.destroy).pack(side="left", padx=4)
        self.bind("<Return>", lambda e: self.save())
        self.show(parent)

    def data(self) -> dict:
        d = dict(self.cam)
        for k, v in self.vars.items():
            d[k] = v.get().strip() if k != "password" else v.get()
        return d

    def say(self, text, color=DIM):
        self.status.configure(text=text, foreground=color)

    def fetch(self):
        d = self.data()
        if not d["address"]:
            self.say("Γράψε πρώτα την IP της κάμερας.", WARN)
            return
        self.say("Επικοινωνία με την κάμερα…")

        def job():
            cam = onvif.OnvifCamera(d["address"], d["user"], d["password"])
            main, sub, profs = cam.get_streams()
            info = cam.info()
            try:
                ptz = cam.ptz_info()
            except Exception:
                ptz = None
            return main, sub, profs, info, ptz

        def done(res, err):
            if err:
                self.say(f"ONVIF: {err}", BAD)
                return
            main, sub, profs, info, ptz = res
            self.vars["main"].set(main)
            self.vars["sub"].set(sub)
            self.cam["ptz"] = ptz or False
            self.orig = {k: self.vars[k].get() for k in ("address", "user", "password")}
            desc = ", ".join(f"{p['name']} {p['width']}x{p['height']}" for p in profs[:4])
            model = " ".join(x for x in (info.get("manufacturer"), info.get("model")) if x)
            extra = " · PTZ ✓" if ptz else ""
            self.say(f"✓ {model + ' · ' if model else ''}{len(profs)} προφίλ: {desc}{extra}", OK)

        run_bg(self, job, done)

    def test(self):
        d = self.data()
        url = onvif.with_credentials(d["main"] or d["sub"], d["user"], d["password"])
        if not url:
            self.say("Δεν υπάρχει RTSP διεύθυνση για δοκιμή.", WARN)
            return
        self.say("Άνοιγμα ροής…")

        def job():
            opts = {"rtsp_transport": "tcp"} if "://" in url else {}
            try:
                c = av.open(url, options=opts, timeout=(8.0, 8.0))
            except Exception as e:  # noqa: BLE001
                raise RuntimeError(friendly_error(e))
            try:
                if not c.streams.video:
                    raise RuntimeError("Η ροή δεν έχει εικόνα")
                vs = c.streams.video[0]
                audio = c.streams.audio[0].codec_context.name if c.streams.audio else ""
                for f in c.decode(vs):
                    return f.width, f.height, vs.codec_context.name, audio
                raise RuntimeError("Άνοιξε αλλά δεν ήρθε εικόνα")
            finally:
                c.close()

        def done(res, err):
            if err:
                self.say(f"✕ {err}", BAD)
            else:
                w, h, vc, ac = res
                self.say(f"✓ Λειτουργεί — {w}x{h} {vc.upper()} · " + (f"ήχος {ac}" if ac else "χωρίς ήχο"), OK)

        run_bg(self, job, done)

    def save(self):
        d = self.data()
        if not d["name"]:
            d["name"] = "Κάμερα"
        if not d["main"] and not d["sub"]:
            self.say("Χρειάζεται τουλάχιστον μία RTSP διεύθυνση (ή πάτα «Ανάκτηση ροών»).", WARN)
            return
        if not d["main"]:
            d["main"], d["sub"] = d["sub"], ""
        for k in ("main", "sub"):
            if d[k] and not d[k].lower().startswith(("rtsp://", "rtsps://", "http://", "https://")):
                self.say("Η διεύθυνση ροής πρέπει να ξεκινά με rtsp://", WARN)
                return
        if any(d.get(k, "") != self.orig.get(k, "") for k in ("address", "user", "password")):
            d.pop("ptz", None)   # νέα στοιχεία → ξαναέλεγξε για PTZ
        d.setdefault("quality", "auto")
        self.destroy()
        self.on_save(d)


# ====================================================================== main

def main():
    if sys.platform == "win32":
        try:
            import ctypes
            ctypes.windll.shcore.SetProcessDpiAwareness(1)
        except Exception:
            pass
        try:
            import ctypes
            ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID("Veagle.Argos")
        except Exception:
            pass
    try:
        av.logging.set_level(av.logging.PANIC)
    except Exception:
        pass
    root = tk.Tk()
    App(root)
    root.mainloop()


if __name__ == "__main__":
    main()
