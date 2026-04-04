import{c as y,r as l,j as h,a3 as q,a4 as H,O as b,d as _}from"./index-Cc_zwsOu.js";import{d as F}from"./Combination-BUJD1FTk.js";import{b as w}from"./index-DnzhSkmE.js";/**
 * @license lucide-react v1.6.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const V=[["path",{d:"M10.268 21a2 2 0 0 0 3.464 0",key:"vwvbt9"}],["path",{d:"M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326",key:"11g9vi"}]],ue=y("bell",V);/**
 * @license lucide-react v1.6.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const B=[["path",{d:"m16 18 6-6-6-6",key:"eg8j8"}],["path",{d:"m8 6-6 6 6 6",key:"ppft3o"}]],ce=y("code",B);/**
 * @license lucide-react v1.6.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const O=[["path",{d:"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",key:"ct8e1f"}],["path",{d:"M14.084 14.158a3 3 0 0 1-4.242-4.242",key:"151rxh"}],["path",{d:"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",key:"13bj9a"}],["path",{d:"m2 2 20 20",key:"1ooewy"}]],ie=y("eye-off",O);/**
 * @license lucide-react v1.6.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const z=[["path",{d:"M10 16h.01",key:"1bzywj"}],["path",{d:"M2.212 11.577a2 2 0 0 0-.212.896V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5.527a2 2 0 0 0-.212-.896L18.55 5.11A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",key:"18tbho"}],["path",{d:"M21.946 12.013H2.054",key:"zqlbp7"}],["path",{d:"M6 16h.01",key:"1pmjb7"}]],de=y("hard-drive",z);/**
 * @license lucide-react v1.6.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const D=[["path",{d:"M21 10.656V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12.344",key:"2acyp4"}],["path",{d:"m9 11 3 3L22 4",key:"1pflzl"}]],le=y("square-check-big",D);function T(e,t=[]){let o=[];function u(a,i){const r=l.createContext(i);r.displayName=a+"Context";const s=o.length;o=[...o,i];const f=n=>{const{scope:d,children:p,...m}=n,v=d?.[e]?.[s]||r,x=l.useMemo(()=>m,Object.values(m));return h.jsx(v.Provider,{value:x,children:p})};f.displayName=a+"Provider";function S(n,d){const p=d?.[e]?.[s]||r,m=l.useContext(p);if(m)return m;if(i!==void 0)return i;throw new Error(`\`${n}\` must be used within \`${a}\``)}return[f,S]}const c=()=>{const a=o.map(i=>l.createContext(i));return function(r){const s=r?.[e]||a;return l.useMemo(()=>({[`__scope${e}`]:{...r,[e]:s}}),[r,s])}};return c.scopeName=e,[u,U(c,...t)]}function U(...e){const t=e[0];if(e.length===1)return t;const o=()=>{const u=e.map(c=>({useScope:c(),scopeName:c.scopeName}));return function(a){const i=u.reduce((r,{useScope:s,scopeName:f})=>{const n=s(a)[`__scope${f}`];return{...r,...n}},{});return l.useMemo(()=>({[`__scope${t.scopeName}`]:i}),[i])}};return o.scopeName=t.scopeName,o}var G=["a","button","div","form","h2","h3","img","input","label","li","nav","ol","p","select","span","svg","ul"],A=G.reduce((e,t)=>{const o=q(`Primitive.${t}`),u=l.forwardRef((c,a)=>{const{asChild:i,...r}=c,s=i?o:t;return typeof window<"u"&&(window[Symbol.for("radix-ui")]=!0),h.jsx(s,{...r,ref:a})});return u.displayName=`Primitive.${t}`,{...e,[t]:u}},{}),g={exports:{}},E={};/**
 * @license React
 * use-sync-external-store-shim.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var C;function K(){if(C)return E;C=1;var e=H();function t(n,d){return n===d&&(n!==0||1/n===1/d)||n!==n&&d!==d}var o=typeof Object.is=="function"?Object.is:t,u=e.useState,c=e.useEffect,a=e.useLayoutEffect,i=e.useDebugValue;function r(n,d){var p=d(),m=u({inst:{value:p,getSnapshot:d}}),v=m[0].inst,x=m[1];return a(function(){v.value=p,v.getSnapshot=d,s(v)&&x({inst:v})},[n,p,d]),c(function(){return s(v)&&x({inst:v}),n(function(){s(v)&&x({inst:v})})},[n]),i(p),p}function s(n){var d=n.getSnapshot;n=n.value;try{var p=d();return!o(n,p)}catch{return!0}}function f(n,d){return d()}var S=typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"?f:r;return E.useSyncExternalStore=e.useSyncExternalStore!==void 0?e.useSyncExternalStore:S,E}var L;function W(){return L||(L=1,g.exports=K()),g.exports}var J=W();function Q(){return J.useSyncExternalStore(X,()=>!0,()=>!1)}function X(){return()=>{}}var k="Avatar",[Y]=T(k),[Z,M]=Y(k),N=l.forwardRef((e,t)=>{const{__scopeAvatar:o,...u}=e,[c,a]=l.useState("idle");return h.jsx(Z,{scope:o,imageLoadingStatus:c,onImageLoadingStatusChange:a,children:h.jsx(A.span,{...u,ref:t})})});N.displayName=k;var R="AvatarImage",$=l.forwardRef((e,t)=>{const{__scopeAvatar:o,src:u,onLoadingStatusChange:c=()=>{},...a}=e,i=M(R,o),r=ee(u,a),s=F(f=>{c(f),i.onImageLoadingStatusChange(f)});return w(()=>{r!=="idle"&&s(r)},[r,s]),r==="loaded"?h.jsx(A.img,{...a,ref:t,src:u}):null});$.displayName=R;var I="AvatarFallback",P=l.forwardRef((e,t)=>{const{__scopeAvatar:o,delayMs:u,...c}=e,a=M(I,o),[i,r]=l.useState(u===void 0);return l.useEffect(()=>{if(u!==void 0){const s=window.setTimeout(()=>r(!0),u);return()=>window.clearTimeout(s)}},[u]),i&&a.imageLoadingStatus!=="loaded"?h.jsx(A.span,{...c,ref:t}):null});P.displayName=I;function j(e,t){return e?t?(e.src!==t&&(e.src=t),e.complete&&e.naturalWidth>0?"loaded":"loading"):"error":"idle"}function ee(e,{referrerPolicy:t,crossOrigin:o}){const u=Q(),c=l.useRef(null),a=u?(c.current||(c.current=new window.Image),c.current):null,[i,r]=l.useState(()=>j(a,e));return w(()=>{r(j(a,e))},[a,e]),w(()=>{const s=n=>()=>{r(n)};if(!a)return;const f=s("loaded"),S=s("error");return a.addEventListener("load",f),a.addEventListener("error",S),t&&(a.referrerPolicy=t),typeof o=="string"&&(a.crossOrigin=o),()=>{a.removeEventListener("load",f),a.removeEventListener("error",S)}},[a,o,t]),i}var te=N,ae=$,re=P;function fe({className:e,...t}){return h.jsx(te,{"data-slot":"avatar",className:_("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",e),...b(t)})}function pe({className:e,...t}){return h.jsx(ae,{"data-slot":"avatar-image",className:_("aspect-square h-full w-full",e),...b(t)})}function ve({className:e,...t}){return h.jsx(re,{"data-slot":"avatar-fallback",className:_("bg-muted flex h-full w-full items-center justify-center rounded-full",e),...b(t)})}export{fe as A,ue as B,ce as C,ie as E,de as H,le as S,pe as a,ve as b,W as r};
