import { Editor } from '@tiptap/react'
import { EditOperation } from '@/lib/ai/types'
import DOMPurify from 'isomorphic-dompurify'
import { useVersionStore } from '@/lib/store/versionStore'
import { useEditorStore } from '@/lib/store/editorStore'

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

// Normalize text for fuzzy matching (lowercase, collapse whitespace, remove punctuation)
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\n\r\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim()
}

// Find the position of target text in the editor document
// Returns { from, to } positions or null if not found
export function findTextInDocument(editor: Editor, targetText: string): { from: number; to: number } | null {
  if (!editor || !targetText) return null
  
  const docText = editor.state.doc.textContent
  const normalizedTarget = normalizeText(targetText)
  const normalizedDoc = normalizeText(docText)
  
  // First try exact match
  const exactIndex = docText.indexOf(targetText)
  if (exactIndex !== -1) {
    return { from: exactIndex + 1, to: exactIndex + targetText.length + 1 } // +1 for prosemirror offset
  }
  
  // Try normalized match
  const normalizedIndex = normalizedDoc.indexOf(normalizedTarget)
  if (normalizedIndex === -1) return null
  
  // Map normalized position back to original document
  // We need to find the actual position by scanning through
  let originalPos = 0
  let normalizedPos = 0
  
  while (normalizedPos < normalizedIndex && originalPos < docText.length) {
    const char = docText[originalPos]
    const normalizedChar = normalizeText(char)
    if (normalizedChar.length > 0) {
      normalizedPos += normalizedChar.length
    }
    originalPos++
  }
  
  // Now find the end position
  let endPos = originalPos
  let matchLen = 0
  while (matchLen < normalizedTarget.length && endPos < docText.length) {
    const char = docText[endPos]
    const normalizedChar = normalizeText(char)
    if (normalizedChar.length > 0) {
      matchLen += normalizedChar.length
    }
    endPos++
  }
  
  // Prosemirror positions are 1-indexed (document starts at pos 1)
  return { from: originalPos + 1, to: endPos + 1 }
}

// Find text using fuzzy matching for partial matches
export function findTextFuzzy(editor: Editor, targetText: string): { from: number; to: number; score: number } | null {
  if (!editor || !targetText || targetText.length < 10) return null
  
  const docText = editor.state.doc.textContent
  const targetWords = normalizeText(targetText).split(' ').filter(w => w.length > 2)
  
  if (targetWords.length === 0) return null
  
  // Sliding window approach to find best match
  let bestMatch: { from: number; to: number; score: number } | null = null
  const windowSize = targetText.length * 1.5 // Allow some variance
  
  for (let i = 0; i < docText.length - 20; i += 10) {
    const window = docText.slice(i, i + windowSize)
    const windowWords = normalizeText(window).split(' ').filter(w => w.length > 2)
    
    // Count matching words
    let matches = 0
    for (const word of targetWords) {
      if (windowWords.includes(word)) matches++
    }
    
    const score = matches / targetWords.length
    if (score > 0.6 && (!bestMatch || score > bestMatch.score)) {
      // Find exact boundaries of the match
      const trimmedWindow = window.trim()
      const actualFrom = i + 1 // +1 for prosemirror
      const actualTo = actualFrom + trimmedWindow.length
      bestMatch = { from: actualFrom, to: actualTo, score }
    }
  }
  
  return bestMatch
}

export function applyEdit(editor: Editor, edit: EditOperation, documentId: string, currentTitle?: string): boolean {
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
        } else {
          // Try to use stored selection first (preserved from when user sent message)
          const storedSel = useEditorStore.getState().storedSelection
          const currentSelection = editor.state.selection
          
          // Check if stored selection is valid and recent (within 5 minutes)
          const useStoredSelection = storedSel && 
            storedSel.from !== storedSel.to &&
            storedSel.from >= 0 && 
            storedSel.to <= editor.state.doc.content.size &&
            Date.now() - storedSel.timestamp < 300000 // 5 minutes
          
          if (useStoredSelection) {
            // Use the stored selection position
            editor.chain()
              .focus()
              .setTextSelection({ from: storedSel.from, to: storedSel.to })
              .deleteSelection()
              .insertContent(content)
              .run()
            // Clear the stored selection after using it
            useEditorStore.getState().clearStoredSelection()
          } else if (!currentSelection.empty) {
            // Use current selection if available
            editor.chain().focus().deleteSelection().insertContent(content).run()
          } else {
            // No selection available - fall back to insert at cursor
            editor.chain().focus().insertContent(content).run()
          }
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
          documentId,
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
