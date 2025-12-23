'use client'

import EditorPane from '@/components/editor/EditorPane'
import ChatPane from '@/components/chat/ChatPane'
import { Document, saveDocument } from '@/lib/store/documentStore'
import { useState, useCallback } from 'react'

import Link from 'next/link'
import { UserNav } from '@/components/auth/UserNav'
import { Button } from '@/components/ui/button'
import { MessageSquare, X, Sparkles } from 'lucide-react'

import { ChatProvider } from '@/components/chat/ChatContext'
import { ToastProvider } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

export default function EditorPaneWrapper({ initialDocument, initialMessages, user }: { initialDocument: Document, initialMessages: any[], user: any }) {
  const [documentTitle, setDocumentTitle] = useState(initialDocument.title)
  const [isChatOpen, setIsChatOpen] = useState(false)

  const handleTitleChange = useCallback(async (newTitle: string) => {
    setDocumentTitle(newTitle)
    try {
      await saveDocument(initialDocument.id, undefined as any, newTitle)
    } catch {
      // Title save failed silently - document will retry on next change
    }
  }, [initialDocument.id])

  // Use a key that includes initial message count to force remount when messages change
  const chatProviderKey = `${initialDocument.id}-${initialMessages?.length || 0}`

  return (
    <ToastProvider>
    <ChatProvider key={chatProviderKey} documentId={initialDocument.id} initialMessages={initialMessages}>
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-background">
        <header className="px-4 lg:px-6 h-14 flex items-center border-b justify-between shrink-0 bg-background/80 backdrop-blur-sm">
          <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg tracking-tight">DocEdit AI</span>
          </Link>
          <div className="flex items-center gap-2 md:gap-4">
              {/* Mobile chat toggle */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden"
                onClick={() => setIsChatOpen(!isChatOpen)}
              >
                {isChatOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <MessageSquare className="h-5 w-5" />
                )}
              </Button>
              <UserNav user={user} />
          </div>
        </header>
        <main className="flex flex-1 overflow-hidden relative">
          <div className="flex-1 flex flex-col h-full min-w-0">
              <EditorPane 
                initialContent={initialDocument.content} 
                documentId={initialDocument.id} 
                title={documentTitle}
                onTitleChange={handleTitleChange}
              />
          </div>
          
          {/* Chat sidebar - responsive */}
          {/* Desktop: always visible */}
          <div className="hidden md:block w-96 flex-shrink-0 border-l bg-sidebar overflow-hidden h-full">
              <ChatPane 
                documentId={initialDocument.id} 
                documentTitle={documentTitle}
                onTitleChange={handleTitleChange}
              />
          </div>
          
          {/* Mobile: slide-in overlay */}
          <div 
            className={cn(
              "md:hidden fixed inset-0 top-14 z-40 transition-transform duration-300 ease-in-out",
              isChatOpen ? "translate-x-0" : "translate-x-full"
            )}
          >
            {/* Backdrop */}
            <div 
              className={cn(
                "absolute inset-0 bg-black/20 transition-opacity",
                isChatOpen ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
              onClick={() => setIsChatOpen(false)}
            />
            
            {/* Chat panel */}
            <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-sidebar border-l shadow-xl">
              <ChatPane 
                documentId={initialDocument.id} 
                documentTitle={documentTitle}
                onTitleChange={handleTitleChange}
              />
            </div>
          </div>
        </main>
      </div>
    </ChatProvider>
    </ToastProvider>
  )
}
