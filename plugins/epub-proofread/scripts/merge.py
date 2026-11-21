"""merge.py <workdir> <out.epub>

Reads corrected chunks from workdir/out/*.txt (same @@ ids as chunks/, one translation line per id),
validates the markup and writes the corrected bilingual EPUB. A unit that fails validation
keeps its original Korean and is listed in the report. A line "=EN" (or "=SRC") removes that translation element.
"""
import sys,os,re,json,glob,shutil
from xml.dom import minidom
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from common import repack,read,write

def load(work):
    new={}
    for f in sorted(glob.glob(os.path.join(work,'out','*.txt'))):
        for blk in re.split(r'^@@ ',read(f),flags=re.M)[1:]:
            i,_,t=blk.partition('\n'); new[i.strip()]=t.strip()
    return new

def clean(k):
    SUPA=r'<sup[^>]*>\s*<a [^>]*>'
    for _ in range(3):   # drop note-link groups a translator left empty
        k=re.sub(SUPA+r'\s*</a>\s*</sup>','',k)
    return k

def render(u,k,errs):
    if k in ('=EN','=SRC'): return None
    ph=sorted(int(x) for x in re.findall(r'⟦(\d+)⟧',k)); lk=sorted(int(x) for x in re.findall(r'⟦L(\d+)⟧',k))
    why=None
    if ph!=list(range(1,len(u['tbl'])+1)): why=f'placeholders {ph} != 1..{len(u["tbl"])}'
    elif lk!=list(range(1,len(u['links'])+1)): why=f'links {lk} != 1..{len(u["links"])}'
    elif re.search(r'<(?!/?(i|b|em|strong)>)',k) or '\n' in k: why='bad markup'
    elif any(k.count(f'<{a}>')!=k.count(f'</{a}>') for a in ('i','b','em','strong')): why='unbalanced tag'
    if why: errs.append((u['id'],why)); return False
    k=re.sub(r'&(?!#\d+;|#x[0-9a-fA-F]+;|amp;|lt;|gt;|quot;|apos;)','&amp;',k)
    k=re.sub(r'⟦L(\d+)⟧',lambda m:re.sub(r'\s+id="[^"]*"','',u['links'][int(m.group(1))-1]),k)   # ids stay unique: the English copy keeps them
    k=re.sub(r'⟦(\d+)⟧',lambda m:u['tbl'][int(m.group(1))-1],k)
    return clean(k)

def main(work,dst):
    U=json.load(open(os.path.join(work,'units.json'))); new=load(work)
    src=os.path.join(work,'epub'); build=os.path.join(work,'build')
    shutil.rmtree(build,ignore_errors=True); shutil.copytree(src,build)
    errs=[]; edits={}; missing=[u['id'] for u in U if u['id'] not in new]
    for u in U:
        if u['id'] not in new: continue
        r=render(u,new[u['id']],errs)
        if r is None: edits.setdefault(u['file'],[]).append((u['ostart'],u['oend'],''))
        elif r is not False: edits.setdefault(u['file'],[]).append((u['start'],u['end'],r))
    bad=[]
    for rel,es in edits.items():
        f=os.path.join(build,rel); t=read(f)
        for s,e,r in sorted(es,reverse=True): t=t[:s]+r+t[e:]
        write(f,t)
        try: minidom.parseString(t.encode())
        except Exception as ex: bad.append((rel,str(ex)))
    if bad: print('XML ERRORS, not packed:',bad[:5]); sys.exit(1)
    repack(build,dst)
    print(f'units {len(U)}, corrected {len(new)}, missing {len(missing)} {missing[:5]}, rejected {len(errs)}')
    for i,w in errs[:30]: print('  rejected',i,w)
    print('->',dst)

if __name__=='__main__': main(sys.argv[1],sys.argv[2])
