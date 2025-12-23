import { describe, it, expect, vi } from 'vitest'
import { applyEdit } from './applyEdit'
import { Editor } from '@tiptap/react'

// Mock Editor
const createMockEditor = () => ({
  chain: () => ({
    focus: () => ({
      insertContent: vi.fn().mockReturnThis(),
      deleteSelection: vi.fn().mockReturnThis(),
      insertContentAt: vi.fn().mockReturnThis(),
      run: vi.fn(),
    })
  }),
  getHTML: () => '<p>mock</p>',
  state: {
    selection: { empty: true },
    doc: { content: { size: 100 }, textContent: 'Some existing content' }
  }
} as unknown as Editor)

describe('applyEdit', () => {
  it('should handle insert_at_cursor', () => {
    vi.useFakeTimers()
    const editor = createMockEditor()
    const focusSpy = vi.spyOn(editor, 'chain')
    
    applyEdit(editor, {
      id: '1',
      title: 'test',
      mode: 'insert_at_cursor',
      contentHtml: '<p>test</p>'
    }, 'doc-1')

    expect(focusSpy).toHaveBeenCalled()
    vi.clearAllTimers()
    vi.useRealTimers()
  })
})
