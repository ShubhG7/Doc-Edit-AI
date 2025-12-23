import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Sparkles, FileText, MessageSquare, Zap } from 'lucide-react'

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-16 flex items-center border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-xl tracking-tight">DocEdit AI</span>
        </div>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors">
            Sign In
          </Link>
        </nav>
      </header>
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/10" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
          
          <div className="relative w-full py-20 md:py-32 lg:py-40 flex flex-col items-center text-center px-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              Powered by Claude AI
            </div>
            
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl max-w-4xl">
              Write better with{' '}
              <span className="text-primary">AI-powered</span>{' '}
              editing
            </h1>
            
            <p className="mx-auto max-w-2xl text-muted-foreground text-lg md:text-xl mt-6 mb-10 leading-relaxed">
              A beautiful document editor with an intelligent AI assistant. 
              Write, edit, and improve your content with the power of Claude right beside you.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/login">
                <Button size="lg" className="gap-2 px-8 text-base">
                  <Sparkles className="h-4 w-4" />
                  Get Started Free
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" size="lg" className="px-8 text-base">
                  View Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-4 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              Everything you need to write
            </h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-card rounded-xl p-6 border shadow-sm">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Rich Text Editor</h3>
                <p className="text-muted-foreground">
                  A beautiful, Notion-style editor with headings, formatting, lists, and more.
                </p>
              </div>
              
              <div className="bg-card rounded-xl p-6 border shadow-sm">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">AI Chat Sidebar</h3>
                <p className="text-muted-foreground">
                  Chat with Claude to generate content, improve text, or get writing suggestions.
                </p>
              </div>
              
              <div className="bg-card rounded-xl p-6 border shadow-sm">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">One-Click Apply</h3>
                <p className="text-muted-foreground">
                  Apply AI suggestions directly to your document with a single click.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <footer className="border-t py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm">DocEdit AI</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Built with Next.js, TipTap, and Claude AI
          </p>
        </div>
      </footer>
    </div>
  )
}
