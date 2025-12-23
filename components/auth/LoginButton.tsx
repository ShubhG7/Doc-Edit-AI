'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Chrome } from 'lucide-react'
import { useState } from 'react'

export default function LoginButton() {
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async () => {
    setIsLoading(true)
    const supabase = createClient()
    
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    })
  }

  return (
    <Button onClick={handleLogin} disabled={isLoading} variant="outline" className="w-full flex items-center gap-2">
      {isLoading ? "Redirecting..." : (
        <>
            <Chrome className="h-4 w-4" />
            Sign in with Google
        </>
      )}
    </Button>
  )
}
