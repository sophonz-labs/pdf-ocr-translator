"""doctor.py [--lang ko] -- checks what the pipeline needs and says how to get what's missing."""
import sys,os,importlib.util
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import common
ok=True
def need(cond,what,fix):
    global ok
    print(('ok      ' if cond else 'MISSING ')+what+('' if cond else f'  -> {fix}')); ok&=bool(cond)
need(sys.version_info>=(3,9),f'Python {sys.version.split()[0]} (3.9+)','install Python 3.9 or later')
need(importlib.util.find_spec('fontTools'),'fontTools (font subsetting)','pip install fonttools')
need(importlib.util.find_spec('fitz') or importlib.util.find_spec('pymupdf'),'PyMuPDF (only for structural fixes against the source PDF)','pip install pymupdf')
for t in ('ebook-convert','ebook-meta'):
    try: p=common.calibre(t)
    except SystemExit: p=None
    need(p,f'calibre {t}','install calibre: https://calibre-ebook.com')
if common.TL.split('-')[0]=='ko':
    for n in ('light','medium','bold'):
        need(common.find_font(rf'kopub(world)?batang.*{n}'),f'KoPub Batang {n.title()}','install KoPub Batang from kopus.org, or set PROOF_FONTS to its folder')
sys.exit(0 if ok else 1)
