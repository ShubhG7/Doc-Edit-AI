import { cn } from '@/lib/utils'
import { Bot, User, Brain, ChevronDown, ChevronRight, FileText, Check } from 'lucide-react'
import { SuggestionCard } from './SuggestionCard'
import { EditOperation } from '@/lib/ai/types'
import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export interface Message {
    id: string
    role: 'system' | 'user' | 'assistant'
    parts: Array<{
        type: string
        text?: string
        thinking?: string
        toolCallId?: string
        toolName?: string
        args?: any
    }>
}

interface MessageListProps {
  messages: Message[]
  onApplyEdit?: (edit: EditOperation) => void
  onUpdateTitle?: (newTitle: string) => void
  isLoading?: boolean
  currentTitle?: string
}

function ThinkingBlock({ content }: { content: string }) {
    const [isOpen, setIsOpen] = useState(false)
    if (!content) return null
    
    return (
        <div className="w-full mb-2">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
                {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                <Brain className="h-3 w-3" />
                <span>AI Reasoning</span>
            </button>
            {isOpen && (
                <div className="mt-2 text-xs text-muted-foreground border-l-2 border-primary/30 pl-3 py-1 italic bg-muted/30 rounded-r-md">
                    {content}
                </div>
            )}
        </div>
    )
}

export function MessageList({ messages, isLoading, currentTitle, ...props }: MessageListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const appliedChanges = useRef<Set<string>>(new Set())
  
  const { onApplyEdit, onUpdateTitle } = props
  
  // Helper to extract tool calls from a message
  const extractToolCalls = (msg: Message, msgIndex: number) => {
    if (!msg?.parts || !Array.isArray(msg.parts)) return []
    return msg.parts
      .filter(p => p && (p.type === 'tool-call' || p.type?.startsWith('tool-')))
      .map((p, pIndex) => ({
        // Use stable ID based on message and part index if no toolCallId
        toolCallId: (p as any).toolCallId || (p as any).id || `tc-${msgIndex}-${pIndex}`,
        toolName: (p as any).toolName || p.type?.replace('tool-', ''),
        args: (p as any).input || (p as any).args || {}
      }))
  }
  
  // Auto-apply title and edit changes for fresh documents (runs once per new tool call)
  useEffect(() => {
    const isFreshDocument = currentTitle === 'Untitled Document'
    if (!isFreshDocument) return // Only auto-apply for fresh documents
    
    const messageList = messages || []
    for (let msgIndex = 0; msgIndex < messageList.length; msgIndex++) {
      const msg = messageList[msgIndex]
      const toolCalls = extractToolCalls(msg, msgIndex)
      
      for (const tc of toolCalls) {
        const changeId = tc.toolCallId
        if (appliedChanges.current.has(changeId)) continue
        
        // Auto-apply title changes for fresh documents
        if (tc.toolName === 'update_document_title' && onUpdateTitle) {
          const newTitle = tc.args?.newTitle
          if (newTitle) {
            appliedChanges.current.add(changeId)
            // Use setTimeout to avoid state updates during render
            setTimeout(() => onUpdateTitle(newTitle), 0)
          }
        }
        
        // Auto-apply content edits for fresh documents  
        if (tc.toolName === 'apply_edit' && onApplyEdit) {
          const args = tc.args
          if (args?.contentHtml && args?.mode) {
            appliedChanges.current.add(changeId)
            // Use setTimeout to avoid state updates during render
            setTimeout(() => onApplyEdit({
              id: changeId,
              title: args.title || 'AI Edit',
              mode: args.mode,
              contentHtml: args.contentHtml,
              originalHtml: args.originalHtml
            }), 0)
          }
        }
      }
    }
  }, [messages, currentTitle, onUpdateTitle, onApplyEdit])
  
  // Auto-scroll to bottom when messages change or loading state changes
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isLoading])
  
  if (!messages || (messages.length === 0 && !isLoading)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
        <Bot className="h-12 w-12 mb-4 opacity-20" />
        <p>Ask me to help you write, edit, or improve your document.</p>
      </div>
    )
  }
  
  return (
    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-6">
      {(messages || []).map((msg, idx) => {
         try {
             if (!msg) return null;

             const hasParts = (msg.parts && Array.isArray(msg.parts) && msg.parts.length > 0)
             const textParts = String(hasParts 
                ? msg.parts.filter(p => p && p.type === 'text').map(p => p.text || '').join('\n')
                : (msg as any).content || '')
                
            const reasoningParts = hasParts
               ? msg.parts.filter(p => p && p.type === 'reasoning').map(p => p.text || '').join('\n')
               : ''
             
             // Support legacy thinking tags if they are in text parts
             const thinkingMatch = typeof textParts === 'string' ? textParts.match(/<thinking>([\s\S]*?)<\/thinking>/) : null
             const thinking = reasoningParts || (thinkingMatch ? thinkingMatch[1].trim() : null)
             const cleanContent = String(textParts.replace(/<thinking>[\s\S]*?<\/thinking>/, '').trim())
             
            const toolInvocations = hasParts
               ? (msg.parts || [])
                   .filter(p => p && (p.type === 'tool-call' || p.type.startsWith('tool-') || p.type === 'dynamic-tool'))
                   .map(p => ({
                       toolCallId: p.toolCallId || (p as any).id,
                       toolName: p.toolName || (p.type === 'tool-call' ? (p as any).toolName : p.type.replace('tool-', '')),
                       // AI SDK v6 uses 'input' for tool args, fallback to 'args' for compatibility
                       args: (p as any).input || p.args
                   }))
               : ((msg as any).toolInvocations || [])

             return (
            <div key={msg.id || idx} className={cn("flex gap-3", msg.role === 'user' ? "flex-row-reverse" : "")}>
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0", msg.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted")}>
                {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div className={cn("max-w-[85%] space-y-2", msg.role === 'user' ? "items-end flex flex-col" : "")}>
                {(thinking || cleanContent) && (
                <div className={cn("rounded-lg p-3 text-sm shadow-sm", msg.role === 'user' ? "bg-primary text-primary-foreground" : "bg-white border w-full")}>
                     {thinking && <ThinkingBlock content={thinking} />}
                     {cleanContent && <div className="whitespace-pre-wrap">{cleanContent}</div>}
                </div>
                )}
                
                {/* Render Tool Invocations */}
                {(toolInvocations || []).map((toolInvocation: any, tIdx: number) => {
                    // Handle apply_edit tool
                    if (toolInvocation && toolInvocation.toolName === 'apply_edit') {
                        const args = (toolInvocation.args || {}) as unknown as Partial<EditOperation>
                        
                        // Show the card as soon as we have a title
                        if (!args.title) return null
                        
                        const isComplete = !!(args.mode && args.contentHtml)
                        const editOp: EditOperation = {
                            id: toolInvocation.toolCallId || `edit-${tIdx}`,
                            title: args.title,
                            mode: (args.mode as any) || 'replace_selection',
                            contentHtml: args.contentHtml || '',
                            originalHtml: args.originalHtml
                        }
                        
                        return (
                            <div key={toolInvocation.toolCallId || tIdx} className="w-full">
                                <SuggestionCard 
                                    edit={editOp} 
                                    onApply={onApplyEdit!} 
                                    isStreaming={!isComplete}
                                />
                            </div>
                        )
                    }
                    
                    // Handle update_document_title tool
                    if (toolInvocation && toolInvocation.toolName === 'update_document_title') {
                        const args = toolInvocation.args || {}
                        const newTitle = args.newTitle
                        
                        if (!newTitle) return null
                        
                        const wasAutoApplied = appliedChanges.current.has(toolInvocation.toolCallId)
                        
                        return (
                            <div key={toolInvocation.toolCallId || tIdx} className="w-full">
                                <Card className={`p-3 my-2 space-y-2 ${wasAutoApplied ? 'border-green-500/20 bg-green-50' : 'border-blue-500/20 bg-blue-50'}`}>
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium text-sm flex items-center gap-2">
                                            <FileText className={`h-4 w-4 ${wasAutoApplied ? 'text-green-600' : 'text-blue-600'}`} />
                                            {wasAutoApplied ? 'Document Renamed' : 'Rename Document'}
                                        </span>
                                        {wasAutoApplied && <Check className="h-4 w-4 text-green-600" />}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {wasAutoApplied ? 'Title set to: ' : 'New title: '}<strong>{newTitle}</strong>
                                    </p>
                                    {!wasAutoApplied && (
                                        <Button 
                                            size="sm" 
                                            onClick={() => onUpdateTitle?.(newTitle)} 
                                            className="w-full"
                                        >
                                            <Check className="h-4 w-4 mr-2" />
                                            Apply Title Change
                                        </Button>
                                    )}
                                </Card>
                            </div>
                        )
                    }
                    
                    return null
                })}
              </div>
            </div>
          )
         } catch {
             return null;
         }
      })}
      
      {isLoading && (
        <div className="flex gap-3">
             <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center animate-pulse">
                <Bot className="h-4 w-4" />
            </div>
            <div className="bg-muted rounded-lg p-3 text-sm animate-pulse">
                <div className="flex gap-1 py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
            </div>
        </div>
      )}
      
      {/* Invisible element to scroll to */}
      <div ref={bottomRef} />
    </div>
  )
}

