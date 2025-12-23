import LoginButton from '@/components/auth/LoginButton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkles } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="px-4 lg:px-6 h-16 flex items-center border-b">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-xl tracking-tight">DocEdit AI</span>
        </Link>
      </header>
      
      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <Card className="border-0 shadow-lg">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
              <CardDescription className="text-base">
                Sign in to continue to DocEdit AI
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <LoginButton />
              <p className="text-xs text-center text-muted-foreground mt-4">
                By signing in, you agree to our Terms of Service and Privacy Policy
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
