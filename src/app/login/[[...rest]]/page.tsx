import { SignIn } from '@clerk/nextjs'

const LoginPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black p-5">
      <div className="mb-8 text-center">
        <h1 className="text-white text-3xl font-bold mb-2">
          Welcome to Hangout
        </h1>
        <p className="text-gray-400 text-base">
          Sign in to start planning events with friends
        </p>
      </div>

      <div className="w-full max-w-md">
        <SignIn 
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
              socialButtonsBlockButton__google: {
                backgroundColor: '#FFFFFF',
                color: '#000000'
              },
              formButtonPrimary: {
                backgroundColor: '#6c47ff',
                color: '#FFFFFF',
                fontWeight: 'bold'
              },
              footerActionLink: {
                color: '#6c47ff'
              },
              identityPreviewText: {
                color: '#FFFFFF'
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
          path="/login"
          signUpUrl="/signup"
        />
      </div>
    </div>
  )
}

export default LoginPage
