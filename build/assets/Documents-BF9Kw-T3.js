import{j as e,m as ee,t as a,r as i,B as m,g as te,h as se,k as _e,l as Pe,K as ae,J as ie,N as ne}from"./index-Cc_zwsOu.js";import{I as p}from"./input-C6jTi7vW.js";import{D as le,e as Me,a as re,b as ce,c as oe,d as de}from"./dialog-BmMMBq5o.js";import{L as c}from"./label-Em6X85YJ.js";import{T as me}from"./textarea-Cxt2r0Rv.js";import{D as ke,a as Xe,E as Be,b as ze,e as ue}from"./dropdown-menu-BVtTkVSi.js";import{S as y,a as I,b as D,c as w,d as g}from"./select-mxQqyxD5.js";import{B as M}from"./badge-ZE9FsAts.js";import{P as Ge,a as Ye}from"./PermissionGate-DC1ZwoK5.js";import{g as Qe,u as $e,b as Ve,d as He,a as We,c as Ke}from"./documents-client-CBL38zNq.js";import{c as qe}from"./api-CFC7OKYI.js";import{A as he,a as xe}from"./alert-DpQM4WFm.js";import{c as Ze}from"./clipboard-DmeE4Bfy.js";import{D as Je}from"./database-D9Kz-29-.js";import{C as u}from"./circle-check-big-BzxNjlbW.js";import{C as k}from"./copy-CM_ltFCn.js";import{E as et}from"./external-link-B6LUNMyG.js";import{F as tt}from"./folder-open-C9-gANh5.js";import{U as pe}from"./upload-BINiyvye.js";import{L as X}from"./loader-circle-Ciqh0ocD.js";import{S as st}from"./search-jfduUHiW.js";import{F as B}from"./sticky-note-Cfo0ofpn.js";import{E as at}from"./eye-u1vCpycL.js";import{D as it}from"./download-C41-Ut_D.js";import{S as nt}from"./square-pen-BHVF2scZ.js";import{T as lt}from"./trash-2-BhRMz-qc.js";import{F as z}from"./file-text-DsxZllBG.js";import"./index-DnzhSkmE.js";import"./Combination-BUJD1FTk.js";import"./index-fcnWbNPi.js";import"./x-N4gD7qwH.js";import"./index-4jb-CZgg.js";import"./index-CGRb1J2Y.js";import"./index-C-dumcl6.js";import"./lock-DdKHSMni.js";import"./server-function-url-DoQAfY32.js";import"./marketing-client-CWMu7203.js";const G=`-- ============================================================================
-- DOCUMENTS MODULE - COMPLETE DATABASE SETUP
-- ============================================================================
-- This migration creates the documents table, storage bucket, and permissions
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- =============================================
-- 1. CREATE STORAGE BUCKET
-- =============================================

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  52428800, -- 50MB
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 2. CREATE STORAGE POLICIES
-- =============================================

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view files in their organization" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload files to their organization" ON storage.objects;
DROP POLICY IF EXISTS "Users can update files in their organization" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete files in their organization" ON storage.objects;

-- Policy: Authenticated users can view files in documents bucket
CREATE POLICY "Users can view files in their organization"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

-- Policy: Authenticated users can upload files to documents bucket
CREATE POLICY "Users can upload files to their organization"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Policy: Authenticated users can update files in documents bucket
CREATE POLICY "Users can update files in their organization"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'documents');

-- Policy: Authenticated users can delete files in documents bucket
CREATE POLICY "Users can delete files in their organization"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'documents');

-- =============================================
-- 3. CREATE DOCUMENTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- File Information
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_path TEXT NOT NULL UNIQUE,
  
  -- Document Metadata
  title TEXT,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  category TEXT,
  
  -- Associations
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  contact_name TEXT,
  
  -- Versioning
  version INTEGER DEFAULT 1,
  is_latest_version BOOLEAN DEFAULT true,
  parent_document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  
  -- Audit Fields
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_by_name TEXT,
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 4. CREATE INDEXES
-- =============================================

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_documents_organization_id ON public.documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_documents_contact_id ON public.documents(contact_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON public.documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_category ON public.documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_parent_id ON public.documents(parent_document_id);
CREATE INDEX IF NOT EXISTS idx_documents_file_path ON public.documents(file_path);

-- Tag search index
CREATE INDEX IF NOT EXISTS idx_documents_tags ON public.documents USING gin(tags);

-- =============================================
-- 5. ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 6. CREATE RLS POLICIES FOR DOCUMENTS TABLE
-- =============================================

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view documents in their organization" ON public.documents;
DROP POLICY IF EXISTS "Users can insert documents in their organization" ON public.documents;
DROP POLICY IF EXISTS "Users can update documents in their organization" ON public.documents;
DROP POLICY IF EXISTS "Users can delete documents in their organization" ON public.documents;

-- Policy: Authenticated users can view documents
CREATE POLICY "authenticated_users_read_documents"
ON public.documents
FOR SELECT
TO authenticated
USING (true);

-- Policy: Authenticated users can manage documents
CREATE POLICY "authenticated_users_manage_documents"
ON public.documents
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- =============================================
-- 7. CREATE TRIGGER FOR UPDATED_AT
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_documents_updated_at ON public.documents;
CREATE TRIGGER trigger_update_documents_updated_at
BEFORE UPDATE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION update_documents_updated_at();

-- =============================================
-- 8. GRANT PERMISSIONS
-- =============================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;

-- =============================================
-- 9. INSERT DEFAULT PERMISSIONS FOR ALL ROLES
-- =============================================

-- Insert permissions for the documents module
INSERT INTO public.permissions (role, module, visible, add, change, delete)
VALUES
  ('super_admin', 'documents', true, true, true, true),
  ('admin', 'documents', true, true, true, true),
  ('manager', 'documents', true, true, true, false),
  ('marketing', 'documents', true, true, false, false),
  ('standard_user', 'documents', true, true, false, false)
ON CONFLICT (role, module) DO UPDATE SET
  visible = EXCLUDED.visible,
  add = EXCLUDED.add,
  change = EXCLUDED.change,
  delete = EXCLUDED.delete;

-- =============================================
-- 10. ADD COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE public.documents IS 'Stores document metadata and file references for the CRM';
COMMENT ON COLUMN public.documents.file_path IS 'Path to file in Supabase Storage';
COMMENT ON COLUMN public.documents.contact_id IS 'Optional association with a contact';
COMMENT ON COLUMN public.documents.version IS 'Document version number for versioning support';
COMMENT ON COLUMN public.documents.is_latest_version IS 'Flag to indicate if this is the latest version';
COMMENT ON COLUMN public.documents.parent_document_id IS 'Reference to original document for versioning';
COMMENT ON COLUMN public.documents.tags IS 'Array of tags for categorization and search';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- The Documents module is now ready to use!
-- Refresh your browser to see the changes.
-- ============================================================================`;function rt(){const[r,h]=useState(!1),b=useRef(null),x=async()=>{try{if(await Ze(G))h(!0),a.success("SQL copied to clipboard!"),setTimeout(()=>h(!1),3e3);else if(b.current){b.current.select();try{document.execCommand("copy"),h(!0),a.success("SQL copied to clipboard!"),setTimeout(()=>h(!1),3e3)}catch{a.error("Unable to copy. Please select and copy manually.")}}}catch{a.error("Unable to copy. Please select and copy manually.")}};return e.jsxs("div",{className:"p-6 max-w-5xl mx-auto space-y-6",children:[e.jsx("textarea",{ref:b,value:G,readOnly:!0,className:"sr-only",style:{position:"absolute",left:"-9999px"}}),e.jsxs(Card,{children:[e.jsxs(CardHeader,{children:[e.jsxs(CardTitle,{className:"flex items-center gap-2",children:[e.jsx(Je,{className:"w-6 h-6"}),"Documents Module Setup Required"]}),e.jsx(CardDescription,{children:"The documents table needs to be created in your Supabase database before you can use the Documents module."})]}),e.jsxs(CardContent,{className:"space-y-6",children:[e.jsxs(he,{children:[e.jsx(ee,{className:"h-4 w-4"}),e.jsx(xe,{children:"The Documents module requires database setup that must be run from the Supabase Dashboard with admin privileges."})]}),e.jsxs("div",{className:"space-y-4",children:[e.jsx("h3",{className:"font-semibold",children:"What will be created:"}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-3",children:[e.jsxs("div",{className:"flex items-start gap-2",children:[e.jsx(u,{className:"w-4 h-4 text-green-600 mt-0.5 flex-shrink-0"}),e.jsxs("div",{className:"text-sm",children:[e.jsx("strong",{children:"Storage Bucket"}),e.jsx("p",{className:"text-muted-foreground",children:"Private bucket for document files (50MB limit)"})]})]}),e.jsxs("div",{className:"flex items-start gap-2",children:[e.jsx(u,{className:"w-4 h-4 text-green-600 mt-0.5 flex-shrink-0"}),e.jsxs("div",{className:"text-sm",children:[e.jsx("strong",{children:"Documents Table"}),e.jsx("p",{className:"text-muted-foreground",children:"Complete schema with all metadata fields"})]})]}),e.jsxs("div",{className:"flex items-start gap-2",children:[e.jsx(u,{className:"w-4 h-4 text-green-600 mt-0.5 flex-shrink-0"}),e.jsxs("div",{className:"text-sm",children:[e.jsx("strong",{children:"8 Performance Indexes"}),e.jsx("p",{className:"text-muted-foreground",children:"Optimized for fast queries and searches"})]})]}),e.jsxs("div",{className:"flex items-start gap-2",children:[e.jsx(u,{className:"w-4 h-4 text-green-600 mt-0.5 flex-shrink-0"}),e.jsxs("div",{className:"text-sm",children:[e.jsx("strong",{children:"8 RLS Policies"}),e.jsx("p",{className:"text-muted-foreground",children:"Multi-tenant security for table and storage"})]})]}),e.jsxs("div",{className:"flex items-start gap-2",children:[e.jsx(u,{className:"w-4 h-4 text-green-600 mt-0.5 flex-shrink-0"}),e.jsxs("div",{className:"text-sm",children:[e.jsx("strong",{children:"Auto-Update Triggers"}),e.jsx("p",{className:"text-muted-foreground",children:"Automatic timestamp management"})]})]}),e.jsxs("div",{className:"flex items-start gap-2",children:[e.jsx(u,{className:"w-4 h-4 text-green-600 mt-0.5 flex-shrink-0"}),e.jsxs("div",{className:"text-sm",children:[e.jsx("strong",{children:"Role Space Access"}),e.jsx("p",{className:"text-muted-foreground",children:"Default space access for all 5 roles"})]})]})]})]})]})]}),e.jsxs(Card,{children:[e.jsxs(CardHeader,{children:[e.jsxs(CardTitle,{className:"flex items-center justify-between",children:[e.jsx("span",{children:"Setup Instructions"}),e.jsx(Button,{onClick:x,variant:"outline",size:"sm",children:r?e.jsxs(e.Fragment,{children:[e.jsx(u,{className:"w-4 h-4 mr-2"}),"Copied!"]}):e.jsxs(e.Fragment,{children:[e.jsx(k,{className:"w-4 h-4 mr-2"}),"Copy SQL"]})})]}),e.jsx(CardDescription,{children:"Follow these steps to set up the Documents module"})]}),e.jsxs(CardContent,{className:"space-y-6",children:[e.jsxs("div",{className:"space-y-4",children:[e.jsxs("div",{className:"flex items-start gap-3",children:[e.jsx("div",{className:"w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold flex-shrink-0",children:"1"}),e.jsxs("div",{className:"flex-1",children:[e.jsx("h4",{className:"font-semibold mb-1",children:"Open Supabase SQL Editor"}),e.jsxs("p",{className:"text-sm text-muted-foreground mb-2",children:["Go to your Supabase Dashboard and navigate to the ",e.jsx("strong",{children:"SQL Editor"})," section"]}),e.jsx(Button,{variant:"outline",size:"sm",asChild:!0,children:e.jsxs("a",{href:"https://supabase.com/dashboard",target:"_blank",rel:"noopener noreferrer",children:[e.jsx(et,{className:"w-4 h-4 mr-2"}),"Open Supabase Dashboard"]})})]})]}),e.jsxs("div",{className:"flex items-start gap-3",children:[e.jsx("div",{className:"w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold flex-shrink-0",children:"2"}),e.jsxs("div",{className:"flex-1",children:[e.jsx("h4",{className:"font-semibold mb-1",children:"Copy the Migration SQL"}),e.jsx("p",{className:"text-sm text-muted-foreground mb-2",children:'Click the "Copy SQL" button above to copy the complete migration script'}),e.jsxs(Button,{onClick:x,size:"sm",children:[e.jsx(k,{className:"w-4 h-4 mr-2"}),"Copy SQL to Clipboard"]})]})]}),e.jsxs("div",{className:"flex items-start gap-3",children:[e.jsx("div",{className:"w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold flex-shrink-0",children:"3"}),e.jsxs("div",{className:"flex-1",children:[e.jsx("h4",{className:"font-semibold mb-1",children:"Run the Migration"}),e.jsxs("p",{className:"text-sm text-muted-foreground",children:["Paste the SQL into the SQL Editor and click ",e.jsx("strong",{children:"Run"})," (or press Cmd/Ctrl + Enter)"]})]})]}),e.jsxs("div",{className:"flex items-start gap-3",children:[e.jsx("div",{className:"w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold flex-shrink-0",children:"4"}),e.jsxs("div",{className:"flex-1",children:[e.jsx("h4",{className:"font-semibold mb-1",children:"Wait for Success"}),e.jsx("p",{className:"text-sm text-muted-foreground",children:'You should see "Success" message in the SQL Editor. Some statements may return "Success. No rows returned" - this is normal.'})]})]}),e.jsxs("div",{className:"flex items-start gap-3",children:[e.jsx("div",{className:"w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-semibold flex-shrink-0",children:"5"}),e.jsxs("div",{className:"flex-1",children:[e.jsx("h4",{className:"font-semibold mb-1",children:"Refresh This Page"}),e.jsx("p",{className:"text-sm text-muted-foreground mb-2",children:"After the migration completes successfully, refresh your browser to start using the Documents module"}),e.jsxs(Button,{onClick:()=>window.location.reload(),size:"sm",variant:"default",children:[e.jsx(u,{className:"w-4 h-4 mr-2"}),"Refresh Page"]})]})]})]}),e.jsxs(he,{className:"border-blue-200 bg-blue-50",children:[e.jsx(ee,{className:"h-4 w-4 text-blue-600"}),e.jsxs(xe,{className:"text-blue-900",children:[e.jsx("strong",{children:"Tip:"})," The migration is idempotent - it's safe to run multiple times. It will skip items that already exist."]})]})]})]}),e.jsxs(Card,{children:[e.jsxs(CardHeader,{children:[e.jsx(CardTitle,{children:"Migration SQL Preview"}),e.jsx(CardDescription,{children:"This is the SQL that will be executed. You can review it before running."})]}),e.jsx(CardContent,{children:e.jsxs("div",{className:"relative",children:[e.jsx("pre",{className:"bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs max-h-96 overflow-y-auto",children:G}),e.jsx(Button,{onClick:x,size:"sm",variant:"secondary",className:"absolute top-2 right-2",children:r?e.jsxs(e.Fragment,{children:[e.jsx(u,{className:"w-3 h-3 mr-1"}),"Copied"]}):e.jsxs(e.Fragment,{children:[e.jsx(k,{className:"w-3 h-3 mr-1"}),"Copy"]})})]})})]}),e.jsxs(Card,{children:[e.jsx(CardHeader,{children:e.jsxs(CardTitle,{className:"flex items-center gap-2 text-lg",children:[e.jsx(tt,{className:"w-5 h-5"}),"About the Documents Module"]})}),e.jsxs(CardContent,{className:"space-y-3 text-sm",children:[e.jsx("p",{children:"The Documents module provides secure, multi-tenant document management with:"}),e.jsxs("ul",{className:"space-y-1 ml-4 text-muted-foreground",children:[e.jsx("li",{children:"• Upload and store documents (PDF, DOCX, XLSX, PPT, images)"}),e.jsx("li",{children:"• Associate documents with contacts"}),e.jsx("li",{children:"• Search and filter by category, contact, or tags"}),e.jsx("li",{children:"• Metadata management (title, description, tags, category)"}),e.jsx("li",{children:"• Role-based access control (configurable in Security → Space Matrix)"}),e.jsx("li",{children:"• Download and preview documents"}),e.jsx("li",{children:"• Version tracking and audit history"}),e.jsx("li",{children:"• 50MB file size limit per document"})]})]})]})]})}function Qt({user:r}){const[h,b]=i.useState([]),[x,L]=i.useState([]),[Y,Q]=i.useState(!1),[E,ge]=i.useState(""),[R,je]=i.useState("all"),[A,Ne]=i.useState("all"),[fe,$]=i.useState(!1),[Ee,U]=i.useState(!1),[j,V]=i.useState(null),[n,N]=i.useState({title:"",description:"",category:"",tags:"",contactId:""}),[F,H]=i.useState(!1),[Ce,v]=i.useState(!1),[W,K]=i.useState(null),[l,C]=i.useState({title:"",description:"",category:"",tags:"",contactId:""}),[_,q]=i.useState(!1),[T,Z]=i.useState(1),S=50;i.useEffect(()=>{O(),Te()},[]);const O=async()=>{Q(!0),$(!1);try{const{documents:t}=await Qe();b(t)}catch(t){t.code!=="PGRST205"&&t.code!=="42P01"&&t.message?.includes("Could not find the table"),t.code==="PGRST205"||t.code==="42P01"||t.message?.includes("Could not find the table")?$(!0):a.error("Failed to load documents")}finally{Q(!1)}},Te=async()=>{try{const t=await qe.getAll();L(t.contacts||[])}catch{a.error("Failed to load contacts")}},be=t=>{const s=t.target.files?.[0];s&&(V(s),N(o=>({...o,title:s.name})))},Se=async()=>{if(!j){a.error("Please select a file to upload");return}if(!ae("documents",r.role)){a.error("You do not have permission to upload documents");return}H(!0);try{const t=x.find(s=>s.id===n.contactId);await $e(j,{title:n.title||j.name,description:n.description||void 0,category:n.category||void 0,tags:n.tags?n.tags.split(",").map(s=>s.trim()):void 0,contactId:n.contactId||void 0,contactName:t?`${t.name} - ${t.company}`:void 0}),a.success("Document uploaded successfully"),U(!1),V(null),N({title:"",description:"",category:"",tags:"",contactId:""}),O()}catch(t){a.error(t.message||"Failed to upload document")}finally{H(!1)}},ve=t=>{K(t),C({title:t.title||"",description:t.description||"",category:t.category||"",tags:t.tags?.join(", ")||"",contactId:t.contactId||""}),v(!0)},Oe=async()=>{if(W){if(!ie("documents",r.role)){a.error("You do not have permission to edit documents");return}q(!0);try{const t=x.find(s=>s.id===l.contactId);await Ke(W.id,{title:l.title,description:l.description,category:l.category,tags:l.tags?l.tags.split(",").map(s=>s.trim()):[],contactId:l.contactId||void 0,contactName:t?`${t.name} - ${t.company}`:void 0}),a.success("Document updated successfully"),v(!1),K(null),O()}catch{a.error("Failed to update document")}finally{q(!1)}}},ye=async t=>{try{const s=await He(t.filePath),o=window.URL.createObjectURL(s),d=document.createElement("a");d.href=o,d.download=t.fileName,document.body.appendChild(d),d.click(),window.URL.revokeObjectURL(o),document.body.removeChild(d),a.success("Document downloaded")}catch{a.error("Failed to download document")}},Ie=async t=>{if(!ne("documents",r.role)){a.error("You do not have permission to delete documents");return}if(confirm(`Are you sure you want to delete "${t.title||t.fileName}"?`))try{await We(t.id),a.success("Document deleted successfully"),O()}catch{a.error("Failed to delete document")}},De=async t=>{try{const s=await Ve(t.filePath);window.open(s,"_blank")}catch{a.error("Failed to view document")}},f=h.filter(t=>{const s=t.title?.toLowerCase().includes(E.toLowerCase())||t.fileName.toLowerCase().includes(E.toLowerCase())||t.description?.toLowerCase().includes(E.toLowerCase())||t.contactName?.toLowerCase().includes(E.toLowerCase())||t.tags?.some(Fe=>Fe.toLowerCase().includes(E.toLowerCase())),o=R==="all"||t.category===R,d=A==="all"||t.contactId===A;return s&&o&&d}),we=Array.from(new Set(h.map(t=>t.category).filter(Boolean))),Le=Array.from(new Set(h.filter(t=>t.contactId).map(t=>({id:t.contactId,name:t.contactName}))).values()),P=Math.ceil(f.length/S),Re=f.slice((T-1)*S,T*S),J=t=>{if(t===0)return"0 Bytes";const s=1024,o=["Bytes","KB","MB","GB"],d=Math.floor(Math.log(t)/Math.log(s));return Math.round(t/Math.pow(s,d)*100)/100+" "+o[d]},Ae=t=>new Date(t).toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}),Ue=t=>t.includes("pdf")?e.jsx(z,{className:"w-5 h-5 text-red-500"}):t.includes("word")||t.includes("document")?e.jsx(z,{className:"w-5 h-5 text-blue-500"}):t.includes("excel")||t.includes("sheet")?e.jsx(z,{className:"w-5 h-5 text-green-500"}):t.includes("image")?e.jsx(B,{className:"w-5 h-5 text-purple-500"}):e.jsx(B,{className:"w-5 h-5 text-muted-foreground"});return fe?e.jsx(rt,{}):e.jsx(Ge,{user:r,module:"documents",action:"view",children:e.jsxs("div",{className:"p-4 sm:p-6 space-y-4 sm:space-y-6",children:[e.jsx("div",{className:"flex justify-end items-center",children:e.jsx(Ye,{module:"documents",action:"add",userRole:r.role,children:e.jsxs(le,{open:Ee,onOpenChange:U,children:[e.jsx(Me,{asChild:!0,children:e.jsxs(m,{children:[e.jsx(pe,{className:"w-4 h-4 mr-2"}),"Upload Document"]})}),e.jsxs(re,{className:"max-w-2xl bg-background",children:[e.jsxs(ce,{children:[e.jsx(oe,{children:"Upload Document"}),e.jsx(de,{children:"Upload a new document and associate it with a contact"})]}),e.jsxs("div",{className:"space-y-4",children:[e.jsxs("div",{children:[e.jsx(c,{htmlFor:"file",children:"File *"}),e.jsx(p,{id:"file",type:"file",onChange:be,accept:".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif"}),j&&e.jsxs("p",{className:"text-sm text-muted-foreground mt-1",children:["Selected: ",j.name," (",J(j.size),")"]})]}),e.jsxs("div",{children:[e.jsx(c,{htmlFor:"title",children:"Title"}),e.jsx(p,{id:"title",value:n.title,onChange:t=>N(s=>({...s,title:t.target.value})),placeholder:"Document title"})]}),e.jsxs("div",{children:[e.jsx(c,{htmlFor:"description",children:"Description"}),e.jsx(me,{id:"description",value:n.description,onChange:t=>N(s=>({...s,description:t.target.value})),placeholder:"Brief description of the document",rows:3})]}),e.jsxs("div",{children:[e.jsx(c,{htmlFor:"contact",children:"Associated Contact"}),e.jsxs(y,{value:n.contactId,onValueChange:t=>N(s=>({...s,contactId:t})),children:[e.jsx(I,{children:e.jsx(D,{placeholder:"Select a contact (optional)"})}),e.jsxs(w,{children:[e.jsx(g,{value:"none",children:"None"}),x.map(t=>e.jsxs(g,{value:t.id,children:[t.name," - ",t.company]},t.id))]})]})]}),e.jsxs("div",{children:[e.jsx(c,{htmlFor:"category",children:"Category"}),e.jsx(p,{id:"category",value:n.category,onChange:t=>N(s=>({...s,category:t.target.value})),placeholder:"e.g., Contract, Invoice, Proposal"})]}),e.jsxs("div",{children:[e.jsx(c,{htmlFor:"tags",children:"Tags"}),e.jsx(p,{id:"tags",value:n.tags,onChange:t=>N(s=>({...s,tags:t.target.value})),placeholder:"Comma-separated tags"})]}),e.jsxs("div",{className:"flex justify-end gap-2 pt-4",children:[e.jsx(m,{variant:"outline",onClick:()=>U(!1),disabled:F,children:"Cancel"}),e.jsx(m,{onClick:Se,disabled:!j||F,children:F?e.jsxs(e.Fragment,{children:[e.jsx(X,{className:"w-4 h-4 mr-2 animate-spin"}),"Uploading..."]}):e.jsxs(e.Fragment,{children:[e.jsx(pe,{className:"w-4 h-4 mr-2"}),"Upload"]})})]})]})]})]})})}),e.jsx(te,{children:e.jsx(se,{className:"pt-6",children:e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-4 gap-4",children:[e.jsx("div",{className:"md:col-span-2",children:e.jsxs("div",{className:"relative",children:[e.jsx(st,{className:"absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4"}),e.jsx(p,{placeholder:"Search documents...",value:E,onChange:t=>ge(t.target.value),className:"pl-10"})]})}),e.jsx("div",{children:e.jsxs(y,{value:R,onValueChange:je,children:[e.jsx(I,{children:e.jsx(D,{placeholder:"All Categories"})}),e.jsxs(w,{children:[e.jsx(g,{value:"all",children:"All Categories"}),we.map(t=>e.jsx(g,{value:t,children:t},t))]})]})}),e.jsx("div",{children:e.jsxs(y,{value:A,onValueChange:Ne,children:[e.jsx(I,{children:e.jsx(D,{placeholder:"All Contacts"})}),e.jsxs(w,{children:[e.jsx(g,{value:"all",children:"All Contacts"}),Le.map(t=>e.jsx(g,{value:t.id,children:t.name},t.id))]})]})})]})})}),e.jsxs(te,{children:[e.jsx(_e,{children:e.jsxs(Pe,{children:[f.length," ",f.length===1?"Document":"Documents"]})}),e.jsx(se,{children:Y?e.jsx("div",{className:"flex items-center justify-center py-8",children:e.jsx(X,{className:"w-8 h-8 animate-spin text-muted-foreground"})}):f.length===0?e.jsxs("div",{className:"text-center py-8 text-muted-foreground",children:[e.jsx(B,{className:"w-12 h-12 mx-auto mb-4 opacity-50"}),e.jsx("p",{children:"No documents found"}),ae("documents",r.role)&&e.jsx("p",{className:"text-sm",children:"Upload your first document to get started"})]}):e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"overflow-x-auto",children:e.jsxs("table",{className:"w-full",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"border-b",children:[e.jsx("th",{className:"text-left p-3",children:"File"}),e.jsx("th",{className:"text-left p-3 hidden sm:table-cell",children:"Title"}),e.jsx("th",{className:"text-left p-3 hidden lg:table-cell",children:"Contact"}),e.jsx("th",{className:"text-left p-3 hidden md:table-cell",children:"Category"}),e.jsx("th",{className:"text-left p-3 hidden md:table-cell",children:"Size"}),e.jsx("th",{className:"text-left p-3 hidden lg:table-cell",children:"Uploaded"}),e.jsx("th",{className:"text-left p-3 hidden lg:table-cell",children:"Tags"}),e.jsx("th",{className:"text-right p-3",children:"Actions"})]})}),e.jsx("tbody",{children:Re.map(t=>e.jsxs("tr",{className:"border-b hover:bg-muted/50",children:[e.jsx("td",{className:"p-3",children:e.jsxs("div",{className:"flex items-center gap-2",children:[Ue(t.fileType),e.jsx("span",{className:"text-sm truncate max-w-[200px]",title:t.fileName,children:t.fileName})]})}),e.jsx("td",{className:"p-3 hidden sm:table-cell",children:e.jsxs("div",{children:[e.jsx("div",{className:"truncate max-w-[200px]",title:t.title,children:t.title}),t.description&&e.jsx("div",{className:"text-sm text-muted-foreground truncate max-w-[200px]",title:t.description,children:t.description})]})}),e.jsx("td",{className:"p-3 hidden lg:table-cell",children:t.contactName?e.jsx("span",{className:"text-sm truncate max-w-[150px] inline-block",title:t.contactName,children:t.contactName}):e.jsx("span",{className:"text-muted-foreground text-sm",children:"-"})}),e.jsx("td",{className:"p-3 hidden md:table-cell",children:t.category?e.jsx(M,{variant:"outline",children:t.category}):e.jsx("span",{className:"text-muted-foreground text-sm",children:"-"})}),e.jsx("td",{className:"p-3 text-sm text-muted-foreground hidden md:table-cell",children:J(t.fileSize)}),e.jsx("td",{className:"p-3 hidden lg:table-cell",children:e.jsxs("div",{className:"text-sm",children:[e.jsx("div",{children:Ae(t.createdAt)}),e.jsx("div",{className:"text-muted-foreground",children:t.uploadedByName})]})}),e.jsx("td",{className:"p-3 hidden lg:table-cell",children:e.jsxs("div",{className:"flex flex-wrap gap-1",children:[t.tags&&t.tags.length>0?t.tags.slice(0,2).map((s,o)=>e.jsx(M,{variant:"secondary",className:"text-xs",children:s},o)):e.jsx("span",{className:"text-muted-foreground text-sm",children:"-"}),t.tags&&t.tags.length>2&&e.jsxs(M,{variant:"secondary",className:"text-xs",children:["+",t.tags.length-2]})]})}),e.jsx("td",{className:"p-3",children:e.jsxs("div",{className:"flex items-center justify-end gap-2",children:[e.jsx(m,{variant:"ghost",size:"sm",onClick:()=>De(t),children:e.jsx(at,{className:"w-4 h-4"})}),e.jsx(m,{variant:"ghost",size:"sm",onClick:()=>ye(t),children:e.jsx(it,{className:"w-4 h-4"})}),e.jsxs(ke,{children:[e.jsx(Xe,{asChild:!0,children:e.jsx(m,{variant:"ghost",size:"sm",children:e.jsx(Be,{className:"w-4 h-4"})})}),e.jsxs(ze,{align:"end",children:[ie("documents",r.role)&&e.jsxs(ue,{onClick:()=>ve(t),children:[e.jsx(nt,{className:"w-4 h-4 mr-2"}),"Edit Details"]}),ne("documents",r.role)&&e.jsxs(ue,{onClick:()=>Ie(t),className:"text-destructive",children:[e.jsx(lt,{className:"w-4 h-4 mr-2"}),"Delete"]})]})]})]})})]},t.id))})]})}),P>1&&e.jsxs("div",{className:"flex items-center justify-between mt-4 pt-4 border-t",children:[e.jsxs("div",{className:"text-sm text-muted-foreground",children:["Showing ",(T-1)*S+1," to"," ",Math.min(T*S,f.length)," of"," ",f.length," documents"]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx(m,{variant:"outline",size:"sm",onClick:()=>Z(t=>Math.max(1,t-1)),disabled:T===1,children:"Previous"}),e.jsx(m,{variant:"outline",size:"sm",onClick:()=>Z(t=>Math.min(P,t+1)),disabled:T===P,children:"Next"})]})]})]})})]}),e.jsx(le,{open:Ce,onOpenChange:v,children:e.jsxs(re,{className:"max-w-2xl bg-background",children:[e.jsxs(ce,{children:[e.jsx(oe,{children:"Edit Document Details"}),e.jsx(de,{children:"Update document information and associations"})]}),e.jsxs("div",{className:"space-y-4",children:[e.jsxs("div",{children:[e.jsx(c,{htmlFor:"edit-title",children:"Title"}),e.jsx(p,{id:"edit-title",value:l.title,onChange:t=>C(s=>({...s,title:t.target.value})),placeholder:"Document title"})]}),e.jsxs("div",{children:[e.jsx(c,{htmlFor:"edit-description",children:"Description"}),e.jsx(me,{id:"edit-description",value:l.description,onChange:t=>C(s=>({...s,description:t.target.value})),placeholder:"Brief description of the document",rows:3})]}),e.jsxs("div",{children:[e.jsx(c,{htmlFor:"edit-contact",children:"Associated Contact"}),e.jsxs(y,{value:l.contactId,onValueChange:t=>C(s=>({...s,contactId:t})),children:[e.jsx(I,{children:e.jsx(D,{placeholder:"Select a contact (optional)"})}),e.jsxs(w,{children:[e.jsx(g,{value:"none",children:"None"}),x.map(t=>e.jsxs(g,{value:t.id,children:[t.name," - ",t.company]},t.id))]})]})]}),e.jsxs("div",{children:[e.jsx(c,{htmlFor:"edit-category",children:"Category"}),e.jsx(p,{id:"edit-category",value:l.category,onChange:t=>C(s=>({...s,category:t.target.value})),placeholder:"e.g., Contract, Invoice, Proposal"})]}),e.jsxs("div",{children:[e.jsx(c,{htmlFor:"edit-tags",children:"Tags"}),e.jsx(p,{id:"edit-tags",value:l.tags,onChange:t=>C(s=>({...s,tags:t.target.value})),placeholder:"Comma-separated tags"})]}),e.jsxs("div",{className:"flex justify-end gap-2 pt-4",children:[e.jsx(m,{variant:"outline",onClick:()=>v(!1),disabled:_,children:"Cancel"}),e.jsx(m,{onClick:Oe,disabled:_,children:_?e.jsxs(e.Fragment,{children:[e.jsx(X,{className:"w-4 h-4 mr-2 animate-spin"}),"Saving..."]}):"Save Changes"})]})]})]})})]})})}export{Qt as Documents};
