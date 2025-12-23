'use client'

import { useEditorStore } from '@/lib/store/editorStore'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Check, X, MousePointer2, Lock, AlertCircle, Type, Plus } from 'lucide-react'
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
  
  const { edit, lockedSelection, cursorPosition, status } = pendingEdit
  
  // Helper to strip HTML and get plain text
  const stripHtml = (html: string) => {
    const tmp = document.createElement('div')
    tmp.innerHTML = html
    return tmp.textContent || tmp.innerText || ''
  }
  
  const newText = stripHtml(edit.contentHtml)
  const isReplaceMode = edit.mode === 'replace_selection' || edit.mode === 'inline_suggestion'
  const isAppendMode = edit.mode === 'append_to_end'
  
  // Awaiting selection state (for replace modes) - floating panel that doesn't block editor
  if (status === 'awaiting_selection') {
    return (
      <div className="fixed top-4 right-4 z-50 w-80 animate-in slide-in-from-right-4 duration-200">
        <Card className="p-4 space-y-3 shadow-2xl border-2 border-blue-500/50 bg-background/95 backdrop-blur-sm">
          {/* Pulsing indicator */}
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full animate-ping" />
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full" />
          
          <div className="flex items-start gap-2">
            <div className="p-1.5 bg-blue-100 rounded-full shrink-0">
              <Type className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Select Text to Replace</h3>
              <p className="text-xs text-muted-foreground">
                Click and drag in the document to select text
              </p>
            </div>
          </div>
          
          <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3 space-y-1 border border-green-200 dark:border-green-800">
            <p className="text-[10px] font-medium text-green-700 dark:text-green-400 uppercase tracking-wide">
              Will replace with:
            </p>
            <div className="text-xs text-green-800 dark:text-green-200 max-h-20 overflow-y-auto">
              {newText.length > 150 ? newText.slice(0, 150) + '...' : newText}
            </div>
          </div>
          
          {hasSelection ? (
            <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-300 dark:border-yellow-700 rounded-lg p-2">
              <p className="text-[10px] font-medium text-yellow-700 dark:text-yellow-400 uppercase tracking-wide mb-1">
                Selected:
              </p>
              <p className="text-xs text-yellow-800 dark:text-yellow-200 line-clamp-2 font-medium">
                "{currentSelection}"
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
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <Lock className="h-3 w-3 mr-1.5" />
              Lock & Preview
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
    const showInsertPreview = !isReplaceMode
    
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
          {/* Fixed Header */}
          <div className="p-4 border-b shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-full">
                <Check className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">
                  {showReplacePreview ? 'Review Replacement' : 'Review Addition'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {showReplacePreview 
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
                {showReplacePreview && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500" />
                    Removing
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-green-500" />
                  {showReplacePreview ? 'Adding' : 'New Content'}
                </span>
              </div>
              
              {/* Diff Content */}
              <div className="p-4 space-y-3 bg-slate-50 dark:bg-slate-900 font-mono text-sm">
                {/* Removed text (red) - only for replace mode */}
                {showReplacePreview && lockedSelection && (
                  <div className="flex">
                    <div className="w-8 text-red-400 font-bold select-none shrink-0">−</div>
                    <div className="flex-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 px-2 py-1 rounded border-l-4 border-red-500 line-through whitespace-pre-wrap break-words">
                      {lockedSelection.text}
                    </div>
                  </div>
                )}
                
                {/* Added text (green) */}
                <div className="flex">
                  <div className="w-8 text-green-400 font-bold select-none shrink-0">+</div>
                  <div className="flex-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 px-2 py-1 rounded border-l-4 border-green-500 whitespace-pre-wrap break-words">
                    {newText}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Fixed Footer with Buttons */}
          <div className="p-4 border-t bg-background shrink-0 flex gap-2">
            <Button 
              onClick={() => confirmEdit()}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Check className="h-4 w-4 mr-2" />
              {showReplacePreview ? 'Accept Changes' : 'Insert Content'}
            </Button>
            <Button 
              variant="outline" 
              onClick={cancelEdit}
              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
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

