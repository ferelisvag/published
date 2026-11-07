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
head=head.replace('<title>Πού έχω πάει</title>','<title>Πού έχω πάει · Χρονολόγιο Χαρτών Google</title>\n<meta name="description" content="Φόρτωσε το Timeline.json από το κινητό σου και δες σε χάρτη πού έχεις πάει: μέρη, διαδρομές, χώρες και ταξίδια. Όλα γίνονται στον browser σου, τίποτα δεν ανεβαίνει πουθενά.">\n<meta name="theme-color" content="#050708">\n<link rel="icon" href="favicon.svg" type="image/svg+xml">\n<link rel="icon" href="icon-192.png" type="image/png" sizes="192x192">\n<link rel="apple-touch-icon" href="apple-touch-icon.png">\n<link rel="manifest" href="manifest.webmanifest">\n<meta name="apple-mobile-web-app-title" content="Πού έχω πάει">')
head=head.replace("--font-anthropic-sans:'IBM Plex Sans',system-ui,sans-serif;--font-anthropic-serif:'Space Grotesk',system-ui,sans-serif;","--font-anthropic-sans:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;--font-anthropic-serif:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;")
assert 'fonts.g' not in head and 'system-ui,-apple-system' in head
a=src.index('<style>\n.tl{');b=src.index('<script src="d3.min.js">')
page=src[a:b];rest=src[b:]
shim,app=re.findall(r'<script>(.*?)</script>',rest,re.S)
def rep(s,o,n):
    assert o in s,o[:40];return s.replace(o,n,1)
