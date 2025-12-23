'use client'

import { Editor } from '@tiptap/react'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChatContext } from '@/components/chat/ChatContext'
import { useEffect, useState, useCallback } from 'react'

interface FloatingImproveButtonProps {
  editor: Editor | null
}

export function FloatingImproveButton({ editor }: FloatingImproveButtonProps) {
  const { sendMessage } = useChatContext()
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  const updatePosition = useCallback(() => {
    if (!editor) return
    
    const { selection } = editor.state
    if (selection.empty) {
      setIsVisible(false)
      return
    }

    // Small delay to ensure view is updated
    setTimeout(() => {
      try {
        const { ranges } = selection
        const from = Math.min(...ranges.map(r => r.$from.pos))
        const to = Math.max(...ranges.map(r => r.$to.pos))
        const start = editor.view.coordsAtPos(from)
        const end = editor.view.coordsAtPos(to)
        
        // Calculate position
        let left = start.left + (end.right - start.left) / 2
        let top = start.top - 48
        
        // Clamp to viewport bounds
        const buttonWidth = 100
        const buttonHeight = 32
        const padding = 8
        
        // Clamp horizontal position
        left = Math.max(padding + buttonWidth / 2, Math.min(left, window.innerWidth - padding - buttonWidth / 2))
        
        // If button would be above viewport, show below selection instead
        if (top < padding) {
          top = end.bottom + 8
        }
        
        // Clamp vertical position
        top = Math.max(padding, Math.min(top, window.innerHeight - padding - buttonHeight))
        
        setPosition({ top, left })
        setIsVisible(true)
      } catch {
        setIsVisible(false)
      }
    }, 0)
  }, [editor])

  useEffect(() => {
    if (!editor) return

    const handleBlur = () => {
      // Small delay to allow click on button before hiding
      setTimeout(() => setIsVisible(false), 150)
    }
    
    editor.on('selectionUpdate', updatePosition)
    editor.on('blur', handleBlur)
    
    return () => {
      editor.off('selectionUpdate', updatePosition)
      editor.off('blur', handleBlur)
    }
  }, [editor, updatePosition])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (isVisible) {
        updatePosition()
      }
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isVisible, updatePosition])

  if (!editor || !position || !isVisible) return null

  const handleImprove = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!editor) return

    const { from, to, empty } = editor.state.selection
    const selectionText = empty ? '' : editor.state.doc.textBetween(from, to, ' ')

    sendMessage({
      text: `Improve this text: "${selectionText.slice(0, 100)}${selectionText.length > 100 ? '...' : ''}"`,
      body: {
        documentHtml: editor.getHTML(),
        selectionText: selectionText || ''
      }
    })
    setIsVisible(false)
  }

  return (
    <div 
      style={{ 
        position: 'fixed', 
        top: position.top, 
        left: position.left, 
        transform: 'translateX(-50%)',
        zIndex: 50 
      }} 
      className="animate-in fade-in zoom-in duration-200"
    >
      <Button 
        size="sm" 
        variant="secondary" 
        className="shadow-lg gap-1.5 bg-background border hover:bg-muted font-medium"
        onClick={handleImprove}
        onMouseDown={(e) => e.preventDefault()} // Prevent focus loss
      >
        <Sparkles className="h-3.5 w-3.5 text-violet-500" />
        Improve
      </Button>
    </div>
  )
}
