function $(e){return`"${String(e??"").replace(/"/g,'""')}"`}function x(e){if(!e.length)return"";const n=Object.keys(e[0]),t=[n.join(",")];for(const c of e)t.push(n.map(r=>$(c[r])).join(","));return t.join(`
`)}function b(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;")}function y(e,n="records",t="record"){const c=e.map(r=>{const o=Object.entries(r).map(([i,s])=>`    <${i}>${b(s)}</${i}>`).join(`
`);return`  <${t}>
${o}
  </${t}>`}).join(`
`);return`<?xml version="1.0" encoding="UTF-8"?>
<${n}>
${c}
</${n}>`}function j(e,n,t,c){const r=e.slice(0,n);if(r.length>=n)return r;const o=c.repeat(n-r.length);return t==="right"?`${o}${r}`:`${r}${o}`}function v(e,n){const t=n.header_lines||[],c=[...n.detail_fields||[]];if(!c.length)return[...t,...e.map(()=>"")].join(`
`);if(n.layout_mode==="delimited"){const o=n.delimiter||"|",i=n.include_column_headers!==!1,s=[...t];i&&s.push(c.map(l=>l.label||l.key).join(o));for(const l of e)s.push(c.map(a=>String(l[a.key]??"")).join(o));return s.join(`
`)}c.sort((o,i)=>(o.start||1)-(i.start||1));const r=[...t];for(const o of e){let i="";for(const s of c){const l=Math.max(1,s.start||1),a=Math.max(1,s.length||1),d=s.align||"left",f=(s.pad_char||" ").charAt(0),p=String(o[s.key]??""),g=j(p,a,d,f);i.length<l-1&&(i+=" ".repeat(l-1-i.length));const h=i.slice(0,l-1),u=l-1+a,m=i.length>u?i.slice(u):"";i=`${h}${g}${m}`}r.push(i)}return r.join(`
`)}function _(e,n,t){const c=new Blob([e],{type:t}),r=URL.createObjectURL(c),o=document.createElement("a");o.href=r,o.download=n,o.style.visibility="hidden",document.body.appendChild(o),o.click(),document.body.removeChild(o),URL.revokeObjectURL(r)}function k(e){return e.trim().replace(/[^a-zA-Z0-9_-]+/g,"-").replace(/-{2,}/g,"-").replace(/^-|-$/g,"")||"export"}function C(e,n){return(e||[]).filter(t=>t.enabled===!1?!1:!t.module||t.module==="all"?!0:t.module===n)}export{y as a,v as b,x as c,_ as d,C as f,k as s};
