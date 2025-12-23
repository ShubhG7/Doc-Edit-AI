import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import BubbleMenu from '@tiptap/extension-bubble-menu'
import { SuggestionNode } from './suggestionExtension'

export const defaultExtensions = [
  StarterKit.configure({
    // history: true, // Default is true
  }),
  Placeholder.configure({
    placeholder: 'Start writing...',
    emptyEditorClass: 'is-editor-empty before:content-[attr(data-placeholder)] before:text-muted-foreground before:float-left before:pointer-events-none before:h-0',
  }),
  BubbleMenu.configure({
    element: null, // Rendered by React component
  }),
  SuggestionNode,
]
