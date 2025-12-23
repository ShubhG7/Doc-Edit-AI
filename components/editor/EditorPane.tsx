'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import { defaultExtensions } from '@/lib/editor/extensions'
import { useEditorStore } from '@/lib/store/editorStore'
import { useEffect, useCallback } from 'react'
import { EditorToolbar } from './EditorToolbar'
import { FloatingImproveButton } from './FloatingImproveButton'
import { ReplacementOverlay } from './ReplacementOverlay'
import { saveDocument } from '@/lib/store/documentStore'
import { debounce } from 'lodash'

interface EditorPaneProps {
  initialContent: string
  documentId: string
  title: string
  onTitleChange?: (newTitle: string) => void
}

export default function EditorPane({ initialContent, documentId, title, onTitleChange }: EditorPaneProps) {
  const { setEditor } = useEditorStore()

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

  return (
    <div className="flex flex-col h-full w-full relative">
      <EditorToolbar editor={editor} />
      <FloatingImproveButton editor={editor} />
      <ReplacementOverlay />
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
