"""pdfsplits.py <source.pdf> <bilingual.epub> [--lang ko]

Finds paragraphs of the source text (Latin script) that start in the middle of a sentence at a PDF page top
(body split by footnotes) or footnote text continuing on the next page, and prints where they are
in the EPUB (file, pars.py index). Use with pars.py output to decide merges for apply_ops.py.
"""
import sys,os,re,statistics
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import fitz
fitz.TOOLS.mupdf_display_errors(False)
from common import unpack,spine,read,LA
doc=fitz.open(sys.argv[1]); d=unpack(sys.argv[2])
norm=lambda s: re.sub(r'[^a-z]','',s.lower())
snips={}
for pn in range(doc.page_count):
    ls=[]
    for b in doc[pn].get_text('dict')['blocks']:
        for l in b.get('lines',[]):
            t=''.join(s['text'] for s in l['spans']).strip()
            if t: ls.append((l['bbox'][1],l['bbox'][0],round(max(s['size'] for s in l['spans'])),t))
    ls.sort()
    if len(ls)<6: continue
    body=statistics.mode([x[2] for x in ls]); top=doc[pn].rect.height*0.09
    bl=[x for x in ls if x[2]==body and x[0]>top]
    if len(bl)<4: continue
    margin=statistics.mode([round(x[1]) for x in bl])
    if bl[0][1]-margin<3 and not re.match(r'^[A-Z][A-Z ]+$',bl[0][3]): snips[norm(bl[0][3])[:24]]=(pn+1,'body continues')
    fl=[x for x in ls if x[2]<body and x[0]>bl[-1][0]-2 and not re.fullmatch(r'\d+',x[3])]
    if fl and not re.match(r'^\d+\.\s',fl[0][3]) and re.match(r'^[a-z(,;]',fl[0][3]): snips[norm(fl[0][3])[:24]]=(pn+1,'footnote continues')
hits=0
for f in spine(d):
    t=read(f)
    for i,m in enumerate(re.finditer(r'<p( [^>]*)?>(.*?)</p>',t,re.S)):
        if LA in (m.group(1) or ''): continue
        x=re.sub(r'<[^>]+>','',m.group(2)).strip()
        k=norm(re.sub(r'^\d+\s+','',x))[:24]; k0=norm(x)[:24]
        for key in {k,k0}:
            if len(key)>=12 and key in snips:
                pg,typ=snips[key]; hits+=1
                print(f'{os.path.splitext(os.path.basename(f))[0]} [{i}] pdf p.{pg} {typ}: {x[:70]}')
                break
        else:
            if re.match(r'^\d{1,3}\s+[a-z]',x): hits+=1; print(f'{os.path.splitext(os.path.basename(f))[0]} [{i}] page-number prefix: {x[:70]}')
print('candidates',hits)
