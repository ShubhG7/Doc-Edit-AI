
export interface Document {
  id: string
  title: string
  content: string // HTML or JSON string
  created_at: string
  updated_at: string
  user_id: string
}

import { createClient as createBrowserClient } from '@/lib/supabase/client'
import { SupabaseClient } from '@supabase/supabase-js'

export async function getDocuments(supabase?: SupabaseClient) {
    const client = supabase || createBrowserClient()
    const { data, error } = await client
        .from('documents')
        .select('*')
        .order('updated_at', { ascending: false })
    
    if (error) {
        throw new Error(error.message || 'Failed to load documents')
    }
    return data as Document[]
}

export async function createDocument(title: string, supabase?: SupabaseClient) {
    const client = supabase || createBrowserClient()
    // get user 
    const { data: { user } } = await client.auth.getUser()
    if (!user) throw new Error("Not authenticated")

    const { data, error } = await client
        .from('documents')
        .insert({
            title,
            user_id: user.id,
            content: '<p>Start writing...</p>'
        })
        .select()
        .single()

    if (error) {
        throw new Error(error.message || 'Failed to create document')
    }
    return data as Document
}

export async function getDocument(id: string, supabase?: SupabaseClient) {
    const client = supabase || createBrowserClient()
    const { data, error } = await client
        .from('documents')
        .select('*')
        .eq('id', id)
        .single()

    if (error) {
        throw new Error(error.message || 'Document not found')
    }
    return data as Document
}

export async function saveDocument(id: string, content?: string, title?: string, supabase?: SupabaseClient) {
    const client = supabase || createBrowserClient()
    const update: any = { updated_at: new Date().toISOString() }
    
    // Only include content if it's provided (not undefined)
    if (content !== undefined) update.content = content
    if (title) update.title = title

    // Don't make a request if there's nothing to update
    if (Object.keys(update).length === 1) {
        return
    }

    const { error } = await client
        .from('documents')
        .update(update)
        .eq('id', id)

    if (error) {
        throw new Error(error.message || 'Failed to save document')
    }
}

export async function deleteDocument(id: string, supabase?: SupabaseClient) {
    const client = supabase || createBrowserClient()
    const { error } = await client
        .from('documents')
        .delete()
        .eq('id', id)

    if (error) {
        throw new Error(error.message || 'Failed to delete document')
    }
}

export async function saveChat(documentId: string, messages: any[], supabase?: SupabaseClient) {
    const client = supabase || createBrowserClient()
    
    try {
        // Serialize messages to ensure they're JSON-compatible
        const serializedMessages = JSON.parse(JSON.stringify(messages))
        
        // Check if we have an authenticated session
        const { data: { session } } = await client.auth.getSession()
        if (!session) {
            return
        }
        
        // Use upsert for atomic update/insert
        // document_id is the unique key per chat record
        const { error } = await client
            .from('chats')
            .upsert({
                document_id: documentId,
                messages: serializedMessages,
                updated_at: new Date().toISOString()
            }, { 
                onConflict: 'document_id' 
            })
            .select()

        if (error) {
            throw error
        }
    } catch {
        // Chat save failed silently
    }
}

export async function getChat(documentId: string, supabase?: SupabaseClient) {
    const client = supabase || createBrowserClient()
    try {
        const { data, error } = await client
            .from('chats')
            .select('messages')
            .eq('document_id', documentId)
            .single()

        if (error) {
            // PGRST116 = not found, which is normal for new documents
            return []
        }
        
        return data?.messages || []
    } catch {
        return []
    }
}

// ============ VERSION MANAGEMENT ============

export interface DocumentVersionDB {
    id: string
    document_id: string
    version_hash: string
    content_html: string
    title: string
    description: string
    version_type: 'ai_edit' | 'ai_title' | 'manual' | 'initial'
    version_number: number
    created_at: string
}

// Generate a short hash like git
function generateVersionHash(): string {
    return Math.random().toString(16).slice(2, 9)
}

export async function saveVersion(
    documentId: string, 
    contentHtml: string, 
    title: string, 
    description: string, 
    versionType: DocumentVersionDB['version_type'],
    supabase?: SupabaseClient
): Promise<DocumentVersionDB | null> {
    const client = supabase || createBrowserClient()
    
    try {
        // Get current version count for this document
        const { count } = await client
            .from('document_versions')
            .select('*', { count: 'exact', head: true })
            .eq('document_id', documentId)
        
        const versionNumber = (count || 0) + 1
        const versionHash = generateVersionHash()
        
        const { data, error } = await client
            .from('document_versions')
            .insert({
                document_id: documentId,
                version_hash: versionHash,
                content_html: contentHtml,
                title,
                description,
                version_type: versionType,
                version_number: versionNumber
            })
            .select()
            .single()
        
        if (error) {
            console.error('Failed to save version:', error)
            return null
        }
        
        return data as DocumentVersionDB
    } catch (e) {
        console.error('Failed to save version:', e)
        return null
    }
}

export async function getVersions(documentId: string, supabase?: SupabaseClient): Promise<DocumentVersionDB[]> {
    const client = supabase || createBrowserClient()
    
    try {
        const { data, error } = await client
            .from('document_versions')
            .select('*')
            .eq('document_id', documentId)
            .order('created_at', { ascending: false })
            .limit(50)  // Keep last 50 versions
        
        if (error) {
            return []
        }
        
        return (data as DocumentVersionDB[]) || []
    } catch {
        return []
    }
}

export async function getVersion(versionId: string, supabase?: SupabaseClient): Promise<DocumentVersionDB | null> {
    const client = supabase || createBrowserClient()
    
    try {
        const { data, error } = await client
            .from('document_versions')
            .select('*')
            .eq('id', versionId)
            .single()
        
        if (error) {
            return null
        }
        
        return data as DocumentVersionDB
    } catch {
        return null
    }
}
