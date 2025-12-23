'use client'

import React, { createContext, useContext, useMemo, useEffect, useState, useCallback } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, UIMessage } from 'ai'
import { saveChat } from '@/lib/store/documentStore'

interface ChatContextType {
  messages: UIMessage[]
  sendMessage: (options: { text: string; body?: any }) => Promise<void>
  status: 'ready' | 'submitted' | 'streaming' | 'error'
  isLoading: boolean
  documentId: string
  error: string | null
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

function dedupeMessagesById<T extends { id?: string }>(msgs: T[]): T[] {
  if (!Array.isArray(msgs) || msgs.length === 0) return []
  const seen = new Set<string>()
  const out: T[] = []

  // Keep the *latest* occurrence of a given id (streaming updates can duplicate ids).
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i]
    const id = (m as any)?.id as string | undefined
    if (id) {
      if (seen.has(id)) continue
      seen.add(id)
    }
    out.push(m)
  }
  out.reverse()
  return out
}

export function ChatProvider({
  children,
  documentId,
  initialMessages
}: {
  children: React.ReactNode
  documentId: string
  initialMessages?: any[]
}) {
  // Normalize messages to ensure they match the UIMessage structure perfectly
  const normalizedInitialMessages = useMemo(() => {
    if (!initialMessages || !Array.isArray(initialMessages)) return []
    return initialMessages.map((m: any, idx: number) => ({
      id: m.id || `hist-${idx}`,
      role: m.role || 'assistant',
      content: typeof m.content === 'string' ? m.content : (m.text || ''),
      parts: m.parts || (m.text ? [{ type: 'text', text: m.text }] : []),
      ...m
    }))
  }, [initialMessages])

  const transport = useMemo(() => new DefaultChatTransport({
    api: '/api/ai',
  }), [])

  // Generate a unique ID for this chat session to avoid caching issues
  const chatSessionId = useMemo(() => `${documentId}-${Date.now()}`, [documentId])
  
  const [error, setError] = useState<string | null>(null)

  const chatResult = useChat({
    id: chatSessionId,
    initialMessages: normalizedInitialMessages as any,
    transport,
    onError: (err: any) => {
        setError(err?.message || 'Something went wrong. Please try again.')
        // Clear error after 5 seconds
        setTimeout(() => setError(null), 5000)
    }
  } as any)

  // Extremely safe destructuring based on actual SDK discovery
  const chat = (chatResult || {}) as any
  const hookMessages = (chat.messages || []) as UIMessage[]
  const setMessages = chat.setMessages as ((messages: UIMessage[]) => void) | undefined
  
  // Natively, this version uses 'sendMessage' instead of 'append'
  const hookSendMessage = typeof chat.sendMessage === 'function' ? chat.sendMessage : null
  const status = chat.status || 'ready'
  
  // Use combined messages: initial + hook messages
  // This ensures we always show initial messages even if the hook doesn't pick them up
  const [hasSetInitial, setHasSetInitial] = useState(false)
  
  useEffect(() => {
    // On mount, if we have initial messages but the hook is empty, force set them
    if (!hasSetInitial && normalizedInitialMessages.length > 0 && setMessages) {
      setMessages(normalizedInitialMessages as any)
      setHasSetInitial(true)
    }
  }, [normalizedInitialMessages, setMessages, hasSetInitial])

  // Use hook messages, but fall back to normalized if hook is empty. Always dedupe by id to
  // avoid duplicate React keys and duplicated UI rows (can happen with streaming updates).
  const messages = useMemo(() => {
    const base = hookMessages.length > 0 ? hookMessages : (normalizedInitialMessages as any as UIMessage[])
    return dedupeMessagesById(base)
  }, [hookMessages, normalizedInitialMessages])

  // Check if we're actually loading - with timeout protection
  const [forceReady, setForceReady] = useState(false)
  const loadingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  
  // Reset force ready when status changes to submitted
  useEffect(() => {
    if (status === 'submitted' || status === 'streaming') {
      setForceReady(false)
      
      // Set a timeout to force-ready if stuck for too long (30 seconds)
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
      }
      loadingTimeoutRef.current = setTimeout(() => {
        setForceReady(true)
      }, 30000)
    } else {
      // Clear timeout when we naturally become ready
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
        loadingTimeoutRef.current = null
      }
    }
    
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
      }
    }
  }, [status])
  
  // Also check if we have a complete tool call - if so, consider not loading
  const hasCompleteToolCall = messages.length > 0 && messages.some((m: any) => 
    m.parts?.some((p: any) => p.type === 'tool-call' && p.toolName && (p.input || p.args))
  )
  
  const isLoading = !forceReady && (status === 'submitted' || status === 'streaming') && !hasCompleteToolCall
  const hasMounted = React.useRef(false)
  const lastSavedLength = React.useRef(0)
  const prevStatus = React.useRef(status)
  const messagesRef = React.useRef(messages)
  
  // Keep messagesRef updated with the latest deduped messages
  React.useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  // Save on page unload
  React.useEffect(() => {
    const handleBeforeUnload = () => {
      if (messagesRef.current.length > 0) {
        // Use sendBeacon for reliable save on page unload
        const data = JSON.stringify({
          document_id: documentId,
          messages: messagesRef.current
        })
        navigator.sendBeacon('/api/save-chat', data)
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [documentId])

  useEffect(() => {
    // Prevent saving on initial mount to avoid overwriting with empty/incomplete messages
    if (!hasMounted.current) {
      hasMounted.current = true
      lastSavedLength.current = messages.length
      return
    }

    // Save when:
    // 1. We have hook messages (not just initial) AND
    // 2. We just finished streaming (status changed from streaming to ready) OR
    // 3. We have more messages than last saved
    const justFinishedStreaming = prevStatus.current === 'streaming' && status === 'ready'
    const hasNewMessages = messages.length > lastSavedLength.current

    prevStatus.current = status

    if (messages && messages.length > 0 && !isLoading && (justFinishedStreaming || hasNewMessages)) {
      // Small debounce to ensure state is settled
      const timer = setTimeout(() => {
        saveChat(documentId, messages)
          .then(() => {
            lastSavedLength.current = messages.length
          })
          .catch(() => {})
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [messages, status, isLoading, documentId])

  const value = useMemo(() => ({
    messages,
    sendMessage: async (options: { text: string; body?: any }) => {
        if (hookSendMessage) {
            setError(null)
            try {
                // AI SDK v6 sendMessage takes { text: string } as first arg, options as second
                await hookSendMessage({
                    text: options.text,
                }, {
                    body: options.body || {}
                })
            } catch (err: any) {
                setError(err?.message || 'Failed to send message')
            }
        }
    },
    status: status as any,
    isLoading,
    documentId,
    error
  }), [messages, hookSendMessage, status, isLoading, documentId, error])

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChatContext() {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider')
  }
  return context
}
