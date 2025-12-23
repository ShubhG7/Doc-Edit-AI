-- Database setup for DocEdit AI

-- 1. Create documents table
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Create chats table
CREATE TABLE IF NOT EXISTS public.chats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE UNIQUE,
    messages JSONB DEFAULT '[]'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Create document_versions table for git-like version history
CREATE TABLE IF NOT EXISTS public.document_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    version_hash VARCHAR(7) NOT NULL,  -- Short hash like git
    content_html TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    version_type VARCHAR(20) NOT NULL DEFAULT 'manual',  -- 'ai_edit', 'ai_title', 'manual', 'initial'
    version_number INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    
    -- Ensure version_hash is unique per document
    UNIQUE(document_id, version_hash)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON public.document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_created_at ON public.document_versions(document_id, created_at DESC);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies for documents
CREATE POLICY "Users can create their own documents" 
ON public.documents FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own documents" 
ON public.documents FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents" 
ON public.documents FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents" 
ON public.documents FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- 6. Create RLS Policies for chats (linked to document ownership)
CREATE POLICY "Users can manage their own chats" 
ON public.chats FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.documents
    WHERE documents.id = chats.document_id
    AND documents.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.documents
    WHERE documents.id = chats.document_id
    AND documents.user_id = auth.uid()
  )
);

-- 7. Create RLS Policies for document_versions (linked to document ownership)
CREATE POLICY "Users can manage their own document versions" 
ON public.document_versions FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.documents
    WHERE documents.id = document_versions.document_id
    AND documents.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.documents
    WHERE documents.id = document_versions.document_id
    AND documents.user_id = auth.uid()
  )
);

-- 6. Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER on_documents_update
    BEFORE UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER on_chats_update
    BEFORE UPDATE ON public.chats
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();
