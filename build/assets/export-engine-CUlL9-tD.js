function F(t){return`"${String(t??"").replace(/"/g,'""')}"`}function L(t){if(!t.length)return"";const e=Object.keys(t[0]),n=[e.join(",")];for(const c of t)n.push(e.map(r=>F(c[r])).join(","));return n.join(`
`)}function C(t){return String(t??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;")}function _(t,e="records",n="record"){const c=t.map(r=>{const s=Object.entries(r).map(([u,d])=>`    <${u}>${C(d)}</${u}>`).join(`
`);return`  <${n}>
${s}
  </${n}>`}).join(`
`);return`<?xml version="1.0" encoding="UTF-8"?>
<${e}>
${c}
</${e}>`}function v(t,e,n,c){const r=t.slice(0,e);if(r.length>=e)return r;const s=c.repeat(e-r.length);return n==="right"?`${s}${r}`:`${r}${s}`}function k(t,e){const n=e,c=e.header_lines||n.headerLines||[],r=[...e.detail_fields||n.detailFields||[]],s=e.layout_mode||n.layoutMode||"delimited",u=e.include_column_headers??n.includeColumnHeaders,d=(i,o)=>(o.source||"field")==="text"?String(o.text??""):String(i[o.key]??""),h=i=>i.label?i.label:(i.source||"field")==="text"?i.text||"text":i.key;if(!r.length)return[...c,...t.map(()=>"")].join(`
`);if(s==="delimited"){const i=e.delimiter||"|",o=u!==!1,l=[...c];o&&l.push(r.map(a=>h(a)).join(i));for(const a of t)l.push(r.map(f=>d(a,f)).join(i));return l.join(`
`)}r.sort((i,o)=>(i.start||1)-(o.start||1));const p=[...c];for(const i of t){let o="";for(const l of r){const a=Math.max(1,l.start||1),f=Math.max(1,l.length||1),m=l.align||"left",b=(l.pad_char||" ").charAt(0),x=d(i,l),$=v(x,f,m,b);o.length<a-1&&(o+=" ".repeat(a-1-o.length));const j=o.slice(0,a-1),g=a-1+f,y=o.length>g?o.slice(g):"";o=`${j}${$}${y}`}p.push(o)}return p.join(`
`)}function M(t,e,n){const c=new Blob([t],{type:n}),r=URL.createObjectURL(c),s=document.createElement("a");s.href=r,s.download=e,s.style.visibility="hidden",document.body.appendChild(s),s.click(),document.body.removeChild(s),URL.revokeObjectURL(r)}function S(t){return t.trim().replace(/[^a-zA-Z0-9_-]+/g,"-").replace(/-{2,}/g,"-").replace(/^-|-$/g,"")||"export"}function U(t,e){return(t||[]).filter(n=>n.enabled===!1?!1:!n.module||n.module==="all"||e==="planners"&&n.module==="quotes"?!0:n.module===e)}export{_ as a,k as b,L as c,M as d,U as f,S as s};
