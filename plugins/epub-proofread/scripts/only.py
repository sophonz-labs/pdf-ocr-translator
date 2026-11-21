"""only.py <bilingual.epub> <out.epub> "<title in the target language>" [--lang ko]

Translation-only edition: drops the source element in front of each lang="<target>" element (or, inside
li/td, the source text before <br/><span lang>), keeps its ids as <a id> anchors, keeps unpaired source
(bibliography etc.), renames p.tr back to the heading it translated, removes the .75 opacity of the
bilingual layout, sets dc:language, and makes toc.ncx labels the target language.
"""
import sys,re,zipfile,os,glob,tempfile,shutil,html
from xml.dom import minidom
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from common import unpack,repack,spine,read,write,LA,TL,SCRIPT_RE
src,dst,title=sys.argv[1:4]
TAG=re.compile(r'<(/?)([a-zA-Z][\w:.-]*)((?:[^>"\']|"[^"]*"|\'[^\']*\')*?)(/?)>|<!--.*?-->|<\?.*?\?>|<!DOCTYPE[^>]*>',re.S)
INLINE_PARENT={'a','i','em','b','strong','span','small','sup','sub'}
INSIDE={'li','td','th','dt','dd','figcaption','caption'}
def process(t):
    els=[];stack=[]
    for m in TAG.finditer(t):
        if m.group(2) is None: continue
        close,name,attrs,selfc=m.group(1),m.group(2),m.group(3),m.group(4)
        if close:
            while stack:
                e=stack.pop()
                if els[e]['name']==name: els[e]['end']=m.end(); break
        else:
            e=dict(name=name,start=m.start(),ostart=m.end(),attrs=attrs,end=m.end() if selfc else None,parent=stack[-1] if stack else None,ko=LA in attrs)
            els.append(e)
            if not selfc and name not in ('br','img','meta','link','hr'): stack.append(len(els)-1)
            elif name in ('br','img','meta','link','hr'): e['end']=m.end()
    H=SCRIPT_RE
    for i,e in enumerate(els):
        if H and not e['ko'] and e['name'] in ('blockquote','div','ol','ul','table') and e['end'] and H.search(t[e['ostart']:e['end']]):
            # Korean block without lang attr right after an English one of the same kind
            sib=[k for k,x in enumerate(els) if x['parent']==e['parent'] and x['start']<e['start']]
            if sib:
                p=els[sib[-1]]
                if p['name']==e['name'] and p['end'] and not H.search(t[p['ostart']:p['end']]) and t[p['end']:e['start']].strip()=='': e['ko']=True
    kids={}
    for i,e in enumerate(els): kids.setdefault(e['parent'],[]).append(i)
    edits=[]
    for i,e in enumerate(els):
        if not e['ko'] or e['end'] is None: continue
        sib=kids[e['parent']]; k=sib.index(i)
        j=k-1; rm_start=e['start']
        while j>=0 and els[sib[j]]['name']=='br' and t[els[sib[j]]['end']:rm_start].strip()=='' : rm_start=els[sib[j]]['start']; j-=1
        par=els[e['parent']] if e['parent'] is not None else None
        if rm_start<e['start'] and par and par['name'] in INSIDE:
            # <li>source<br/><span lang>translation</span></li>: drop everything before the <br/>
            ids=re.findall(r'\sid="([^"]+)"',t[par['ostart']:rm_start])
            edits.append((par['ostart'],e['start'],''.join(f'<a id="{x}"></a>' for x in ids))); continue
        if j<0: continue
        p=els[sib[j]]
        if p['ko'] or p['end'] is None or t[p['end']:rm_start].strip()!='': continue
        chunk=t[p['start']:rm_start]
        ids=[x for x in re.findall(r'\sid="([^"]+)"',chunk)]
        anchors=''.join(f'<a id="{x}"></a>' for x in ids)
        if e['name'] in ('p','h1','h2','h3','h4','h5','h6','li','td'):
            edits.append((p['start'],rm_start,'')); edits.append((e['ostart'],e['ostart'],anchors))
            if e['name']=='p' and re.fullmatch(r'h[1-6]',p['name']) and t[e['end']-4:e['end']]=='</p>':
                # OCR-built books translate a heading with a p.tr: give the translation the heading's tag
                edits.append((e['start'],e['start']+2,'<'+p['name'])); edits.append((e['end']-4,e['end'],f"</{p['name']}>"))
            pc=re.search(r'\sclass="([^"]*)"',p['attrs'])
            if pc and re.search(r'\sclass="tr"',e['attrs']):
                # p.tr after p.note (OCR footnote): the translation takes the source's class
                o=t.find('class="tr"',e['start'],e['ostart']); edits.append((o,o+len('class="tr"'),f'class="{pc.group(1)}"'))
        else:
            edits.append((p['start'],rm_start,anchors))
    for s,en,r in sorted(edits,key=lambda x:(x[0],x[1]),reverse=True): t=t[:s]+r+t[en:]
    return t,len([1 for x in edits if x[2]!='' or x[1]>x[0]])
