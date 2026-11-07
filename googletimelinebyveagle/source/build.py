"""Χτίζει το ../index.html (μία σελίδα: οδηγίες για αρχάριους + η εφαρμογή) από τα αρχεία του source/.
   python3 build.py [ΕΚΔΟΣΗ]   π.χ. python3 build.py "Έκδοση 7.11 · 23:55"
   Αρχεία: dashboard.html (οθόνες dashboard), d3.min.js, outline.json (περίγραμμα χάρτη), proc.js (επεξεργασία),
   cities.json.gz (GeoNames cities1000, CC BY 4.0, ονόματα τοποθεσιών)."""
import json,base64,re,os,sys,datetime
H=os.path.dirname(os.path.abspath(__file__))
VER=sys.argv[1] if len(sys.argv)>1 else 'Έκδοση %d.%d · %s'%(datetime.date.today().day,datetime.date.today().month,datetime.datetime.now().strftime('%H:%M'))
src=open(H+'/dashboard.html').read()
head=src[:src.index('<body>')]
head=re.sub(r'<link rel="(icon|preconnect)"[^>]*>\n?','',head)
head=re.sub(r'<link href="https://fonts[^>]*>\n?','',head)
head=re.sub(r'<meta name="theme-color"[^>]*>\n?','',head)
SEO_TITLE='Google Timeline by Veagle · Google Maps Timeline viewer (Χρονολόγιο Χαρτών Google)'
SEO_DESC='See where you have been: load your Google Maps Timeline.json and get a map, routes, countries and trips. Everything runs in your browser, nothing is uploaded. · Φόρτωσε το Timeline.json σου και δες σε χάρτη πού έχεις πάει: μέρη, διαδρομές, χώρες και ταξίδια. Τίποτα δεν ανεβαίνει πουθενά.'
SEO_URL='https://ferelisvag.github.io/published/googletimelinebyveagle/'
LD=json.dumps({"@context":"https://schema.org","@type":"WebApplication","name":"Google Timeline by Veagle","alternateName":["Πού έχω πάει","Χρονολόγιο Χαρτών Google"],"url":SEO_URL,"description":SEO_DESC,"applicationCategory":"TravelApplication","operatingSystem":"Any (web browser)","browserRequirements":"Requires a modern browser (Chrome, Edge, Firefox, Safari 16.4+)","inLanguage":["el","en"],"isAccessibleForFree":True,"offers":{"@type":"Offer","price":"0","priceCurrency":"EUR"},"image":SEO_URL+"icon-512.png","publisher":{"@type":"Person","name":"Vagelis Ferelis","url":"https://ferelis.gr/"}},ensure_ascii=False)
def esc_attr(x):return x.replace('&','&amp;').replace('"','&quot;')
SEO='\n'.join([
 '<title>%s</title>'%SEO_TITLE,
 '<meta name="description" content="%s">'%esc_attr(SEO_DESC),
 '<meta name="robots" content="index,follow,max-image-preview:large">',
 '<link rel="canonical" href="%s">'%SEO_URL,
 '<meta name="theme-color" content="#050708">',
 '<meta name="color-scheme" content="dark">',
 '<meta name="application-name" content="Google Timeline by Veagle">',
 '<meta name="apple-mobile-web-app-title" content="Timeline Veagle">',
 '<meta name="apple-mobile-web-app-capable" content="yes">',
 '<meta property="og:type" content="website">','<meta property="og:site_name" content="ferelis.gr">',
 '<meta property="og:title" content="Google Timeline by Veagle">',
 '<meta property="og:description" content="%s">'%esc_attr(SEO_DESC),
 '<meta property="og:url" content="%s">'%SEO_URL,
 '<meta property="og:image" content="%sicon-512.png">'%SEO_URL,'<meta property="og:image:width" content="512">','<meta property="og:image:height" content="512">',
 '<meta property="og:locale" content="el_GR">','<meta property="og:locale:alternate" content="en_GB">',
 '<meta name="twitter:card" content="summary">','<meta name="twitter:title" content="Google Timeline by Veagle">',
 '<meta name="twitter:description" content="%s">'%esc_attr(SEO_DESC),'<meta name="twitter:image" content="%sicon-512.png">'%SEO_URL,
 '<link rel="icon" href="favicon.svg" type="image/svg+xml">','<link rel="icon" href="icon-192.png" type="image/png" sizes="192x192">',
 '<link rel="apple-touch-icon" href="apple-touch-icon.png">','<link rel="manifest" href="manifest.webmanifest">',
 '<script type="application/ld+json">%s</script>'%LD])
head=head.replace('<title>Google Timeline by Veagle</title>',SEO)
head=head.replace('<html lang="el">','<html lang="el">')
head=head.replace("--font-anthropic-sans:'IBM Plex Sans',system-ui,sans-serif;--font-anthropic-serif:'Space Grotesk',system-ui,sans-serif;","--font-anthropic-sans:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;--font-anthropic-serif:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;")
assert 'fonts.g' not in head and 'system-ui,-apple-system' in head
a=src.index('<style>\n.tl{');b=src.index('<script src="d3.min.js">')
page=src[a:b];rest=src[b:]
shim,app=re.findall(r'<script>(.*?)</script>',rest,re.S)
def rep(s,o,n):
    assert o in s,o[:40];return s.replace(o,n,1)
