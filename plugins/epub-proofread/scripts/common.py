"""Shared by the scripts: the target language (--lang, default ko), EPUB unpack/repack/spine, and finders for calibre and fonts.

Every script takes `--lang <code>`: the lang attribute the translation elements carry (ko, en, ja, zh-CN, …).
"""
import os,re,sys,zipfile,glob,shutil,tempfile

def _take_lang():
    if '--lang' in sys.argv:
        i=sys.argv.index('--lang'); v=sys.argv[i+1]; del sys.argv[i:i+2]; return v
    return 'ko'
TL=_take_lang()
LA=f'lang="{TL}"'                      # attribute text of a translation element
LA_RE=r'\blang="'+re.escape(TL)+'"'
# Characters of the target script, where one can tell it from Latin; None for Latin-script targets.
SCRIPT={'ko':'[가-힣]','ja':'[\u3040-\u30ff]','zh':'[\u4e00-\u9fff]'}.get(TL.split('-')[0])
SCRIPT_RE=re.compile(SCRIPT) if SCRIPT else None

def calibre(tool):
    """Path of a calibre command line tool (ebook-convert, ebook-meta)."""
    for p in (shutil.which(tool),f'/Applications/calibre.app/Contents/MacOS/{tool}',rf'C:\Program Files\Calibre2\{tool}.exe'):
        if p and os.path.exists(p): return p
    sys.exit(f'{tool} not found: install calibre (https://calibre-ebook.com)')

FONT_DIRS=[os.environ.get('PROOF_FONTS',''),os.path.expanduser('~/Library/Fonts'),'/Library/Fonts','/System/Library/Fonts',
           os.path.expanduser('~/.local/share/fonts'),os.path.expanduser('~/.fonts'),'/usr/share/fonts','/usr/local/share/fonts',
           r'C:\Windows\Fonts',os.path.join(os.environ.get('LOCALAPPDATA',''),'Microsoft','Windows','Fonts')]
def find_font(*pats):
    """First installed font file whose name matches one of the regexes (case and separators ignored)."""
    for d in FONT_DIRS:
        if not d or not os.path.isdir(d): continue
        for f in sorted(glob.glob(os.path.join(d,'**','*'),recursive=True)):
            if not re.search(r'\.(ttf|otf)$',f,re.I): continue
            n=re.sub(r'[\s_\-]','',os.path.basename(f)).lower()
            if any(re.search(p,n) for p in pats): return f
    return None

def unpack(src,dst=None):
    dst=dst or tempfile.mkdtemp()
    shutil.rmtree(dst,ignore_errors=True); os.makedirs(dst)
    zipfile.ZipFile(src).extractall(dst); return dst

def repack(d,dst):
    tmp=dst+'.tmp'
    z=zipfile.ZipFile(tmp,'w')
    z.write(os.path.join(d,'mimetype'),'mimetype',compress_type=zipfile.ZIP_STORED)
    for f in sorted(glob.glob(d+'/**/*',recursive=True)):
        r=os.path.relpath(f,d)
        if os.path.isfile(f) and r!='mimetype' and not any(p.startswith('.') for p in r.split(os.sep)):
            z.write(f,r,compress_type=zipfile.ZIP_DEFLATED)
    z.close(); os.replace(tmp,dst)

def opf_path(d):
    c=open(os.path.join(d,'META-INF/container.xml'),encoding='utf-8').read()
    return os.path.join(d,re.search(r'full-path="([^"]+)"',c).group(1))

def spine(d):
    """XHTML files in reading order (absolute paths)."""
    opf=opf_path(d); o=open(opf,encoding='utf-8').read(); base=os.path.dirname(opf)
    items={}
    for m in re.finditer(r'<item\b[^>]*>',o):
        a=dict(re.findall(r'([\w:-]+)="([^"]*)"',m.group(0)))
        items[a.get('id')]=a.get('href')
    out=[]
    for idref in re.findall(r'<itemref\b[^>]*idref="([^"]+)"',o):
        h=items.get(idref)
        if h and re.search(r'\.x?html?$',h): out.append(os.path.normpath(os.path.join(base,h.split('#')[0])))
    return out

def read(f): return open(f,encoding='utf-8').read()
def write(f,t): open(f,'w',encoding='utf-8').write(t)
