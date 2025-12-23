import { create } from 'zustand'
import { Editor } from '@tiptap/react'
import { EditOperation } from '@/lib/ai/types'
import { findTextInDocument, findTextFuzzy } from '@/lib/editor/applyEdit'
import { useSuggestionStore } from './suggestionStore'

interface StoredSelection {
  from: number
  to: number
  text: string
  timestamp: number
}

interface PendingEdit {
  edit: EditOperation
  lockedSelection: StoredSelection | null
  cursorPosition: number | null
  status: 'awaiting_selection' | 'awaiting_cursor' | 'preview' | 'auto_found'
  // For find_and_replace: did we automatically locate the target?
  autoLocated: boolean
  // Match confidence for fuzzy matches
  matchConfidence: number | null
}

interface EditorState {
  editor: Editor | null
  setEditor: (editor: Editor | null) => void
  // Store selection at the time of sending a message
  storedSelection: StoredSelection | null
  storeCurrentSelection: () => void
  clearStoredSelection: () => void
  // Interactive edit flow (for all edit types)
  pendingEdit: PendingEdit | null
  startEdit: (edit: EditOperation) => void
  lockSelection: () => boolean
  lockCursor: () => boolean
  confirmEdit: () => boolean
  cancelEdit: () => void
  getCurrentSelectionText: () => string
  getCursorPosition: () => number
  // NEW: Insert inline suggestion block into document
  insertInlineSuggestion: (edit: EditOperation) => boolean
}