app=rep(app,"setView(24.5,38.6,10)","setView(window.TLHOME[1],window.TLHOME[0],10)")
app=rep(app,"['Αθήνα',23.75,38.0,0.5]","['Σπίτι',window.TLHOME[1],window.TLHOME[0],0.5]")
app=re.sub(r"const names=\{GR:.*?\};","const names=new Proxy({},{get:(t,k)=>{try{return new Intl.DisplayNames([window.LANG],{type:'region'}).of(String(k))}catch(e){return String(k)}}});",app,count=1,flags=re.S)
app=re.sub(r"'([^'\\\n]*[Α-ωά-ώ][^'\\\n]*)'",lambda m:"GT('"+m.group(1)+"')",app)
assert "'el-GR'" in app and "'el')" in app
app=app.replace("'el-GR'",'window.LOC').replace("String(y),'el')","String(y),window.LANG)")
page=rep(page,'Η έδρα ήταν η Καβάλα και από το 2025 η Αθήνα.','Έδρα θεωρείται το σημείο που το κινητό σου ονόμασε «σπίτι» (<span id="homeName">—</span>).')
d3=open(H+'/d3.min.js').read();assert '</script>' not in d3
outline=json.load(open(H+'/outline.json'))
cities=base64.b64encode(open(H+'/cities.json.gz','rb').read()).decode()
EN_JSON=json.dumps(json.load(open(H+'/en.json')),ensure_ascii=False,separators=(',',':')).replace('</','<\\/')
proc=open(H+'/proc.js').read().replace('</script>','<\\/script>')
FOOT='<p class="app-foot">Google Timeline by Veagle · <a href="https://ferelis.gr" target="_blank" rel="noopener">ferelis.gr</a> · '+VER+'</p>'
css='''<style>
#imp[hidden],#tools[hidden],#appwrap[hidden],#back[hidden],#imp [hidden]{display:none!important}
#appwrap{padding-top:30px}
#imp{max-width:760px;margin:0 auto;padding:6px 0 30px;font-family:var(--font-anthropic-sans);color:var(--color-fg);line-height:1.6}
#imp h1{font:600 clamp(28px,6vw,40px)/1.15 var(--font-anthropic-serif);margin:6px 0 10px}
#imp h2{font:600 22px/1.25 var(--font-anthropic-serif);margin:34px 0 10px}
#imp p,#imp li{color:var(--color-fg-muted);font-size:16px}
#imp li{margin:6px 0}
#imp b,#imp strong{color:var(--color-fg);font-weight:600}
#imp .lead{font-size:18px;color:var(--color-fg-muted)}
#imp .card{border:1px solid var(--color-border-line);border-radius:14px;padding:16px 18px;margin:14px 0;background:rgba(255,255,255,.02)}
#imp .card p:first-child{margin-top:0}#imp .card p:last-child{margin-bottom:0}
#imp .note{border-left:3px solid #f5b700;padding:8px 14px;margin:14px 0;background:rgba(245,183,0,.07);border-radius:0 10px 10px 0}
#imp .note p{margin:0;color:var(--color-fg)}
#imp .step{display:flex;gap:14px;margin:16px 0;align-items:flex-start}
#imp .step .n{flex:none;width:34px;height:34px;border-radius:50%;background:#5b8def;color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center;font-size:16px}
#imp .step .t{flex:1;min-width:0}#imp .step .t>*:first-child{margin-top:4px}
#imp ol{padding-left:22px;margin:8px 0}
#imp details{border:1px solid var(--color-border-line);border-radius:12px;padding:0;margin:10px 0;background:rgba(255,255,255,.02)}
#imp details>summary{cursor:pointer;padding:13px 16px;font-weight:600;font-size:16px;color:var(--color-fg);list-style:none;display:flex;gap:10px;align-items:center}
#imp details>summary::-webkit-details-marker{display:none}
#imp details>summary::before{content:"▸";color:#5b8def;transition:.15s}
#imp details[open]>summary::before{transform:rotate(90deg)}
#imp details>div{padding:0 18px 14px}
#imp code{font:13.5px ui-monospace,Menlo,Consolas,monospace;background:rgba(255,255,255,.07);padding:1px 6px;border-radius:5px;color:var(--color-fg)}
#imp .drop{border:2px dashed var(--color-border-line);border-radius:16px;padding:38px 18px;text-align:center;cursor:pointer;transition:.15s;margin:14px 0;background:rgba(91,141,239,.04)}
#imp .drop:hover,#imp .drop:focus,#imp .drop.over{border-color:#5b8def;background:rgba(91,141,239,.1);outline:none}
#imp .drop b{display:block;font-size:19px;margin-bottom:6px}
#imp .drop span{color:var(--color-fg-muted);font-size:14px}
#imp .opt{display:flex;gap:12px;align-items:flex-start;border:1px solid var(--color-border-line);border-radius:12px;padding:12px 14px;margin:12px 0;cursor:pointer}
#imp .opt input{margin-top:5px;width:18px;height:18px;flex:none}
#imp .opt>div>b{display:block;margin-bottom:2px}
#imp .opt span{color:var(--color-fg-muted);font-size:14px;line-height:1.5}
#imp .bar{height:8px;border-radius:4px;background:var(--color-border-line);overflow:hidden;margin:16px 0 8px;display:none}
#imp .bar i{display:block;height:100%;width:0;background:#5b8def;transition:width .25s}
#imp .err{color:#ff8a98;font-size:15px;margin:10px 0 0;white-space:pre-wrap;line-height:1.5}
#imp button.btn{font:600 15px var(--font-anthropic-sans);color:#fff;background:#3b6fd8;border:0;border-radius:10px;padding:10px 18px;cursor:pointer}
#tools{position:fixed;top:10px;right:12px;z-index:20;display:flex;gap:8px}
#tools button{font:500 12px var(--font-anthropic-sans);color:var(--color-fg-muted);background:rgba(20,24,30,.9);border:1px solid var(--color-border-line);border-radius:999px;padding:6px 12px;cursor:pointer}
#tools button:hover{color:var(--color-fg)}
.app-foot{max-width:760px;margin:28px auto 0;text-align:center;font-size:12px;color:var(--color-fg-muted)}
.app-foot a{color:inherit}
#appwrap .app-foot{max-width:1200px}
@media(max-width:600px){#appwrap{padding-top:0}#tools{position:static;margin:0 0 10px;justify-content:flex-end}}

body::before{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;background:radial-gradient(60rem 40rem at 12% -8%,rgba(91,141,239,.18),transparent 60%),radial-gradient(50rem 36rem at 100% 8%,rgba(232,44,45,.10),transparent 60%),radial-gradient(40rem 30rem at 50% 110%,rgba(52,211,153,.07),transparent 60%)}
#imp .hero{position:relative;overflow:hidden;border:1px solid var(--color-border-line);border-radius:22px;padding:34px 26px 26px;margin:0 0 18px;background:linear-gradient(145deg,rgba(91,141,239,.14),rgba(13,17,22,.6) 55%,rgba(232,44,45,.09))}
#imp .hero svg.map{position:absolute;right:-20px;top:-10px;width:62%;max-width:430px;opacity:.38;pointer-events:none}
#imp .hero svg .rt{fill:none;stroke:#5b8def;stroke-width:2.4;stroke-linecap:round;stroke-dasharray:6 7;animation:dash 22s linear infinite}
#imp .hero svg .rt2{stroke:#e82c2d;animation-duration:30s}
#imp .hero svg .pt{fill:#fff;stroke:#5b8def;stroke-width:2}
#imp .hero svg .gr{stroke:rgba(255,255,255,.07);stroke-width:1}
@keyframes dash{to{stroke-dashoffset:-260}}
#imp .hero>*:not(svg){position:relative}
#imp .hero>.langbtn{position:absolute!important;top:14px;right:14px;z-index:3;font:600 12px var(--font-anthropic-sans);color:var(--color-fg);background:rgba(255,255,255,.07);border:1px solid var(--color-border-line);border-radius:999px;padding:6px 12px;cursor:pointer}
#imp .langbtn:hover{background:rgba(255,255,255,.14)}
#imp .kicker{display:inline-block;font:600 12px var(--font-anthropic-sans);letter-spacing:.08em;text-transform:uppercase;color:#9db8f5;background:rgba(91,141,239,.14);border:1px solid rgba(91,141,239,.3);padding:4px 11px;border-radius:999px}
#imp .hero h1{font-size:clamp(34px,8vw,56px);margin:14px 0 10px;letter-spacing:-.01em}
#imp .hero h1 em{font-style:normal;background:linear-gradient(90deg,#7aa5ff,#ff6b6e);-webkit-background-clip:text;background-clip:text;color:transparent}
#imp .hero .lead{max-width:34rem}
#imp .cta{display:flex;flex-wrap:wrap;gap:10px;margin:18px 0 6px}
#imp a.btn,#imp button.btn{display:inline-block;text-decoration:none;font:600 15px var(--font-anthropic-sans);color:#fff;background:#3b6fd8;border:1px solid transparent;border-radius:12px;padding:12px 20px;cursor:pointer;transition:.15s}
#imp a.btn:hover,#imp button.btn:hover{background:#4a7de8;transform:translateY(-1px)}
#imp .btn.ghost{background:rgba(255,255,255,.05);border-color:var(--color-border-line);color:var(--color-fg)}
#imp .btn.ghost:hover{background:rgba(255,255,255,.1)}
#imp .badges{list-style:none;display:flex;flex-wrap:wrap;gap:8px;padding:0;margin:14px 0 0}
#imp .badges li{margin:0;font-size:13px;color:var(--color-fg-muted);background:rgba(255,255,255,.04);border:1px solid var(--color-border-line);border-radius:999px;padding:4px 11px}
#imp .feat{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:14px 0}
#imp .feat div{border:1px solid var(--color-border-line);border-radius:14px;padding:13px 14px;background:rgba(255,255,255,.025)}
#imp .feat b{display:block;font-size:15px;margin:2px 0 2px}
#imp .feat span{font-size:13px;color:var(--color-fg-muted);line-height:1.45}
#imp .feat i{font-style:normal;font-size:22px}
#imp h2{display:flex;align-items:center;gap:11px;scroll-margin-top:14px}
#imp h2 .sn{flex:none;width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#5b8def,#3b6fd8);color:#fff;font:700 15px var(--font-anthropic-sans);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(59,111,216,.4)}
#imp .drop{padding:46px 18px;border-radius:20px;background:linear-gradient(145deg,rgba(91,141,239,.08),rgba(91,141,239,.02))}
#imp .drop i{display:block;font-style:normal;font-size:38px;margin-bottom:6px}
#imp .demoline{text-align:center;font-size:14px;color:var(--color-fg-muted);margin:6px 0 0}
#imp .demoline button{all:unset;cursor:pointer;color:#9db8f5;text-decoration:underline}
#imp details{transition:.15s}#imp details[open]{border-color:rgba(91,141,239,.4);background:rgba(91,141,239,.04)}
#demoBar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;max-width:1200px;margin:0 auto 12px;padding:10px 14px;border-radius:12px;background:rgba(245,183,0,.1);border:1px solid rgba(245,183,0,.35);color:var(--color-fg);font-size:14px}
#demoBar[hidden]{display:none!important}
#demoBar button{font:600 13px var(--font-anthropic-sans);color:#14181e;background:#f5b700;border:0;border-radius:9px;padding:7px 13px;cursor:pointer}
#appwrap .tl h1{font-weight:700;letter-spacing:-.01em;font-size:clamp(28px,5vw,40px);background:linear-gradient(90deg,#e7ecf3,#9db8f5 60%,#ff8a8c);-webkit-background-clip:text;background-clip:text;color:transparent;display:inline-block}
#appwrap .tl .lead{font-size:15px}
#appwrap .tl .tabs{border:0;gap:6px;background:rgba(255,255,255,.04);padding:5px;border-radius:14px;display:inline-flex;margin-bottom:16px}
#appwrap .tl .tab{border:0;border-radius:10px;padding:8px 16px}
#appwrap .tl .tab[aria-selected=true]{background:#e7ecf3;color:#0b0e12;font-weight:600}
#appwrap .tl .tile{position:relative;overflow:hidden;border-radius:16px;background:linear-gradient(160deg,rgba(255,255,255,.05),rgba(255,255,255,.01));padding:16px 18px;transition:.15s}
#appwrap .tl .tile:hover{transform:translateY(-2px);border-color:#34404d}
#appwrap .tl .tile::before{content:"";position:absolute;left:0;top:0;right:0;height:3px;background:var(--ac,#5b8def)}
#appwrap .tl .tile:nth-child(1){--ac:#5b8def}#appwrap .tl .tile:nth-child(2){--ac:#34d399}#appwrap .tl .tile:nth-child(3){--ac:#f5b700}
#appwrap .tl .tile:nth-child(4){--ac:#e82c2d}#appwrap .tl .tile:nth-child(5){--ac:#c084fc}#appwrap .tl .tile:nth-child(6){--ac:#22d3ee}
#appwrap .tl .tile .v{font-weight:700;font-size:clamp(26px,4vw,34px);color:var(--ac)}
#appwrap .tl .card{border-radius:16px;background:linear-gradient(170deg,rgba(255,255,255,.035),rgba(255,255,255,.008))}
#appwrap .tl .card h2{font-size:16px;font-weight:600}
#appwrap .tl tbody tr:hover td{background:rgba(91,141,239,.08)}
#facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,17rem),1fr));gap:10px;margin:0 0 14px}
#facts div{display:flex;gap:11px;align-items:flex-start;padding:12px 14px;border-radius:14px;border:1px solid var(--color-border-line);background:rgba(91,141,239,.06);font-size:14px;line-height:1.45;color:var(--color-fg-muted)}
#facts div b{color:var(--color-fg)}#facts div i{font-style:normal;font-size:22px;line-height:1}
.csvbtn,.pngbtn{font:500 12px var(--font-anthropic-sans);color:var(--color-fg);background:rgba(255,255,255,.05);border:1px solid var(--color-border-line);border-radius:999px;padding:5px 12px;cursor:pointer;margin-left:6px}
.csvbtn:hover,.pngbtn:hover{background:rgba(255,255,255,.12)}
.exportrow{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:6px 0}
@media(max-width:600px){#imp .hero{padding:26px 18px 20px}#imp .hero svg.map{opacity:.28;width:90%}}
@media(prefers-reduced-motion:reduce){#imp .hero svg .rt{animation:none}#appwrap .tl .tile,#imp a.btn,#imp button.btn{transition:none}}
@media print{#tools,#demoBar,.csvbtn,.pngbtn{display:none!important}body::before{display:none}}
</style>'''
INTRO='''<div id="imp" hidden>
<section class="hero">
<button class="langbtn" id="btnLang" type="button"></button>
<svg class="map" viewBox="0 0 400 300" aria-hidden="true"><g class="gr"><path d="M0 60H400M0 120H400M0 180H400M0 240H400M80 0V300M160 0V300M240 0V300M320 0V300"/></g>
<path class="rt" d="M40 230C90 190 110 120 170 130S250 210 300 150 350 60 372 52"/><path class="rt rt2" d="M60 90C120 70 150 40 210 70S270 120 250 190 190 262 150 250"/>
<circle class="pt" cx="40" cy="230" r="7"/><circle class="pt" cx="170" cy="130" r="6"/><circle class="pt" cx="300" cy="150" r="6"/><circle class="pt" cx="372" cy="52" r="8"/><circle class="pt" cx="210" cy="70" r="5"/><circle class="pt" cx="150" cy="250" r="6"/></svg>
<span class="kicker">Δωρεάν · Χωρίς λογαριασμό</span>
<h1>Google Timeline <em>by Veagle</em></h1>
<p class="lead">Το κινητό σου θυμάται πού πηγαίνεις (αν έχεις ανοιχτό το «Χρονολόγιο» στους Χάρτες Google). Φόρτωσε το αρχείο και δες τη ζωή σου σε χάρτη: μέρη, διαδρομές, χιλιόμετρα, χώρες και ταξίδια.</p>
<div class="cta" id="demoCta"><a class="btn" href="#step1">Ξεκίνα · 5 λεπτά →</a><button class="btn ghost" id="btnDemo" type="button" title="Ανοίγει την εφαρμογή με φανταστικά δεδομένα, για να δεις πώς δείχνει. Δεν αποθηκεύεται τίποτα.">▶ Δες πρώτα ένα δείγμα</button></div>
<ul class="badges"><li>🔒 Δεν ανεβαίνει πουθενά</li><li>🚫 Χωρίς παρακολούθηση</li><li>📱 Android και iPhone</li><li>🆓 Δωρεάν</li></ul>
</section>
<p id="backWrap" hidden><button class="btn" id="btnBack" type="button">← Πίσω στα αποτελέσματά μου</button></p>
<div class="feat">
<div><i>🗺️</i><b>Χάρτης</b><span>Όλα τα μέρη και οι διαδρομές σου, με φίλτρα ανά έτος και μέσο.</span></div>
<div><i>📊</i><b>Γραφήματα</b><span>Μέρη και χιλιόμετρα ανά χρόνο, ποιες περιοχές επισκέπτεσαι πιο συχνά.</span></div>
<div><i>🌍</i><b>Χώρες</b><span>Πόσες χώρες και πόλεις έχεις δει και πόσες ημέρες έμεινες.</span></div>
<div><i>🧳</i><b>Ταξίδια</b><span>Οι εξορμήσεις σου μακριά από το σπίτι, με ημερομηνίες. Λήψη σε CSV.</span></div>
</div>

<div class="card">
<p><b>Πριν ξεκινήσεις, τρία πράγματα να ξέρεις:</b></p>
<ul>
<li><b>Τίποτα δεν ανεβαίνει πουθενά.</b> Το αρχείο σου ανοίγει και διαβάζεται μέσα στον δικό σου browser. Αυτή η σελίδα δεν στέλνει τα στοιχεία σου σε κανέναν server, ούτε έχει παρακολούθηση.</li>
<li><b>Τίποτα δεν αλλάζει στο κινητό σου.</b> Το μόνο που κάνεις εκεί είναι να πατήσεις «Εξαγωγή» και να πάρεις ένα αντίγραφο του ιστορικού σου.</li>
<li><b>Τίποτα δεν γίνεται μόνο του.</b> Ό,τι αποθηκεύεται το διαλέγεις εσύ (θα το δεις στο Βήμα 3).</li>
</ul>
</div>

<h2>Τι χρειάζεσαι</h2>
<ul>
<li>Ένα <b>κινητό με την εφαρμογή Χάρτες Google</b> (Google Maps) στο οποίο το <b>Χρονολόγιο (Timeline)</b> ήταν ανοιχτό για κάποιο διάστημα. Αν ήταν πάντα κλειστό, δεν υπάρχει ιστορικό να δεις.</li>
<li>Ένα πρόγραμμα περιήγησης: <b>Chrome, Edge, Firefox ή Safari</b> (νέα έκδοση). Καλύτερα σε υπολογιστή, αλλά δουλεύει και στο κινητό.</li>
<li>Περίπου <b>5 λεπτά</b>.</li>
</ul>

<h2 id="step1"><span class="sn">1</span>Κατέβασε το αρχείο από το κινητό σου</h2>
<p>Διάλεξε το δικό σου κινητό. Πατάς το βέλος για να ανοίξουν τα βήματα.</p>
<details open><summary>📱 Έχω Android (Samsung, Xiaomi, Pixel, κ.λπ.)</summary><div>
<div class="step"><span class="n">1</span><div class="t">Άνοιξε τις <b>Ρυθμίσεις</b> του τηλεφώνου (το εικονίδιο με το γρανάζι).</div></div>
<div class="step"><span class="n">2</span><div class="t">Πάτα <b>Τοποθεσία</b> (Location).</div></div>
<div class="step"><span class="n">3</span><div class="t">Πάτα <b>Υπηρεσίες τοποθεσίας</b> (Location services).</div></div>
<div class="step"><span class="n">4</span><div class="t">Πάτα <b>Χρονολόγιο</b> (Timeline).</div></div>
<div class="step"><span class="n">5</span><div class="t">Κύλισε προς τα κάτω και πάτα <b>Εξαγωγή δεδομένων Χρονολογίου</b> (Export Timeline data).</div></div>
<div class="step"><span class="n">6</span><div class="t">Το κινητό θα ρωτήσει πού να σώσει το αρχείο. Διάλεξε <b>Λήψεις (Downloads)</b> ή το <b>Google Drive</b> σου και πάτα <b>Αποθήκευση</b>.</div></div>
<div class="step"><span class="n">7</span><div class="t">Έτοιμο! Έχεις ένα αρχείο που λέγεται <code>Timeline.json</code>. Μπορεί να έχει λίγο διαφορετικό όνομα, δεν πειράζει.</div></div>
<div class="note"><p>Τα ονόματα των μενού αλλάζουν λίγο ανάλογα με τη μάρκα του κινητού. Αν δεν βρίσκεις κάτι, γράψε <b>«Χρονολόγιο»</b> ή <b>«Timeline»</b> στην αναζήτηση μέσα στις Ρυθμίσεις.</p></div>
</div></details>
<details><summary>🍎 Έχω iPhone ή iPad</summary><div>
<div class="step"><span class="n">1</span><div class="t">Άνοιξε την εφαρμογή <b>Google Maps</b> (η εφαρμογή της Google, όχι οι «Χάρτες» της Apple).</div></div>
<div class="step"><span class="n">2</span><div class="t">Πάτα την <b>εικόνα προφίλ</b> σου πάνω δεξιά (ο κύκλος με τη φωτογραφία ή το γράμμα σου).</div></div>
<div class="step"><span class="n">3</span><div class="t">Πάτα <b>Ρυθμίσεις</b> (Settings).</div></div>
<div class="step"><span class="n">4</span><div class="t">Πάτα <b>Προσωπικό περιεχόμενο</b> (Personal content).</div></div>
<div class="step"><span class="n">5</span><div class="t">Πάτα <b>Εξαγωγή δεδομένων Χρονολογίου</b> (Export Timeline data).</div></div>
<div class="step"><span class="n">6</span><div class="t">Θα ανοίξει το παράθυρο κοινοποίησης. Διάλεξε <b>Αποθήκευση σε Αρχεία</b> (Save to Files), μετά π.χ. <b>iCloud Drive</b>, και πάτα <b>Αποθήκευση</b>.</div></div>
<div class="step"><span class="n">7</span><div class="t">Έτοιμο! Έχεις το αρχείο <code>Timeline.json</code> στην εφαρμογή «Αρχεία».</div></div>
<div class="note"><p>Αν το κινητό σου προτείνει κάτι λίγο διαφορετικό, ακολούθησε αυτό. Το ζητούμενο είναι να καταλήξεις με ένα αρχείο που τελειώνει σε <code>.json</code>.</p></div>
</div></details>
<details><summary>🤔 Δεν βλέπω την «Εξαγωγή δεδομένων Χρονολογίου». Τι κάνω;</summary><div>
<ol>
<li><b>Ενημέρωσε την εφαρμογή Google Maps</b> από το Play Store ή το App Store και δοκίμασε ξανά.</li>
<li>Άνοιξε τους Χάρτες Google, πάτα την εικόνα προφίλ και δες αν υπάρχει το <b>«Το χρονολόγιό σου» (Your Timeline)</b>. Αν σου ζητάει να το ενεργοποιήσεις, τότε δεν έχεις ιστορικό από πριν: θα αρχίσει να γράφει από τώρα και θα μπορέσεις να εξαγάγεις αργότερα.</li>
<li>Αν άλλαξες κινητό ή το έκανες επαναφορά, το ιστορικό μπορεί να μην είναι στο νέο. Χρειάζεται πρώτα να το επαναφέρεις μέσα από το Google Maps.</li>
<li>Αν έχεις πάνω από ένα κινητό, κάνε την εξαγωγή από αυτό που κουβαλάς περισσότερο.</li>
<li>Δες και τη <a href="https://support.google.com/maps/answer/6258979" target="_blank" rel="noopener">βοήθεια της Google για το Χρονολόγιο</a>.</li>
</ol>
</div></details>

<h2><span class="sn">2</span>Φέρε το αρχείο εκεί που θα το ανοίξεις</h2>
<p>Αν θα το ανοίξεις <b>στο ίδιο κινητό</b>, πήγαινε κατευθείαν στο Βήμα 3. Αν θες να το δεις στον <b>υπολογιστή</b> (πιο άνετα), στείλε το αρχείο εκεί με όποιον τρόπο σου αρέσει:</p>
<ul>
<li><b>Google Drive:</b> αν το σώσεις στο Drive από το κινητό, το κατεβάζεις από τον υπολογιστή στο drive.google.com.</li>
<li><b>Email στον εαυτό σου:</b> επισύναψε το αρχείο σε ένα μήνυμα και στείλ' το στη δική σου διεύθυνση.</li>
<li><b>Καλώδιο USB:</b> συνδέεις το κινητό στον υπολογιστή και αντιγράφεις το αρχείο από τον φάκελο «Λήψεις».</li>
<li><b>Viber, Telegram ή WhatsApp</b> σε μήνυμα προς τον εαυτό σου, ή <b>AirDrop</b> αν έχεις iPhone και Mac.</li>
</ul>
<div class="note"><p>Το αρχείο περιέχει <b>όλο το ιστορικό τοποθεσιών σου</b>. Μην το στέλνεις σε άγνωστους και μην το ανεβάζεις σε δημόσιο μέρος.</p></div>

<h2><span class="sn">3</span>Φόρτωσέ το εδώ</h2>
<div class="drop" id="drop" tabindex="0" role="button" aria-label="Επιλογή αρχείου Timeline.json"><i>📂</i><b>Πάτα εδώ και διάλεξε το Timeline.json</b><span>ή σύρε το αρχείο μέσα σε αυτό το πλαίσιο</span></div>
<input type="file" id="file" hidden>
<label class="opt"><input type="checkbox" id="rem"><div><b>Να θυμάται τα αποτελέσματα αυτός ο υπολογιστής (προαιρετικό)</b><span>Αν το τσεκάρεις, την επόμενη φορά που θα ανοίξεις τη σελίδα δεν θα χρειαστεί να ξαναφορτώσεις το αρχείο. Τα αποτελέσματα μένουν αποθηκευμένα <b>μόνο σε αυτόν τον browser</b>, όχι στο internet. <b>Μην το τσεκάρεις σε υπολογιστή που δεν είναι δικός σου.</b> Αν δεν το τσεκάρεις, μόλις κλείσεις τη σελίδα όλα σβήνουν. Μπορείς να τα σβήσεις όποτε θες με το κουμπί «Διαγραφή δεδομένων».</span></div></label>
<div class="bar" id="bar"><i id="bari"></i></div><div id="stage" style="font-size:14px;color:var(--color-fg-muted)"></div><div class="err" id="err"></div>
<p style="font-size:14px">Αν το αρχείο είναι μεγάλο (πολλές δεκάδες MB), κάνε λίγη υπομονή: συνήθως παίρνει από λίγα δευτερόλεπτα μέχρι ένα λεπτό. Μην κλείσεις τη σελίδα.</p>

<p class="demoline" id="demoLine">Δεν έχεις ακόμα το αρχείο; <button type="button" id="btnDemo2">Δες ένα δείγμα με φανταστικά δεδομένα</button></p>
<h2><span class="sn">4</span>Δες τα αποτελέσματα</h2>
<p>Μόλις τελειώσει, ανοίγει η σελίδα με 4 καρτέλες:</p>
<ul>
<li><b>Επισκόπηση:</b> συνολικά νούμερα (μέρη, χώρες, χιλιόμετρα) και γραφήματα ανά χρόνο.</li>
<li><b>Χάρτης:</b> όλα τα μέρη και οι διαδρομές σου. Φίλτρα για έτος και τρόπο μετακίνησης. Με το ποντίκι ή τα δάχτυλα κάνεις ζουμ και μετακίνηση.</li>
<li><b>Περιοχές:</b> πόσο καιρό έμεινες σε κάθε πόλη και χώρα.</li>
<li><b>Ταξίδια:</b> οι εξορμήσεις σου μακριά από το σπίτι (πάνω από 80 χλμ.), με ημερομηνίες και διαδρομές.</li>
</ul>

<h2>Συχνές ερωτήσεις</h2>
<details><summary>Είναι ασφαλές; Πού πηγαίνει το αρχείο μου;</summary><div><p>Το αρχείο δεν πηγαίνει πουθενά. Ανοίγει και διαβάζεται μέσα στη δική σου συσκευή, με κώδικα που τρέχει στον δικό σου browser. Η σελίδα δεν έχει παρακολούθηση, δεν φορτώνει γραμματοσειρές ή σκριπτ από το internet και δεν στέλνει τίποτα. Μπορείς να τη δοκιμάσεις και χωρίς σύνδεση: αφού ανοίξει, κόψε το internet και φόρτωσε το αρχείο.</p></div></details>
<details><summary>Τι θα γίνει αν πατήσω «Να θυμάται τα αποτελέσματα»;</summary><div><p>Τα αποτελέσματα (όχι το αρχικό σου αρχείο) αποθηκεύονται στον browser αυτού του υπολογιστή. Την επόμενη φορά ανοίγεις τη σελίδα και τα βλέπεις αμέσως. Τα σβήνεις όποτε θες με το κουμπί <b>«Διαγραφή δεδομένων»</b> πάνω δεξιά, ή αν καθαρίσεις τα δεδομένα του browser.</p></div></details>
<details><summary>Μου βγάζει σφάλμα. Τι σημαίνει;</summary><div><ul>
<li><b>«Αυτό είναι αρχείο ZIP»:</b> άνοιξε (αποσυμπίεσε) το ZIP και διάλεξε το αρχείο <code>.json</code> που είναι μέσα.</li>
<li><b>«Records.json / παλιό αρχείο»:</b> αυτό είναι ο παλιός τρόπος του Google Takeout. Χρειάζεται το αρχείο που βγάζει το ίδιο το κινητό από το «Εξαγωγή δεδομένων Χρονολογίου» (Βήμα 1).</li>
<li><b>«Δεν βρήκα επισκέψεις»:</b> το Χρονολόγιο ήταν κλειστό ή άδειο στο κινητό από το οποίο έβγαλες το αρχείο.</li>
<li><b>«Σφάλμα επεξεργασίας / δεν έχει μνήμη»:</b> το αρχείο είναι πολύ μεγάλο για τη συσκευή σου. Δοκίμασε σε υπολογιστή με Chrome ή Edge.</li>
</ul></div></details>
<details><summary>Βλέπω λάθος ονόματα ή λείπουν διαδρομές</summary><div><p>Τα ονόματα των πόλεων βρίσκονται από τις συντεταγμένες, με μια ενσωματωμένη λίστα πόλεων, οπότε μπορεί σε μικρά χωριά να δείξει το πιο κοντινό μέρος. Οι διαδρομές εξαρτώνται από το τι κατέγραψε το κινητό σου: όπου δεν υπήρχε σήμα ή το Χρονολόγιο ήταν κλειστό, δεν υπάρχουν στοιχεία.</p></div></details>
<details><summary>Τι κάνουν τα κουμπιά πάνω δεξιά;</summary><div><ul>
<li><b>Άλλο αρχείο:</b> σε πάει πίσω σε αυτές τις οδηγίες για να φορτώσεις ένα διαφορετικό αρχείο (π.χ. κάποιου φίλου ή νεότερο δικό σου).</li>
<li><b>Διαγραφή δεδομένων:</b> σβήνει ό,τι είχε αποθηκευτεί σε αυτόν τον browser και σε γυρίζει στην αρχή. Πριν σβήσει, σε ρωτάει.</li>
</ul></div></details>
<details><summary>Τι browser να χρησιμοποιήσω;</summary><div><p>Chrome, Edge, Firefox ή Safari, σε νέα έκδοση (Safari 16.4 και πάνω). Αν δεν δουλεύει, δοκίμασε Chrome ή Edge σε υπολογιστή.</p></div></details>
<details><summary>Από πού βγαίνουν τα ονόματα των πόλεων;</summary><div><p>Ονόματα τοποθεσιών: βάση <a href="https://www.geonames.org/" target="_blank" rel="noopener">GeoNames</a> (CC BY 4.0). Η βάση και το περίγραμμα του χάρτη είναι ενσωματωμένα στη σελίδα, γι' αυτό δουλεύει και χωρίς internet.</p></div></details>
'''+FOOT+'''
</div>'''
body='''<body>
<div id="tools" hidden><button id="btnLang2" type="button"></button><button id="btnNew" type="button" title="Γυρίζει στις οδηγίες για να φορτώσεις άλλο αρχείο. Δεν σβήνει τίποτα.">Άλλο αρχείο</button><button id="btnDel" type="button" title="Σβήνει ό,τι έχει αποθηκευτεί σε αυτόν τον browser. Θα σε ρωτήσει πρώτα.">Διαγραφή δεδομένων</button></div>
'''+INTRO+'''
<div id="appwrap" hidden>
<div id="demoBar" hidden><span>🎭 <b>Δείγμα με φανταστικά δεδομένα.</b> Δεν είναι κανενός. Έτσι θα δείχνει η δική σου σελίδα.</span><button type="button" id="btnReal">Φόρτωσε το δικό μου αρχείο</button></div>
'''+page+'''
'''+FOOT+'''
</div>
<script>'''+d3+'''</script>
<script type="text/plain" id="app-shim">'''+shim+'''</script>
<script type="text/plain" id="app-main">'''+app+'''</script>
<script type="text/plain" id="proc-src">'''+proc+'''</script>
<script>
var EN='''+EN_JSON+''';
var LANG=(function(){try{var l=localStorage.getItem('gtv-lang');if(l==='en'||l==='el')return l}catch(e){}return /^el/i.test(navigator.language||'el')?'el':'en'})();
window.LANG=LANG;window.LOC=LANG==='en'?'en-GB':'el-GR';
function GT(s){if(LANG!=='en'||typeof s!=='string')return s;var t=s.trim();if(!t)return s;var e=EN[t];if(e===undefined)return s;var a=s.indexOf(t);return s.slice(0,a)+e+s.slice(a+t.length)}
window.GT=GT;
function L(el,en){return LANG==='en'?en:el}
var CITIES_B64="'''+cities+'''";
var OUTLINE='''+json.dumps(outline,separators=(',',':'))+''';
(function(){
  var $=function(i){return document.getElementById(i)};
  var DB='pou-exo-pai',mem=null,hasData=false;
  function idb(mode,fn){return new Promise(function(res,rej){try{var r=indexedDB.open(DB,1);r.onupgradeneeded=function(){r.result.createObjectStore('kv')};r.onerror=function(){rej(r.error)};r.onsuccess=function(){var tx=r.result.transaction('kv',mode),st=tx.objectStore('kv'),q=fn(st);tx.oncomplete=function(){res(q&&q.result)};tx.onerror=function(){rej(tx.error)}}}catch(e){rej(e)}})}
  function get(){return idb('readonly',function(s){return s.get('data')}).catch(function(){return null})}
  function put(d){return idb('readwrite',function(s){s.put(d,'data')})}
  function del(){return idb('readwrite',function(s){s.delete('data')}).catch(function(){})}
  function inject(id){var s=document.createElement('script');s.textContent=$(id).textContent;document.body.appendChild(s)}
  var started=false;
  function start(data,saved,demo){curSaved=!!saved;
    window.TLDATA=data;window.TLDEMO=!!demo;window.TLHOME=data.meta&&data.meta.home||[38,24.5];hasData=true;
    $('imp').hidden=true;$('appwrap').hidden=false;$('tools').hidden=false;$('btnDel').hidden=!saved;$('demoBar').hidden=!demo;
    var hn=$('homeName');if(hn&&data.meta)hn.textContent=data.meta.homeName;
    if(!started){started=true;inject('app-shim');inject('app-main');try{extras(data)}catch(e){}trDom(document.body)}
    else if(saved){location.reload()}
    else{idb('readwrite',function(s){s.put(data,'tmp')}).then(function(){try{sessionStorage.setItem('pep-tmp','1')}catch(e){}location.reload()},function(){location.reload()})}
  }
  function showImp(){$('btnDemo').hidden=started;$('demoLine').hidden=started;$('imp').hidden=false;$('appwrap').hidden=true;$('tools').hidden=true;$('backWrap').hidden=!(hasData&&started);window.scrollTo(0,0)}
  function setP(p,m){$('bar').style.display='block';$('bari').style.width=Math.round(p*100)+'%';$('stage').textContent=GT(m||'')}
  function fail(m){$('err').textContent=GT(m);$('bar').style.display='none';$('stage').textContent=''}
  function process(file){
    $('err').textContent='';
    file.slice(0,300).text().then(function(h){
      if(h.slice(0,2)==='PK')return fail('Αυτό είναι αρχείο ZIP. Άνοιξε (αποσυμπίεσε) το ZIP και διάλεξε το αρχείο που τελειώνει σε .json από μέσα.');
      var t=h.replace(/^\\uFEFF/,'').trim().charAt(0);
      if(t!=='{'&&t!=='[')return fail(GT('Αυτό το αρχείο (')+file.name+GT(') δεν μοιάζει με Timeline.json. Χρειάζεται το αρχείο .json που βγάζει το κινητό από το «Εξαγωγή δεδομένων Χρονολογίου» (Βήμα 1).'));
      run(file);
    }).catch(function(){fail('Δεν μπόρεσα να διαβάσω το αρχείο. Δοκίμασε να το διαλέξεις ξανά.')});
  }
  function run(file,demo){
    setP(.01,'Ξεκινάω…');
    var remember=!demo&&$('rem').checked;
    var wsrc=$('proc-src').textContent+'\\nfunction unpack(b64){var bin=atob(b64),u=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream("gzip"))).text().then(function(t){var c=JSON.parse(t),n=c.rows.length,la=new Float32Array(n),lo=new Float32Array(n),ad=new Uint16Array(n),cc=new Uint16Array(n),nm=new Array(n);for(var i=0;i<n;i++){var p=c.rows[i].split("|");la[i]=+p[0];lo[i]=+p[1];nm[i]=p[2];ad[i]=+p[3];cc[i]=+p[4]}return{n:nm,la:la,lo:lo,ad:ad,cc:cc,admins:c.admins,ccs:c.ccs}})}\\nonmessage=function(e){var m=e.data;m.file.text().then(function(t){return unpack(m.cities).then(function(c){return processTimeline(t,c,m.outline,function(p,s){postMessage({p:p,m:s})})})}).then(function(o){postMessage({done:o})}).catch(function(x){postMessage({err:x&&x.message||String(x)})})};';
    var w;try{w=new Worker(URL.createObjectURL(new Blob([wsrc],{type:'text/javascript'})))}catch(e){return fail('Αυτός ο browser δεν μπορεί να κάνει την επεξεργασία. Δοκίμασε Chrome, Edge ή Firefox.')}
    w.onmessage=function(e){var d=e.data;if(d.p!=null)setP(d.p,d.m);else if(d.err){w.terminate();fail(/JSON|Unexpected|position/.test(d.err)?'Το αρχείο δεν είναι ολόκληρο ή δεν είναι σωστό JSON. Δοκίμασε να το εξαγάγεις ξανά από το κινητό.':/memory|allocation/i.test(d.err)?'Το αρχείο είναι πολύ μεγάλο για αυτή τη συσκευή. Δοκίμασε σε υπολογιστή με Chrome ή Edge.':d.err)}else if(d.done){w.terminate();setP(1,'Έτοιμο!');var fin=function(sv){start(d.done,sv,demo)};if(demo)fin(false);else if(remember)put(d.done).then(function(){fin(true)},function(){fin(false)});else del().then(function(){fin(false)})}};
    w.onerror=function(e){fail(GT('Κάτι πήγε στραβά στην επεξεργασία (')+(e.message||GT('άγνωστο σφάλμα'))+GT('). Αν το αρχείο είναι πολύ μεγάλο, δοκίμασε σε υπολογιστή.'))};
    w.postMessage({file:file,cities:CITIES_B64,outline:OUTLINE});
  }

  function trDom(root){
    if(LANG!=='en')return;
    var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),n,list=[];
    while(n=w.nextNode()){if(!n.parentElement||n.parentElement.closest('script,style'))continue;if(/[Α-ωά-ώ]/.test(n.nodeValue))list.push(n)}
    list.forEach(function(n){var v=GT(n.nodeValue);v=v.replace('Έκδοση','Version');if(v!==n.nodeValue)n.nodeValue=v});
    [].forEach.call(root.querySelectorAll('[title],[aria-label],[placeholder],[alt]'),function(e){['title','aria-label','placeholder','alt'].forEach(function(a){var v=e.getAttribute(a);if(v&&/[Α-ωά-ώ]/.test(v)){var g=GT(v);if(g!==v)e.setAttribute(a,g)}})});
  }
  var curSaved=false;
  function setLang(l){
    try{localStorage.setItem('gtv-lang',l)}catch(e){}
    if(hasData&&started){
      if(window.TLDEMO){try{sessionStorage.setItem('pep-tmp','demo')}catch(e){}location.reload()}
      else if(curSaved)location.reload();
      else idb('readwrite',function(s){s.put(window.TLDATA,'tmp')}).then(function(){try{sessionStorage.setItem('pep-tmp','1')}catch(e){}location.reload()},function(){location.reload()});
    }else location.reload();
  }
  function esc(x){return String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
  function nf(n,d){return Number(n).toLocaleString(LOC,{maximumFractionDigits:d||0})}
  function dl(blob,fn){var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=fn;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},600)}
  function facts(data){
    var box=$('facts');if(!box){box=document.createElement('div');box.id='facts';var t=document.querySelector('#overview .tiles');if(!t)return;t.parentNode.insertBefore(box,t)}
    var km=0;(data.acts||[]).forEach(function(a){km+=a.km});
    var F=[],home=data.meta&&data.meta.homeName;
    if(km>=100){var laps=km/40075;F.push(['🌍',laps>=1?L('Έχεις διανύσει <b>'+nf(km)+' χλμ</b>, δηλαδή <b>'+nf(laps,1)+' φορές</b> τον γύρο της Γης.','You have travelled <b>'+nf(km)+' km</b>, that is <b>'+nf(laps,1)+' times</b> around the Earth.'):L('Έχεις διανύσει <b>'+nf(km)+' χλμ</b>, δηλαδή το <b>'+nf(laps*100)+'%</b> του γύρου της Γης.','You have travelled <b>'+nf(km)+' km</b>, that is <b>'+nf(laps*100)+'%</b> of the way around the Earth.')])}
    if(km>=20000)F.push(['🌙',L('Μέχρι τη Σελήνη είναι 384.400 χλμ. Εσύ έχεις κάνει το <b>'+nf(km/384400*100,1)+'%</b> του δρόμου.','The Moon is 384,400 km away. You have done <b>'+nf(km/384400*100,1)+'%</b> of the way.')]);
    var yr={},cd={};
    (data.visits||[]).forEach(function(v){yr[v.y]=(yr[v.y]||0)+1;var pl=data.places[v.p];if(pl&&pl.city!==home){var c=cd[pl.city]||(cd[pl.city]={});c[v.d]=1}});
    var ys=Object.keys(yr).sort(function(a,b){return yr[b]-yr[a]});
    if(ys.length>1)F.push(['📅',L('Η πιο γεμάτη χρονιά ήταν το <b>'+ys[0]+'</b>, με <b>'+nf(yr[ys[0]])+'</b> επισκέψεις σε μέρη.','Your busiest year was <b>'+ys[0]+'</b>, with <b>'+nf(yr[ys[0]])+'</b> visits to places.')]);
    var cs=Object.keys(cd).map(function(k){return[k,Object.keys(cd[k]).length]}).sort(function(a,b){return b[1]-a[1]});
    if(cs.length)F.push(['📍',L('Εκτός από το σπίτι, πήγες πιο συχνά στην περιοχή <b>'+esc(cs[0][0])+'</b>: σε <b>'+nf(cs[0][1])+'</b> διαφορετικές ημέρες.','Apart from home, you went most often to <b>'+esc(cs[0][0])+'</b>: on <b>'+nf(cs[0][1])+'</b> different days.')]);
    var tr=(data.trips||[]).slice().sort(function(a,b){return b.days-a.days})[0];
    if(tr)F.push(['🧳',L('Το μεγαλύτερο ταξίδι σου κράτησε <b>'+tr.days+' ημέρες</b> ('+esc(String(tr.places).split(', ').slice(0,2).join(', '))+').','Your longest trip lasted <b>'+tr.days+' days</b> ('+esc(String(tr.places).split(', ').slice(0,2).join(', '))+').')]);
    var fr=(data.trips||[]).slice().sort(function(a,b){return b.far_km-a.far_km})[0];
    if(fr&&fr.far_km>0)F.push(['📏',L('Το πιο μακρινό σου σημείο ήταν <b>'+nf(fr.far_km)+' χλμ</b> από το σπίτι ('+esc(String(fr.places).split(', ')[0])+').','Your farthest point was <b>'+nf(fr.far_km)+' km</b> from home ('+esc(String(fr.places).split(', ')[0])+').')]);
    box.innerHTML=F.slice(0,6).map(function(f){return '<div><i>'+f[0]+'</i><span>'+f[1]+'</span></div>'}).join('');
    box.hidden=!F.length;
  }
  function csvOf(id,fname){
    var t=$(id),rows=[],NL=String.fromCharCode(13,10);
    rows.push([].map.call(t.querySelectorAll('thead th'),function(h){return h.textContent.trim()}));
    [].forEach.call(t.querySelectorAll('tbody tr'),function(tr){if(tr.hidden||tr.style.display==='none')return;rows.push([].map.call(tr.children,function(c){return c.textContent.trim()}))});
    var q=function(x){x=String(x);return(x.indexOf(';')>=0||x.indexOf('"')>=0||x.indexOf(String.fromCharCode(10))>=0)?'"'+x.split('"').join('""')+'"':x};
    var txt=String.fromCharCode(65279)+rows.map(function(r){return r.map(q).join(';')}).join(NL)+NL+NL+GT('Δημιουργήθηκε με Google Timeline by Veagle · ferelis.gr')+NL;
    dl(new Blob([txt],{type:'text/csv;charset=utf-8'}),fname);
  }
  function extras(data){
    facts(data);
    if($('csvAreas'))return;
    [['q-areas','tb-areas','csvAreas','googletimelinebyveagle-perioches.csv'],['q-trips','tb-trips','csvTrips','googletimelinebyveagle-taxidia.csv']].forEach(function(c){
      var inp=$(c[0]);if(!inp)return;var b=document.createElement('button');b.type='button';b.id=c[2];b.className='csvbtn';b.textContent='⬇ Λήψη CSV (Excel)';
      b.title='Κατεβάζει τον πίνακα όπως φαίνεται τώρα, για να τον ανοίξεις στο Excel.';b.onclick=function(){csvOf(c[1],c[3])};inp.insertAdjacentElement('afterend',b)});
    var ctl=document.querySelector('#map .controls');
    if(ctl){var pb=document.createElement('button');pb.type='button';pb.className='pngbtn';pb.textContent='📷 Αποθήκευση εικόνας χάρτη';pb.title='Κατεβάζει τον χάρτη όπως τον βλέπεις τώρα, ως εικόνα PNG.';
      pb.onclick=function(){var cv=$('cv');if(!cv)return;var o=document.createElement('canvas');o.width=cv.width;o.height=cv.height+Math.max(30,Math.round(cv.width/40));var x=o.getContext('2d');x.fillStyle='#050708';x.fillRect(0,0,o.width,o.height);x.drawImage(cv,0,0);x.fillStyle='#9aa6b6';x.font='600 '+Math.max(13,Math.round(o.width/60))+'px system-ui,sans-serif';x.fillText('Google Timeline by Veagle · ferelis.gr',14,o.height-10);o.toBlob(function(b){if(b)dl(b,'googletimelinebyveagle-xartis.png')})};
      ctl.appendChild(pb)}
  }
  function demoJSON(){
    var seed=11;function R(){seed=(seed*16807)%2147483647;return seed/2147483647}
    var S=[],D=864e5,H=36e5;
    function LL(p){return p[0].toFixed(5)+'°, '+p[1].toFixed(5)+'°'}
    function T(day,h){return new Date(day+h*H).toISOString().slice(0,19)+'.000+00:00'}
    function km(a,b){var x=Math.sin((b[0]-a[0])*Math.PI/360),y=Math.sin((b[1]-a[1])*Math.PI/360);return 12742*Math.asin(Math.sqrt(x*x+Math.cos(a[0]*Math.PI/180)*Math.cos(b[0]*Math.PI/180)*y*y))}
    function visit(d,h0,h1,p,t){S.push({startTime:T(d,h0),endTime:T(d,h1),visit:{topCandidate:{semanticType:t||'UNKNOWN',placeLocation:{latLng:LL(p)}}}})}
    function act(d,h0,h1,a,b,t){
      S.push({startTime:T(d,h0),endTime:T(d,h1),activity:{start:{latLng:LL(a)},end:{latLng:LL(b)},distanceMeters:String(Math.round(km(a,b)*1250)),topCandidate:{type:t}}});
      var n=t==='FLYING'?2:9,pts=[];
      for(var i=0;i<=n;i++){var f=i/n,j=(t==='FLYING'||i===0||i===n)?0:(R()-.5)*.012;pts.push({point:LL([a[0]+(b[0]-a[0])*f+j,a[1]+(b[1]-a[1])*f-j]),time:T(d,h0+(h1-h0)*f)})}
      S.push({startTime:T(d,h0),endTime:T(d,h1),timelinePath:pts});
    }
    var HOME=[37.9838,23.7275],WORK=[38.0170,23.7870],CAFE=[37.9755,23.7348],GYM=[37.9921,23.7361],PARK=[37.9715,23.7257],MKT=[37.9795,23.7215],SUN=[37.6496,24.0243],NAF=[37.5675,22.8008],PIR=[37.9420,23.6470];
    var W='WALKING',C='IN_PASSENGER_VEHICLE';
    var OFF=[[0,0],[.006,.01],[-.008,.004],[.002,-.012]];
    var TR=[['2024-03-15',3,[40.6401,22.9444],C],['2024-07-20',7,[35.3387,25.1442],'FLYING'],['2024-10-05',4,[41.9028,12.4964],'FLYING'],['2025-04-18',4,[39.6650,20.8537],C],['2025-08-02',8,[37.1036,25.3764],'IN_FERRY'],['2025-12-27',5,[48.8566,2.3522],'FLYING'],['2026-05-01',3,[37.5675,22.8008],C],['2026-09-05',6,[38.7223,-9.1393],'FLYING']].map(function(t){return{s:Date.parse(t[0]+'T00:00:00Z'),n:t[1],p:t[2],m:t[3]}});
    function dur(a,b,m){var k=km(a,b);return m==='FLYING'?Math.min(5,1.5+k/700):m==='IN_FERRY'?Math.min(6,1+k/30):Math.max(.5,k/70)}
    function go(d,h,a,b,m){var u=dur(a,b,m);act(d,h,h+u,a,b,m);return h+u}
    for(var d=Date.parse('2024-01-01T00:00:00Z');d<=Date.parse('2026-10-31T00:00:00Z');d+=D){
      var tr=null,k=0;
      for(var i=0;i<TR.length;i++)if(d>=TR[i].s&&d<TR[i].s+TR[i].n*D){tr=TR[i];k=Math.round((d-tr.s)/D)}
      var sp=function(j){return[tr.p[0]+OFF[j][0],tr.p[1]+OFF[j][1]]};
      if(tr){
        if(k===0){
          visit(d,0,6,HOME,'HOME');var h=7;
          if(tr.m==='IN_FERRY'){h=go(d,h,HOME,PIR,C);h=go(d,h+.5,PIR,tr.p,'IN_FERRY')}else h=go(d,h,HOME,tr.p,tr.m);
          visit(d,h+.3,h+2,sp(0));visit(d,h+2.5,h+4.5,sp(1));visit(d,Math.max(h+5,20),23.9,sp(3))
        }else if(k===tr.n-1){
          visit(d,0,8,sp(3));visit(d,9,11,sp(2));var h2=11.5;
          if(tr.m==='IN_FERRY'){h2=go(d,h2,tr.p,PIR,'IN_FERRY');h2=go(d,h2+.5,PIR,HOME,C)}else h2=go(d,h2,tr.p,HOME,tr.m);
          visit(d,Math.min(h2+.5,22),23.9,HOME,'HOME')
        }else{visit(d,0,8,sp(3));visit(d,9,12,sp(k%3));visit(d,13,15.5,sp((k+1)%3));visit(d,16.5,19,sp((k+2)%3));visit(d,20,23.9,sp(3))}
        continue;
      }
      var dow=new Date(d).getUTCDay();
      if(dow>=1&&dow<=5){
        visit(d,0,7.4,HOME,'HOME');act(d,7.5,7.8,HOME,CAFE,W);visit(d,7.8,8.4,CAFE);act(d,8.4,9,CAFE,WORK,C);visit(d,9,17,WORK,'WORK');
        if(R()<.4){act(d,17,17.4,WORK,GYM,C);visit(d,17.4,18.6,GYM);act(d,18.6,19,GYM,HOME,C)}else act(d,17,17.6,WORK,HOME,C);
        visit(d,19.2,23.9,HOME,'HOME')
      }else{
        visit(d,0,9.8,HOME,'HOME');
        if(dow===0&&R()<.18){var DS=R()<.5?SUN:NAF;act(d,9.8,11.3,HOME,DS,'MOTORCYCLING');visit(d,11.3,14,DS);act(d,14,15.6,DS,HOME,'MOTORCYCLING');visit(d,16,23.9,HOME,'HOME')}
        else{act(d,10,10.4,HOME,PARK,W);visit(d,10.4,12,PARK);act(d,12,12.3,PARK,MKT,W);visit(d,12.3,13,MKT);act(d,13,13.4,MKT,HOME,W);visit(d,13.6,23.9,HOME,'HOME')}
      }
    }
    return JSON.stringify({semanticSegments:S});
  }
  function runDemo(){$('err').textContent='';try{$('bar').scrollIntoView({block:'center',behavior:'smooth'})}catch(e){}run(new Blob([demoJSON()],{type:'application/json'}),true)}
  var inp=$('file'),drop=$('drop');
  drop.onclick=function(){inp.click()};drop.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();inp.click()}};
  inp.onchange=function(){var f=inp.files[0];if(f){process(f);inp.value=''}};
  ['dragenter','dragover'].forEach(function(t){window.addEventListener(t,function(e){e.preventDefault();if(!$('imp').hidden)drop.classList.add('over')})});
  ['dragleave','drop'].forEach(function(t){window.addEventListener(t,function(e){e.preventDefault();drop.classList.remove('over')})});
  window.addEventListener('drop',function(e){var f=e.dataTransfer&&e.dataTransfer.files[0];if(f&&!$('imp').hidden)process(f)});
  $('btnNew').onclick=showImp;$('btnReal').onclick=showImp;$('btnDemo').onclick=runDemo;$('btnDemo2').onclick=runDemo;
  $('btnBack').onclick=function(){$('imp').hidden=true;$('appwrap').hidden=false;$('tools').hidden=false};
  $('btnDel').onclick=function(){if(confirm(GT('Να διαγραφούν τα αποθηκευμένα δεδομένα από αυτόν τον browser;\\n\\nΤο αρχικό σου αρχείο Timeline.json δεν πειράζεται.')))del().then(function(){location.reload()})};
  document.documentElement.lang=LANG;
  document.title=LANG==='en'?'Google Timeline by Veagle · Google Maps Timeline viewer':'Google Timeline by Veagle · Χρονολόγιο Χαρτών Google';
  trDom(document.body);
  [$('btnLang'),$('btnLang2')].forEach(function(b){b.textContent=LANG==='en'?'EL':'EN';b.setAttribute('aria-label',LANG==='en'?'Ελληνικά':'English');b.title=LANG==='en'?'Ελληνικά':'English';b.onclick=function(){setLang(LANG==='en'?'el':'en')}});
  var fl=null;try{fl=sessionStorage.getItem('pep-tmp');sessionStorage.removeItem('pep-tmp')}catch(e){}
  var tf=fl==='1';
  var first=tf?idb('readonly',function(s){return s.get('tmp')}).then(function(d){idb('readwrite',function(s){s.delete('tmp')}).catch(function(){});return d}).catch(function(){return null}):get();
  if(fl==='demo'){showImp();runDemo()}else first.then(function(d){if(d&&d.places)start(d,!tf);else showImp()}).catch(showImp);
})();
</script>
</body>
</html>
'''
open(H+'/../index.html','w').write(head+css+'\n'+body)
print(os.path.getsize(H+'/../index.html')//1024,'KB',VER)
