'use client'

import { useEditorStore } from '@/lib/store/editorStore'
import { EditOperation } from '@/lib/ai/types'
import { applyEdit } from '@/lib/editor/applyEdit'
import { MessageList } from './MessageList'
import { Composer } from './Composer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useChatContext } from './ChatContext'
import { useToast } from '@/components/ui/toast'
import { useEffect } from 'react'
import { VersionHistory } from '@/components/editor/VersionHistory'
import { type DocumentVersion } from '@/lib/store/versionStore'

interface ChatPaneProps {
    documentId: string
    documentTitle: string
    onTitleChange: (newTitle: string) => void
}

export default function ChatPane({ documentId, documentTitle, onTitleChange }: ChatPaneProps) {
    const { editor } = useEditorStore()
    const { messages, sendMessage, isLoading, error } = useChatContext()
    const { toast } = useToast()

    // Show error toast when error occurs
    useEffect(() => {
        if (error) {
            toast(error, 'error')
        }
    }, [error, toast])

    const handleApplyEdit = (edit: EditOperation): boolean => {
        if (!editor) return false
        return applyEdit(editor, edit, documentId, documentTitle)
    }

    const handleUpdateTitle = (newTitle: string) => {
        onTitleChange(newTitle)
    }

    // Handle rollback to a previous version
    const handleRollback = (version: DocumentVersion) => {
        if (editor) {
            // Set the editor content to the version's content
            editor.commands.setContent(version.contentHtml)
            // Update title if it changed
            if (version.title !== documentTitle) {
                onTitleChange(version.title)
            }
            toast(`Rolled back to version ${version.id}`, 'success')
        }
    }

    const { storeCurrentSelection, clearStoredSelection } = useEditorStore()

    const handleSend = async (text: string) => {
        // Store the current selection before sending (it will be lost when focus moves to chat)
        storeCurrentSelection()
        
        await sendMessage({ 
            text,
            body: {
                documentId,
                documentTitle,
                documentHtml: editor?.getHTML() || '',
                selectionText: editor?.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, ' ') || ''
            }
        })
    }

    // Filter messages for improvement tab (containing tool calls for edits)
    const editMessages = (messages || []).filter((m: any) => 
        m && m.parts && Array.isArray(m.parts) && m.parts.some((p: any) => 
            p && ((p.type === 'tool-call' && p.toolName === 'apply_edit') || 
            p.type === 'tool-apply_edit')
        )
    )

    return (
        <div className="flex flex-col h-full bg-sidebar">
            <div className="p-4 border-b font-semibold flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    AI Assistant
                </div>
                <div className="text-[10px] text-muted-foreground font-normal">
                    {messages.length} messages
                </div>
            </div>
            
            <Tabs defaultValue="chat" className="flex-1 flex flex-col overflow-hidden">
                <div className="px-4 pt-2">
                    <TabsList className="w-full">
                        <TabsTrigger value="chat" className="flex-1">Chat</TabsTrigger>
                        <TabsTrigger value="improve" className="flex-1">Improve</TabsTrigger>
                    </TabsList>
                </div>
                
                <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden m-0">
                     <MessageList 
                        messages={messages as any} 
                        onApplyEdit={handleApplyEdit} 
                        onUpdateTitle={handleUpdateTitle}
                        isLoading={isLoading}
                        currentTitle={documentTitle}
                     />
                </TabsContent>
                
                <TabsContent value="improve" className="flex-1 flex flex-col overflow-hidden m-0">
                    {editMessages.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center text-muted-foreground p-8 text-center text-sm">
                            No improvements suggested yet.
                        </div>
                    ) : (
                        <MessageList 
                            messages={editMessages as any} 
                            onApplyEdit={handleApplyEdit} 
                            onUpdateTitle={handleUpdateTitle}
                            isLoading={isLoading}
                            currentTitle={documentTitle}
                        />
                    )}
                </TabsContent>
            </Tabs>

            <Composer 
                onSend={handleSend} 
                isLoading={isLoading} 
            />
            
            {/* Version History - collapsible at bottom */}
            <VersionHistory onRollback={handleRollback} />
        </div>
    )
}