app=rep(app,"setView(24.5,38.6,10)","setView(window.TLHOME[1],window.TLHOME[0],10)")
app=rep(app,"['Αθήνα',23.75,38.0,0.5]","['Σπίτι',window.TLHOME[1],window.TLHOME[0],0.5]")
app=re.sub(r"const names=\{GR:.*?\};","const names=new Proxy({},{get:(t,k)=>{try{return new Intl.DisplayNames(['el'],{type:'region'}).of(String(k))}catch(e){return String(k)}}});",app,count=1,flags=re.S)
page=rep(page,'Η έδρα ήταν η Καβάλα και από το 2025 η Αθήνα.','Έδρα θεωρείται το σημείο που το κινητό σου ονόμασε «σπίτι» (<span id="homeName">—</span>).')
d3=open(H+'/d3.min.js').read();assert '</script>' not in d3
outline=json.load(open(H+'/outline.json'))
cities=base64.b64encode(open(H+'/cities.json.gz','rb').read()).decode()
proc=open(H+'/proc.js').read().replace('</script>','<\\/script>')
FOOT='<p class="app-foot">Πού έχω πάει · <a href="https://ferelis.gr" target="_blank" rel="noopener">ferelis.gr</a> · '+VER+'</p>'
css='''<style>
#imp[hidden],#tools[hidden],#appwrap[hidden],#back[hidden]{display:none!important}
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
@media(max-width:600px){#tools{position:static;margin:0 0 10px;justify-content:flex-end}}
</style>'''
INTRO='''<div id="imp" hidden>
<h1>Πού έχω πάει</h1>
<p class="lead">Το κινητό σου θυμάται πού πηγαίνεις (αν έχεις ανοιχτό το «Χρονολόγιο» στους Χάρτες Google). Εδώ φορτώνεις αυτό το αρχείο και βλέπεις τη ζωή σου σε χάρτη: μέρη, διαδρομές, χιλιόμετρα, χώρες και ταξίδια.</p>
<p id="backWrap" hidden><button class="btn" id="btnBack" type="button">← Πίσω στα αποτελέσματά μου</button></p>

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

<h2>Βήμα 1 · Κατέβασε το αρχείο από το κινητό σου</h2>
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

<h2>Βήμα 2 · Φέρε το αρχείο εκεί που θα το ανοίξεις</h2>
<p>Αν θα το ανοίξεις <b>στο ίδιο κινητό</b>, πήγαινε κατευθείαν στο Βήμα 3. Αν θες να το δεις στον <b>υπολογιστή</b> (πιο άνετα), στείλε το αρχείο εκεί με όποιον τρόπο σου αρέσει:</p>
<ul>
<li><b>Google Drive:</b> αν το σώσεις στο Drive από το κινητό, το κατεβάζεις από τον υπολογιστή στο drive.google.com.</li>
<li><b>Email στον εαυτό σου:</b> επισύναψε το αρχείο σε ένα μήνυμα και στείλ' το στη δική σου διεύθυνση.</li>
<li><b>Καλώδιο USB:</b> συνδέεις το κινητό στον υπολογιστή και αντιγράφεις το αρχείο από τον φάκελο «Λήψεις».</li>
<li><b>Viber, Telegram ή WhatsApp</b> σε μήνυμα προς τον εαυτό σου, ή <b>AirDrop</b> αν έχεις iPhone και Mac.</li>
</ul>
<div class="note"><p>Το αρχείο περιέχει <b>όλο το ιστορικό τοποθεσιών σου</b>. Μην το στέλνεις σε άγνωστους και μην το ανεβάζεις σε δημόσιο μέρος.</p></div>

<h2>Βήμα 3 · Φόρτωσέ το εδώ</h2>
<div class="drop" id="drop" tabindex="0" role="button" aria-label="Επιλογή αρχείου Timeline.json"><b>Πάτα εδώ και διάλεξε το Timeline.json</b><span>ή σύρε το αρχείο μέσα σε αυτό το πλαίσιο</span></div>
<input type="file" id="file" hidden>
<label class="opt"><input type="checkbox" id="rem"><div><b>Να θυμάται τα αποτελέσματα αυτός ο υπολογιστής (προαιρετικό)</b><span>Αν το τσεκάρεις, την επόμενη φορά που θα ανοίξεις τη σελίδα δεν θα χρειαστεί να ξαναφορτώσεις το αρχείο. Τα αποτελέσματα μένουν αποθηκευμένα <b>μόνο σε αυτόν τον browser</b>, όχι στο internet. <b>Μην το τσεκάρεις σε υπολογιστή που δεν είναι δικός σου.</b> Αν δεν το τσεκάρεις, μόλις κλείσεις τη σελίδα όλα σβήνουν. Μπορείς να τα σβήσεις όποτε θες με το κουμπί «Διαγραφή δεδομένων».</span></div></label>
<div class="bar" id="bar"><i id="bari"></i></div><div id="stage" style="font-size:14px;color:var(--color-fg-muted)"></div><div class="err" id="err"></div>
<p style="font-size:14px">Αν το αρχείο είναι μεγάλο (πολλές δεκάδες MB), κάνε λίγη υπομονή: συνήθως παίρνει από λίγα δευτερόλεπτα μέχρι ένα λεπτό. Μην κλείσεις τη σελίδα.</p>

<h2>Βήμα 4 · Δες τα αποτελέσματα</h2>
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
<div id="tools" hidden><button id="btnNew" type="button" title="Γυρίζει στις οδηγίες για να φορτώσεις άλλο αρχείο. Δεν σβήνει τίποτα.">Άλλο αρχείο</button><button id="btnDel" type="button" title="Σβήνει ό,τι έχει αποθηκευτεί σε αυτόν τον browser. Θα σε ρωτήσει πρώτα.">Διαγραφή δεδομένων</button></div>
'''+INTRO+'''
<div id="appwrap" hidden>
'''+page+'''
'''+FOOT+'''
</div>
<script>'''+d3+'''</script>
<script type="text/plain" id="app-shim">'''+shim+'''</script>
<script type="text/plain" id="app-main">'''+app+'''</script>
<script type="text/plain" id="proc-src">'''+proc+'''</script>
<script>
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
  function start(data,saved){
    window.TLDATA=data;window.TLHOME=data.meta&&data.meta.home||[38,24.5];hasData=true;
    $('imp').hidden=true;$('appwrap').hidden=false;$('tools').hidden=false;$('btnDel').hidden=!saved;
    var hn=$('homeName');if(hn&&data.meta)hn.textContent=data.meta.homeName;
    if(!started){started=true;inject('app-shim');inject('app-main')}
    else{location.reload()}
  }
  function showImp(){$('imp').hidden=false;$('appwrap').hidden=true;$('tools').hidden=true;$('backWrap').hidden=!(hasData&&started);window.scrollTo(0,0)}
  function setP(p,m){$('bar').style.display='block';$('bari').style.width=Math.round(p*100)+'%';$('stage').textContent=m||''}
  function fail(m){$('err').textContent=m;$('bar').style.display='none';$('stage').textContent=''}
  function process(file){
    $('err').textContent='';
    file.slice(0,300).text().then(function(h){
      if(h.slice(0,2)==='PK')return fail('Αυτό είναι αρχείο ZIP. Άνοιξε (αποσυμπίεσε) το ZIP και διάλεξε το αρχείο που τελειώνει σε .json από μέσα.');
      var t=h.replace(/^\\uFEFF/,'').trim().charAt(0);
      if(t!=='{'&&t!=='[')return fail('Αυτό το αρχείο ('+file.name+') δεν μοιάζει με Timeline.json. Χρειάζεται το αρχείο .json που βγάζει το κινητό από το «Εξαγωγή δεδομένων Χρονολογίου» (Βήμα 1).');
      run(file);
    }).catch(function(){fail('Δεν μπόρεσα να διαβάσω το αρχείο. Δοκίμασε να το διαλέξεις ξανά.')});
  }
  function run(file){
    setP(.01,'Ξεκινάω…');
    var remember=$('rem').checked;
    var wsrc=$('proc-src').textContent+'\\nfunction unpack(b64){var bin=atob(b64),u=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream("gzip"))).text().then(function(t){var c=JSON.parse(t),n=c.rows.length,la=new Float32Array(n),lo=new Float32Array(n),ad=new Uint16Array(n),cc=new Uint16Array(n),nm=new Array(n);for(var i=0;i<n;i++){var p=c.rows[i].split("|");la[i]=+p[0];lo[i]=+p[1];nm[i]=p[2];ad[i]=+p[3];cc[i]=+p[4]}return{n:nm,la:la,lo:lo,ad:ad,cc:cc,admins:c.admins,ccs:c.ccs}})}\\nonmessage=function(e){var m=e.data;m.file.text().then(function(t){return unpack(m.cities).then(function(c){return processTimeline(t,c,m.outline,function(p,s){postMessage({p:p,m:s})})})}).then(function(o){postMessage({done:o})}).catch(function(x){postMessage({err:x&&x.message||String(x)})})};';
    var w;try{w=new Worker(URL.createObjectURL(new Blob([wsrc],{type:'text/javascript'})))}catch(e){return fail('Αυτός ο browser δεν μπορεί να κάνει την επεξεργασία. Δοκίμασε Chrome, Edge ή Firefox.')}
    w.onmessage=function(e){var d=e.data;if(d.p!=null)setP(d.p,d.m);else if(d.err){w.terminate();fail(/JSON|Unexpected|position/.test(d.err)?'Το αρχείο δεν είναι ολόκληρο ή δεν είναι σωστό JSON. Δοκίμασε να το εξαγάγεις ξανά από το κινητό.':/memory|allocation/i.test(d.err)?'Το αρχείο είναι πολύ μεγάλο για αυτή τη συσκευή. Δοκίμασε σε υπολογιστή με Chrome ή Edge.':d.err)}else if(d.done){w.terminate();setP(1,'Έτοιμο!');var fin=function(sv){start(d.done,sv)};if(remember)put(d.done).then(function(){fin(true)},function(){fin(false)});else del().then(function(){fin(false)})}};
    w.onerror=function(e){fail('Κάτι πήγε στραβά στην επεξεργασία ('+(e.message||'άγνωστο σφάλμα')+'). Αν το αρχείο είναι πολύ μεγάλο, δοκίμασε σε υπολογιστή.')};
    w.postMessage({file:file,cities:CITIES_B64,outline:OUTLINE});
  }
  var inp=$('file'),drop=$('drop');
  drop.onclick=function(){inp.click()};drop.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();inp.click()}};
  inp.onchange=function(){var f=inp.files[0];if(f){process(f);inp.value=''}};
  ['dragenter','dragover'].forEach(function(t){window.addEventListener(t,function(e){e.preventDefault();if(!$('imp').hidden)drop.classList.add('over')})});
  ['dragleave','drop'].forEach(function(t){window.addEventListener(t,function(e){e.preventDefault();drop.classList.remove('over')})});
  window.addEventListener('drop',function(e){var f=e.dataTransfer&&e.dataTransfer.files[0];if(f&&!$('imp').hidden)process(f)});
  $('btnNew').onclick=showImp;
  $('btnBack').onclick=function(){$('imp').hidden=true;$('appwrap').hidden=false;$('tools').hidden=false};
  $('btnDel').onclick=function(){if(confirm('Να διαγραφούν τα αποθηκευμένα δεδομένα από αυτόν τον browser;\\n\\nΤο αρχικό σου αρχείο Timeline.json δεν πειράζεται.'))del().then(function(){location.reload()})};
  get().then(function(d){if(d&&d.places)start(d,true);else showImp()}).catch(showImp);
})();
</script>
</body>
</html>
'''
open(H+'/../index.html','w').write(head+css+'\n'+body)
print(os.path.getsize(H+'/../index.html')//1024,'KB',VER)
