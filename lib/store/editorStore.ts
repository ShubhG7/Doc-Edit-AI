import { create } from 'zustand'
import { Editor } from '@tiptap/react'
import { EditOperation } from '@/lib/ai/types'

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
  status: 'awaiting_selection' | 'awaiting_cursor' | 'preview'
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
    
    set({
      pendingEdit: {
        edit,
        lockedSelection: null,
        cursorPosition: null,
        status: isReplaceMode ? 'awaiting_selection' : 'awaiting_cursor'
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
        status: 'preview'
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
        status: 'preview'
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
      if (edit.mode === 'replace_selection' || edit.mode === 'inline_suggestion') {
        // Replace mode - use locked selection
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
  }
}))
