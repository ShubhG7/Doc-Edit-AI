import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'

// The attributes we store on the suggestion node
export interface SuggestionNodeAttrs {
  suggestionId: string
  originalHtml: string
  newHtml: string
  title: string
  targetHint?: string
  mode?: string // 'find_and_replace' | 'delete'
}

// Extension for inline suggestion blocks in the editor
export const SuggestionNode = Node.create({
  name: 'suggestionBlock',
  group: 'block',
  content: 'block*',
  atom: true, // Treated as a single unit
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      suggestionId: {
        default: null,
      },
      originalHtml: {
        default: '',
      },
      newHtml: {
        default: '',
      },
      title: {
        default: 'Suggested edit',
      },
      targetHint: {
        default: null,
      },
      mode: {
        default: 'find_and_replace',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-suggestion-block]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 
      'data-suggestion-block': '',
      'class': 'suggestion-block-wrapper'
    }), 0]
  },

  // We'll use a React component to render this node
  addNodeView() {
    return ReactNodeViewRenderer(SuggestionNodeView as any)
  },
})

// Placeholder for the React component - will be imported from the component file
// This is just the type definition
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react'
import React from 'react'

// Simple React component to render the suggestion block
function SuggestionNodeView({ node, deleteNode }: NodeViewProps) {
  const { suggestionId, originalHtml, newHtml, title, mode } = node.attrs as SuggestionNodeAttrs
  const isDeleteMode = mode === 'delete'
  
  const handleAccept = () => {
    // Will be handled by the editor store
    const event = new CustomEvent('suggestion-accept', { 
      detail: { suggestionId, newHtml, isDelete: isDeleteMode },
      bubbles: true 
    })
    document.dispatchEvent(event)
    deleteNode()
  }
  
  const handleReject = () => {
    // Will be handled by the editor store  
    const event = new CustomEvent('suggestion-reject', { 
      detail: { suggestionId, originalHtml },
      bubbles: true 
    })
    document.dispatchEvent(event)
    deleteNode()
  }
  
  // Different styling for delete mode
  const borderColor = isDeleteMode ? '#fecaca' : '#e2e8f0'
  const headerBg = isDeleteMode ? '#fef2f2' : '#f1f5f9'
  const acceptBtnColor = isDeleteMode ? '#dc2626' : '#22c55e'
  const acceptBtnText = isDeleteMode ? 'Delete' : 'Accept'
  
  return React.createElement(NodeViewWrapper, { className: 'suggestion-node-wrapper' },
    React.createElement('div', {
      className: 'inline-suggestion-block my-4 rounded-lg border-2 overflow-hidden',
      style: { 
        borderColor: borderColor,
        backgroundColor: '#f8fafc'
      },
      'data-suggestion-id': suggestionId
    }, [
      // Header
      React.createElement('div', {
        key: 'header',
        className: 'flex items-center justify-between px-3 py-2 border-b',
        style: { backgroundColor: headerBg, borderColor: borderColor }
      }, [
        React.createElement('span', {
          key: 'title',
          className: 'text-xs font-medium',
          style: { color: isDeleteMode ? '#991b1b' : '#475569' }
        }, title || (isDeleteMode ? 'Delete this content?' : 'Suggested edit')),
        React.createElement('div', {
          key: 'buttons',
          className: 'flex items-center gap-1'
        }, [
          React.createElement('button', {
            key: 'accept',
            onClick: handleAccept,
            className: 'inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
            style: { backgroundColor: acceptBtnColor, color: 'white' }
          }, [
            React.createElement('svg', {
              key: 'check-icon',
              className: 'h-3 w-3',
              fill: 'none',
              viewBox: '0 0 24 24',
              stroke: 'currentColor',
              strokeWidth: 2
            }, React.createElement('path', {
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
              d: isDeleteMode ? 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' : 'M5 13l4 4L19 7'
            })),
            acceptBtnText
          ]),
          React.createElement('button', {
            key: 'reject',
            onClick: handleReject,
            className: 'inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
            style: { backgroundColor: 'transparent', color: '#64748b' }
          }, [
            React.createElement('svg', {
              key: 'x-icon',
              className: 'h-3 w-3',
              fill: 'none',
              viewBox: '0 0 24 24',
              stroke: 'currentColor',
              strokeWidth: 2
            }, React.createElement('path', {
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
              d: 'M6 18L18 6M6 6l12 12'
            })),
            isDeleteMode ? 'Keep' : 'Reject'
          ])
        ])
      ]),
      // Content
      React.createElement('div', {
        key: 'content',
        className: 'p-3 space-y-3',
        style: { backgroundColor: 'white' }
      }, isDeleteMode ? [
        // Delete mode: only show what will be deleted
        React.createElement('div', {
          key: 'delete-content',
          className: 'space-y-1'
        }, [
          React.createElement('p', {
            key: 'delete-label',
            className: 'text-[10px] font-semibold uppercase tracking-wider',
            style: { color: '#dc2626' }
          }, 'Will be deleted'),
          React.createElement('div', {
            key: 'delete-box',
            className: 'p-3 rounded-md border',
            style: { backgroundColor: '#fef2f2', borderColor: '#fecaca' }
          }, React.createElement('div', {
            className: 'text-sm prose prose-sm max-w-none prose-p:my-1 prose-li:my-0.5 line-through',
            style: { color: '#991b1b', textDecoration: 'line-through' },
            dangerouslySetInnerHTML: { __html: originalHtml }
          }))
        ])
      ] : [
        // Replace mode: show current and suggested
        React.createElement('div', {
          key: 'current',
          className: 'space-y-1'
        }, [
          React.createElement('p', {
            key: 'current-label',
            className: 'text-[10px] font-semibold uppercase tracking-wider text-slate-500',
            style: { color: '#64748b' }
          }, 'Current text'),
          React.createElement('div', {
            key: 'current-content',
            className: 'p-3 rounded-md border',
            style: { backgroundColor: '#fef2f2', borderColor: '#fecaca' }
          }, React.createElement('div', {
            className: 'text-sm prose prose-sm max-w-none prose-p:my-1 prose-li:my-0.5',
            style: { color: '#991b1b' },
            dangerouslySetInnerHTML: { __html: originalHtml }
          }))
        ]),
        // Suggested update
        React.createElement('div', {
          key: 'suggested',
          className: 'space-y-1'
        }, [
          React.createElement('p', {
            key: 'suggested-label',
            className: 'text-[10px] font-semibold uppercase tracking-wider text-slate-500',
            style: { color: '#64748b' }
          }, 'Suggested update'),
          React.createElement('div', {
            key: 'suggested-content',
            className: 'p-3 rounded-md border',
            style: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }
          }, React.createElement('div', {
            className: 'text-sm prose prose-sm max-w-none prose-p:my-1 prose-li:my-0.5',
            style: { color: '#166534' },
            dangerouslySetInnerHTML: { __html: newHtml }
          }))
        ])
      ])
    ])
  )
}

