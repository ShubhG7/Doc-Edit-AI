import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { document_id, messages } = body

    if (!document_id || !messages) {
      return new Response('Missing required fields', { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Verify user owns the document
    const { data: doc } = await supabase
      .from('documents')
      .select('user_id')
      .eq('id', document_id)
      .single()

    if (!doc || doc.user_id !== user.id) {
      return new Response('Forbidden', { status: 403 })
    }

    // Save the chat
    const { error } = await supabase
      .from('chats')
      .upsert({
        document_id,
        messages,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'document_id'
      })

    if (error) {
      return new Response('Error saving chat', { status: 500 })
    }

    return new Response('OK', { status: 200 })
  } catch {
    return new Response('Internal error', { status: 500 })
  }
}

