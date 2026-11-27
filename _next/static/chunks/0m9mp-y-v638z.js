(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,57955,e=>{"use strict";var t=e.i(29969),i=e.i(96423),n=e.i(85684);let a=e=>e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");function l(e){return e.map(e=>{let t=a(e.text);return e.sup&&(t=`<sup>${t}</sup>`),e.italic&&(t=`<i>${t}</i>`),e.bold&&(t=`<b>${t}</b>`),t}).join("")}let r=(e,t,i)=>`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${t}" lang="${t}">
<head><meta charset="UTF-8"/><title>${a(e)}</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
<body>
${i}
</body>
</html>
`,o=`body { margin: 0 4%; line-height: 1.6; }
h1, h2, h3 { line-height: 1.3; text-align: left; page-break-after: avoid; }
h1 { font-size: 1.6em; margin: 2em 0 1em; }
h2 { font-size: 1.3em; margin: 1.6em 0 .8em; }
h3 { font-size: 1.1em; margin: 1.4em 0 .6em; }
p { margin: 0; text-indent: 1.5em; text-align: justify; }
h1 + p, h2 + p, h3 + p, .note + p { text-indent: 0; }
p.note { font-size: .85em; text-indent: 0; margin: .6em 0; opacity: .85; }
sup { font-size: .7em; line-height: 0; }
p.tr { text-indent: 0; margin: .3em 0 .9em; opacity: .75; }
figure { margin: 1em 0; text-align: center; page-break-inside: avoid; }
figure img { max-width: 100%; }
.cover { margin: 0; text-align: center; }
.cover img { max-width: 100%; max-height: 100vh; }
`;e.s(["buildEpub",0,function(e){let m,p,s,c=`urn:uuid:${crypto.randomUUID()}`,g={mimetype:[(0,t.strToU8)("application/epub+zip"),{level:0}],"META-INF/container.xml":(0,t.strToU8)(`<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>
`),"OEBPS/style.css":(0,t.strToU8)(o)},h=e.toc?.length?function(e,t){if(!e.length)return[];let i=e[0].page,n=[];for(let a of t){if(a.page<i)continue;let t=e.findIndex(e=>e.page>a.page||e.page===a.page&&(e.top??0)>=a.top-2);t>=0&&a.title.trim()&&n.push({title:a.title.trim(),level:a.level,at:t})}return n}(e.blocks,e.toc):[],d=function(e,t,i){let a=[];if(t.length){let e=Math.min(...t.map(e=>e.level));for(let i of t)i.level===e&&a.at(-1)?.at!==i.at&&a.push({at:i.at,title:i.title})}else{let t=["h1","h2","h3"].find(t=>e.filter(e=>e.kind===t).length>=2);t&&e.forEach((e,i)=>e.kind===t&&a.push({at:i,title:(0,n.lineText)(e)}))}return a[0]?.at!==0&&a.unshift({at:0,title:t.length?i:""}),a.map((t,i)=>({title:t.title,start:t.at,end:a[i+1]?.at??e.length})).flatMap(e=>Array.from({length:Math.max(1,Math.ceil((e.end-e.start)/300))},(t,i)=>({title:i?"":e.title,start:e.start+300*i,end:Math.min(e.end,e.start+300*i+300)})))}(e.blocks,h,e.title),f=e=>`ch${String(e+1).padStart(3,"0")}.xhtml`,u=new Set(h.map(e=>e.at));d.forEach((n,o)=>{let m=e.blocks.slice(n.start,n.end).map((t,r)=>{let o=u.has(n.start+r)?` id="b${n.start+r}"`:"",m=t.tr?`
<p class="tr" lang="${e.trLang}" xml:lang="${e.trLang}">${(0,i.hasTags)(t.tr)?l((0,i.parseRuns)(t.tr)):a(t.tr)}</p>`:"";if("img"===t.kind)return`<figure${o}><img src="${a(t.src??"")}" alt=""/></figure>`;if("note"===t.kind)return`<p class="note"${o}>${l(t.runs)}</p>${m}`;let p="p"===t.kind?t.runs:t.runs.map(e=>({...e,bold:!1}));return`<${t.kind}${o}>${l(p)}</${t.kind}>${m}`}).join("\n");g[`OEBPS/${f(o)}`]=(0,t.strToU8)(r(n.title||e.title,e.lang,m))});let $=h.length?h.map(e=>{let t;return{title:e.title,level:e.level,href:`${t=e.at,f(d.findIndex(e=>t>=e.start&&t<e.end))}#b${e.at}`}}):d.flatMap((t,i)=>t.title||0===i?[{title:t.title||e.title,level:0,href:f(i)}]:[]);e.cover&&(g["OEBPS/cover.jpg"]=e.cover,g["OEBPS/cover.xhtml"]=(0,t.strToU8)(r(e.title,e.lang,`<section epub:type="cover" class="cover"><img src="cover.jpg" alt="${a(e.title)}"/></section>`)));let v=[...new Set(e.blocks.flatMap(t=>"img"===t.kind&&t.src&&e.images?.has(t.src)?[t.src]:[]))];for(let t of v)g[`OEBPS/${t}`]=e.images.get(t);g["OEBPS/nav.xhtml"]=(0,t.strToU8)(r(e.title,e.lang,`<nav epub:type="toc" id="toc"><h1>${a(e.title)}</h1>
${(m="<ol>",p=0,s=Math.min(...$.map(e=>e.level)),$.forEach((e,t)=>{let i=t?Math.min(e.level-s,p+1):0;t&&(m+=i>p?"\n<ol>":"</li>"+"</ol></li>".repeat(p-i)),m+=`
<li><a href="${e.href}">${a(e.title)}</a>`,p=i}),m+($.length?"</li>"+"</ol></li>".repeat(p):"")+"\n</ol>")}
</nav>`));let x=new Date().toISOString().replace(/\.\d+Z$/,"Z");return g["OEBPS/content.opf"]=(0,t.strToU8)(`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="${e.lang}">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">${c}</dc:identifier>
    <dc:title>${a(e.title)}</dc:title>
    ${e.author?`<dc:creator>${a(e.author)}</dc:creator>`:""}
    <dc:language>${e.lang}</dc:language>
    <meta property="dcterms:modified">${x}</meta>
    ${e.cover?'<meta name="cover" content="cover-image"/>':""}
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="css" href="style.css" media-type="text/css"/>
${e.cover?'    <item id="cover-image" href="cover.jpg" media-type="image/jpeg" properties="cover-image"/>\n    <item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>\n':""}${d.map((e,t)=>`    <item id="c${t+1}" href="${f(t)}" media-type="application/xhtml+xml"/>`).join("\n")}
${v.map((e,t)=>`    <item id="img${t+1}" href="${a(e)}" media-type="image/jpeg"/>`).join("\n")}
  </manifest>
  <spine>
${e.cover?'    <itemref idref="cover"/>\n':""}${d.map((e,t)=>`    <itemref idref="c${t+1}"/>`).join("\n")}
  </spine>
</package>
`),(0,t.zipSync)(g)},"guessLang",0,function(e){let t=e.map(e=>(0,n.lineText)(e)).join("");return(t.match(/[가-힣]/g)??[]).length>.3*(t.match(/[A-Za-z]/g)??[]).length?"ko":"en"}])}]);