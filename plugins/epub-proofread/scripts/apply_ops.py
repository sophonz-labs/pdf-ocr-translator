"""apply_ops.py <in.epub> <opsdir> <out.epub> [--lang ko]

Applies structural repairs written as JSON files in opsdir:
  { "<file name without extension>": { "set": { "<i>": "<new inner html>" }, "delete": [i, ...] } }
Indices are the [i] of pars.py (every <p> in the file, in order). Conflicting edits abort.
"""
import sys,os,re,json,glob
from xml.dom import minidom
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from common import unpack,repack,spine,read,write,LA
src,opsdir,dst=sys.argv[1:4]; d=unpack(src)
ops={}
for jf in sorted(glob.glob(os.path.join(opsdir,'*.json'))):
    for fn,o in json.load(open(jf)).items():
        x=ops.setdefault(fn,{'set':{},'delete':set()})
        for k,v in o.get('set',{}).items():
            if k in x['set']: sys.exit(f'conflict: {fn} [{k}] set twice ({jf})')
            x['set'][k]=v
        x['delete']|=set(o.get('delete',[]))
byname={os.path.splitext(os.path.basename(f))[0]:f for f in spine(d)}
for fn,o in ops.items():
    f=byname[fn]; t=read(f)
    ms=list(re.finditer(r'<p( [^>]*)?>(.*?)</p>',t,re.S))
    for i,m in reversed(list(enumerate(ms))):
        if i in o['delete']: t=t[:m.start()]+t[m.end():]
        elif str(i) in o['set']: t=t[:m.start(2)]+o['set'][str(i)]+t[m.end(2):]
    minidom.parseString(t.encode()); write(f,t)
    kinds=['K' if LA in (m.group(1) or '') else 'E' for m in re.finditer(r'<p( [^>]*)?>(.*?)</p>',t,re.S)]
    print(fn,'set',len(o['set']),'delete',len(o['delete']),'translation-after-translation',sum(a=='K'==b for a,b in zip(kinds,kinds[1:])))
repack(d,dst); print('->',dst)
