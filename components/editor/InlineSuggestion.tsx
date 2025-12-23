'use client'

import { InlineSuggestion as SuggestionType } from '@/lib/store/suggestionStore'
import { Check, X } from 'lucide-react'

interface InlineSuggestionProps {
  suggestion: SuggestionType
  onAccept: (id: string) => void
  onReject: (id: string) => void
}

export function InlineSuggestionBlock({ suggestion, onAccept, onReject }: InlineSuggestionProps) {
  if (suggestion.status !== 'pending') return null

  return (
    <div 
      className="inline-suggestion-block my-4 rounded-lg border-2 border-primary/30 bg-gradient-to-b from-primary/5 to-transparent overflow-hidden"
      data-suggestion-id={suggestion.id}
    >
      {/* Header with Accept/Reject */}
      <div className="flex items-center justify-between px-3 py-2 bg-primary/10 border-b border-primary/20">
        <span className="text-xs font-medium text-primary/80">
          {suggestion.title || 'Suggested edit'}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onAccept(suggestion.id)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-emerald-500 hover:bg-emerald-600 text-white rounded-md transition-colors"
          >
            <Check className="h-3 w-3" />
            Accept
          </button>
          <button
            onClick={() => onReject(suggestion.id)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-transparent hover:bg-red-100 text-red-600 rounded-md transition-colors"
          >
            <X className="h-3 w-3" />
            Reject
          </button>
        </div>
      </div>

      {/* Content comparison */}
      <div className="p-3 space-y-3">
        {/* Current text */}
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Current text
          </p>
          <div className="p-3 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
            <div 
              className="text-sm text-red-800 dark:text-red-200 prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-li:my-0.5"
              dangerouslySetInnerHTML={{ __html: suggestion.originalHtml }}
            />
          </div>
        </div>

        {/* Suggested update */}
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Suggested update
          </p>
          <div className="p-3 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
            <div 
              className="text-sm text-emerald-800 dark:text-emerald-200 prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-li:my-0.5"
              dangerouslySetInnerHTML={{ __html: suggestion.newHtml }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// Simplified inline diff that replaces the original content
export function InlineDiffView({ suggestion, onAccept, onReject }: InlineSuggestionProps) {
  if (suggestion.status !== 'pending') return null

  return (
    <span 
      className="inline-diff-wrapper"
      data-suggestion-id={suggestion.id}
    >
      {/* Original with strikethrough */}
      <span className="line-through text-red-500 bg-red-100 dark:bg-red-900/30 px-0.5 rounded">
        {suggestion.originalText}
      </span>
      {' '}
      {/* New text highlighted */}
      <span className="text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-0.5 rounded font-medium">
        {suggestion.newText}
      </span>
      {/* Inline buttons */}
      <span className="inline-flex items-center gap-0.5 ml-1 align-middle">
        <button
          onClick={() => onAccept(suggestion.id)}
          className="inline-flex items-center justify-center w-5 h-5 bg-emerald-500 hover:bg-emerald-600 text-white rounded transition-colors"
          title="Accept"
        >
          <Check className="h-3 w-3" />
        </button>
        <button
          onClick={() => onReject(suggestion.id)}
          className="inline-flex items-center justify-center w-5 h-5 bg-red-100 hover:bg-red-200 text-red-600 rounded transition-colors"
          title="Reject"
        >
          <X className="h-3 w-3" />
        </button>
      </span>
    </span>
  )
}

