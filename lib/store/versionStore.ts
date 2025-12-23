import { create } from 'zustand'

export interface DocumentVersion {
  id: string
  timestamp: number
  contentHtml: string
  title: string
  description: string
  type: 'ai_edit' | 'ai_title' | 'manual' | 'initial'
}

interface VersionState {
  versions: DocumentVersion[]
  currentIndex: number
  
  // Actions
  addVersion: (contentHtml: string, title: string, description: string, type: DocumentVersion['type']) => void
  undo: () => DocumentVersion | null
  redo: () => DocumentVersion | null
  goToVersion: (index: number) => DocumentVersion | null
  canUndo: () => boolean
  canRedo: () => boolean
  reset: () => void
}

function genId(): string {
  return Math.random().toString(16).slice(2, 9)
}

export const useVersionStore = create<VersionState>((set, get) => ({
  versions: [],
  currentIndex: -1,
  
  addVersion: (contentHtml: string, title: string, description: string, type: DocumentVersion['type']) => {
    const state = get()
    
    const newVersion: DocumentVersion = {
      id: genId(),
      timestamp: Date.now(),
      contentHtml,
      title,
      description,
      type
    }
    
    // Truncate future versions if we're not at the end
    let newVersions = state.currentIndex >= 0 
      ? state.versions.slice(0, state.currentIndex + 1)
      : []
    
    newVersions.push(newVersion)
    
    // Keep max 20 versions in memory
    if (newVersions.length > 20) {
      newVersions = newVersions.slice(-20)
    }
    
    set({ 
      versions: newVersions, 
      currentIndex: newVersions.length - 1 
    })
  },
  
  undo: () => {
    const state = get()
    if (state.currentIndex <= 0) return null
    
    const newIndex = state.currentIndex - 1
    set({ currentIndex: newIndex })
    return state.versions[newIndex]
  },
  
  redo: () => {
    const state = get()
    if (state.currentIndex >= state.versions.length - 1) return null
    
    const newIndex = state.currentIndex + 1
    set({ currentIndex: newIndex })
    return state.versions[newIndex]
  },
  
  goToVersion: (index: number) => {
    const state = get()
    if (index < 0 || index >= state.versions.length) return null
    
    set({ currentIndex: index })
    return state.versions[index]
  },
  
  canUndo: () => get().currentIndex > 0,
  
  canRedo: () => {
    const state = get()
    return state.currentIndex < state.versions.length - 1
  },
  
  reset: () => {
    set({ versions: [], currentIndex: -1 })
  }
}))
