'use client'

import { useEffect, useState } from 'react'
import { getDocuments, Document, createDocument, deleteDocument, saveDocument } from '@/lib/store/documentStore'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, FileText, Loader2, Trash2, MoreVertical, Edit2 } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { useRouter } from 'next/navigation'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
  } from "@/components/ui/dialog"

export default function DocumentList() {
    const [documents, setDocuments] = useState<Document[]>([])
    const [loading, setLoading] = useState(true)
    const [creating, setCreating] = useState(false)
    const router = useRouter()

    useEffect(() => {
        loadDocs()
    }, [])

    const loadDocs = async () => {
        try {
            const docs = await getDocuments()
            setDocuments(docs)
        } catch {
            // Failed to load documents
        } finally {
            setLoading(false)
        }
    }

    const handleCreate = async () => {
        setCreating(true)
        try {
            const doc = await createDocument("Untitled Document")
            if (doc && doc.id) {
                router.push(`/doc/${doc.id}`)
            }
        } catch {
            setCreating(false)
        }
    }

    const handleRename = async (id: string, newTitle: string, currentContent: string) => {
        try {
            await saveDocument(id, currentContent, newTitle)
            setDocuments(docs => docs.map(d => d.id === id ? { ...d, title: newTitle } : d))
        } catch {
            // Rename failed
        }
    }

    const handleDelete = async (id: string) => {
        try {
            await deleteDocument(id)
            setDocuments(docs => docs.filter(d => d.id !== id))
        } catch {
            // Delete failed
        }
    }

    if (loading) {
        return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground"/></div>
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold tracking-tight">Recent Documents</h2>
                <Button onClick={handleCreate} disabled={creating}>
                    {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Plus className="mr-2 h-4 w-4"/>}
                    New Document
                </Button>
            </div>
            
            {documents.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground mb-4">No documents found</p>
                    <Button variant="outline" onClick={handleCreate}>Create your first document</Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {documents.map(doc => (
                        <div key={doc.id} className="group relative">
                            <Link href={`/doc/${doc.id}`}>
                                <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 pr-8">
                                            <FileText className="h-4 w-4 text-primary shrink-0" />
                                            <span className="truncate">{doc.title}</span>
                                        </CardTitle>
                                        <CardDescription>
                                            Updated {formatDistanceToNow(new Date(doc.updated_at), { addSuffix: true })}
                                        </CardDescription>
                                    </CardHeader>
                                </Card>
                            </Link>
                            
                            <div className="absolute top-4 right-4 ">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                    <Edit2 className="mr-2 h-4 w-4" />
                                                    Rename
                                                </DropdownMenuItem>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Rename Document</DialogTitle>
                                                    <DialogDescription>
                                                        Enter a new title for this document.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <form onSubmit={(e: any) => {
                                                    e.preventDefault()
                                                    const formData = new FormData(e.currentTarget)
                                                    const newTitle = formData.get('title') as string
                                                    if (newTitle) {
                                                        handleRename(doc.id, newTitle, doc.content)
                                                    }
                                                }}>
                                                    <Input name="title" defaultValue={doc.title} className="mb-4" autoFocus />
                                                    <DialogFooter>
                                                        <Button type="submit">Save Changes</Button>
                                                    </DialogFooter>
                                                </form>
                                            </DialogContent>
                                        </Dialog>
                                        
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This will permanently delete &quot;{doc.title}&quot;. This action cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(doc.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                                        Delete
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}


