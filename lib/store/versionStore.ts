import { create } from 'zustand'
import { saveVersion, getVersions, DocumentVersionDB } from './documentStore'

export interface DocumentVersion {
  id: string
  timestamp: number
  contentHtml: string
  title: string
  description: string
  type: 'ai_edit' | 'ai_title' | 'manual' | 'initial'
  dbId?: string  // Database ID if persisted
}

interface VersionState {
  versions: DocumentVersion[]
  currentIndex: number
  isInitialized: boolean
  documentId: string | null
  
  // Actions
  initialize: (documentId: string, contentHtml: string, title: string) => void
  loadFromDB: (documentId: string) => Promise<void>
  addVersion: (contentHtml: string, title: string, description: string, type: DocumentVersion['type']) => void
  undo: () => DocumentVersion | null
  redo: () => DocumentVersion | null
  goToVersion: (index: number) => DocumentVersion | null
  canUndo: () => boolean
  canRedo: () => boolean
  reset: () => void
}

// Generate a short unique ID
function genId(): string {
  return Math.random().toString(16).slice(2, 9)
}

export const useVersionStore = create<VersionState>((set, get) => ({
  versions: [],
  currentIndex: -1,
  isInitialized: false,
  documentId: null,
  
  initialize: (documentId: string, contentHtml: string, title: string) => {
    const state = get()
    if (state.isInitialized && state.documentId === documentId) return
    
    const initialVersion: DocumentVersion = {
      id: genId(),
      timestamp: Date.now(),
      contentHtml,
      title,
      description: 'Initial state',
      type: 'initial'
    }
    
    set({
      versions: [initialVersion],
      currentIndex: 0,
      isInitialized: true,
      documentId
    })
    
    // Save initial version to DB (fire and forget)
    saveVersion(documentId, contentHtml, title, 'Initial state', 'initial')
      .catch(() => {})
  },
  
  loadFromDB: async (documentId: string) => {
    try {
      const dbVersions = await getVersions(documentId)
      
      if (dbVersions.length > 0) {
        // Convert DB versions to local format (they come in descending order)
        const versions: DocumentVersion[] = dbVersions.reverse().map(v => ({
          id: v.version_hash,
          timestamp: new Date(v.created_at).getTime(),
          contentHtml: v.content_html,
          title: v.title,
          description: v.description,
          type: v.version_type,
          dbId: v.id
        }))
        
        set({
          versions,
          currentIndex: versions.length - 1,
          isInitialized: true,
          documentId
        })
      }
    } catch (e) {
      console.error('Failed to load versions from DB:', e)
    }
  },
  
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
    
    // Auto-initialize if needed
    if (!state.isInitialized) {
      set({
        versions: [newVersion],
        currentIndex: 0,
        isInitialized: true
      })
    } else {
      // Truncate future versions if we're not at the end
      const newVersions = state.versions.slice(0, state.currentIndex + 1)
      newVersions.push(newVersion)
      
      // Keep max 30 versions in memory
      if (newVersions.length > 30) {
        newVersions.shift()
      }
      
      set({ 
        versions: newVersions, 
        currentIndex: newVersions.length - 1 
      })
    }
    
    // Persist to database (fire and forget)
    if (state.documentId) {
      saveVersion(state.documentId, contentHtml, title, description, type)
        .catch(() => {})
    }
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
    set({
      versions: [],
      currentIndex: -1,
      isInitialized: false,
      documentId: null
    })
  }
}))
