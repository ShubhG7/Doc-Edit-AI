'use client'

import { EditOperation } from '@/lib/ai/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ChevronDown, ChevronRight, Check, Loader2, AlertCircle, MousePointer2 } from 'lucide-react'
import { useState, useMemo } from 'react'
import { useEditorStore } from '@/lib/store/editorStore'

interface SuggestionCardProps {
  edit: EditOperation
  onApply: (edit: EditOperation) => boolean | void
  isStreaming?: boolean
}

export function SuggestionCard({ edit, onApply, isStreaming }: SuggestionCardProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [isApplied, setIsApplied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { startEdit } = useEditorStore()

  // Check if content appears complete
  const isContentComplete = useMemo(() => {
    if (!edit.contentHtml) return false
    if (edit.contentHtml.length < 10) return false
    
    const trimmed = edit.contentHtml.trim()
    // Check for incomplete HTML
    if (trimmed.endsWith('<') || trimmed.endsWith('</')) return false
    // Check for unclosed common tags
    if (trimmed.includes('<p>') && !trimmed.includes('</p>')) return false
    if (trimmed.includes('<h1>') && !trimmed.includes('</h1>')) return false
    if (trimmed.includes('<h2>') && !trimmed.includes('</h2>')) return false
    
    return true
  }, [edit.contentHtml])

  const canApply = !isStreaming && isContentComplete && !isApplying && !isApplied
  
  // Check if this is a replace operation that needs interactive selection
  const isReplaceMode = edit.mode === 'replace_selection' || edit.mode === 'inline_suggestion'

  const handleApply = () => {
    if (!canApply) return
    
    // All modes now use interactive flow with preview
    startEdit(edit)
    setIsApplied(true) // Mark as handled
  }

  // Strip HTML tags for plain text preview
  const plainTextPreview = useMemo(() => {
    if (!edit.contentHtml) return ''
    return edit.contentHtml
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 150)
  }, [edit.contentHtml])

  return (
    <Card className="p-3 my-2 space-y-2 border-primary/20 bg-primary/5">
      <div className="flex justify-between items-center">
        <span className="font-medium text-sm flex items-center gap-2">
          {edit.title}
          {isStreaming && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
        </span>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md capitalize">
          {edit.mode?.replace(/_/g, ' ') || 'edit'}
        </span>
      </div>

      {/* Content Preview - only show when not streaming and content exists */}
      {edit.contentHtml && isContentComplete && !isStreaming && (
        <div className="space-y-2">
          <button
            onClick={() => setIsPreviewOpen(!isPreviewOpen)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-left"
          >
            {isPreviewOpen ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            <span className="font-medium">Preview</span>
            {!isPreviewOpen && plainTextPreview && (
              <span className="truncate opacity-60 ml-1">
                — {plainTextPreview}...
              </span>
            )}
          </button>
          
          {isPreviewOpen && (
            <div 
              className="text-xs border rounded-md p-3 bg-background max-h-48 overflow-y-auto prose prose-sm dark:prose-invert prose-p:my-1 prose-headings:my-2"
              dangerouslySetInnerHTML={{ __html: edit.contentHtml }}
            />
          )}
        </div>
      )}
      
      {/* Streaming indicator */}
      {isStreaming && (
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Generating content...</span>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </div>
      )}

      <Button 
        size="sm" 
        onClick={handleApply} 
        className="w-full"
        disabled={!canApply}
        variant={isApplied ? "secondary" : "default"}
      >
        {isStreaming ? (
          <>
            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
            Generating...
          </>
        ) : isApplying ? (
          <>
            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
            Applying...
          </>
        ) : isApplied ? (
          <>
            <Check className="h-3 w-3 mr-2" />
            {isReplaceMode ? 'Select Text in Document' : 'Place Cursor in Document'}
          </>
        ) : !isContentComplete ? (
          <>
            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
            Waiting for content...
          </>
        ) : (
          <>
            <MousePointer2 className="h-3 w-3 mr-2" />
            Preview & Apply
          </>
        )}
      </Button>
    </Card>
  )
}
