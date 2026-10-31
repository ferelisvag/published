import json, pathlib, sys
root = pathlib.Path(__file__).resolve().parent.parent
tpl = (root/'app'/'template.html').read_text(encoding='utf-8')
def make(src, dst):
    obj = json.loads((root/'tools'/src).read_text(encoding='utf-8'))
    if src == 'sample-data.json':
        obj['meta']['root'] = 'C:\\Users\\demo\\Desktop\\VEAGLE-PC-Check'
        obj['previous'] = json.loads((root/'tools'/'sample-older.json').read_text(encoding='utf-8'))
    data = json.dumps(obj, separators=(',',':')).replace('</','<\\/')
    (root/'tools'/dst).write_text(tpl.replace('/*__PCDATA__*/null', data), encoding='utf-8')
make('sample-data.json', 'sample-report.html')
make('sample-win10-laptop.json', 'sample-win10-laptop.html')
print('reports written')
