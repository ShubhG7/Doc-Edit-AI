'use client'

import { EditOperation } from '@/lib/ai/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ChevronDown, ChevronRight, Check, Loader2, MousePointer2, Trash2, Search, Sparkles } from 'lucide-react'
import { useState, useMemo } from 'react'
import { useEditorStore } from '@/lib/store/editorStore'

interface SuggestionCardProps {
  edit: EditOperation
  onApply?: (edit: EditOperation) => boolean | void
  isStreaming?: boolean
}

export function SuggestionCard({ edit, isStreaming }: SuggestionCardProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isApplied, setIsApplied] = useState(false)
  
  const { startEdit, insertInlineSuggestion } = useEditorStore()

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

  const canApply = !isStreaming && isContentComplete && !isApplied
  
  // Check if this is a replace or delete operation that needs interactive selection
  const isReplaceMode = edit.mode === 'replace_selection' || edit.mode === 'inline_suggestion'
  const isDeleteMode = edit.mode === 'delete'
  const isFindAndReplace = edit.mode === 'find_and_replace'

  const handleApply = () => {
    if (!canApply) return
    
    // For find_and_replace or delete mode with targetText, use the new inline suggestion flow
    if ((isFindAndReplace || isDeleteMode) && edit.targetText) {
      const success = insertInlineSuggestion(edit)
      if (success) {
        setIsApplied(true)
        return
      }
      // If inline suggestion failed (couldn't find text), fall back to old flow
    }
    
    // All other modes use interactive flow with preview
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

      {/* Find & Replace target info */}
      {isFindAndReplace && edit.targetText && !isStreaming && (
        <div className="bg-amber-50 dark:bg-amber-950/50 rounded-lg p-2 space-y-1 border border-amber-200 dark:border-amber-800">
          <p className="text-[10px] font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wide flex items-center gap-1">
            <Search className="h-3 w-3" />
            Will find & replace:
          </p>
          <p className="text-xs text-amber-800 dark:text-amber-200 line-clamp-2 italic">
            &ldquo;{edit.targetText.length > 80 ? edit.targetText.slice(0, 80) + '...' : edit.targetText}&rdquo;
          </p>
          {edit.targetHint && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Sparkles className="h-2.5 w-2.5" />
              {edit.targetHint}
            </p>
          )}
        </div>
      )}

      {/* Delete target info */}
      {isDeleteMode && edit.targetText && !isStreaming && (
        <div className="bg-red-50 dark:bg-red-950/50 rounded-lg p-2 space-y-1 border border-red-200 dark:border-red-800">
          <p className="text-[10px] font-medium text-red-700 dark:text-red-400 uppercase tracking-wide flex items-center gap-1">
            <Trash2 className="h-3 w-3" />
            Will delete:
          </p>
          <p className="text-xs text-red-800 dark:text-red-200 line-clamp-2 italic line-through">
            &ldquo;{edit.targetText.length > 80 ? edit.targetText.slice(0, 80) + '...' : edit.targetText}&rdquo;
          </p>
          {edit.targetHint && (
            <p className="text-[10px] text-red-600 dark:text-red-400 flex items-center gap-1">
              <Sparkles className="h-2.5 w-2.5" />
              {edit.targetHint}
            </p>
          )}
        </div>
      )}

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
            <span className="font-medium">{isFindAndReplace ? 'New Content' : 'Preview'}</span>
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

      <Button 
        size="sm" 
        onClick={handleApply} 
        className={`w-full ${isDeleteMode && !isApplied ? 'bg-red-600 hover:bg-red-700' : ''} ${isFindAndReplace && !isApplied ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
        disabled={!canApply}
        variant={isApplied ? "secondary" : "default"}
      >
        {isStreaming ? (
          <>
            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
            Generating...
          </>
        ) : isApplied ? (
          <>
            <Check className="h-3 w-3 mr-2" />
            {isDeleteMode 
              ? 'Select Text to Delete' 
              : isFindAndReplace
                ? 'Showing in Document'
                : isReplaceMode 
                  ? 'Select Text in Document' 
                  : 'Place Cursor in Document'
            }
          </>
        ) : !isContentComplete ? (
          <>
            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
            Waiting for content...
          </>
        ) : isDeleteMode ? (
          <>
            <Trash2 className="h-3 w-3 mr-2" />
            Select & Delete
          </>
        ) : isFindAndReplace ? (
          <>
            <Search className="h-3 w-3 mr-2" />
            Find & Replace
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
