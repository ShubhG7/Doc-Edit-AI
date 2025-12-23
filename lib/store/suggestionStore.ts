import { create } from 'zustand'

export interface InlineSuggestion {
  id: string
  // Position in document
  from: number
  to: number
  // Content
  originalText: string
  originalHtml: string
  newText: string
  newHtml: string
  // Metadata
  title: string
  description?: string
  targetHint?: string
  // Status
  status: 'pending' | 'accepted' | 'rejected'
  // Timestamp
  createdAt: number
}

interface SuggestionState {
  suggestions: InlineSuggestion[]
  // Add a new suggestion
  addSuggestion: (suggestion: Omit<InlineSuggestion, 'id' | 'status' | 'createdAt'>) => string
  // Accept a suggestion (apply the change)
  acceptSuggestion: (id: string) => InlineSuggestion | null
  // Reject a suggestion (discard it)
  rejectSuggestion: (id: string) => void
  // Accept all pending suggestions
  acceptAll: () => InlineSuggestion[]
  // Reject all pending suggestions
  rejectAll: () => void
  // Get pending suggestions count
  getPendingCount: () => number
  // Get all pending suggestions
  getPendingSuggestions: () => InlineSuggestion[]
  // Clear all suggestions
  clearAll: () => void
  // Remove a suggestion by id
  removeSuggestion: (id: string) => void
}

export const useSuggestionStore = create<SuggestionState>((set, get) => ({
  suggestions: [],

  addSuggestion: (suggestion) => {
    const id = `suggestion-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const newSuggestion: InlineSuggestion = {
      ...suggestion,
      id,
      status: 'pending',
      createdAt: Date.now()
    }
    set((state) => ({
      suggestions: [...state.suggestions, newSuggestion]
    }))
    return id
  },

  acceptSuggestion: (id) => {
    const suggestion = get().suggestions.find(s => s.id === id)
    if (!suggestion) return null
    
    set((state) => ({
      suggestions: state.suggestions.map(s => 
        s.id === id ? { ...s, status: 'accepted' as const } : s
      )
    }))
    
    // Return the suggestion so the caller can apply it
    return suggestion
  },

  rejectSuggestion: (id) => {
    set((state) => ({
      suggestions: state.suggestions.map(s => 
        s.id === id ? { ...s, status: 'rejected' as const } : s
      )
    }))
  },

  acceptAll: () => {
    const pending = get().suggestions.filter(s => s.status === 'pending')
    set((state) => ({
      suggestions: state.suggestions.map(s => 
        s.status === 'pending' ? { ...s, status: 'accepted' as const } : s
      )
    }))
    return pending
  },

  rejectAll: () => {
    set((state) => ({
      suggestions: state.suggestions.map(s => 
        s.status === 'pending' ? { ...s, status: 'rejected' as const } : s
      )
    }))
  },

  getPendingCount: () => {
    return get().suggestions.filter(s => s.status === 'pending').length
  },

  getPendingSuggestions: () => {
    return get().suggestions.filter(s => s.status === 'pending')
  },

  clearAll: () => {
    set({ suggestions: [] })
  },

  removeSuggestion: (id) => {
    set((state) => ({
      suggestions: state.suggestions.filter(s => s.id !== id)
    }))
  }
}))

