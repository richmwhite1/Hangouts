import { SignIn } from '@clerk/nextjs'
import { SignInPageClient } from './sign-in-client'

interface SignInPageProps {
  searchParams: Promise<{ redirect_url?: string }>
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams
  const redirectUrl = params.redirect_url || '/'
  
  return (
    <SignInPageClient redirectUrl={redirectUrl} />
  )
}

