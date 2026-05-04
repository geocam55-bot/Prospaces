import{c as a,b as c}from"./index-D4XUGGZt.js";/**
 * @license lucide-react v1.6.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const i=[["path",{d:"m16 11 2 2 4-4",key:"9rsbq5"}],["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}]],h=a("user-check",i),n=`https://${c}.supabase.co/functions/v1/make-server-8405be07`;async function m(t,s="/"){const e=t.trim().toLowerCase();if(!e)throw new Error("Email is required");const r=await fetch(`${n}/auth/request-password-reset`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:e,redirectPath:s})});if(!r.ok){const o=await r.json().catch(()=>({}));throw new Error(o.error||"Failed to send reset email")}}export{h as U,m as r};
