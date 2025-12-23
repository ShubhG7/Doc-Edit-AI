'use client'

import { useSuggestionStore } from '@/lib/store/suggestionStore'
import { useEditorStore } from '@/lib/store/editorStore'
import { Check, X } from 'lucide-react'
import { useVersionStore } from '@/lib/store/versionStore'

interface SuggestionBarProps {
  documentId: string
  documentTitle?: string
}

export function SuggestionBar({ documentId, documentTitle }: SuggestionBarProps) {
  const { getPendingCount, acceptAll, rejectAll, getPendingSuggestions, removeSuggestion } = useSuggestionStore()
  const { editor } = useEditorStore()
  
  const pendingCount = getPendingCount()
  
  if (pendingCount === 0) return null

  const handleAcceptAll = () => {
    if (!editor) return
    
    const suggestions = getPendingSuggestions()
    
    // Sort suggestions by position (from end to start) to avoid position shifting issues
    const sortedSuggestions = [...suggestions].sort((a, b) => b.from - a.from)
    
    // Apply each suggestion
    for (const suggestion of sortedSuggestions) {
      try {
        editor.chain()
          .setTextSelection({ from: suggestion.from, to: suggestion.to })
          .deleteSelection()
          .insertContent(suggestion.newHtml)
          .run()
      } catch (e) {
        console.error('Failed to apply suggestion:', suggestion.id, e)
      }
    }
    
    // Mark all as accepted and clean up
    acceptAll()
    
    // Remove suggestion blocks from document
    setTimeout(() => {
      for (const suggestion of suggestions) {
        removeSuggestion(suggestion.id)
      }
      // Cleanup any remaining suggestion block elements
      cleanupSuggestionBlocks()
    }, 100)
    
    // Save version
    setTimeout(() => {
      const newHtml = editor.getHTML()
      useVersionStore.getState().addVersion(
        documentId,
        newHtml,
        documentTitle || 'Untitled Document',
        `Accepted ${suggestions.length} suggestion${suggestions.length > 1 ? 's' : ''}`,
        'ai_edit'
      )
    }, 200)
  }

  const handleRejectAll = () => {
    const suggestions = getPendingSuggestions()
    
    // Mark all as rejected
    rejectAll()
    
    // Remove suggestion blocks from document and store
    setTimeout(() => {
      for (const suggestion of suggestions) {
        removeSuggestion(suggestion.id)
      }
      cleanupSuggestionBlocks()
    }, 100)
  }
  
  // Helper to clean up suggestion block DOM elements
  const cleanupSuggestionBlocks = () => {
    const blocks = document.querySelectorAll('.inline-suggestion-block, .inline-suggestion-wrapper')
    blocks.forEach(block => {
      // Get the original content and restore it
      const suggestionId = block.getAttribute('data-suggestion-id')
      if (suggestionId) {
        // For now just remove the block - the actual content is managed by the editor
        block.remove()
      }
    })
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-slate-900 rounded-full shadow-2xl border border-slate-200 dark:border-slate-700">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {pendingCount} suggestion{pendingCount !== 1 ? 's' : ''}
        </span>
        
        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />
        
        <button
          onClick={handleAcceptAll}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition-colors"
        >
          <Check className="h-3.5 w-3.5" />
          Accept All
        </button>
        
        <button
          onClick={handleRejectAll}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition-colors"
        >
          <X className="h-3.5 w-3.5" />
          Reject All
        </button>
      </div>
    </div>
  )
}

