"""fontify.py in.epub out.epub [--lang ko]

Embeds subset fonts and forces them in CSS: Noto Serif (bundled, Latin/Greek/Cyrillic) plus, for Korean,
KoPub Batang from the installed fonts (not bundled: its licence doesn't clearly allow redistribution).
Weights: body Light, b/strong 500 (Regular / Medium), headings Bold.
"""
import sys,os,re,zipfile,shutil,tempfile,subprocess,html,glob
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from common import TL,find_font
FD=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),"fonts")
FONTS=[("Noto Serif","normal","normal",f"{FD}/NotoSerif-Light.ttf"),("Noto Serif","500","normal",f"{FD}/NotoSerif-Regular.ttf"),("Noto Serif","bold","normal",f"{FD}/NotoSerif-Bold.ttf"),
       ("Noto Serif","normal","italic",f"{FD}/NotoSerif-LightItalic.ttf"),("Noto Serif","500","italic",f"{FD}/NotoSerif-Italic.ttf"),("Noto Serif","bold","italic",f"{FD}/NotoSerif-BoldItalic.ttf")]
SECOND=""   # the target script's family, after Noto Serif in font-family
if TL.split('-')[0]=='ko':
    kp={w:find_font(rf'kopub(world)?batang.*{n}') for w,n in (("normal","light"),("500","medium"),("bold","bold"))}
    if not all(kp.values()):
        sys.exit("KoPub Batang (Light, Medium, Bold) not found among installed fonts. Install it from the official site "
                 "(Korean Publishers Society, kopus.org) or set PROOF_FONTS to the folder that holds it.")
    FONTS+=[("KoPub Batang",w,"normal",p) for w,p in kp.items()]; SECOND='"KoPub Batang",'
else:
    print(f"note: only Noto Serif is embedded; {TL} characters it lacks use the reader's serif font")
src,dst=sys.argv[1],sys.argv[2]
tmp=tempfile.mkdtemp(); zipfile.ZipFile(src).extractall(tmp)
opf=glob.glob(tmp+"/**/*.opf",recursive=True)[0]; opfdir=os.path.dirname(opf)
HB=re.compile(r'(<p\b[^>]*>\s*<(b|strong))((?: [^>]*)?)(>(?:(?!</?\2[ >]).)*</\2>\s*</p>)',re.S)
def mark(m):
    a=m.group(3)
    if 'emb-hd' in a: return m.group(0)
    a=re.sub(r'class="([^"]*)"',r'class="\1 emb-hd"',a) if 'class="' in a else a+' class="emb-hd"'
    return m.group(1)+a+m.group(4)
for f in glob.glob(tmp+"/**/*",recursive=True):
    if re.search(r'\.x?html?$',f):
        t=open(f,encoding='utf-8').read(); t2=HB.sub(mark,t)
        if t2!=t: open(f,"w",encoding='utf-8').write(t2)
chars=set()
for f in glob.glob(tmp+"/**/*",recursive=True):
    if re.search(r'\.(x?html?|ncx)$',f): chars|=set(html.unescape(re.sub(r'<[^>]+>',' ',open(f,encoding='utf-8').read())))
