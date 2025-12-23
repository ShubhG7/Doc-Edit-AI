'use client'

import { useVersionStore, DocumentVersion } from '@/lib/store/versionStore'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  History, 
  Undo2, 
  Redo2, 
  GitCommit,
  Bot,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

interface VersionHistoryProps {
  onRollback: (version: DocumentVersion) => void
}

function formatTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const seconds = Math.floor(diff / 1000)
  
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

function VersionItem({ 
  version, 
  isCurrent,
  onSelect 
}: { 
  version: DocumentVersion
  isCurrent: boolean
  onSelect: () => void 
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full text-left p-2 rounded-md transition-all text-sm",
        "hover:bg-muted border",
        isCurrent 
          ? "bg-primary/10 border-primary/30" 
          : "bg-background border-transparent"
      )}
    >
      <div className="flex items-center gap-2">
        {version.type === 'ai_edit' ? (
          <Bot className="h-3 w-3 text-violet-500 flex-shrink-0" />
        ) : (
          <GitCommit className="h-3 w-3 text-gray-400 flex-shrink-0" />
        )}
        <span className="font-mono text-[10px] text-muted-foreground">{version.id}</span>
        {isCurrent && (
          <span className="text-[9px] bg-primary text-primary-foreground px-1 rounded">HEAD</span>
        )}
      </div>
      <p className="text-xs truncate mt-1">{version.description}</p>
      <p className="text-[10px] text-muted-foreground">{formatTime(version.timestamp)}</p>
    </button>
  )
}

export function VersionHistory({ onRollback }: VersionHistoryProps) {
  const versions = useVersionStore(state => state.versions)
  const currentIndex = useVersionStore(state => state.currentIndex)
  const undo = useVersionStore(state => state.undo)
  const redo = useVersionStore(state => state.redo)
  const canUndo = useVersionStore(state => state.canUndo)
  const canRedo = useVersionStore(state => state.canRedo)
  const goToVersion = useVersionStore(state => state.goToVersion)
  
  const [isOpen, setIsOpen] = useState(false)

  const handleUndo = () => {
    const version = undo()
    if (version) onRollback(version)
  }

  const handleRedo = () => {
    const version = redo()
    if (version) onRollback(version)
  }

  const handleSelect = (index: number) => {
    const version = goToVersion(index)
    if (version) onRollback(version)
  }

  if (versions.length === 0) {
    return null
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border-t bg-background">
        <div className="w-full px-4 py-2 flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
              <History className="h-4 w-4" />
              <span>Versions</span>
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {versions.length}
              </span>
              {isOpen ? (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              )}
            </button>
          </CollapsibleTrigger>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleUndo}
              disabled={!canUndo()}
              title="Undo"
            >
              <Undo2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleRedo}
              disabled={!canRedo()}
              title="Redo"
            >
              <Redo2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        <CollapsibleContent>
          <div className="px-3 pb-3">
            <ScrollArea className="h-48">
              <div className="space-y-1 pr-2">
                {[...versions].reverse().map((version, idx) => {
                  const actualIndex = versions.length - 1 - idx
                  return (
                    <VersionItem
                      key={version.id}
                      version={version}
                      isCurrent={actualIndex === currentIndex}
                      onSelect={() => handleSelect(actualIndex)}
                    />
                  )
                })}
              </div>
            </ScrollArea>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
