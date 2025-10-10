import { SignUp } from '@clerk/nextjs'

const SignUpPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black p-5">
      <div className="mb-8 text-center">
        <h1 className="text-white text-3xl font-bold mb-2">
          Join Hangout
        </h1>
        <p className="text-gray-400 text-base">
          Create your account to get started
        </p>
      </div>

      <div className="w-full max-w-md">
        <SignUp 
          appearance={{
            elements: {
              rootBox: { 
                width: '100%', 
                maxWidth: '400px' 
              },
              card: {
                backgroundColor: '#1a1a1a',
                border: '1px solid #333333',
                boxShadow: 'none'
              },
              headerTitle: { 
                color: '#FFFFFF' 
              },
              headerSubtitle: { 
                color: '#B3B3B3' 
              },
              socialButtonsBlockButton: {
                backgroundColor: '#FFFFFF',
                color: '#000000',
                border: 'none',
                fontWeight: 'bold'
              },
              formButtonPrimary: {
                backgroundColor: '#6c47ff',
                color: '#FFFFFF',
                fontWeight: 'bold'
              },
              footerActionLink: { 
                color: '#6c47ff' 
              },
              formFieldLabel: { 
                color: '#FFFFFF' 
              },
              formFieldInput: {
                backgroundColor: '#000000',
                borderColor: '#333333',
                color: '#FFFFFF'
              }
            }
          }}
          routing="path"
          path="/signup"
          signInUrl="/login"
        />
      </div>
    </div>
  )
}

export default SignUpPage




