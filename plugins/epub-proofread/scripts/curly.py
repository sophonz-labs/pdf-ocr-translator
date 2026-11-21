# usage: curly.py in.epub out.epub [--lang ko] -- straight quotes -> curly, inside translation elements only
import sys,zipfile,re,os
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from common import LA_RE
from xml.dom import minidom
OPENERS=set(' \t\n ([{—–-/‘“「『')
def fix(inner,st):
    out=[];prev=' '
    for seg in re.split(r'(<[^>]+>)',inner.replace('&quot;','"')):
        if seg.startswith('<'): out.append(seg); continue
        s=list(seg)
        for i,ch in enumerate(s):
            if ch in '"\'':
                nxt=s[i+1] if i+1<len(s) else ''
                if ch=="'" and prev.isalnum() and nxt.isalnum(): s[i]='’'  # apostrophe
                else:
                    op=prev in OPENERS
                    s[i]=('“' if op else '”') if ch=='"' else ('‘' if op else '’')
                st[s[i]]=st.get(s[i],0)+1
            prev=s[i]
        out.append(''.join(s))
    return ''.join(out)
src,dst=sys.argv[1:3]; zi=zipfile.ZipFile(src); zo=zipfile.ZipFile(dst+'.tmp','w'); st={}; bad=0
for it in zi.infolist():
    d=zi.read(it.filename)
    if re.search(r'\.x?html?$',it.filename):
        t=d.decode()
        def rep(m):
            global bad
            new=fix(m.group(3),st)
            txt=re.sub(r'<[^>]+>','',new)
            if txt.count('“')!=txt.count('”'): bad+=1
            return m.group(1)+m.group(2)+new+m.group(4)
        t=re.sub(r'(<(\w+)[^>]*'+LA_RE+r'[^>]*>)()(.*?)(?=</\2>)',lambda m:m.group(1)+fix(m.group(4),st),t,flags=re.S)
        minidom.parseString(t.encode()); d=t.encode()
    zo.writestr(it,d,compress_type=zipfile.ZIP_STORED if it.filename=='mimetype' else zipfile.ZIP_DEFLATED)
zo.close(); os.replace(dst+'.tmp',dst); print(dst,st)
