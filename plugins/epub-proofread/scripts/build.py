"""build.py <corrected bilingual.epub> <outdir> "<base name>" "<title in the target language>" [--lang ko] [--no-curly]

Makes the four deliverables in outdir:
  <base> - 교정본.epub/.pdf          bilingual, fonts embedded
  <base> - 교정본 (<lang>만).epub/.pdf translation only
Steps: curly quotes in the translation -> only.py -> fonts/CSS -> calibre PDF (justified) -> check.
"""
import sys,os,subprocess,tempfile,shutil
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from common import TL,calibre
H=os.path.dirname(os.path.abspath(__file__)); PY=sys.executable
src,out,base,title=sys.argv[1:5]
curly='--no-curly' not in sys.argv and TL.split('-')[0] not in ('ja','zh')   # CJK other than Korean uses its own quotes
run=lambda *a: subprocess.run(list(a),check=True)
L=['--lang',TL]
os.makedirs(out,exist_ok=True)
tmp=tempfile.mkdtemp(); bi=os.path.join(tmp,'bi.epub'); only=os.path.join(tmp,'only.epub')
if curly: run(PY,f'{H}/curly.py',src,bi,*L)
else: shutil.copy(src,bi)
run(PY,f'{H}/only.py',bi,only,title,*L)
label={'ko':'한국어','en':'영어','ja':'일본어','zh':'중국어'}.get(TL.split('-')[0],TL)
for s,name,t in ((bi,f'{base} - 교정본',None),(only,f'{base} - 교정본 ({label}만)',title)):
    e=os.path.join(out,name+'.epub')
    run(PY,f'{H}/fontify.py',s,e,*L)
    if t: run(calibre('ebook-meta'),e,'-t',t,'-l',TL)
    run(calibre('ebook-convert'),e,os.path.join(out,name+'.pdf'),'--change-justification','justify')
    subprocess.run([PY,f'{H}/check.py',e,*L]+(['--only'] if t else []))
shutil.rmtree(tmp)
