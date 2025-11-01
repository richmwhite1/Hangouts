import { SignUp } from '@clerk/nextjs'

interface SignUpPageProps {
  searchParams: Promise<{ redirect_url?: string }>
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = await searchParams
  const redirectUrl = params.redirect_url || '/'
  
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-full max-w-md">
        <SignUp 
          redirectUrl={redirectUrl}
          appearance={{
            elements: {
              formButtonPrimary: 'bg-blue-600 hover:bg-blue-700',
              card: 'bg-gray-900 border-gray-700',
              headerTitle: 'text-white',
              headerSubtitle: 'text-gray-400',
              socialButtonsBlockButton: 'bg-gray-800 border-gray-600 text-white hover:bg-gray-700',
              formFieldInput: 'bg-gray-800 border-gray-600 text-white',
              formFieldLabel: 'text-gray-300',
              footerActionLink: 'text-blue-400 hover:text-blue-300'
            }
          }}
        />
      </div>
    </div>
  )
}