chars|=set(" 0123456789")
txt=os.path.join(tmp,"_chars.txt"); open(txt,"w").write("".join(sorted(chars)))
fdir=os.path.join(opfdir,"fonts"); os.makedirs(fdir,exist_ok=True)
man=[]
def cff_to_ttf(path):
    """CFF (.otf) outlines -> TrueType. calibre's PDF output turns CFF fonts into unnamed Type3 glyphs; TrueType embeds as itself."""
    from fontTools.ttLib import TTFont,newTable
    from fontTools.pens.cu2quPen import Cu2QuPen
    from fontTools.pens.ttGlyphPen import TTGlyphPen
    f=TTFont(path)
    if 'CFF ' not in f: return path
    order=f.getGlyphOrder(); gs=f.getGlyphSet(); glyphs={}
    for n in order:
        pen=TTGlyphPen(gs); gs[n].draw(Cu2QuPen(pen,1.0,reverse_direction=True)); glyphs[n]=pen.glyph()
    f['loca']=newTable('loca'); g=f['glyf']=newTable('glyf'); g.glyphOrder=order; g.glyphs=glyphs
    del f['CFF ']
    if 'VORG' in f: del f['VORG']
    m=f['maxp']; m.tableVersion=0x00010000
    for k in ('maxZones','maxTwilightPoints','maxStorage','maxFunctionDefs','maxInstructionDefs','maxStackElements','maxSizeOfInstructions','maxComponentElements'):
        setattr(m,k,1 if k=='maxZones' else 0)
    f['head'].glyphDataFormat=0
    p=f['post']; p.formatType=2.0; p.extraNames=[]; p.mapping={}
    f.sfntVersion="\x00\x01\x00\x00"
    out=re.sub(r'\.otf$','.ttf',path,flags=re.I); f.save(out)
    if out!=path: os.remove(path)
    return out

FONTS=[(fam,w,st,src,re.sub(r'\s+','',os.path.basename(src))) for fam,w,st,src in FONTS]
for i,(fam,w,st,src,fn) in enumerate(FONTS):
    out=os.path.join(fdir,fn)
    subprocess.run([sys.executable,"-m","fontTools.subset",src,f"--text-file={txt}","--layout-features=*",f"--output-file={out}"],check=True,capture_output=True)
    fn=os.path.basename(cff_to_ttf(out)); FONTS[i]=(fam,w,st,src,fn)
    man.append(fn)
os.remove(txt)
o=open(opf).read()
for i,fn in enumerate(man):
    if f'fonts/{fn}' not in o:
        o=o.replace("</manifest>",f'<item id="emb_font_{i}" href="fonts/{fn}" media-type="application/x-font-truetype"/>\n</manifest>')
open(opf,"w").write(o)
csss=[os.path.join(opfdir,re.sub(r'.*href="([^"]+)".*',r'\1',m)) for m in re.findall(r'<item [^>]*media-type="text/css"[^>]*>',o)]
for c in csss:
    rel=os.path.relpath(fdir,os.path.dirname(c))
    face="".join(f'@font-face{{font-family:"{fam}";font-weight:{w};font-style:{st};src:url("{rel}/{fn}");}}\n' for fam,w,st,_,fn in FONTS)
    rule='p:not(.extract-verse-or-poetry-extv){margin-top:0.45em !important;}\n'
    rule+='b,strong{font-weight:500 !important;}h1,h2,h3,h4,h5,h6,h1 *,h2 *,h3 *,h4 *,h5 *,h6 *,.emb-hd{font-weight:bold !important;}\n'
    rule+='body,p,div,span,a,em,i,strong,b,h1,h2,h3,h4,h5,h6,td,th,li,blockquote,sup,sub,small{font-family:"Noto Serif",'+SECOND+'serif !important;}\n'
    t=open(c).read(); t=re.sub(r'/\* embfonts \*/.*','',t,flags=re.S)
    open(c,"w").write(face+t+"\n/* embfonts */\n"+rule)
if os.path.exists(dst): os.remove(dst)
z=zipfile.ZipFile(dst,"w")
z.write(os.path.join(tmp,"mimetype"),"mimetype",compress_type=zipfile.ZIP_STORED)
for f in sorted(glob.glob(tmp+"/**/*",recursive=True)):
    r=os.path.relpath(f,tmp)
    if os.path.isfile(f) and r!="mimetype" and not os.path.basename(r).startswith('.'): z.write(f,r,compress_type=zipfile.ZIP_DEFLATED)
z.close(); shutil.rmtree(tmp)
print(dst, os.path.getsize(dst)//1024,"KB, css:",len(csss))