export const useEditorStore = create<EditorState>((set, get) => ({
  editor: null,
  setEditor: (editor) => set({ editor }),
  storedSelection: null,
  storeCurrentSelection: () => {
    const editor = get().editor
    if (!editor) return
    
    const { from, to, empty } = editor.state.selection
    if (!empty && from !== to) {
      const text = editor.state.doc.textBetween(from, to, ' ')
      set({
        storedSelection: { from, to, text, timestamp: Date.now() }
      })
    } else {
      set({ storedSelection: null })
    }
  },
  clearStoredSelection: () => set({ storedSelection: null }),
  
  // Interactive edit flow
  pendingEdit: null,
  
  startEdit: (edit: EditOperation) => {
    const editor = get().editor
    // Focus the editor so user can immediately start selecting/placing cursor
    if (editor) {
      editor.commands.focus()
    }
    
    // Determine initial status based on edit mode
    const isReplaceMode = edit.mode === 'replace_selection' || edit.mode === 'inline_suggestion'
    const isDeleteMode = edit.mode === 'delete'
    const isFindAndReplace = edit.mode === 'find_and_replace'
    
    // For find_and_replace or delete mode with targetText, try to auto-locate the target text
    if ((isFindAndReplace || isDeleteMode) && edit.targetText && editor) {
      // Try exact match first
      let found = findTextInDocument(editor, edit.targetText)
      let confidence = 1.0
      
      // If no exact match, try fuzzy matching
      if (!found) {
        const fuzzyResult = findTextFuzzy(editor, edit.targetText)
        if (fuzzyResult) {
          found = { from: fuzzyResult.from, to: fuzzyResult.to }
          confidence = fuzzyResult.score
        }
      }
      
      if (found) {
        // Auto-select the found text in the editor
        editor.chain()
          .setTextSelection({ from: found.from, to: found.to })
          .run()
        
        const text = editor.state.doc.textBetween(found.from, found.to, ' ')
        
        set({
          pendingEdit: {
            edit,
            lockedSelection: { from: found.from, to: found.to, text, timestamp: Date.now() },
            cursorPosition: null,
            status: 'auto_found',
            autoLocated: true,
            matchConfidence: confidence
          }
        })
        return
      }
      
      // Couldn't find target - fall back to manual selection
      set({
        pendingEdit: {
          edit,
          lockedSelection: null,
          cursorPosition: null,
          status: 'awaiting_selection',
          autoLocated: false,
          matchConfidence: null
        }
      })
      return
    }
    
    set({
      pendingEdit: {
        edit,
        lockedSelection: null,
        cursorPosition: null,
        status: (isReplaceMode || isDeleteMode) ? 'awaiting_selection' : 'awaiting_cursor',
        autoLocated: false,
        matchConfidence: null
      }
    })
  },
  
  lockSelection: () => {
    const editor = get().editor
    if (!editor) return false
    
    const { from, to, empty } = editor.state.selection
    if (empty || from === to) return false
    
    const text = editor.state.doc.textBetween(from, to, ' ')
    const pending = get().pendingEdit
    if (!pending) return false
    
    set({
      pendingEdit: {
        ...pending,
        lockedSelection: { from, to, text, timestamp: Date.now() },
        status: 'preview',
        autoLocated: pending.autoLocated,
        matchConfidence: pending.matchConfidence
      }
    })
    return true
  },
  
  lockCursor: () => {
    const editor = get().editor
    if (!editor) return false
    
    const { from } = editor.state.selection
    const pending = get().pendingEdit
    if (!pending) return false
    
    set({
      pendingEdit: {
        ...pending,
        cursorPosition: from,
        status: 'preview',
        autoLocated: pending.autoLocated,
        matchConfidence: pending.matchConfidence
      }
    })
    return true
  },
  
  confirmEdit: () => {
    const { editor, pendingEdit } = get()
    if (!editor || !pendingEdit) return false
    
    const { edit, lockedSelection, cursorPosition } = pendingEdit
    const newContent = edit.contentHtml
    
    try {
      if (edit.mode === 'delete') {
        // Delete mode - just delete the selection, no replacement
        if (!lockedSelection) return false
        editor.chain()
          .focus()
          .setTextSelection({ from: lockedSelection.from, to: lockedSelection.to })
          .deleteSelection()
          .run()
      } else if (edit.mode === 'replace_selection' || edit.mode === 'inline_suggestion' || edit.mode === 'find_and_replace') {
        // Replace mode - use locked selection (find_and_replace uses auto-located selection)
        if (!lockedSelection) return false
        editor.chain()
          .focus()
          .setTextSelection({ from: lockedSelection.from, to: lockedSelection.to })
          .deleteSelection()
          .insertContent(newContent)
          .run()
      } else if (edit.mode === 'append_to_end') {
        // Append to end
        editor.chain()
          .focus()
          .insertContentAt(editor.state.doc.content.size, newContent)
          .run()
      } else {
        // Insert at cursor position
        if (cursorPosition !== null) {
          editor.chain()
            .focus()
            .setTextSelection(cursorPosition)
            .insertContent(newContent)
            .run()
        } else {
          editor.chain()
            .focus()
            .insertContent(newContent)
            .run()
        }
      }
      
      set({ pendingEdit: null })
      return true
    } catch (e) {
      console.error('Failed to apply edit:', e)
      return false
    }
  },
  
  cancelEdit: () => {
    set({ pendingEdit: null })
  },
  
  getCurrentSelectionText: () => {
    const editor = get().editor
    if (!editor) return ''
    const { from, to, empty } = editor.state.selection
    if (empty) return ''
    return editor.state.doc.textBetween(from, to, ' ')
  },
  
  getCursorPosition: () => {
    const editor = get().editor
    if (!editor) return 0
    return editor.state.selection.from
  },

  // NEW: Insert an inline suggestion block into the document
  insertInlineSuggestion: (edit: EditOperation) => {
    const editor = get().editor
    if (!editor) return false

    const isFindAndReplace = edit.mode === 'find_and_replace'
    const isDeleteMode = edit.mode === 'delete'
    
    // For find_and_replace or delete, we need to locate the target text
    if ((isFindAndReplace || isDeleteMode) && edit.targetText) {
      // Try exact match first
      let found = findTextInDocument(editor, edit.targetText)
      
      // If no exact match, try fuzzy matching
      if (!found) {
        const fuzzyResult = findTextFuzzy(editor, edit.targetText)
        if (fuzzyResult) {
          found = { from: fuzzyResult.from, to: fuzzyResult.to }
        }
      }
      
      if (found) {
        // Get the original HTML content at this position
        // We need to capture the actual content that will be replaced
        const originalText = editor.state.doc.textBetween(found.from, found.to, '\n')
        
        // For HTML, we'll just wrap the text in a paragraph for now
        // In a more sophisticated implementation, we'd preserve the original node structure
        const originalHtml = `<p>${originalText}</p>`
        
        // Add to suggestion store
        const suggestionId = useSuggestionStore.getState().addSuggestion({
          from: found.from,
          to: found.to,
          originalText,
          originalHtml,
          newText: edit.contentHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
          newHtml: edit.contentHtml,
          title: edit.title,
          targetHint: edit.targetHint
        })
        
        // Insert the suggestion block node at the position, replacing the original content
        try {
          editor.chain()
            .focus()
            .setTextSelection({ from: found.from, to: found.to })
            .deleteSelection()
            .insertContent({
              type: 'suggestionBlock',
              attrs: {
                suggestionId,
                originalHtml,
                newHtml: isDeleteMode ? '' : edit.contentHtml,
                title: edit.title,
                targetHint: edit.targetHint,
                mode: edit.mode
              }
            })
            .run()
          
          return true
        } catch (e) {
          console.error('Failed to insert suggestion block:', e)
          // Clean up the suggestion from store
          useSuggestionStore.getState().removeSuggestion(suggestionId)
          return false
        }
      }
    }
    
    // For other modes or if find_and_replace failed, fall back to the old behavior
    return false
  }
}))
