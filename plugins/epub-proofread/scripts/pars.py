"""pars.py <in.epub> <outdir> [--lang ko]

Dumps every <p> of each spine file as "[i] EN: …" (source) / "[i] KO: …" (translation) lines into outdir/<file>.txt,
so a reviewer can name paragraphs by index in an ops file for apply_ops.py.
"""
import sys,os,re
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from common import unpack,spine,read,LA
d=unpack(sys.argv[1]); out=sys.argv[2]; os.makedirs(out,exist_ok=True)
for f in spine(d):
    t=read(f); rows=[]
    for i,m in enumerate(re.finditer(r'<p( [^>]*)?>(.*?)</p>',t,re.S)):
        rows.append(f"[{i}] {'KO' if LA in (m.group(1) or '') else 'EN'}: {re.sub(r'\s+',' ',m.group(2)).strip()}")
    open(os.path.join(out,os.path.splitext(os.path.basename(f))[0]+'.txt'),'w',encoding='utf-8').write('\n'.join(rows)+'\n')
print('->',out)
