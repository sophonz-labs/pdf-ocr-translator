"""extract.py <bilingual.epub> <workdir> [chunk_size=40] [--lang ko]

Pulls every translation element (lang="<target>") of a bilingual EPUB, pairs it with its source
and writes workdir/chunks/cNN.txt for the proofreaders, plus units.json for merge.py.
Works with PDF OCR Translator output (sibling element, or <br/><span lang> inside li/td; p.tr after
headings in OCR-built books) and calibre Ebook Translator output.
Chunk format (EN/KO are labels: source and translation, whatever the languages):
  @@ <id>
  EN: <source, links as ⟦Lk:text⟧, <i>/<b> kept>
  KO: <translation, other markup as ⟦n⟧>
"""
import sys,os,re,json
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import bisect
from common import unpack,spine,read,LA,LA_RE

TAG=re.compile(r'<[^>]+>')
LINK=re.compile(r'<sup\b[^>]*>\s*<a\b[^>]*href[^>]*>.*?</a>\s*</sup>|<a\b[^>]*href=[^>]*>.*?</a>',re.S)
KEEP=re.compile(r'</?(i|b|em|strong)>')   # bare inline tags pass through untouched
BLOCK=('p','h1','h2','h3','h4','h5','h6','li','td','blockquote')
INLINE=('span','a','i','em','b','strong')
INSIDE=('li','td','th','dt','dd','figcaption','caption')   # translation sits inside these, after <br/>

def en_view(s):
    links=[]
    def lk(m):
        links.append(m.group(0)); return f'⟦L{len(links)}:{TAG.sub("",m.group(0)).strip()}⟧'
    s=LINK.sub(lk,s)
    s=re.sub(r'<(em|i)\b[^>]*>','<i>',s); s=re.sub(r'</(em|i)>','</i>',s)
    s=re.sub(r'<(strong|b)\b[^>]*>','<b>',s); s=re.sub(r'</(strong|b)>','</b>',s)
    s=re.sub(r'<br[^>]*>',' / ',s); s=re.sub(r'<(?!/?[ib]>)[^>]+>','',s)
    return re.sub(r'\s+',' ',s).strip(),links

def protect(s):
    """Markup becomes ⟦n⟧ except bare <i>/<b>/<em>/<strong> pairs; a closing tag follows its opening tag's fate."""
    tbl=[]; stack={}
    def r(m):
        t=m.group(0); g=re.fullmatch(r'<(/?)(i|b|em|strong)\b[^>]*>',t)
        if g:
            if not g.group(1):
                keep=KEEP.fullmatch(t) is not None; stack.setdefault(g.group(2),[]).append(keep)
                if keep: return t
            elif stack.get(g.group(2)) and stack[g.group(2)].pop(): return t
        tbl.append(t); return f'⟦{len(tbl)}⟧'
    return re.sub(r'\s+',' ',TAG.sub(r,s)).strip(),tbl

def main(src,work,size=40):
    d=unpack(src,os.path.join(work,'epub')); files=spine(d)
    units=[]; prev_last={}   # tag -> (file, match) of last English element in the previous file
    for f in files:
        t=read(f); rel=os.path.relpath(f,d); n=0; stem=os.path.splitext(os.path.basename(f))[0]
        taken=[]
        # Source candidates: block elements without the target lang, by end offset.
        srcs=sorted((e for tag in BLOCK for e in re.finditer(r'<'+tag+r'\b([^>]*)>(.*?)</'+tag+'>',t,re.S) if LA not in e.group(1)),key=lambda e:e.end())
        ends=[e.end() for e in srcs]
        inside=[e for e in re.finditer(r'<('+'|'.join(INSIDE)+r')\b[^>]*>',t)]; istarts=[e.start() for e in inside]
        for m in re.finditer(r'<('+'|'.join(BLOCK)+r')\b([^>]*'+LA_RE+r'[^>]*)>(.*?)</\1>',t,re.S):
            tag=m.group(1); taken.append((m.start(),m.end()))
            k=bisect.bisect_right(ends,m.start())
            en_file,e=rel,None
            if k and re.fullmatch(r'(\s|<br[^>]*>)*',t[srcs[k-1].end():m.start()]): e=srcs[k-1]   # any block kind: h1 + p.tr pairs too
            elif not k and tag in prev_last: en_file,e=prev_last[tag]   # source sits at the end of the previous file
            en,links=en_view(e.group(2)) if e else ('',[])
            ko,tbl=protect(m.group(3))
            units.append(dict(id=f'{stem}-{n}',file=rel,kind='block',start=m.start(3),end=m.end(3),ostart=m.start(),oend=m.end(),
                              en_file=en_file,en=en,links=links,ko=ko,tbl=tbl)); n+=1
        for m in re.finditer(r'<('+'|'.join(INLINE)+r')\b([^>]*'+LA_RE+r'[^>]*)>(.*?)</\1>',t,re.S):
            if any(a<=m.start()<b for a,b in taken): continue
            k=bisect.bisect_right(istarts,m.start()); par=inside[k-1] if k else None
            links=[]
            if par and f'</{par.group(1)}' not in t[par.end():m.start()]:
                # <li>source<br/><span lang>translation</span></li>: the source is the element's text before the <br/>
                en,links=en_view(re.sub(r'(<br[^>]*>\s*)+$','',t[par.end():m.start()].rstrip()))
            else:
                before=TAG.sub(' ',t[max(0,m.start()-400):m.start()])
                en=re.sub(r'\s+',' ',before).strip()[-120:]
            ko,tbl=protect(m.group(3))
            units.append(dict(id=f'{stem}-{n}',file=rel,kind='inline',start=m.start(3),end=m.end(3),ostart=m.start(),oend=m.end(),
                              en_file=rel,en=en,links=links,ko=ko,tbl=tbl)); n+=1
        prev_last={}
        for tag in BLOCK:
            ens=[e for e in re.finditer(r'<'+tag+r'\b([^>]*)>(.*?)</'+tag+'>',t,re.S)]
            if ens and LA not in ens[-1].group(1) and LA not in t[ens[-1].end():]: prev_last[tag]=(rel,ens[-1])
    json.dump(units,open(os.path.join(work,'units.json'),'w'),ensure_ascii=False)
    cd=os.path.join(work,'chunks'); os.makedirs(cd,exist_ok=True); os.makedirs(os.path.join(work,'out'),exist_ok=True)
    for i in range(0,len(units),size):
        with open(os.path.join(cd,f'c{i//size:03d}.txt'),'w',encoding='utf-8') as o:
            for u in units[i:i+size]: o.write(f"@@ {u['id']}\nEN: {u['en']}\nKO: {u['ko']}\n\n")
    print(f"units {len(units)} (inline {sum(u['kind']=='inline' for u in units)}, no-EN {sum(not u['en'] for u in units)}), chunks {(len(units)+size-1)//size} -> {cd}")

if __name__=='__main__':
    main(sys.argv[1],sys.argv[2],int(sys.argv[3]) if len(sys.argv)>3 else 40)
