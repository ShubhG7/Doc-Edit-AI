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
  onApplyEdit?: (edit: EditOperation) => boolean | void
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
  const appliedTitles = useRef<Set<string>>(new Set())
  
  const { onApplyEdit, onUpdateTitle } = props
  
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
             
             const thinkingMatch = typeof textParts === 'string' ? textParts.match(/<thinking>([\s\S]*?)<\/thinking>/) : null
             const thinking = reasoningParts || (thinkingMatch ? thinkingMatch[1].trim() : null)
             const cleanContent = String(textParts.replace(/<thinking>[\s\S]*?<\/thinking>/, '').trim())
             
            const toolInvocations = hasParts
               ? (msg.parts || [])
                   .filter(p => p && (p.type === 'tool-call' || (p.type && p.type.startsWith('tool-'))))
                   .map(p => ({
                       toolCallId: (p as any).toolCallId || (p as any).id || `tc-${idx}`,
                       toolName: (p as any).toolName || (p.type === 'tool-call' ? (p as any).toolName : p.type?.replace('tool-', '')),
                       args: (p as any).input || (p as any).args || {}
                   }))
               : ((msg as any).toolInvocations || [])

             return (
            <div key={msg.id || `msg-${idx}`} className={cn("flex gap-3", msg.role === 'user' ? "flex-row-reverse" : "")}>
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
                        
                        if (!args.title) return null
                        
                        const isComplete = !!(args.mode && args.contentHtml && args.contentHtml.length > 10)
                        const editOp: EditOperation = {
                            id: toolInvocation.toolCallId || `edit-${tIdx}`,
                            title: args.title,
                            mode: (args.mode as any) || 'replace_selection',
                            contentHtml: args.contentHtml || '',
                            originalHtml: args.originalHtml,
                            targetText: args.targetText,
                            targetHint: args.targetHint
                        }
                        
                        return (
                            <div key={`${msg.id || `msg-${idx}`}-${toolInvocation.toolCallId || tIdx}`} className="w-full">
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
                        
                        const titleKey = `${toolInvocation.toolCallId}-${newTitle}`
                        const wasAutoApplied = appliedTitles.current.has(titleKey)
                        
                        // Auto-apply title for fresh documents
                        if (!wasAutoApplied && currentTitle === 'Untitled Document' && onUpdateTitle) {
                            appliedTitles.current.add(titleKey)
                            // Apply in next tick to avoid render issues
                            setTimeout(() => onUpdateTitle(newTitle), 10)
                        }
                        
                        return (
                            <div key={`${msg.id || `msg-${idx}`}-${toolInvocation.toolCallId || tIdx}`} className="w-full">
                                <Card className={`p-3 my-2 space-y-2 ${wasAutoApplied || currentTitle === newTitle ? 'border-green-500/20 bg-green-50' : 'border-blue-500/20 bg-blue-50'}`}>
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium text-sm flex items-center gap-2">
                                            <FileText className={`h-4 w-4 ${wasAutoApplied || currentTitle === newTitle ? 'text-green-600' : 'text-blue-600'}`} />
                                            {wasAutoApplied || currentTitle === newTitle ? 'Document Renamed' : 'Rename Document'}
                                        </span>
                                        {(wasAutoApplied || currentTitle === newTitle) && <Check className="h-4 w-4 text-green-600" />}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {wasAutoApplied || currentTitle === newTitle ? 'Title set to: ' : 'New title: '}<strong>{newTitle}</strong>
                                    </p>
                                    {!(wasAutoApplied || currentTitle === newTitle) && (
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
      
      <div ref={bottomRef} />
    </div>
  )
}
