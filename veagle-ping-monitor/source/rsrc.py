#!/usr/bin/env python3
"""Φτιάχνει το rsrc_windows_amd64.syso (εικονίδιο και «Ιδιότητες» του .exe). Θέλει Pillow."""
import io, re, struct
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
VERSION = re.search(r"Έκδοση (\d{4}) (\d{4})", (HERE / "web/index.html").read_text(encoding="utf-8")).groups()
TEXT = " ".join(VERSION)


def pad(b):
    return b + b"\0" * (-len(b) % 4)


def block(key, value=b"", children=(), text=False):
    head = (key + "\0").encode("utf-16le")
    body = pad(b"\0" * 6 + head) + value
    for c in children:
        body = pad(body) + c
    vlen = len(value) // 2 if text else len(value)
    return struct.pack("<HHH", len(body), vlen, int(text)) + body[6:]


def version_info():
    a, b = int(VERSION[0]), int(VERSION[1])
    fixed = struct.pack("<13I", 0xFEEF04BD, 0x10000, a << 16 | b, 0, a << 16 | b, 0, 0x3F, 0, 0x40004, 1, 0, 0, 0)
    fields = {"CompanyName": "VEAGLE - ferelis.gr", "FileDescription": "VEAGLE Ping Monitor", "FileVersion": TEXT,
              "InternalName": "VeaglePingMonitor", "LegalCopyright": "VEAGLE - ferelis.gr",
              "OriginalFilename": "VeaglePingMonitor.exe", "ProductName": "VEAGLE Ping Monitor", "ProductVersion": TEXT}
    strings = [block(k, (v + "\0").encode("utf-16le"), text=True) for k, v in fields.items()]
    return block("VS_VERSION_INFO", fixed, [
        block("StringFileInfo", children=[block("040904B0", children=strings, text=True)], text=True),
        block("VarFileInfo", children=[block("Translation", struct.pack("<HH", 0x409, 0x4B0))], text=True)])


def resources():
    icon = Image.open(HERE / "web/icon.png").convert("RGBA")
    images, group = [], struct.pack("<HHH", 0, 1, 5)
    for i, n in enumerate((16, 32, 48, 64, 256), 1):
        buf = io.BytesIO()
        icon.resize((n, n), Image.LANCZOS).save(buf, "PNG")
        data = buf.getvalue()
        images.append((i, data))
        group += struct.pack("<BBBBHHIH", n % 256, n % 256, 0, 0, 1, 32, len(data), i)
    return {3: images, 14: [(1, group)], 16: [(1, version_info())]}


def build():
    res = resources()
    items = [(t, i, d) for t in sorted(res) for i, d in res[t]]
    dir_size = lambda n: 16 + 8 * n
    type_off = dir_size(len(res))
    lang_off = type_off + sum(dir_size(len(v)) for v in res.values())
    entry_off = lang_off + len(items) * dir_size(1)
    data_off = entry_off + len(items) * 16
    head = lambda n: struct.pack("<IIHHHH", 0, 0, 0, 0, 0, n)
    root, types, langs, entries, blob, relocs = head(len(res)), b"", b"", b"", b"", []
    t_pos, k = type_off, 0
    for t in sorted(res):
        root += struct.pack("<II", t, 0x80000000 | t_pos)
        types += head(len(res[t]))
        for i, data in res[t]:
            types += struct.pack("<II", i, 0x80000000 | (lang_off + k * dir_size(1)))
            langs += head(1) + struct.pack("<II", 0x409, entry_off + k * 16)
            relocs.append(entry_off + k * 16)
            entries += struct.pack("<IIII", data_off + len(blob), len(data), 0, 0)
            blob += data + b"\0" * (-len(data) % 8)
            k += 1
        t_pos += dir_size(len(res[t]))
    section = root + types + langs + entries + blob
    raw_at = 20 + 40
    reloc_at = raw_at + len(section)
    sym_at = reloc_at + 10 * len(relocs)
    out = struct.pack("<HHIIIHH", 0x8664, 1, 0, sym_at, 1, 0, 0)
    out += struct.pack("<8sIIIIIIHHI", b".rsrc", 0, 0, len(section), raw_at, reloc_at, 0, len(relocs), 0, 0x40000040)
    out += section + b"".join(struct.pack("<IIH", r, 0, 3) for r in relocs)
    out += struct.pack("<8sIhHBB", b".rsrc", 0, 1, 0, 3, 0) + struct.pack("<I", 4)
    (HERE / "rsrc_windows_amd64.syso").write_bytes(out)


build()