tmp=unpack(src); n=0
files=spine(tmp)
# Korean paragraph whose English is the last paragraph of the previous file: move it next to its English
P=re.compile(r'<p\b([^>]*)>(.*?)</p>',re.S)
for pf,f in zip(files,files[1:]):
    t=read(f); ps=list(P.finditer(t))
    if not ps or LA not in ps[0].group(1): continue
    pt=read(pf); pps=list(P.finditer(pt))
    if not pps or LA in pps[-1].group(1): continue
    m=ps[0]; write(f,t[:m.start()]+t[m.end():])
    write(pf,pt[:pps[-1].end()]+'\n'+m.group(0)+pt[pps[-1].end():])
for f in files:
    t=read(f)
    if LA not in t: continue
    t2,c=process(t); n+=c
    t2=re.sub(r'\s*style="opacity:\s*\.75;?"','',t2)   # the bilingual layout's faded translation
    t2=re.sub(r'<html\b[^>]*>',lambda m:re.sub(r'\b((?:xml:)?lang=")[^"]*"',r'\g<1>'+TL+'"',m.group(0)),t2,count=1)
    write(f,t2); minidom.parse(f)
for f in glob.glob(tmp+"/**/*.css",recursive=True):
    c=read(f); write(f,re.sub(r'opacity:\s*\.75;?','',c))
for f in glob.glob(tmp+"/**/*.opf",recursive=True):
    o=read(f); write(f,re.sub(r'(<dc:language[^>]*>)[^<]*',r'\g<1>'+TL,o))
TR=re.compile(r'<(?!html\b|body\b)(\w+)\b[^>]*'+re.escape(LA)+r'[^>]*>(.*?)</\1>',re.S)
def translated_label(ncx,src):
    """Text of the translation element at src (file#id): the one holding the id's anchor, else the next one."""
    path,_,frag=src.partition('#'); path=os.path.normpath(os.path.join(os.path.dirname(ncx),path))
    if not os.path.exists(path): return None
    t=read(path); pos=t.find(f'id="{frag}"') if frag else t.find('<body')
    if pos<0: return None
    for m in TR.finditer(t):
        if m.end()>pos:
            x=re.sub(r'\s+',' ',re.sub(r'<[^>]+>','',m.group(2))).strip()
            return x or None
    return None
for f in glob.glob(tmp+"/**/*.ncx",recursive=True):
    t=open(f,encoding='utf-8').read()
    def point(m):
        # navPoint: label from the translated heading it points at, unless the label already has the target script
        lab_,src=m.group(2),m.group(3)
        if SCRIPT_RE and SCRIPT_RE.search(lab_): return m.group(0)
        x=translated_label(f,src)
        return m.group(0).replace(f'<text>{lab_}</text>',f'<text>{html.escape(x,quote=False)}</text>',1) if x else m.group(0)
    t=re.sub(r'(<navLabel>\s*<text>([^<]*)</text>\s*</navLabel>\s*<content\b[^>]*\bsrc="([^"]+)")',point,t)
    def lab(m):
        s=m.group(1)
        if not SCRIPT_RE: return m.group(0)   # can't tell the languages apart in a label; leave it
        if ' / ' in s and SCRIPT_RE.search(s.split(' / ',1)[1]): return f'<text>{s.split(" / ",1)[1]}</text>'
        h=SCRIPT_RE.search(s)
        if not h: return f'<text>{title}</text>' if m.start()<t.find('<navMap') else m.group(0)
        st=s.rfind(' ',0,h.start())+1
        return f'<text>{s[st:]}</text>'
    t=re.sub(r'<text>([^<]*)</text>',lab,t); open(f,'w',encoding='utf-8').write(t)
repack(tmp,dst); shutil.rmtree(tmp); print(dst,"edits",n)
