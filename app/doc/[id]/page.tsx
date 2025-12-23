import { Suspense } from 'react'
import { getDocument, getChat } from '@/lib/store/documentStore'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import EditorPaneWrapper from './EditorPaneWrapper'

// Ensure fresh data on every request - don't cache this page
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { id } = await params

    try {
        const [doc, initialMessages] = await Promise.all([
            getDocument(id, supabase),
            getChat(id, supabase)
        ])

        if (doc.user_id !== user.id) {
            redirect('/dashboard')
        }

        return (
            <Suspense fallback={<div>Loading editor...</div>}>
                <EditorPaneWrapper initialDocument={doc} initialMessages={initialMessages} user={user} />
            </Suspense>
        )
    } catch {
        notFound()
    }
}
