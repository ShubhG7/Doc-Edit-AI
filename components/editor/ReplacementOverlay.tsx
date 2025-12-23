'use client'

import { useEditorStore } from '@/lib/store/editorStore'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Check, X, MousePointer2, Lock, AlertCircle, Type, Plus, Trash2, Sparkles, Search, RefreshCw } from 'lucide-react'
import { useState, useEffect } from 'react'

export function ReplacementOverlay() {
  const { 
    pendingEdit, 
    lockSelection,
    lockCursor,
    confirmEdit, 
    cancelEdit,
    getCurrentSelectionText,
    getCursorPosition,
    editor
  } = useEditorStore()
  
  const [currentSelection, setCurrentSelection] = useState('')
  const [hasSelection, setHasSelection] = useState(false)
  const [cursorPos, setCursorPos] = useState(0)
  
  // Track current selection/cursor in real-time
  useEffect(() => {
    if (!editor || !pendingEdit) return
    
    const updateState = () => {
      const text = getCurrentSelectionText()
      setCurrentSelection(text)
      setHasSelection(text.length > 0)
      setCursorPos(getCursorPosition())
    }
    
    // Initial check
    updateState()
    
    // Listen for selection changes
    editor.on('selectionUpdate', updateState)
    
    return () => {
      editor.off('selectionUpdate', updateState)
    }
  }, [editor, pendingEdit, getCurrentSelectionText, getCursorPosition])
  
  if (!pendingEdit) return null
  
  const { edit, lockedSelection, cursorPosition, status, matchConfidence } = pendingEdit
  
  // Helper to strip HTML and get plain text
  const stripHtml = (html: string) => {
    const tmp = document.createElement('div')
    tmp.innerHTML = html
    return tmp.textContent || tmp.innerText || ''
  }
  
  const newText = stripHtml(edit.contentHtml)
  const isReplaceMode = edit.mode === 'replace_selection' || edit.mode === 'inline_suggestion'
  const isDeleteMode = edit.mode === 'delete'
  const isAppendMode = edit.mode === 'append_to_end'
  
  // Auto-found state (for find_and_replace that successfully located target)
  if (status === 'auto_found' && lockedSelection) {
    const confidencePercent = matchConfidence ? Math.round(matchConfidence * 100) : 100
    const isExactMatch = confidencePercent === 100
    
    return (
      <div className="fixed top-4 right-4 z-50 w-96 animate-in slide-in-from-right-4 duration-200">
        <Card className="p-4 space-y-3 shadow-2xl border-2 border-emerald-500/50 bg-background/95 backdrop-blur-sm">
          {/* Success indicator */}
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
          
          <div className="flex items-start gap-2">
            <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900 rounded-full shrink-0">
              <Search className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm">Text Found & Selected</h3>
                {isExactMatch ? (
                  <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-full font-medium">
                    Exact Match
                  </span>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 rounded-full font-medium">
                    {confidencePercent}% Match
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                The text was automatically located in your document
              </p>
            </div>
          </div>
          
          {/* What will be replaced */}
          <div className="bg-red-50 dark:bg-red-950 rounded-lg p-3 space-y-1 border border-red-200 dark:border-red-800">
            <p className="text-[10px] font-medium text-red-700 dark:text-red-400 uppercase tracking-wide flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Will Replace:
            </p>
            <div className="text-xs text-red-800 dark:text-red-200 max-h-20 overflow-y-auto line-through opacity-80">
              {lockedSelection.text.length > 200 ? lockedSelection.text.slice(0, 200) + '...' : lockedSelection.text}
            </div>
          </div>
          
          {/* What it will become */}
          <div className="bg-emerald-50 dark:bg-emerald-950 rounded-lg p-3 space-y-1 border border-emerald-200 dark:border-emerald-800">
            <p className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wide flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              New Content:
            </p>
            <div className="text-xs text-emerald-800 dark:text-emerald-200 max-h-24 overflow-y-auto">
              {newText.length > 250 ? newText.slice(0, 250) + '...' : newText}
            </div>
          </div>
          
          {edit.targetHint && (
            <p className="text-[10px] text-muted-foreground italic">
              <Sparkles className="h-3 w-3 inline mr-1" />
              Target: {edit.targetHint}
            </p>
          )}
          
          <div className="flex gap-2">
            <Button 
              onClick={() => confirmEdit()}
              size="sm"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              <Check className="h-3 w-3 mr-1.5" />
              Apply Replacement
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                // Allow user to adjust selection manually
                const pending = pendingEdit
                if (pending) {
                  // Switch to manual selection mode
                  useEditorStore.setState({
                    pendingEdit: {
                      ...pending,
                      status: 'awaiting_selection',
                      lockedSelection: null,
                      autoLocated: false
                    }
                  })
                }
              }}
              className="text-muted-foreground hover:text-foreground"
              title="Select different text"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={cancelEdit}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    )
  }
  
  // Awaiting selection state (for replace/delete modes) - floating panel that doesn't block editor
  if (status === 'awaiting_selection') {
    const borderColor = isDeleteMode ? 'border-red-500/50' : 'border-blue-500/50'
    const indicatorColor = isDeleteMode ? 'bg-red-500' : 'bg-blue-500'
    const iconBgColor = isDeleteMode ? 'bg-red-100' : 'bg-blue-100'
    const iconColor = isDeleteMode ? 'text-red-600' : 'text-blue-600'
    const buttonColor = isDeleteMode ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
    
    return (
      <div className="fixed top-4 right-4 z-50 w-80 animate-in slide-in-from-right-4 duration-200">
        <Card className={`p-4 space-y-3 shadow-2xl border-2 ${borderColor} bg-background/95 backdrop-blur-sm`}>
          {/* Pulsing indicator */}
          <div className={`absolute -top-1 -left-1 w-3 h-3 ${indicatorColor} rounded-full animate-ping`} />
          <div className={`absolute -top-1 -left-1 w-3 h-3 ${indicatorColor} rounded-full`} />
          
          <div className="flex items-start gap-2">
            <div className={`p-1.5 ${iconBgColor} rounded-full shrink-0`}>
              {isDeleteMode 
                ? <Trash2 className={`h-4 w-4 ${iconColor}`} />
                : <Type className={`h-4 w-4 ${iconColor}`} />
              }
            </div>
            <div>
              <h3 className="font-semibold text-sm">
                {isDeleteMode ? 'Select Text to Delete' : 'Select Text to Replace'}
              </h3>
              <p className="text-xs text-muted-foreground">
                Click and drag in the document to select text
              </p>
            </div>
          </div>
          
          {/* Only show replacement text for non-delete modes */}
          {!isDeleteMode && (
            <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3 space-y-1 border border-green-200 dark:border-green-800">
              <p className="text-[10px] font-medium text-green-700 dark:text-green-400 uppercase tracking-wide">
                Will replace with:
              </p>
              <div className="text-xs text-green-800 dark:text-green-200 max-h-20 overflow-y-auto">
                {newText.length > 150 ? newText.slice(0, 150) + '...' : newText}
              </div>
            </div>
          )}
          
          {/* For delete mode, show what AI identified to delete */}
          {isDeleteMode && newText && (
            <div className="bg-red-50 dark:bg-red-950 rounded-lg p-3 space-y-1 border border-red-200 dark:border-red-800">
              <p className="text-[10px] font-medium text-red-700 dark:text-red-400 uppercase tracking-wide">
                AI suggests removing:
              </p>
              <div className="text-xs text-red-800 dark:text-red-200 max-h-20 overflow-y-auto italic">
                {newText.length > 150 ? newText.slice(0, 150) + '...' : newText}
              </div>
            </div>
          )}
          
          {hasSelection ? (
            <div className={`${isDeleteMode ? 'bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-700' : 'bg-yellow-50 dark:bg-yellow-950 border-yellow-300 dark:border-yellow-700'} border rounded-lg p-2`}>
              <p className={`text-[10px] font-medium ${isDeleteMode ? 'text-red-700 dark:text-red-400' : 'text-yellow-700 dark:text-yellow-400'} uppercase tracking-wide mb-1`}>
                {isDeleteMode ? 'Will be deleted:' : 'Selected:'}
              </p>
              <p className={`text-xs ${isDeleteMode ? 'text-red-800 dark:text-red-200 line-through' : 'text-yellow-800 dark:text-yellow-200'} line-clamp-2 font-medium`}>
                &ldquo;{currentSelection}&rdquo;
              </p>
            </div>
          ) : (
            <div className="bg-muted/50 rounded-lg p-2 text-center">
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <AlertCircle className="h-3 w-3" />
                No text selected yet
              </p>
            </div>
          )}
          
          <div className="flex gap-2">
            <Button 
              onClick={() => lockSelection()}
              disabled={!hasSelection}
              size="sm"
              className={`flex-1 ${buttonColor}`}
            >
              <Lock className="h-3 w-3 mr-1.5" />
              {isDeleteMode ? 'Confirm Selection' : 'Lock & Preview'}
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={cancelEdit}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    )
  }
  
  // Awaiting cursor state (for insert modes) - floating panel that doesn't block editor
  if (status === 'awaiting_cursor') {
    return (
      <div className="fixed top-4 right-4 z-50 w-80 animate-in slide-in-from-right-4 duration-200">
        <Card className="p-4 space-y-3 shadow-2xl border-2 border-purple-500/50 bg-background/95 backdrop-blur-sm">
          {/* Pulsing indicator */}
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-purple-500 rounded-full animate-ping" />
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-purple-500 rounded-full" />
          
          <div className="flex items-start gap-2">
            <div className="p-1.5 bg-purple-100 rounded-full shrink-0">
              <MousePointer2 className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">
                {isAppendMode ? 'Append to End' : 'Place Your Cursor'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {isAppendMode 
                  ? 'Content will be added at the end of the document'
                  : 'Click where you want to insert the content'
                }
              </p>
            </div>
          </div>
          
          <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3 space-y-1 border border-green-200 dark:border-green-800">
            <p className="text-[10px] font-medium text-green-700 dark:text-green-400 uppercase tracking-wide">
              Content to add:
            </p>
            <div className="text-xs text-green-800 dark:text-green-200 max-h-20 overflow-y-auto">
              {newText.length > 150 ? newText.slice(0, 150) + '...' : newText}
            </div>
          </div>
          
          {!isAppendMode && (
            <div className="bg-purple-50 dark:bg-purple-950 border border-purple-300 dark:border-purple-700 rounded-lg p-2">
              <p className="text-[10px] font-medium text-purple-700 dark:text-purple-400 uppercase tracking-wide mb-1">
                Cursor Position:
              </p>
              <p className="text-xs text-purple-800 dark:text-purple-200 font-mono">
                Character {cursorPos}
              </p>
            </div>
          )}
          
          <div className="flex gap-2">
            <Button 
              onClick={() => lockCursor()}
              size="sm"
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="h-3 w-3 mr-1.5" />
              {isAppendMode ? 'Preview' : 'Lock Position & Preview'}
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={cancelEdit}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    )
  }
  
  // Preview state - modal for final confirmation
  if (status === 'preview') {
    const showReplacePreview = isReplaceMode && lockedSelection
    const showDeletePreview = isDeleteMode && lockedSelection
    
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
          {/* Fixed Header */}
          <div className="p-4 border-b shrink-0">
            <div className="flex items-center gap-3">
              <div className={`p-2 ${showDeletePreview ? 'bg-red-100' : 'bg-purple-100'} rounded-full`}>
                <Check className={`h-5 w-5 ${showDeletePreview ? 'text-red-600' : 'text-purple-600'}`} />
              </div>
              <div>
                <h3 className="font-semibold text-lg">
                  {showDeletePreview 
                    ? 'Confirm Deletion' 
                    : showReplacePreview 
                      ? 'Review Replacement' 
                      : 'Review Addition'
                  }
                </h3>
                <p className="text-sm text-muted-foreground">
                  {showDeletePreview
                    ? 'The following text will be permanently removed'
                    : showReplacePreview 
                      ? 'Confirm the changes below' 
                      : isAppendMode 
                        ? 'This will be added at the end of the document'
                        : `This will be inserted at position ${cursorPosition}`
                  }
                </p>
              </div>
            </div>
          </div>
          
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="border rounded-lg overflow-hidden">
              {/* Header */}
              <div className="bg-muted px-4 py-2 border-b flex items-center gap-4 text-xs font-medium sticky top-0">
                {(showReplacePreview || showDeletePreview) && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500" />
                    {showDeletePreview ? 'Deleting' : 'Removing'}
                  </span>
                )}
                {!showDeletePreview && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-green-500" />
                    {showReplacePreview ? 'Adding' : 'New Content'}
                  </span>
                )}
              </div>
              
              {/* Diff Content */}
              <div className="p-4 space-y-3 bg-slate-50 dark:bg-slate-900 font-mono text-sm">
                {/* Removed/deleted text (red) */}
                {(showReplacePreview || showDeletePreview) && lockedSelection && (
                  <div className="flex">
                    <div className="w-8 text-red-400 font-bold select-none shrink-0">−</div>
                    <div className="flex-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 px-2 py-1 rounded border-l-4 border-red-500 line-through whitespace-pre-wrap break-words">
                      {lockedSelection.text}
                    </div>
                  </div>
                )}
                
                {/* Added text (green) - not for delete mode */}
                {!showDeletePreview && (
                  <div className="flex">
                    <div className="w-8 text-green-400 font-bold select-none shrink-0">+</div>
                    <div className="flex-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 px-2 py-1 rounded border-l-4 border-green-500 whitespace-pre-wrap break-words">
                      {newText}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Fixed Footer with Buttons */}
          <div className="p-4 border-t bg-background shrink-0 flex gap-2">
            <Button 
              onClick={() => confirmEdit()}
              className={`flex-1 ${showDeletePreview ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
            >
              <Check className="h-4 w-4 mr-2" />
              {showDeletePreview 
                ? 'Delete Text' 
                : showReplacePreview 
                  ? 'Accept Changes' 
                  : 'Insert Content'
              }
            </Button>
            <Button 
              variant="outline" 
              onClick={cancelEdit}
              className="border-muted-foreground/30 hover:bg-muted"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </Card>
      </div>
    )
  }
  
  return null
}

