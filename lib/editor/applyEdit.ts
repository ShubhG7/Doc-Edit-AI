import { Editor } from '@tiptap/react'
import { EditOperation } from '@/lib/ai/types'
import DOMPurify from 'isomorphic-dompurify'
import { useVersionStore } from '@/lib/store/versionStore'

// Check if the editor has only placeholder content
function isEmptyOrPlaceholder(editor: Editor): boolean {
  const text = editor.state.doc.textContent.trim()
  return !text || text === 'Start writing...' || text.length < 20
}

// Validate that content is safe to apply
function isValidContent(html: string): boolean {
  if (!html || typeof html !== 'string') return false
  if (html.length < 3) return false  // Too short to be valid
  
  // Check for obviously incomplete HTML (unclosed tags at end)
  const trimmed = html.trim()
  if (trimmed.endsWith('<') || trimmed.endsWith('</')) return false
  
  return true
}

export function applyEdit(editor: Editor, edit: EditOperation, currentTitle?: string): boolean {
  // Validate inputs
  if (!editor) {
    console.warn('applyEdit: No editor provided')
    return false
  }
  
  if (!edit?.contentHtml) {
    console.warn('applyEdit: No content to apply')
    return false
  }
  
  if (!isValidContent(edit.contentHtml)) {
    console.warn('applyEdit: Content appears incomplete or invalid')
    return false
  }

  try {
    // Sanitize content with timeout protection
    const content = DOMPurify.sanitize(edit.contentHtml, {
      ALLOWED_TAGS: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'strong', 'em', 'u', 's', 'a', 'br', 'span', 'div', 'blockquote', 'code', 'pre'],
      ALLOWED_ATTR: ['href', 'target', 'style', 'class']
    })
    
    if (!content || content.length < 3) {
      console.warn('applyEdit: Sanitized content is empty')
      return false
    }

    // Apply the edit with error handling
    switch (edit.mode) {
      case 'insert_at_cursor':
        if (isEmptyOrPlaceholder(editor)) {
          editor.chain().focus().clearContent().setContent(content).run()
        } else {
          editor.chain().focus().insertContent(content).run()
        }
        break
        
      case 'replace_selection':
        if (isEmptyOrPlaceholder(editor)) {
          editor.chain().focus().clearContent().setContent(content).run()
        } else if (editor.state.selection.empty) {
          editor.chain().focus().insertContent(content).run()
        } else {
          editor.chain().focus().deleteSelection().insertContent(content).run()
        }
        break
        
      case 'append_to_end':
        if (isEmptyOrPlaceholder(editor)) {
          editor.chain().focus().clearContent().setContent(content).run()
        } else {
          editor.chain().focus().insertContentAt(editor.state.doc.content.size, content).run()
        }
        break
        
      case 'inline_suggestion':
        const { from, to, empty } = editor.state.selection
        
        if (!empty && edit.originalHtml) {
          const originalText = editor.state.doc.textBetween(from, to, ' ')
          const diffHtml = `<span style="text-decoration: line-through; color: #ef4444; opacity: 0.7;">${originalText}</span> <span style="background-color: #22c55e20; color: #16a34a; border-bottom: 2px solid #22c55e;">${content}</span>`
          
          editor.chain()
            .focus()
            .deleteSelection()
            .insertContent(diffHtml)
            .run()
        } else {
          const highlightedContent = `<span style="background-color: #22c55e20; border-bottom: 2px solid #22c55e;">${content}</span>`
          editor.chain().focus().insertContent(highlightedContent).run()
        }
        break
        
      default:
        // Default to insert at cursor
        editor.chain().focus().insertContent(content).run()
    }

    // Save version AFTER the edit is applied
    setTimeout(() => {
      try {
        const newHtml = editor.getHTML()
        useVersionStore.getState().addVersion(
          newHtml,
          currentTitle || 'Untitled Document',
          edit.title || 'AI Edit',
          'ai_edit'
        )
      } catch (e) {
        console.error('Failed to save version:', e)
      }
    }, 100)
    
    return true
  } catch (e) {
    console.error('applyEdit failed:', e)
    return false
  }
}
