import { create } from 'zustand'
import { getVersions, saveVersion } from '@/lib/store/documentStore'

export interface DocumentVersion {
  id: string
  timestamp: number
  contentHtml: string
  title: string
  description: string
  type: 'ai_edit' | 'ai_title' | 'manual' | 'initial'
  dbId?: string
}

interface VersionState {
  documentId: string | null
  versions: DocumentVersion[]
  currentIndex: number
  
  // Actions
  initialize: (documentId: string, initialContentHtml: string, title: string) => Promise<void>
  addVersion: (documentId: string, contentHtml: string, title: string, description: string, type: DocumentVersion['type']) => void
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
  documentId: null,
  versions: [],
  currentIndex: -1,
  
  initialize: async (documentId: string, initialContentHtml: string, title: string) => {
    // If we're already initialized for this doc, no-op.
    const state = get()
    if (state.documentId === documentId && state.versions.length > 0) return

    // Reset immediately so UI doesn't show versions from another document.
    set({ documentId, versions: [], currentIndex: -1 })

    // Load from DB (newest first), normalize into chronological list for undo/redo.
    const dbVersions = await getVersions(documentId)
    if (dbVersions.length === 0) {
      // Create an initial version if none exist yet.
      await saveVersion(documentId, initialContentHtml, title, 'Initial state', 'initial')
    }

    const refreshed = await getVersions(documentId)
    const normalized: DocumentVersion[] = [...refreshed]
      .reverse() // chronological (oldest -> newest)
      .map((v) => ({
        dbId: v.id,
        id: v.version_hash, // short, human-friendly
        timestamp: Date.parse(v.created_at) || Date.now(),
        contentHtml: v.content_html,
        title: v.title,
        description: v.description,
        type: v.version_type,
      }))

    set({
      documentId,
      versions: normalized,
      currentIndex: normalized.length - 1,
    })
  },

  addVersion: (documentId: string, contentHtml: string, title: string, description: string, type: DocumentVersion['type']) => {
    const state = get()

    // If the store is currently for a different doc, reset first.
    if (state.documentId !== documentId) {
      set({ documentId, versions: [], currentIndex: -1 })
    }
    
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
    
    // Keep max 50 versions in memory (matches DB loader)
    if (newVersions.length > 50) {
      newVersions = newVersions.slice(-50)
    }
    
    set({ 
      versions: newVersions, 
      currentIndex: newVersions.length - 1 
    })

    // Persist in background (best-effort).
    saveVersion(documentId, contentHtml, title, description, type).then((saved) => {
      if (!saved) return
      // Patch the optimistic version with DB ids/hash if it's still the latest one.
      set((s) => {
        if (s.documentId !== documentId) return s
        if (s.versions.length === 0) return s
        const last = s.versions[s.versions.length - 1]
        if (!last || last.contentHtml !== contentHtml) return s
        const patched: DocumentVersion = {
          ...last,
          dbId: saved.id,
          id: saved.version_hash,
          timestamp: Date.parse(saved.created_at) || last.timestamp,
        }
        const versions = [...s.versions]
        versions[versions.length - 1] = patched
        return { ...s, versions }
      })
    }).catch(() => {})
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
    set({ documentId: null, versions: [], currentIndex: -1 })
  }
}))
