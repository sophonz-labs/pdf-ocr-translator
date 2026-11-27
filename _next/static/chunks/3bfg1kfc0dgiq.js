(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,18566,(e,t,a)=>{t.exports=e.r(76562)},5155,e=>{"use strict";var t=e.i(43476),a=e.i(71645),r=e.i(18566),n=e.i(22016),i=e.i(83627),s=e.i(43101),o=e.i(53998);let l=["ocr","translate"];function d({lang:e,right:a,onLang:r}){let l=i.J[e];return(0,t.jsxs)("header",{className:"relative left-1/2 flex h-9 w-[min(62rem,calc(100cqw-2rem))] -translate-x-1/2 items-center justify-between gap-4",children:[(0,t.jsxs)(n.default,{href:`/${e}`,className:"flex items-center gap-2.5","aria-label":l.home,children:[(0,t.jsx)(s.f,{size:32}),(0,t.jsx)("span",{className:"text-lg font-semibold tracking-tight",children:"PDF OCR"})]}),(0,t.jsxs)("div",{className:"flex items-center gap-3",children:[(0,t.jsx)("a",{href:"https://github.com/sophonz-labs/pdf-ocr-translator","aria-label":"GitHub",title:"GitHub",className:"rounded-md p-1.5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white",children:(0,t.jsx)(s.$,{className:"size-5"})}),(0,t.jsx)(o.LangSwitch,{lang:e,label:l.langSwitch,onChange:r}),a]})]})}let c=(0,a.createContext)("en");function h({lang:e,children:a}){return(0,t.jsx)(c.Provider,{value:e,children:a})}let u=()=>(0,a.useContext)(c),p=()=>i.J[(0,a.useContext)(c)];async function m(e){let t=[],a=async(r,n)=>{for(let i of r??[]){try{let a="string"==typeof i.dest?await e.getDestination(i.dest):i.dest;if(a?.[0]){let r=("number"==typeof a[0]?a[0]:await e.getPageIndex(a[0]))+1,s=(await e.getPage(r)).getViewport({scale:1}).height,o=a[1]?.name==="XYZ"?a[3]:/^FitB?H$/.test(a[1]?.name??"")?a[2]:null;t.push({title:i.title,level:n,page:r,top:"number"==typeof o?Math.max(0,s-o):0})}}catch{}n<2&&await a(i.items,n+1)}};return await a(await e.getOutline().catch(()=>null),0),t}async function g(e,t){let a=e.getViewport({scale:t}),r=document.createElement("canvas");return r.width=a.width,r.height=a.height,await e.render({canvas:r,viewport:a}).promise,{canvas:r,viewport:a}}let x=async e=>{let t=await new Promise(t=>e.toBlob(t,"image/jpeg",.85));return t?new Uint8Array(await t.arrayBuffer()):void 0};async function b(e){let t=await e.getPage(1),{canvas:a}=await g(t,Math.min(2.5,1200/t.getViewport({scale:1}).width)),r=await x(a);return a.width=a.height=0,r}async function f(e,t,a,r){let n=function({data:e,width:t,height:a},r,n=Math.max(4,Math.round(t/160))){let i=Math.ceil(t/n),s=Math.ceil(a/n),o=t=>(299*e[t]+587*e[t+1]+114*e[t+2])/1e3,l=new Uint32Array(256);for(let t=0;t<e.length;t+=28)l[0|o(t)]++;let d=0,c=255,h=l.reduce((e,t)=>e+t,0);for(let e=0;e<256;e++)if((d+=l[e])>=.9*h){c=e;break}let u=c-50,p=new Float32Array(i*s);for(let e=0;e<a;e+=2)for(let a=0;a<t;a+=2)o((e*t+a)*4)<u&&p[(e/n|0)*i+(a/n|0)]++;let m=n*n/4,g=new Uint8Array(i*s);for(let e=0;e<g.length;e++)g[e]=+(p[e]/m>.06);let x=e=>(e.x1-e.x0)*(e.y1-e.y0);for(let e of r){let t=(e.y1-e.y0)/3;for(let a=Math.max(0,(e.y0-t)/n|0);a<=Math.min(s-1,(e.y1+t)/n|0);a++)for(let r=Math.max(0,(e.x0-t)/n|0);r<=Math.min(i-1,(e.x1+t)/n|0);r++)g[a*i+r]=0}let b=new Uint8Array(g.length);for(let e=0;e<s;e++)for(let t=0;t<i;t++)if(g[e*i+t])for(let a=-1;a<=1;a++)for(let r=-1;r<=1;r++){let n=e+a,o=t+r;n>=0&&n<s&&o>=0&&o<i&&(b[n*i+o]=1)}let f=[],w=new Int32Array(g.length).fill(-1),y=[];for(let e=0;e<b.length;e++){if(!b[e]||w[e]>=0)continue;let o=0,[l,d,c,h]=[i,s,0,0];for(y.length=0,y.push(e),w[e]=e;y.length;){let t=y.pop(),a=t%i,r=t/i|0;for(let n of(o++,l=Math.min(l,a),c=Math.max(c,a),d=Math.min(d,r),h=Math.max(h,r),[t-1,t+1,t-i,t+i]))n<0||n>=b.length||w[n]>=0||!b[n]||(n!==t-1||0!==a)&&(n!==t+1||a!==i-1)&&(w[n]=e,y.push(n))}let u={x0:l*n,y0:d*n,x1:Math.min(t,(c+1)*n),y1:Math.min(a,(h+1)*n)},p=u.x1-u.x0,m=u.y1-u.y0,g=o/((c-l+1)*(h-d+1)),k=l<=1||d<=1||c>=i-2||h>=s-2;p*m<t*a*.015||Math.min(p,m)<.06*t||Math.max(p,m)/Math.min(p,m)>12||g<.3||k&&(p<.2*t||m<.2*a)||r.reduce((e,t)=>e+Math.max(0,Math.min(t.x1,u.x1)-Math.max(t.x0,u.x0))*Math.max(0,Math.min(t.y1,u.y1)-Math.max(t.y0,u.y0)),0)>.35*x(u)||f.push(u)}return f.sort((e,t)=>e.y0-t.y0)}(e.getContext("2d").getImageData(0,0,e.width,e.height),t),i=[];for(let[t,s]of n.entries()){let n=Math.min(1,1600/(s.x1-s.x0)),o=document.createElement("canvas");o.width=Math.round((s.x1-s.x0)*n),o.height=Math.round((s.y1-s.y0)*n),o.getContext("2d").drawImage(e,s.x0,s.y0,s.x1-s.x0,s.y1-s.y0,0,0,o.width,o.height);let l=await x(o);if(o.width=o.height=0,!l)continue;let d=`images/p${a}-${t+1}.jpg`;r.set(d,l),i.push({src:d,x0:s.x0/w,x1:s.x1/w,top:s.y0/w,bottom:s.y1/w})}return i}let w=2.5;async function y(t,a){let r=await e.A(25612);r.GlobalWorkerOptions.workerSrc="/vendor/pdf.worker.min.mjs";let n=await e.A(40947),{textLayerLines:i}=await e.A(16587),s=[],o=await t.arrayBuffer(),l={name:t.name.replace(/\.pdf$/i,""),bytes:o,lines:new Map,layouts:new Map,toc:[],images:new Map};try{let e=await r.getDocument({data:o.slice(0),wasmUrl:"/vendor/pdfjs/wasm/",cMapUrl:"/vendor/pdfjs/cmaps/",standardFontDataUrl:"/vendor/pdfjs/standard_fonts/",iccUrl:"/vendor/pdfjs/iccs/",fontExtraProperties:!0}).promise,t=(await e.getMetadata().catch(()=>null))?.info;l.title=t?.Title?.trim()||void 0,l.author=t?.Author?.trim()||void 0;let d=a.pick(e.numPages);l.toc=await m(e),l.cover=await b(e).catch(()=>void 0);let c=Math.max(1,Math.min(4,(navigator.hardwareConcurrency||2)-1,d.length));a.onOpen(d,c);let h=0,u=new Set([r.OPS.paintImageXObject,r.OPS.paintInlineImageXObject,r.OPS.paintImageXObjectRepeat]),p=e=>a.figures&&!(1===e&&l.cover),x=async()=>{let t=null,r=0;for(;!a.cancelled();){if(h>=d.length)return;let o=d[h++];r=o;let c=performance.now(),m=a.restore?.get(o);if(m){for(let[e,t]of(l.layouts.set(o,m.layout),m.lines&&l.lines.set(o,m.lines),m.images))l.images.set(e,t);a.onPage(o,{status:m.status,progress:1,text:m.text,ms:m.ms});continue}let x=(e,t)=>{let r=l.layouts.get(o),n=(r.figures??[]).flatMap(e=>l.images.has(e.src)?[[e.src,l.images.get(e.src)]]:[]);a.persist?.(o,{status:e,text:t,ms:performance.now()-c,lines:l.lines.get(o),layout:r,images:n})};try{let d=await e.getPage(o),h=d.getViewport({scale:1});if(a.skipText){let e=await d.getTextContent(),t=e.items.map(e=>"str"in e?e.str+(e.hasEOL?"\n":""):"").join("");if(t.trim().length>20){let r=await i(d,e),n=[];if(p(o)&&(await d.getOperatorList()).fnArray.some(e=>u.has(e))){let{canvas:e}=await g(d,w),t=e=>e*w;n=await f(e,r.map(e=>({x0:t(e.x0),x1:t(e.x1),y0:t(e.top),y1:t(e.bottom)})),o,l.images),e.width=e.height=0}l.layouts.set(o,{n:o,width:h.width,height:h.height,lines:r,figures:n}),x("text",t),a.onPage(o,{status:"text",progress:1,text:t,ms:performance.now()-c});continue}}a.onPage(o,{status:"render",progress:0});let{canvas:m,viewport:b}=await g(d,w);t||(t=await n.createWorker(a.lang.split("+"),n.OEM.LSTM_ONLY,{workerPath:"/vendor/worker.min.js",workerBlobURL:!1,corePath:"/vendor",langPath:"/models",gzip:!1,logger:e=>{"recognizing text"===e.status&&a.onProgress(r,e.progress)}}),s.push(t)),a.onPage(o,{status:"ocr"});let{data:y}=await t.recognize(m,{},{text:!0,blocks:!0}),k=(y.blocks??[]).flatMap(e=>e.paragraphs).map(e=>e.lines.filter(e=>e.confidence>=65)),v=k.flat(),z=p(o)?await f(m,v.map(e=>e.bbox),o,l.images):[];m.width=m.height=0;let j=k.filter(e=>e.length).map(e=>e.map(e=>e.text.trim()).join("\n")).join("\n\n");l.lines.set(o,v.map(({text:e,bbox:t})=>{let[a,r]=b.convertToPdfPoint(t.x0,t.y1),[n,i]=b.convertToPdfPoint(t.x1,t.y0);return{text:e.trim(),x:a,y:r,w:n-a,h:i-r}})),l.layouts.set(o,{n:o,width:h.width,height:h.height,lines:v.map(({text:e,bbox:t})=>({runs:[{text:e.trim().replace(/\s+/g," ")}],x0:t.x0/w,x1:t.x1/w,top:t.y0/w,bottom:t.y1/w,size:(t.y1-t.y0)/w*.8})),figures:z}),x("done",j),a.onPage(o,{status:"done",progress:1,text:j,ms:performance.now()-c})}catch(e){console.error(`page ${o}`,e),a.onPage(o,{status:"error",progress:1,ms:performance.now()-c})}}};return await Promise.all(Array.from({length:c},x)),new URLSearchParams(location.search).has("debug")&&Object.assign(window,{__layouts:[...l.layouts.values()]}),l}finally{await Promise.all(s.map(e=>e.terminate()))}}async function k(t){let{buildSearchablePdf:a}=await e.A(23284);return a(t.bytes,t.lines)}async function v(t){let{buildBlocks:a}=await e.A(30467),{buildEpub:r,guessLang:n}=await e.A(33414),i=a([...t.layouts.values()]);return r({...z(t),lang:n(i),blocks:i})}let z=e=>({title:e.title??e.name,author:e.author,toc:e.toc,cover:e.cover,images:e.images});async function j(t){let{buildBlocks:a}=await e.A(30467),{guessLang:r}=await e.A(33414),{toMarkdown:n}=await e.A(78483),{strToU8:i,zipSync:s}=await e.A(80067),o=a([...t.layouts.values()]),l=i(n({...z(t),lang:r(o),blocks:o})),d=o.flatMap(e=>"img"===e.kind&&e.src&&t.images.has(e.src)?[e.src]:[]);return d.length?{bytes:s({[`${t.name}.md`]:l,...Object.fromEntries(d.map(e=>[e,[t.images.get(e),{level:0}]]))}),ext:"zip"}:{bytes:l,ext:"md"}}async function N(t){let{buildBlocks:a}=await e.A(30467),{buildEpub:r,guessLang:n}=await e.A(33414),{applyTranslations:i,blockSources:s,blockTexts:o}=await e.A(96816),l=a([...t.layouts.values()]),d=o(l),c=s(l),h=d.map((e,t)=>e?t:-1).filter(e=>e>=0);return{name:t.name,origin:"ocr",segments:h.map(e=>({tag:l[e].kind,text:d[e],src:c[e]})),build:(e,a,s)=>{let o=Array(l.length);h.forEach((t,a)=>o[t]=e[a]);let d=i(l,o,a);return r({...z(t),lang:"replace"===a?s:n(l),trLang:s,blocks:d})},pdf:async a=>{let[{buildTranslatedPdf:r},{stripTags:n}]=await Promise.all([e.A(65563),e.A(36611)]),i=Array(l.length);h.forEach((e,t)=>i[e]=a[t]&&n(a[t]));let s=await fetch("/fonts/NanumGothic-Regular.ttf").then(e=>e.arrayBuffer());return r(t.bytes,l,i,s)}}}function $(e,t,a){let r=URL.createObjectURL(new Blob([e],{type:a})),n=document.createElement("a");n.href=r,n.download=t,n.click(),setTimeout(()=>URL.revokeObjectURL(r),1e4)}var P=e.i(53262);let S=(e,t)=>{try{return new Intl.DisplayNames([t],{type:"language"}).of(e)??e}catch{return e}};function C({prompt:e}){let r=p().tr,[n,i]=(0,a.useState)(!1),s=async()=>{await navigator.clipboard.writeText(e),i(!0),setTimeout(()=>i(!1),1500)};return(0,t.jsxs)("section",{className:"border-t border-zinc-200 px-5 py-4 dark:border-zinc-800",children:[(0,t.jsxs)("div",{className:"flex flex-wrap items-start justify-between gap-3",children:[(0,t.jsxs)("div",{className:"min-w-0 max-w-xl",children:[(0,t.jsx)("h3",{className:"text-sm font-medium",children:r.agentTitle}),(0,t.jsx)("p",{className:"mt-1 text-xs leading-relaxed text-zinc-500",children:r.agentBody}),(0,t.jsx)("p",{className:"mt-1 text-xs leading-relaxed text-zinc-500",children:r.openClaudeHint})]}),(0,t.jsxs)("div",{className:"flex flex-wrap gap-2",children:[(0,t.jsx)("a",{href:`claude://code/new?q=${encodeURIComponent(e)}`,onClick:s,className:"rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800",children:r.openClaude}),(0,t.jsx)("button",{className:"rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200",onClick:s,children:n?r.copied:r.copyPrompt})]})]}),(0,t.jsxs)("details",{className:"group mt-3",children:[(0,t.jsxs)("summary",{className:"cursor-pointer text-xs text-zinc-500 select-none hover:text-zinc-800 dark:hover:text-zinc-200",children:[(0,t.jsx)("span",{className:"group-open:hidden",children:r.showPrompt}),(0,t.jsx)("span",{className:"hidden group-open:inline",children:r.hidePrompt})]}),(0,t.jsx)("pre",{className:"mt-2 max-h-80 overflow-auto rounded-lg bg-zinc-50 p-3 text-xs leading-relaxed whitespace-pre-wrap text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300",children:e})]})]})}async function M(t,a){let{readEpub:r,writeEpub:n}=await e.A(32116),i=r(new Uint8Array(await t.arrayBuffer()));if(!i.segments.length)throw Error(a);return{name:t.name.replace(/\.epub$/i,""),origin:"epub",segments:i.segments,build:(e,t,a)=>n(i,e,t,a)}}let B={en:{"zh-CN":"Chinese (Simplified)","zh-TW":"Chinese (Traditional)"},ko:{"zh-CN":"중국어(간체)","zh-TW":"중국어(번체)"}},A={};function E({label:e,value:r,onChange:n,auto:i,disabled:s}){let o=(0,a.useSyncExternalStore)(()=>()=>{},()=>!0,()=>!1),l=u(),d=p().tr,c=o?function(e){if(!A[e]){let t=new Intl.DisplayNames([e],{type:"language",fallback:"code"});A[e]=P.LANGS.map(a=>({code:a,name:B[e][a]??(e=>{try{return t.of(e)??e}catch{return e}})(a)})).sort((t,a)=>t.name.localeCompare(a.name,e))}return A[e]}(l):[],h=({code:e,name:a})=>(0,t.jsxs)("option",{value:e,children:[a," · ",e]},e);return(0,t.jsxs)("label",{className:"flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400",children:[e,(0,t.jsxs)("select",{value:r,disabled:s,onChange:e=>n(e.target.value),className:`${R} max-w-48 text-zinc-900 dark:text-zinc-100`,children:[i&&(0,t.jsx)("option",{value:"auto",children:d.auto}),o?(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)("optgroup",{label:d.common,children:P.COMMON_LANGS.map(e=>h(c.find(t=>t.code===e)))}),(0,t.jsx)("optgroup",{label:d.all(c.length),children:c.map(h)})]}):"auto"!==r&&(0,t.jsx)("option",{value:r,children:r})]})]})}let F=new WeakMap,T=0,U=["all","todo","fail","edit"],D=e=>e.length+(e.match(/[\u1100-\u11ff\u2e80-\u9fff\uac00-\ud7af\uff00-\uffef]/g)?.length??0),L="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800",O="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200",R="rounded-md border border-zinc-200 bg-transparent px-1.5 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900";function I({job:e,setJob:r,made:n,onUseMade:i}){let s=p(),o=s.tr,l=s.ocr.epubFailed,[d,c]=(0,a.useState)(""),[h,u]=(0,a.useState)(!1);async function m(e){c(""),u(!0);try{r(await M(e,o.noSegments))}catch(e){c(l(e instanceof Error?e.message:String(e)))}finally{u(!1)}}let[g,x]=(0,a.useState)(!1),b=(0,t.jsx)("input",{type:"file",accept:".epub,application/epub+zip",className:"sr-only",onChange:e=>{let t=e.target.files?.[0];e.target.value="",t&&m(t)}});return(0,t.jsxs)(t.Fragment,{children:[!e&&n&&(0,t.jsxs)("div",{className:"mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50/60 px-5 py-4 dark:border-blue-500/30 dark:bg-blue-500/10",children:[(0,t.jsxs)("div",{className:"min-w-0",children:[(0,t.jsx)("p",{className:"text-sm font-medium",children:o.madeTitle}),(0,t.jsx)("p",{className:"truncate text-xs text-zinc-600 dark:text-zinc-400",children:n})]}),(0,t.jsx)("button",{className:O,onClick:i,children:o.useMade})]}),!e&&(0,t.jsxs)("label",{onDragOver:e=>{e.preventDefault(),x(!0)},onDragLeave:()=>x(!1),onDrop:e=>{e.preventDefault(),x(!1);let t=e.dataTransfer.files[0];t&&m(t)},className:`flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center transition focus-within:ring-2 focus-within:ring-blue-500/40 ${g?"border-blue-500 bg-blue-50/60 dark:bg-blue-500/10":"border-zinc-300 bg-white hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-500"}`,children:[b,(0,t.jsx)("p",{className:"text-sm font-medium",children:h?o.reading:o.drop}),(0,t.jsx)("p",{className:"mt-1 text-xs text-zinc-600 dark:text-zinc-400",children:o.dropHint})]}),d&&(0,t.jsx)("p",{className:"mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400",children:d}),e&&(0,t.jsxs)("section",{className:"rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900",children:[(0,t.jsxs)("div",{className:"flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-3 dark:border-zinc-800",children:[(0,t.jsxs)("div",{className:"min-w-0",children:[(0,t.jsx)("h2",{className:"truncate text-sm font-medium",children:e.name}),(0,t.jsx)("p",{className:"text-xs text-zinc-600 dark:text-zinc-400 tabular-nums",children:o.paragraphs(e.segments.length.toLocaleString())})]}),(0,t.jsxs)("label",{className:`${L} cursor-pointer`,children:[h?o.reading:o.openOther,b]})]}),(0,t.jsx)(K,{job:e},F.get(e)??(F.set(e,++T),T))]})]})}function K({job:r}){var n,i;let s,o,l,d,c,h,m,g,x,b,f=u(),w=p().tr,[y,k]=(0,a.useState)(null),v=r.segments.length,[z,j]=(0,a.useState)("auto"),[N,P]=(0,a.useState)("google"),M=(0,a.useSyncExternalStore)(()=>()=>{},()=>"Translator"in self,()=>!1),[B,A]=(0,a.useState)(u()),[F,T]=(0,a.useState)("both"),[I,H]=(0,a.useState)(()=>Array(v).fill(void 0)),[G,J]=(0,a.useState)(()=>Array(v).fill("")),[W,X]=(0,a.useState)(new Set),[_,q]=(0,a.useState)("all"),[V,Y]=(0,a.useState)(0),[Q,Z]=(0,a.useState)(null),[ee,et]=(0,a.useState)(""),ea=(0,a.useRef)(null),er=(0,a.useMemo)(()=>e.A(55815).then(e=>({m:e,key:e.jobKey(r.name,r.segments.map(e=>e.text))})),[r]),[en,ei]=(0,a.useState)(!1),[es,eo]=(0,a.useState)(0);(0,a.useEffect)(()=>{let e=!0;return er.then(async({m:t,key:a})=>{let r=await t.loadJob(a);e&&(r?.tr.length===v&&(j(r.source),A(r.target),T(r.mode),H(r.tr),J(r.st),eo(r.tr.filter(Boolean).length)),ei(!0))}),()=>{e=!1}},[er,v]),(0,a.useEffect)(()=>{if(!en)return;let e=setTimeout(()=>er.then(({m:e,key:t})=>I.some(Boolean)?e.saveJob(t,{source:z,target:B,mode:F,tr:I,st:G}):e.clearJob(t)),800);return()=>clearTimeout(e)},[en,er,z,B,F,I,G]);let el=G.filter(e=>"ok"===e||"edit"===e).length,ed=G.filter(e=>"fail"===e).length,ec=r.segments.map((e,t)=>t).filter(e=>!I[e]),eh=r.segments.map((e,t)=>t).filter(e=>"all"===_||("todo"===_?!I[e]:G[e]===_)),eu=Math.max(1,Math.ceil(eh.length/30)),ep=eh.slice(30*V,30*V+30),em=!el||Q?2:el===v?4:3;async function eg(t){if(!t.length)return;let{translateTexts:a}=await e.A(96816),n=new AbortController;ea.current=n,et("");try{let i;if("device"===N){let{onDeviceEngine:a,OnDeviceError:s}=await e.A(32958);Z([0,t.length]);let o=t.slice(0,20).map(e=>r.segments[e].text).join("\n");try{i=await a(z,B,o,e=>et(w.downloading(Math.round(100*e))),n.signal),et("")}catch(e){if(e instanceof s)return et(w.onDeviceError[e.reason]);throw e}}await a(r.segments.map(e=>i?e.text:e.src??e.text),B,{only:t,source:z,engine:i,signal:n.signal,onProgress:(e,t)=>Z([e,t]),onResult:(e,t)=>{H(a=>a.with(e,t??a[e])),J(a=>a.with(e,t?"ok":"fail"))}})}catch(e){n.signal.aborted||et(w.stopped(e instanceof Error?e.message:String(e)))}finally{ea.current=null,Z(null)}}let[ex,eb]=(0,a.useState)(!1);async function ef(){eb(!0);try{$(await r.pdf(I),`${r.name}.${B}.pdf`,"application/pdf")}catch(e){et(w.pdfFailed(e instanceof Error?e.message:String(e)))}finally{eb(!1)}}let ew=ep.length>0&&ep.every(e=>W.has(e));return(0,t.jsxs)("div",{children:[(0,t.jsx)("ol",{className:"flex flex-wrap gap-x-5 gap-y-1 border-b border-zinc-200 px-5 py-2.5 text-xs dark:border-zinc-800",children:w.steps.map((e,a)=>(0,t.jsxs)("li",{className:a+1<=em?"font-medium text-zinc-900 dark:text-zinc-100":"text-zinc-400",children:[(0,t.jsx)("span",{className:`mr-1.5 inline-grid h-4 w-4 place-items-center rounded-full text-[10px] ${a+1<em?"bg-blue-600 text-white":a+1===em?"ring-1 ring-blue-600 text-blue-600":"ring-1 ring-zinc-300 dark:ring-zinc-700"}`,children:a+1}),e]},e))}),(0,t.jsxs)("div",{className:"flex flex-wrap items-center gap-2 px-5 pt-3",children:[(0,t.jsx)(E,{label:w.source,value:z,onChange:j,auto:!0,disabled:!!Q}),(0,t.jsx)("span",{"aria-hidden":!0,className:"text-zinc-400",children:"→"}),(0,t.jsx)(E,{label:w.target,value:B,onChange:function(e){(!el||confirm(w.changeTarget))&&(A(e),H(Array(v).fill(void 0)),J(Array(v).fill("")))},disabled:!!Q}),M&&(0,t.jsxs)("label",{className:"flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400",children:[w.engine,(0,t.jsxs)("select",{value:N,disabled:!!Q,onChange:e=>P(e.target.value),className:`${R} text-zinc-900 dark:text-zinc-100`,children:[(0,t.jsx)("option",{value:"google",children:w.google}),(0,t.jsx)("option",{value:"device",children:w.onDevice})]})]}),(0,t.jsxs)("span",{className:"ml-auto text-xs text-zinc-600 dark:text-zinc-400 tabular-nums",children:[w.count(el,v),ed>0&&(0,t.jsxs)("span",{className:"text-red-600",children:[" · ",w.failedCount(ed)]})]}),es>0&&(0,t.jsxs)("p",{className:"w-full text-xs text-zinc-600 dark:text-zinc-400",children:[w.resumed(es)," ·"," ",(0,t.jsx)("button",{className:"underline",disabled:!!Q,onClick:function(){confirm(w.discardConfirm)&&(H(Array(v).fill(void 0)),J(Array(v).fill("")),eo(0))},children:w.discard})]})]}),(0,t.jsxs)("div",{className:"flex flex-wrap items-center gap-2 px-5 py-3",children:[(0,t.jsx)("button",{className:O,disabled:!!Q||!ec.length,onClick:()=>eg(ec),children:w.translateTodo(ec.length.toLocaleString())}),(0,t.jsx)("button",{className:L,disabled:!!Q||!W.size,onClick:()=>eg([...W].sort((e,t)=>e-t)),children:w.retranslate(W.size)}),Q&&(0,t.jsxs)(t.Fragment,{children:[(0,t.jsxs)("span",{className:"text-xs text-zinc-600 dark:text-zinc-400 tabular-nums",children:[Q[0],"/",Q[1]]}),(0,t.jsx)("button",{className:L,onClick:()=>ea.current?.abort(),children:w.cancel})]})]}),Q&&(0,t.jsx)("div",{className:"mx-5 mb-2 h-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800",children:(0,t.jsx)("div",{className:"h-full bg-blue-600 transition-[width]",style:{width:`${Q[0]/Math.max(1,Q[1])*100}%`}})}),ee&&(0,t.jsx)("p",{className:"mx-5 mb-2 text-sm text-red-600",children:ee}),(0,t.jsxs)("div",{className:"flex flex-wrap items-center gap-3 border-y border-zinc-200 px-5 py-2 text-xs dark:border-zinc-800",children:[(0,t.jsxs)("label",{className:"flex items-center gap-1.5",children:[(0,t.jsx)("input",{type:"checkbox",checked:ew,onChange:()=>X(e=>new Set(ew?[...e].filter(e=>!ep.includes(e)):[...e,...ep]))}),w.selectPage]}),W.size>0&&(0,t.jsx)("button",{className:"text-zinc-600 dark:text-zinc-400 underline",onClick:()=>X(new Set),children:w.clear}),(0,t.jsx)("div",{role:"radiogroup","aria-label":w.view,className:"ml-auto inline-flex rounded-md bg-zinc-100 p-0.5 dark:bg-zinc-800",children:U.map(e=>(0,t.jsx)("button",{role:"radio","aria-checked":_===e,onClick:()=>{q(e),Y(0)},className:`rounded px-2 py-1 ${_===e?"bg-white font-medium shadow-sm dark:bg-zinc-950":"text-zinc-600 dark:text-zinc-400"}`,children:w.filters[e]},e))})]}),(0,t.jsxs)("ul",{className:"divide-y divide-zinc-100 dark:divide-zinc-800",children:[ep.map(e=>(0,t.jsxs)("li",{className:"grid gap-2 px-5 py-3 sm:grid-cols-[auto_1fr_1fr]",children:[(0,t.jsxs)("label",{className:"flex items-start gap-2 pt-0.5 text-[11px] text-zinc-400 tabular-nums",children:[(0,t.jsx)("input",{type:"checkbox",checked:W.has(e),onChange:()=>X(t=>{let a=new Set(t);return a.has(e)?a.delete(e):a.add(e),a}),"aria-label":w.select(e+1)}),(0,t.jsxs)("span",{className:"w-10",children:[e+1,(0,t.jsx)("br",{}),r.segments[e].tag]})]}),(0,t.jsx)("p",{className:"max-h-40 overflow-auto text-sm leading-relaxed text-zinc-600 dark:text-zinc-300",children:r.segments[e].text}),(0,t.jsx)("div",{children:(0,t.jsx)("textarea",{"aria-label":w.translation(e+1),value:I[e]??"",placeholder:"fail"===G[e]?w.failPlaceholder:w.todoPlaceholder,rows:Math.min(8,Math.max(2,Math.ceil(Math.max(D(I[e]??""),D(r.segments[e].text))/45))),onChange:t=>{let a=t.target.value;H(t=>t.with(e,a||void 0)),J(t=>t.with(e,a?"edit":""))},className:`w-full resize-y rounded-md border bg-transparent px-2 py-1.5 text-sm leading-relaxed ${"fail"===G[e]?"border-red-300 dark:border-red-500/50":"edit"===G[e]?"border-amber-300 dark:border-amber-500/50":"border-zinc-200 dark:border-zinc-700"}`})})]},e)),!ep.length&&(0,t.jsx)("li",{className:"px-5 py-6 text-center text-sm text-zinc-600 dark:text-zinc-400",children:w.none})]}),(0,t.jsxs)("div",{className:"flex flex-wrap items-center gap-2 border-t border-zinc-200 px-5 py-3 dark:border-zinc-800",children:[(0,t.jsx)("button",{className:L,disabled:0===V,onClick:()=>Y(V-1),children:w.prev}),(0,t.jsxs)("span",{className:"text-xs text-zinc-600 dark:text-zinc-400 tabular-nums",children:[V+1," / ",eu]}),(0,t.jsx)("button",{className:L,disabled:V>=eu-1,onClick:()=>Y(V+1),children:w.next}),(0,t.jsxs)("div",{className:"ml-auto flex items-center gap-2",children:[(0,t.jsxs)("select",{"aria-label":w.layout,value:F,onChange:e=>T(e.target.value),className:R,children:[(0,t.jsx)("option",{value:"both",children:w.both}),(0,t.jsx)("option",{value:"replace",children:w.replace})]}),r.pdf&&(0,t.jsx)("button",{className:L,disabled:!el||!!Q||ex,onClick:ef,children:w.buildPdf}),(0,t.jsx)("button",{className:O,disabled:!el||!!Q,onClick:function(){try{let e=`${r.name}.${B}.epub`;$(r.build(I,F,B),e,"application/epub+zip"),k({file:e,source:z,target:B,mode:F,origin:r.origin,total:v,done:el,failed:ed,edited:G.filter(e=>"edit"===e).length})}catch(e){et(w.buildFailed(e instanceof Error?e.message:String(e)))}},children:w.build})]})]}),y&&(0,t.jsx)(C,{prompt:"ko"===f?(s="auto"===(n=y).source?"원문":S(n.source,"ko"),o=S(n.target,"ko"),l=n.target,d="both"===n.mode,c="replace"===n.mode?`- 원문 텍스트를 번역으로 바꾼 EPUB이다. 요소마다 \`lang="${l}"\`가 달려 있다. 원문의 기울임, 굵게, 위첨자, 링크는 기계 번역이 태그를 지킨 곳에서는 번역으로 옮겨 두었지만, 빠지거나 자리가 어긋난 곳이 있을 수 있다.
- 원문이 이 EPUB에 없다. 원문 EPUB이나 원서 PDF를 함께 받아 문단 순서대로 대조한다. 없으면 먼저 요청한다.`:"ocr"===n.origin?`- 스캔 PDF를 OCR해서 만든 EPUB이다. 원문 블록(\`p\`, \`h1\`~\`h3\`, 각주 \`p.note\`) 바로 뒤에 번역 \`<p class="tr" lang="${l}">\`가 붙는다.
- 원문은 OCR 결과라 오자가 있고, 쪽 머리나 쪽 번호가 일부 남았을 수 있다. 각주는 본문에서 떼어 \`p.note\`로 두었다.`:`- 원문 요소 바로 뒤에 같은 종류의 번역 요소가 붙는다(\`lang="${l}" style="opacity:.75"\`). \`li\`, \`td\`, \`th\`, \`dt\`, \`dd\`, \`figcaption\`, \`caption\`은 같은 요소 안 끝에 \`<br/><span lang="${l}">번역</span>\`으로 들어 있다.
- 원문의 기울임, 굵게, 위첨자, 링크는 기계 번역이 태그를 지킨 곳에서는 번역 쪽에도 옮겨 두었다. 빠지거나 자리가 어긋난 곳이 있을 수 있으니 교정하면서 원문과 대조해 바로잡는다.`,`# 번역 교정 작업 지침

${"auto"===n.source?"원문":`${s} 원문`}과 1차 ${o} 번역이 담긴 EPUB을 교정해 완성본으로 만드는 일이다. 아래 순서와 원칙을 따른다.

## 이 책

- 파일: \`${n.file}\`
- 언어: ${"auto"===n.source?"원문은 자동 감지(본문을 보고 판단)":`${s}(\`${n.source}\`)`} → ${o}(\`${l}\`)
- 배치: ${d?"원문 아래 번역(대역)":"번역만"}
- 문단 ${n.total}개 중 번역 ${n.done}개, 실패 ${n.failed}개, 사람이 고친 문단 ${n.edited}개
- PDF OCR Translator(https://ocr.sophonz.com)에서 ${"ocr"===n.origin?"스캔 PDF를 OCR해 만든 EPUB을":"가지고 있던 EPUB을"} Google 번역으로 1차 번역했다. 사람이 고친 문단은 의도가 있으니 신중히 다룬다.

## 도구

Claude Code에서 작업한다면 epub-proofread 플러그인의 \`proofread\` 스킬(\`/epub-proofread:proofread\`)로 진행한다. 아래 작업 순서의 추출\xb7병합\xb7번역만 남긴 판\xb7글꼴\xb7PDF를 스크립트가 처리한다.

- 설치돼 있지 않으면 먼저 사용자에게 설치를 제안한다. Claude 데스크톱 앱이면 Customize → Plugins → Add → Add marketplace에 \`sophonz-labs/pdf-ocr-translator\`를 넣고 EPUB Proofread를 추가한다. 터미널이면 \`claude plugin install epub-proofread --marketplace sophonz-labs/pdf-ocr-translator\`를 실행한다. 그 뒤 세션에서 \`/reload-plugins\`를 입력하거나 새 세션을 연다.
- 스킬을 쓸 때는 \`--lang ${l}\`를 넘긴다.
- 플러그인을 쓸 수 없는 환경이면 아래 지침을 직접 따른다.

## 입력 형식

${c}
- 번역에 실패한 문단은 번역이 비어 있다. 새로 번역한다.
- 원서 PDF가 있으면 구조를 판단하는 기준으로 쓴다.

## 목표와 원칙

산출물은 셋이다.

- 교정한 대역 EPUB과 PDF(원문 문단 뒤에 번역 문단)
- ${o}만 남긴 EPUB과 PDF
- 용어집 \`glossary.md\`

원칙:

- 같은 원어 용어는 책 전체에서 같은 말로 옮긴다.
- 원문에 충실하되 자연스러운 ${o}로 쓴다.
- 이미 맞고 자연스러운 번역은 그대로 둔다. 과잉 윤문하지 않는다.
- 확인하지 않은 것을 확인했다고 하지 않는다.

## 작업 순서

### 1. 조사

책 전체의 파일, 문단 수, 원문\xb7번역 짝 수를 센다. 짝이 없는 문단, 문체와 고유명사 표기가 섞인 정도를 표본으로 본다.

### 2. 용어집

반복 용어, 인명\xb7지명, 작품과 장 제목을 뽑고 1차 번역이 실제로 어떻게 옮겼는지 함께 적는다. \`| 원어 | 번역 | 쓰지 않음 |\` 표로 정리하고, 맨 앞에 번역 원칙(문체, 외래어 표기, 제목 표기, 서지 정보 처리, 각주 번호 처리)을 정한다. ${o}의 표준 표기법과 출판 관례를 따른다.${"ko"===n.target?" 한국어라면 본문 한다체, 국립국어원 외래어 표기법, 책 제목 『』·글 제목 「」가 기본이다.":""} 책의 성격에 맞는 규칙(호칭, 존칭 등)을 더한다.

### 3. 구조 교정

스캔에서 온 책은 쪽 경계에서 손상이 생긴다. 번역 교정 전에 원서 PDF와 대조해 고친다.

- 쪽 경계에서 끊긴 문단을 합치고, 끼어든 쪽 번호\xb7쪽 머리를 지운다.
- 다음 쪽으로 이어진 각주와 인용을 합치고, 줄 끝 하이픈으로 끊긴 단어를 잇는다.
- 본문과 각주에 서로 끼어든 조각을 제자리로 옮긴다.
- 의미 없는 OCR 조각은 원문과 번역을 함께 지운다.

원문과 번역은 항상 짝으로 움직인다. 원문을 합치면 번역도 합치고, 합친 번역은 이어 붙이지 말고 한 문단으로 다시 번역한다. 쪽 경계와 무관한 OCR 오타는 이 단계에서 건드리지 않는다.

### 4. 번역 교정

수십~백여 문단씩 덩어리로 나눠, 문단마다 원문과 1차 번역을 나란히 놓고 고친다.

- 오역, 누락, 덧붙임, 뜻이 뒤집힌 곳, 숫자\xb7연도\xb7인명 오류를 고친다.
- 용어집의 용어, 표기, 문체를 적용한다.
- 절 번호, 강조, 각주 표시는 원문 위치에 맞춰 둔다. 시는 행을 나눠 옮긴다.
- 서지 정보, 약어처럼 원어로 둘 것은 그대로 둔다.

마크업은 깨지지 않게 다룬다. 태그와 각주 링크는 자리표시자로 바꿔 넘기고, 돌려받을 때 개수와 짝이 맞는지 스크립트로 확인한다. 허용하는 인라인 태그는 최소로(예: \`<i>\`, \`<b>\`) 둔다.

### 5. 병합과 검증

교정 결과를 XHTML에 되돌려 넣고 확인한다.

- 모든 XHTML이 XML로 파싱된다.
- 원문\xb7번역 짝이 어긋나지 않는다(번역 문단이 연달아 나오지 않는다).
- 빈 각주 링크가 남지 않았고, 차례와 앵커가 살아 있다.

EPUB으로 다시 묶을 때 \`mimetype\`을 압축하지 않고 첫 항목에 넣는다. 제목, 저자, 표지 메타데이터를 채운다.

### 6. ${o}만 남긴 판
${d?'\n- 번역 요소 앞의 짝 원문을 지운다. 요소 안에 `<br/><span>`으로 들어간 번역은 원문 부분과 `<br/>`를 지운다.\n- 지운 원문에 있던 `id`는 번역 앞에 `<a id="…"></a>`로 옮겨 각주 역링크와 차례가 깨지지 않게 한다.':`
- 이 EPUB은 이미 번역만 담고 있다. 남은 원문 문단을 찾아 번역한다.`}
- 짝 없는 원문(참고문헌, 원어 서지)은 남긴다. 차례와 메타데이터 제목은 ${o}로, \`dc:language\`는 \`${l}\`로 한다.
- 남은 원문 본문(출판사 고지, 안내 링크 등)을 찾아 번역한다.

### 7. 조판

글꼴과 PDF 설정은 아래로 정해져 있다. 임의로 바꾸지 않는다.

- 글꼴: 라틴 문자는 Noto Serif, ${"ko"===n.target?"한글은 KoPub바탕":`${o} 문자는 그 문자를 지원하는 Noto Serif 계열(예: Noto Serif JP, Noto Serif SC)`}을 쓴다. 파일을 EPUB에 넣고, 책에 쓰인 글자만 남기도록 \`pyftsubset\`으로 서브셋한다.

| 쓰임 | weight | 라틴 문자 | ${"ko"===n.target?"한글":o} |
|---|---|---|---|
| 본문 | normal | Noto Serif Light | ${"ko"===n.target?"KoPub바탕 Light":"Light 또는 Regular"} |
| 본문 속 굵게(\`b\`, \`strong\`) | 500 | Noto Serif Regular | ${"ko"===n.target?"KoPub바탕 Medium":"Medium"} |
| 제목 | bold | Noto Serif Bold | ${"ko"===n.target?"KoPub바탕 Bold":"Bold"} |

- 이탤릭은 Noto Serif Light Italic / Italic / Bold Italic을 같은 weight에 잇는다.
- 기존 스타일시트 끝에 \`/* embfonts */\` 표시를 두고 아래 규칙을 붙인다. 다시 돌릴 때는 표시 아래를 지우고 새로 붙인다. 문단 전체가 \`<b>\`/\`<strong>\` 하나인 문단은 제목으로 보고 \`emb-hd\` 클래스를 단다.

\`\`\`css
p{margin-top:0.45em !important;}
b,strong{font-weight:500 !important;}
h1,h2,h3,h4,h5,h6,h1 *,h2 *,h3 *,h4 *,h5 *,h6 *,.emb-hd{font-weight:bold !important;}
body,p,div,span,a,em,i,strong,b,h1,h2,h3,h4,h5,h6,td,th,li,blockquote,sup,sub,small{font-family:"Noto Serif","${"ko"===n.target?"KoPub Batang":"<번역 글꼴>"}",serif !important;}
\`\`\`

- 따옴표: 번역 텍스트의 곧은 따옴표를 둥근 따옴표(“ ” ‘ ’)로 바꾼다. 원문은 바꾸지 않는다.
- PDF: calibre로 만들고 양쪽 정렬한다. \`ebook-convert 책.epub 책.pdf --change-justification justify\`
- 대역판과 ${o}만 판 모두 EPUB과 PDF를 만든다.

### 8. 최종 확인

결과물 자체로 확인한다. 명령이 성공했다는 것만으로는 부족하다.

- 문제가 있던 쪽을 렌더링해 눈으로 본다(문단 연결, 굵기, 정렬, 간격).
- PDF에 실제로 들어간 글꼴을 확인한다.
- ${o}만 판에서 깨진 앵커와 남은 원문 문단이 0인지 센다(참고문헌 제외).

## 보고

사용자에게 짧게 보고한다. 고친 유형별 개수와 대표 위치, 확인한 것과 하지 않은 것, 남겨 둔 문제(쪽 경계와 무관한 OCR 오타, 일부만 다시 번역해 생긴 용어 불일치 등).

## 자주 하는 실수

- 정규식이 이웃 태그까지 삼켜 태그 짝이 깨진다. 잡을 대상을 좁게 정한다.
- 각주 링크를 빠뜨려 빈 링크가 남는다. 병합 후 정리한다.
- 원문을 지울 때 \`id\`를 옮기지 않아 앵커가 깨진다.
- 문단 하나만 다시 번역하면 주변과 용어가 갈린다. 주변도 용어집 기준으로 맞춘다.
`):(h="auto"===(i=y).source?"source":S(i.source,"en"),m=S(i.target,"en"),g=i.target,x="both"===i.mode,b="replace"===i.mode?`- An EPUB whose original text was replaced by the translation. Each element carries \`lang="${g}"\`. Italics, bold, superscripts and links were carried into the translation where machine translation kept their tags, but some may be missing or misplaced.
- The original is not in this EPUB. Get the original EPUB or source PDF as well and compare paragraph by paragraph. Ask for it first if you don't have it.`:"ocr"===i.origin?`- An EPUB built by OCR from a scanned PDF. Each original block (\`p\`, \`h1\`–\`h3\`, footnote \`p.note\`) is followed directly by its translation \`<p class="tr" lang="${g}">\`.
- The original is OCR output: expect typos, and possibly some leftover running heads or page numbers. Footnotes were split from the body into \`p.note\`.`:`- Each original element is followed directly by a translation element of the same kind (\`lang="${g}" style="opacity:.75"\`). In \`li\`, \`td\`, \`th\`, \`dt\`, \`dd\`, \`figcaption\` and \`caption\` the translation sits inside the element, at the end, as \`<br/><span lang="${g}">translation</span>\`.
- Italics, bold, superscripts and links from the original were carried into the translation where machine translation kept their tags. Some may be missing or misplaced: check them against the original while proofreading.`,`# Translation proofreading instructions

The job: proofread an EPUB holding the ${"source"===h?"source text":`${h} source text`} and a first-pass ${m} translation, and turn it into a finished book. Follow the steps and principles below.

## This book

- File: \`${i.file}\`
- Languages: ${"auto"===i.source?"source auto-detected (judge from the text)":`${h} (\`${i.source}\`)`} → ${m} (\`${g}\`)
- Layout: ${x?"translation under the original (bilingual)":"translation only"}
- ${i.total} paragraphs: ${i.done} translated, ${i.failed} failed, ${i.edited} edited by hand
- Made with PDF OCR Translator (https://ocr.sophonz.com): ${"ocr"===i.origin?"a scanned PDF was OCR'd into an EPUB and":"an existing EPUB was"} machine-translated with Google Translate. Hand-edited paragraphs were changed on purpose; treat them with care.

## Tools

If you are Claude Code, use the \`proofread\` skill of the epub-proofread plugin (\`/epub-proofread:proofread\`). Its scripts handle extraction, merging, the translation-only edition, fonts and the PDF in the steps below.

- If it isn't installed, offer to install it first. In the Claude desktop app: Customize → Plugins → Add → Add marketplace, enter \`sophonz-labs/pdf-ocr-translator\`, and add EPUB Proofread. In a terminal: \`claude plugin install epub-proofread --marketplace sophonz-labs/pdf-ocr-translator\`. Then run \`/reload-plugins\` in the session or start a new one.
- Pass \`--lang ${g}\` to its scripts.
- Where the plugin can't be used, follow the instructions below directly.

## Input

${b}
- Paragraphs whose translation failed have no translation. Translate them.
- If the source PDF is available, use it as the reference for structure.

## Goal and principles

Three deliverables:

- a proofread bilingual EPUB and PDF (each source paragraph followed by its translation)
- a ${m}-only EPUB and PDF
- a glossary, \`glossary.md\`

Principles:

- Translate the same source term the same way throughout the book.
- Stay faithful to the original, in natural ${m}.
- Leave translations that are already correct and natural alone. Don't over-polish.
- Never report something as checked if you didn't check it.

## Steps

### 1. Survey

Count the files, paragraphs and source–translation pairs across the book. Sample unpaired paragraphs and how mixed the register and name spellings are.

### 2. Glossary

Collect recurring terms, names of people and places, and titles of works and chapters, with how the first pass actually translated them. Put them in a \`| Source | Translation | Avoid |\` table, preceded by translation principles (register, loanword spelling, title formatting, bibliographic details, footnote numbering) that follow ${m}'s standard spelling and publishing conventions.${"ko"===i.target?" For Korean the defaults are the plain written style (한다체) for body text, the National Institute of Korean Language loanword rules, and 『』 for book titles, 「」 for article titles.":""} Add rules that fit the book (forms of address, honorifics and so on).

### 3. Structural fixes

Books that come from scans get damaged at page breaks. Fix this against the source PDF before proofreading the translation.

- Join paragraphs cut at page breaks; delete page numbers and running heads that got into the text.
- Join footnotes and quotations continued on the next page; mend words hyphenated at line ends.
- Move body and footnote fragments that ended up in each other back where they belong.
- Delete meaningless OCR fragments together with their translations.

Source and translation always move as a pair. When you join source paragraphs, join the translations too, and retranslate the joined paragraph as one instead of gluing the pieces. Leave OCR typos unrelated to page breaks for later.

### 4. Proofreading

Work in chunks of a few dozen to about a hundred paragraphs, with each source paragraph and its first-pass translation side by side.

- Fix mistranslations, omissions, additions, reversed meanings, and errors in numbers, years and names.
- Apply the glossary's terms, spellings and register.
- Keep section numbers, emphasis and footnote markers where the original has them. Translate verse line by line.
- Leave what should stay in the original language (bibliographic details, abbreviations) as is.

Protect the markup: hand tags and footnote links over as placeholders, and check by script that counts and pairs match when they come back. Keep allowed inline tags to a minimum (e.g. \`<i>\`, \`<b>\`).

### 5. Merge and verify

Put the results back into the XHTML and check:

- every XHTML file parses as XML;
- source–translation pairs never drift (no two translation paragraphs in a row);
- no empty footnote links are left, and the table of contents and anchors work.

When re-zipping the EPUB, put \`mimetype\` first and uncompressed. Fill in title, author and cover metadata.

### 6. The ${m}-only edition
${x?'\n- Delete the source element paired with each translation. Where the translation sits inside the element as `<br/><span>`, delete the source part and the `<br/>`.\n- Move the deleted source element\'s `id` to an `<a id="…"></a>` before the translation, so footnote backlinks and the table of contents keep working.':`
- This EPUB already holds only the translation. Find the remaining source-language paragraphs and translate them.`}
- Keep unpaired source text (bibliography, original-language references). Put the table of contents and metadata title in ${m}, and set \`dc:language\` to \`${g}\`.
- Find and translate leftover source-language body text (publisher notices, navigation links and the like).

### 7. Typesetting

Fonts and PDF settings are fixed as below. Don't substitute others.

- Fonts: Noto Serif for Latin script, ${"ko"===i.target?"KoPub Batang for Hangul":`and for ${m} script the Noto Serif family that covers it (e.g. Noto Serif JP, Noto Serif SC)`}. Embed the files in the EPUB, subset with \`pyftsubset\` to the characters the book uses.

| Use | weight | Latin | ${"ko"===i.target?"Hangul":m} |
|---|---|---|---|
| Body | normal | Noto Serif Light | ${"ko"===i.target?"KoPub Batang Light":"Light or Regular"} |
| Bold in body (\`b\`, \`strong\`) | 500 | Noto Serif Regular | ${"ko"===i.target?"KoPub Batang Medium":"Medium"} |
| Headings | bold | Noto Serif Bold | ${"ko"===i.target?"KoPub Batang Bold":"Bold"} |

- Italics: Noto Serif Light Italic / Italic / Bold Italic at the same weights.
- Append the rules below to the end of the existing stylesheet after a \`/* embfonts */\` marker; on a rerun, delete everything below the marker first. A paragraph that is a single \`<b>\`/\`<strong>\` counts as a heading and gets the \`emb-hd\` class.

\`\`\`css
p{margin-top:0.45em !important;}
b,strong{font-weight:500 !important;}
h1,h2,h3,h4,h5,h6,h1 *,h2 *,h3 *,h4 *,h5 *,h6 *,.emb-hd{font-weight:bold !important;}
body,p,div,span,a,em,i,strong,b,h1,h2,h3,h4,h5,h6,td,th,li,blockquote,sup,sub,small{font-family:"Noto Serif","${"ko"===i.target?"KoPub Batang":"<translation font>"}",serif !important;}
\`\`\`

- Quotes: turn straight quotes in the translation into curly ones (“ ” ‘ ’). Leave the source text alone.
- PDF: make it with calibre, justified: \`ebook-convert book.epub book.pdf --change-justification justify\`
- Make an EPUB and a PDF of both the bilingual and the ${m}-only editions.

### 8. Final check

Check the output itself; a command succeeding is not enough.

- Render the pages that had problems and look at them (paragraph joins, weights, alignment, spacing).
- Check which fonts actually ended up in the PDF.
- In the ${m}-only edition, count broken anchors and leftover source paragraphs; both should be 0 (bibliography excepted).

## Reporting

Report briefly to the user: counts of each kind of fix with representative locations, what you checked and what you didn't, and what's left open (OCR typos unrelated to page breaks, term mismatches from partial retranslation and so on).

## Common mistakes

- A regex swallows neighbouring tags and breaks tag pairs. Keep what you match narrow.
- Footnote links get dropped, leaving empty links. Clean up after merging.
- \`id\`s aren't moved when source elements are deleted, and anchors break.
- Retranslating one paragraph splits terms from its neighbours. Align the surrounding text with the glossary too.
`)},JSON.stringify(y))]})}let H=["kor+eng","kor","eng"];function G({initialTab:r,onLang:n}){var i;let s=u(),o=p(),c=o.ocr,h=c.status,[m,g]=(0,a.useState)([]),[x,b]=(0,a.useState)("kor+eng"),[f,w]=(0,a.useState)(!0),[z,P]=(0,a.useState)(!0),[S,C]=(0,a.useState)(""),[B,A]=(0,a.useState)(0),E=(0,a.useRef)(null),[F,T]=(0,a.useState)(!1),[U,D]=(0,a.useState)(""),[L,O]=(0,a.useState)(""),[R,K]=(0,a.useState)(0),[W,X]=(0,a.useState)(null),[_,q]=(0,a.useState)(null),[V,Y]=(0,a.useState)(!1),[Q,Z]=(0,a.useState)(null),[ee,et]=(0,a.useState)(r),ea=e=>{et(e),history.replaceState(null,"",`${location.pathname}?tab=${e}`)},[er,en]=(0,a.useState)(!1),ei=(0,a.useRef)(!1),[es,eo]=(0,a.useState)(1),el=(0,a.useRef)(null),[ed,ec]=(0,a.useState)(null),eh=(e,t)=>g(a=>a.map(a=>a.n===e?{...a,...t}:a));async function eu(t,a=!1){if(F)return;T(!0),O(""),g([]),ec(null),A(0),E.current=t;let{clearPages:r,fileKey:n,loadPages:i,savePage:s}=await e.A(55815),o=n(t);a&&await r(o,x);let l=await i(o,x);X({name:t.name,size:t.size}),ei.current=!1;let d=performance.now(),h=setInterval(()=>K(performance.now()-d),250);try{D("opening"),el.current=await y(t,{lang:x,skipText:f,figures:z,pick:e=>{let t=function(e,t){if(!e.trim())return Array.from({length:t},(e,t)=>t+1);let a=new Set;for(let r of e.replace(/\s*[-–~]\s*/g,"-").split(/[,，\s]+/).filter(Boolean)){let e=/^(\d*)-(\d*)$|^(\d+)$/.exec(r);if(!e)return null;let n=e[3]?+e[3]:e[1]?+e[1]:1,i=e[3]?+e[3]:e[2]?+e[2]:t;for(let e=Math.max(1,n);e<=Math.min(t,i);e++)a.add(e)}return a.size?[...a].sort((e,t)=>e-t):null}(S,e);if(!t)throw Error(c.badRange(e));return t},restore:l,persist:(e,t)=>void s(o,x,e,t),cancelled:()=>ei.current,onOpen:(e,t)=>{A(e.filter(e=>l.has(e)).length),g(e.map(e=>({n:e,status:"pending",progress:0,text:""}))),eo(t),D("working")},onPage:eh,onProgress:(e,t)=>g(a=>a.map(a=>a.n===e&&"ocr"===a.status?{...a,progress:t}:a))}),D(ei.current?"stopped":"done"),ec(el.current.name)}catch(e){O(e instanceof Error?e.message:String(e)),g(e=>e.map(e=>"render"===e.status||"ocr"===e.status?{...e,status:"error"}:e)),D("error")}finally{clearInterval(h),K(performance.now()-d),T(!1)}}async function ep(e){let t=el.current;if(t){q(e);try{if("pdf"===e)$(await k(t),`${t.name}-ocr.pdf`,"application/pdf");else if("epub"===e)$(await v(t),`${t.name}.epub`,"application/epub+zip");else{let{bytes:e,ext:a}=await j(t);$(e,`${t.name}.${a}`,"md"===a?"text/markdown":"application/zip")}}catch(t){O(c.exportFailed(e.toUpperCase(),t instanceof Error?t.message:String(t)))}finally{q(null)}}}async function em(){!el.current||(!Q||confirm(c.replaceJob))&&(Z(await N(el.current)),ea("translate"))}async function eg(e){if(/\.epub$/i.test(e.name))try{Z(await M(e,o.tr.noSegments)),ea("translate")}catch(e){O(c.epubFailed(e instanceof Error?e.message:String(e)))}else"application/pdf"===e.type&&eu(e)}async function ex(){await navigator.clipboard.writeText(ej),Y(!0),setTimeout(()=>Y(!1),1500)}let eb=m.length,ef=m.filter(e=>"done"===e.status||"text"===e.status).length,ew=eb?m.reduce((e,t)=>e+t.progress,0)/eb:0,ey=m.filter(e=>e.ms),ek=ey.length?ey.reduce((e,t)=>e+t.ms,0)/ey.length:0,ev=F&&ek?(eb-ef)*ek/es/1e3:0,ez=m.filter(e=>e.text.trim()),ej=ez.map(e=>`${c.copyHeader(e.n)}
${e.text.trim()}`).join("\n\n");return(0,t.jsxs)("main",{className:"mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:py-14",children:[(0,t.jsx)(d,{lang:s,onLang:n}),(0,t.jsx)("nav",{role:"tablist","aria-label":c.tablist,className:"mt-8 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-zinc-200 dark:border-zinc-800",children:l.map(e=>(0,t.jsxs)("button",{role:"tab",id:`tab-${e}`,"aria-selected":ee===e,"aria-controls":`panel-${e}`,onClick:()=>ea(e),className:`-mb-px shrink-0 border-b-2 px-3 py-2 text-sm transition ${ee===e?"border-zinc-900 font-medium text-zinc-900 dark:border-white dark:text-white":"border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"}`,children:[o.tools[e].label,"ocr"===e&&F&&(0,t.jsx)("span",{className:"ml-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-blue-600 align-middle"})]},e))}),(0,t.jsxs)("p",{className:"mt-4 mb-8 text-sm text-zinc-600 dark:text-zinc-400",children:[o.tools[ee].desc," ",c.local]}),(0,t.jsxs)("div",{role:"tabpanel",id:"panel-ocr","aria-labelledby":"tab-ocr",hidden:"ocr"!==ee,children:[(0,t.jsxs)("label",{onDragOver:e=>{e.preventDefault(),en(!0)},onDragLeave:()=>en(!1),onDrop:e=>{e.preventDefault(),en(!1);let t=e.dataTransfer.files[0];t&&eg(t)},className:`group flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center transition focus-within:ring-2 focus-within:ring-blue-500/40 ${er?"border-blue-500 bg-blue-50/60 dark:bg-blue-500/10":"border-zinc-300 bg-white hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-500"} ${F?"pointer-events-none opacity-60":""}`,children:[(0,t.jsx)("input",{type:"file",accept:"application/pdf,.epub,application/epub+zip",disabled:F,className:"sr-only",onChange:e=>{let t=e.target.files?.[0];e.target.value="",t&&eg(t)}}),(0,t.jsx)("svg",{"aria-hidden":!0,viewBox:"0 0 24 24",className:"h-8 w-8 text-zinc-400 transition group-hover:text-zinc-600 dark:group-hover:text-zinc-300",fill:"none",stroke:"currentColor",strokeWidth:1.5,children:(0,t.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"})}),(0,t.jsx)("p",{className:"mt-3 text-sm font-medium",children:c.drop}),(0,t.jsx)("p",{className:"mt-1 text-xs text-zinc-600 dark:text-zinc-400",children:W?`${W.name} \xb7 ${(i=W.size)<1048576?`${Math.round(i/1024)}KB`:`${(i/1024/1024).toFixed(1)}MB`}`:c.dropHint})]}),(0,t.jsxs)("div",{className:"mt-4 flex flex-wrap items-center justify-between gap-3",children:[(0,t.jsx)("div",{role:"radiogroup","aria-label":c.langGroup,className:"inline-flex rounded-lg bg-zinc-100 p-0.5 text-sm dark:bg-zinc-800",children:H.map(e=>(0,t.jsx)("button",{role:"radio","aria-checked":x===e,disabled:F,onClick:()=>b(e),className:`rounded-md px-3 py-1.5 transition ${x===e?"bg-white font-medium shadow-sm dark:bg-zinc-950":"text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"}`,children:c.langs[e]},e))}),(0,t.jsxs)("label",{className:"flex cursor-pointer items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300",children:[(0,t.jsx)("input",{type:"checkbox",className:"peer sr-only",checked:f,disabled:F,onChange:e=>w(e.target.checked)}),(0,t.jsx)("span",{className:"relative h-5 w-9 rounded-full bg-zinc-300 transition peer-checked:bg-blue-600 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500/40 after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-4 dark:bg-zinc-700"}),c.skipText]}),(0,t.jsxs)("label",{className:"flex cursor-pointer items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300",children:[(0,t.jsx)("input",{type:"checkbox",className:"peer sr-only",checked:z,disabled:F,onChange:e=>P(e.target.checked)}),(0,t.jsx)("span",{className:"relative h-5 w-9 rounded-full bg-zinc-300 transition peer-checked:bg-blue-600 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500/40 after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-4 dark:bg-zinc-700"}),c.figures]}),(0,t.jsxs)("label",{className:"flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300",children:[c.range,(0,t.jsx)("input",{value:S,disabled:F,onChange:e=>C(e.target.value),placeholder:c.rangeAll,inputMode:"numeric",className:"w-36 rounded-md border border-zinc-200 bg-transparent px-2 py-1 text-sm placeholder:text-zinc-400 dark:border-zinc-700"})]})]}),eb>0&&(0,t.jsxs)("section",{className:"mt-8 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900",children:[(0,t.jsxs)("div",{className:"flex items-start justify-between gap-4",children:[(0,t.jsxs)("div",{className:"min-w-0",children:[(0,t.jsx)("p",{className:"truncate text-sm font-medium",children:U&&c[U]}),(0,t.jsxs)("p",{className:"mt-0.5 text-xs text-zinc-600 dark:text-zinc-400 tabular-nums",children:[c.pages(ef,eb)," · ",c.secs((R/1e3).toFixed(1)),F&&es>1&&` \xb7 ${c.lanes(es)}`,ek>0&&` \xb7 ${c.perPage((ek/es/1e3).toFixed(2))}`,ev>0&&` \xb7 ${c.eta(Math.ceil(ev))}`]}),B>0&&(0,t.jsxs)("p",{className:"mt-0.5 text-xs text-zinc-600 dark:text-zinc-400",children:[c.restored(B),!F&&(0,t.jsxs)(t.Fragment,{children:[" · ",(0,t.jsx)("button",{className:"underline",onClick:()=>E.current&&eu(E.current,!0),children:c.startOver})]})]})]}),(0,t.jsxs)("div",{className:"flex items-center gap-3",children:[F&&(0,t.jsx)("button",{onClick:()=>ei.current=!0,className:"rounded-md px-2 py-1 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200",children:c.stop}),(0,t.jsxs)("span",{className:"text-2xl font-semibold tracking-tight tabular-nums",children:[Math.round(100*ew),"%"]})]})]}),(0,t.jsx)("div",{className:"mt-4 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800",role:"progressbar","aria-label":c.progress,"aria-valuenow":Math.round(100*ew),"aria-valuemin":0,"aria-valuemax":100,children:(0,t.jsx)("div",{className:"h-full rounded-full bg-blue-600 transition-[width] duration-300",style:{width:`${100*ew}%`}})}),(0,t.jsx)("ol",{className:"mt-5 flex flex-wrap gap-1","aria-label":c.pageStates,children:m.map(e=>(0,t.jsxs)("li",{title:`${c.page(e.n)} \xb7 ${h[e.status]}${e.ms?` \xb7 ${c.secs((e.ms/1e3).toFixed(1))}`:""}`,"aria-label":`${c.page(e.n)} ${h[e.status]}`,className:`relative grid h-7 min-w-7 place-items-center overflow-hidden rounded-md px-1 text-[10px] font-medium tabular-nums ${J[e.status]}`,children:[("ocr"===e.status||"render"===e.status)&&(0,t.jsx)("span",{className:"absolute inset-x-0 bottom-0 bg-blue-500/25 transition-[height]",style:{height:`${100*e.progress}%`}}),(0,t.jsx)("span",{className:"relative",children:e.n})]},e.n))}),(0,t.jsx)("div",{className:"mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-600 dark:text-zinc-400",children:["done","text","ocr","pending","error"].map(e=>"error"!==e||m.some(e=>"error"===e.status)?(0,t.jsxs)("span",{className:"flex items-center gap-1.5",children:[(0,t.jsx)("span",{className:`h-2 w-2 rounded-sm ${J[e]}`}),h[e]]},e):null)})]}),L&&(0,t.jsx)("p",{className:"mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400",children:L}),ez.length>0&&(0,t.jsxs)("section",{className:"mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900",children:[(0,t.jsxs)("div",{className:"flex items-center justify-between gap-3 border-b border-zinc-200 px-5 py-3 dark:border-zinc-800",children:[(0,t.jsxs)("div",{children:[(0,t.jsx)("h2",{className:"text-sm font-medium",children:c.result}),(0,t.jsx)("p",{className:"text-xs text-zinc-600 dark:text-zinc-400 tabular-nums",children:c.chars(ej.length.toLocaleString())})]}),(0,t.jsxs)("div",{className:"flex gap-2",children:[(0,t.jsx)("button",{onClick:ex,className:"rounded-lg border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800",children:V?c.copied:c.copy}),(0,t.jsx)("button",{onClick:em,disabled:F,className:"rounded-lg border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800",children:c.toTranslate}),["pdf","epub","md"].map(e=>(0,t.jsxs)("button",{onClick:()=>ep(e),disabled:F||!!_,className:"flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200",children:[(0,t.jsx)("svg",{"aria-hidden":!0,viewBox:"0 0 24 24",className:"h-4 w-4",fill:"none",stroke:"currentColor",strokeWidth:2,children:(0,t.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M12 4v12m0 0 4-4m-4 4-4-4M4 20h16"})}),_===e?c.making:"pdf"===e?c.searchablePdf:"epub"===e?"EPUB":"Markdown"]},e))]})]}),(0,t.jsx)("div",{className:"max-h-[28rem] overflow-auto px-5 py-4",children:ez.map(e=>(0,t.jsxs)("article",{className:"mb-5 last:mb-0",children:[(0,t.jsxs)("p",{className:"mb-1.5 text-[11px] font-medium tracking-wide text-zinc-400",children:[c.page(e.n),"text"===e.status&&` \xb7 ${h.text}`]}),(0,t.jsx)("p",{className:"text-sm leading-relaxed whitespace-pre-wrap",children:e.text.trim()})]},e.n))})]})]}),(0,t.jsx)("div",{role:"tabpanel",id:"panel-translate","aria-labelledby":"tab-translate",hidden:"translate"!==ee,children:(0,t.jsx)(I,{job:Q,setJob:Z,made:ed,onUseMade:em})})]})}let J={pending:"bg-zinc-100 text-zinc-400 ring-1 ring-zinc-200 ring-inset dark:bg-zinc-800 dark:text-zinc-500 dark:ring-zinc-700",render:"bg-blue-50 text-blue-700 ring-1 ring-blue-500 ring-inset dark:bg-blue-500/10 dark:text-blue-300",ocr:"bg-blue-50 text-blue-700 ring-1 ring-blue-500 ring-inset dark:bg-blue-500/10 dark:text-blue-300",text:"bg-emerald-500 text-white",done:"bg-blue-600 text-white",error:"bg-red-500 text-white"};function W({render:e}){let t=(0,r.useSearchParams)().get("tab");return(0,a.useEffect)(()=>void delete document.documentElement.dataset.tab,[]),e(l.find(e=>e===t)??"ocr")}e.s(["ToolsRoute",0,function({lang:e}){let[r,n]=(0,a.useState)(e),i=e=>{n(e),document.documentElement.lang=e,history.replaceState(null,"",location.pathname.replace(/^\/(en|ko)/,`/${e}`)+location.search)},s=e=>(0,t.jsx)(G,{initialTab:e,onLang:i});return(0,t.jsx)(h,{lang:r,children:(0,t.jsx)(a.Suspense,{fallback:s("ocr"),children:(0,t.jsx)(W,{render:s})})})}],5155)}]);