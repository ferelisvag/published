#!/usr/bin/env python3
"""Builds app/template.html from the sources in src/ (fonts and logo are embedded, so the report works offline)."""
import base64, pathlib

root = pathlib.Path(__file__).parent
src = root / 'src'
fonts = root / 'fonts'


def b64(p):
    return base64.b64encode(pathlib.Path(p).read_bytes()).decode('ascii')


logo = 'data:image/png;base64,' + b64(src / 'eagle-white.png')
css_fonts = (
    "@font-face{font-family:'Play';font-weight:400;font-style:normal;src:url(data:font/woff;base64,%s) format('woff');}\n"
    "@font-face{font-family:'Play';font-weight:700;font-style:normal;src:url(data:font/woff;base64,%s) format('woff');}\n"
    "@font-face{font-family:'Fira Code';font-weight:300 700;font-style:normal;src:url(data:font/woff;base64,%s) format('woff');}\n"
) % (b64(fonts / 'Play-Regular.woff'), b64(fonts / 'Play-Bold.woff'), b64(fonts / 'FiraCode.woff'))

css = (src / 'style.css').read_text(encoding='utf-8')
body = (src / 'body.html').read_text(encoding='utf-8').replace('%%LOGO%%', logo)
js = '\n'.join((src / n).read_text(encoding='utf-8') for n in ('core.js', 'i18n.js', 'viz.js', 'render.js', 'ai.js', 'compare.js', 'tools.js', 'tools2.js', 'support.js', 'pro.js', 'xlsx.js', 'inv.js', 'viz2.js', 'themes.js', 'share.js', 'main.js'))

csp = "default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:; script-src 'unsafe-inline'; connect-src 'none'; base-uri 'none'; form-action 'none'"
html = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="{csp}">
<title>VEAGLE PC Check</title>
<link rel="icon" href="{logo}">
<style>
{css_fonts}{css}
</style>
</head>
<body>
{body}
<script>window.__PCDATA__ = /*__PCDATA__*/null;</script>
<script>
{js}
</script>
</body>
</html>
"""
assert '</script' not in js.lower(), 'a literal closing script tag inside the JavaScript would break the page'
assert html.count('/*__PCDATA__*/null') == 1, 'data placeholder must appear exactly once'
out = root / 'app' / 'template.html'
out.write_text(html, encoding='utf-8')
print('built', out, round(len(html.encode('utf-8')) / 1024), 'KB')
