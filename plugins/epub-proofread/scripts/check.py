"""check.py <file.epub> [--only] [--lang ko]

Checks an EPUB: XML parses, in-book links resolve, and (bilingual) no translation paragraph follows another
without a source paragraph between; (--only, translation-only edition) lists source paragraphs left untranslated.
Exit code 1 if XML or links are broken.
"""
import sys,os,zipfile,re,posixpath
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from common import LA,SCRIPT_RE
from xml.dom import minidom
from collections import Counter
z=zipfile.ZipFile(sys.argv[1]); ko='--only' in sys.argv or '--ko' in sys.argv
names=[n for n in z.namelist() if re.search(r'\.x?html?$',n)]
txt={n:z.read(n).decode('utf-8') for n in names}
ids={n:set(re.findall(r'\sid="([^"]+)"',t)) for n,t in txt.items()}
xml=[];broken=[];kk=[];left=[]
for n,t in txt.items():
    try: minidom.parseString(t.encode())
    except Exception as e: xml.append((n,str(e)))
    for h,frag in re.findall(r'href="([^"#:]*)#([^"]+)"',t):
        tgt=posixpath.normpath(posixpath.join(posixpath.dirname(n),h)) if h else n
        if tgt in ids and frag not in ids[tgt]: broken.append((n,h,frag))
    kinds=['K' if LA in (m.group(2) or '') else 'E' for m in re.finditer(r'<(p)( [^>]*)?>',t)]
    kk+= [n]*sum(1 for a,b in zip(kinds,kinds[1:]) if a=='K'==b)
    body=t[t.find('<body'):]
    for m in re.finditer(r'<(p|h[1-6])( [^>]*)?>(.*?)</\1>',body,re.S):
        if LA in (m.group(2) or ''): continue
        x=re.sub(r'<[^>]+>','',m.group(3)).strip()
        # Left untranslated: Latin words and none of the target script (for Latin-script targets this can't be told apart; skipped).
        if SCRIPT_RE and len(re.findall(r'[A-Za-z]{3,}',x))>=2 and not SCRIPT_RE.search(x): left.append((n.split('/')[-1],x[:70]))
print(f'xml errors {len(xml)} {xml[:3]}')
print(f'broken links {len(broken)} {broken[:5]}')
if not ko: print(f'translation-after-translation paragraphs {len(kk)} {Counter(kk).most_common(3)}')
else:
    print(f'source paragraphs left {len(left)} by file {Counter(a for a,b in left).most_common(6)}')
    for a,b in left[:10]: print('  ',a,b)
sys.exit(1 if xml or broken else 0)
