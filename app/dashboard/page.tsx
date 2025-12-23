
import DocumentList from "@/components/dashboard/DocumentList"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { UserNav } from "@/components/auth/UserNav"
import { Sparkles } from "lucide-react"
import Link from "next/link"

export default async function DashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    return (
        <div className="min-h-screen bg-background">
             <header className="px-4 lg:px-6 h-16 flex items-center border-b justify-between bg-background/80 backdrop-blur-sm sticky top-0 z-50">
                <Link href="/dashboard" className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <span className="font-bold text-xl tracking-tight">DocEdit AI</span>
                </Link>
                <div className="flex items-center gap-4">
                    <UserNav user={user} />
                </div>
            </header>
            <main className="container mx-auto py-8 px-4">
                <DocumentList />
            </main>
        </div>
    )
}
