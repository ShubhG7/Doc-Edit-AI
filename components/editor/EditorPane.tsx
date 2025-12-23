'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import { defaultExtensions } from '@/lib/editor/extensions'
import { useEditorStore } from '@/lib/store/editorStore'
import { useSuggestionStore } from '@/lib/store/suggestionStore'
import { useEffect, useCallback } from 'react'
import { EditorToolbar } from './EditorToolbar'
import { FloatingImproveButton } from './FloatingImproveButton'
import { ReplacementOverlay } from './ReplacementOverlay'
import { SuggestionBar } from './SuggestionBar'
import { saveDocument } from '@/lib/store/documentStore'
import { useVersionStore } from '@/lib/store/versionStore'
import { debounce } from 'lodash'

interface EditorPaneProps {
  initialContent: string
  documentId: string
  title: string
  onTitleChange?: (newTitle: string) => void
}

export default function EditorPane({ initialContent, documentId, title, onTitleChange }: EditorPaneProps) {
  const { setEditor } = useEditorStore()
  const { acceptSuggestion, rejectSuggestion, removeSuggestion } = useSuggestionStore()

  const debouncedSave = useCallback(
    debounce((content: string) => {
      saveDocument(documentId, content).catch(() => {})
    }, 1000),
    [documentId]
  )

  const editor = useEditor({
    extensions: defaultExtensions,
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'prose prose-lg dark:prose-invert focus:outline-none max-w-none p-8 min-h-screen',
      },
    },
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
        debouncedSave(editor.getHTML())
    },
  })

  useEffect(() => {
    setEditor(editor)
  }, [editor, setEditor])

  // Initialize + load version history for this document once the editor is ready.
  useEffect(() => {
    if (!editor) return
    useVersionStore.getState().initialize(documentId, editor.getHTML(), title).catch(() => {})
  }, [editor, documentId, title])

  // Handle suggestion accept/reject events from the suggestion block nodes
  useEffect(() => {
    const handleAccept = (e: CustomEvent) => {
      const { suggestionId, newHtml, isDelete } = e.detail
      const suggestion = acceptSuggestion(suggestionId)
      
      if (suggestion && editor) {
        // The suggestion node is already deleted by the node view
        // For delete mode: don't insert anything (content is already removed)
        // For replace mode: insert the new content
        if (!isDelete && newHtml) {
          editor.chain()
            .focus()
            .insertContent(newHtml)
            .run()
        }
        
        // Save version
        setTimeout(() => {
          useVersionStore.getState().addVersion(
            documentId,
            editor.getHTML(),
            title,
            isDelete ? 'Deleted content' : (suggestion.title || 'Accepted suggestion'),
            'ai_edit'
          )
        }, 100)
      }
      
      // Clean up
      setTimeout(() => removeSuggestion(suggestionId), 100)
    }

    const handleReject = (e: CustomEvent) => {
      const { suggestionId, originalHtml } = e.detail
      rejectSuggestion(suggestionId)
      
      if (editor) {
        // Restore the original content
        editor.chain()
          .focus()
          .insertContent(originalHtml)
          .run()
      }
      
      // Clean up
      setTimeout(() => removeSuggestion(suggestionId), 100)
    }

    document.addEventListener('suggestion-accept', handleAccept as EventListener)
    document.addEventListener('suggestion-reject', handleReject as EventListener)

    return () => {
      document.removeEventListener('suggestion-accept', handleAccept as EventListener)
      document.removeEventListener('suggestion-reject', handleReject as EventListener)
    }
  }, [editor, acceptSuggestion, rejectSuggestion, removeSuggestion, title, documentId])

  return (
    <div className="flex flex-col h-full w-full relative">
      <EditorToolbar editor={editor} />
      <FloatingImproveButton editor={editor} />
      <ReplacementOverlay />
      <SuggestionBar documentId={documentId} documentTitle={title} />
      <div className="flex-1 overflow-y-auto bg-background" onClick={() => editor?.chain().focus().run()}>
        <div className="max-w-4xl mx-auto px-4 py-8">
            <h1 
                className="text-4xl font-bold mb-8 focus:outline-none" 
                contentEditable 
                suppressContentEditableWarning 
                onBlur={(e) => {
                    const newTitle = e.currentTarget.innerText.trim()
                    if (newTitle && newTitle !== title) {
                        onTitleChange?.(newTitle)
                    }
                }}
            >
                {title}
            </h1>
            <EditorContent editor={editor} className="min-h-[500px]" />
        </div>
      </div>
    </div>
  )
}
