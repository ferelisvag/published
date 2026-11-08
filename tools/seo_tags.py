#!/usr/bin/env python3
"""Προσθέτει (μόνο όσα λείπουν) canonical, robots, Open Graph, Twitter card και JSON-LD στο <head> κάθε εφαρμογής,
και ξαναγράφει το sitemap.xml. Τρέχει από το root του repo:  python3 tools/seo_tags.py
Δεν πειράζει τίποτα άλλο στις σελίδες. Για το veagle-pc-check πειράζει και το source/landing.template.html."""
import re,os,json,datetime,html
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE='https://ferelisvag.github.io/published/'
# slug: (applicationCategory, operatingSystem, og:locale, εναλλακτική γλώσσα, inLanguage)
APPS={
 'brokeometer':('FinanceApplication','Any (web browser)','el_GR','en_US',['el']),
 'misthos':('FinanceApplication','Any (web browser)','el_GR','en_US',['el']),
 'perfect-egg':('LifestyleApplication','Any (web browser)','el_GR','en_US',['el']),
 'route-planner':('TravelApplication','Any (web browser)','el_GR','en_US',['el']),
 'seismoi':('ReferenceApplication','Any (web browser)','el_GR','en_US',['el']),
 'veagle-notes':('ProductivityApplication','Chrome, Edge (desktop)','el_GR','en_US',['el']),
 'veagle-pc-check':('UtilitiesApplication','Windows 10, Windows 11','en_US','el_GR',['en','el']),
 'veaglefinancecalc':('FinanceApplication','Any (web browser)','el_GR','en_US',['el']),
 'veagle-eye':('UtilitiesApplication','Windows 10, Windows 11','en_US','el_GR',['en','el']),
 'veagleos':('UtilitiesApplication','Any (web browser)','el_GR','en_US',['el','en']),
 'veagleontheroad':('TravelApplication','Any (web browser)','el_GR','en_US',['el']),
 'googletimelinebyveagle':None,   # έχει δικά του tags από το build.py
}
def snippet(slug,t,title,desc):
    cat,osys,loc,alt,langs=t
    url=BASE+slug+'/'
    img=url+('icon-512.png' if os.path.exists(os.path.join(R,slug,'icon-512.png')) else 'icon-192.png')
    ld=json.dumps({"@context":"https://schema.org","@type":"SoftwareApplication" if slug=='veagle-pc-check' else "WebApplication","name":html.unescape(title),"url":url,"description":html.unescape(desc),"applicationCategory":cat,"operatingSystem":osys,"inLanguage":langs,"isAccessibleForFree":True,"offers":{"@type":"Offer","price":"0","priceCurrency":"EUR"},"image":img,"publisher":{"@type":"Person","name":"Vagelis Ferelis","url":"https://ferelis.gr/"}},ensure_ascii=False)
    tags=[
     ('name="robots"','<meta name="robots" content="index,follow,max-image-preview:large">'),
     ('rel="canonical"','<link rel="canonical" href="%s">'%url),
     ('property="og:type"','<meta property="og:type" content="website">'),
     ('property="og:site_name"','<meta property="og:site_name" content="ferelis.gr">'),
     ('property="og:title"','<meta property="og:title" content="%s">'%title),
     ('property="og:description"','<meta property="og:description" content="%s">'%desc),
     ('property="og:url"','<meta property="og:url" content="%s">'%url),
     ('property="og:image"','<meta property="og:image" content="%s">'%img),
     ('property="og:locale"','<meta property="og:locale" content="%s">'%loc),
     ('property="og:locale:alternate"','<meta property="og:locale:alternate" content="%s">'%alt),
     ('name="twitter:card"','<meta name="twitter:card" content="summary">'),
     ('name="twitter:title"','<meta name="twitter:title" content="%s">'%title),
     ('name="twitter:description"','<meta name="twitter:description" content="%s">'%desc),
     ('name="twitter:image"','<meta name="twitter:image" content="%s">'%img),
     ('application/ld+json','<script type="application/ld+json">%s</script>'%ld)]
    return tags
def patch(path,slug,t):
    s=open(path,encoding='utf-8').read()
    m=re.search(r'<title>(.*?)</title>',s,re.S);d=re.search(r'<meta name="description" content="([^"]*)"',s)
    assert m and d,path
    title,desc=html.escape(html.unescape(m.group(1).strip()),quote=True),d.group(1)
    add=[x for k,x in snippet(slug,t,title,desc) if k not in s]
    if not add:return 0
    s=s.replace('</head>','<!-- SEO -->\n'+'\n'.join(add)+'\n</head>',1)
    open(path,'w',encoding='utf-8').write(s);return len(add)
for slug,t in APPS.items():
    if not t:continue
    files=[os.path.join(R,slug,'index.html')]
    if slug=='veagle-pc-check':files.append(os.path.join(R,slug,'source','landing.template.html'))
    for f in files:
        if os.path.exists(f):print(slug,os.path.relpath(f,R),'+%d tags'%patch(f,slug,t))
today=datetime.date.today().isoformat()
urls=[BASE+s+'/' for s in APPS]
open(os.path.join(R,'sitemap.xml'),'w').write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+''.join('  <url><loc>%s</loc><lastmod>%s</lastmod></url>\n'%(u,today) for u in urls)+'</urlset>\n')
print('sitemap.xml',len(urls),'urls')
