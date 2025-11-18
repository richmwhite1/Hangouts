export interface OnboardingStep {
  id: string
  title: string
  description: string
  targetSelector: string
  position: 'top' | 'bottom' | 'left' | 'right' | 'center'
  action?: () => void
}

export const onboardingSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Plans! 📅',
    description: 'Let\'s show you around. This quick 5-step tour will help you get started in no time. You can skip anytime with ESC.',
    targetSelector: 'body',
    position: 'center'
  },
  {
    id: 'discover',
    title: 'Discover Events & Hangouts 🔍',
    description: 'Find amazing events and hangouts happening around you. Filter by category, location, and date to find exactly what you\'re looking for.',
    targetSelector: '[data-tour="discover-nav"]',
    position: 'bottom'
  },
  {
    id: 'events',
    title: 'Browse Public Events 🎉',
    description: 'Explore curated events from concerts to workshops. Save your favorites by tapping the heart icon, and RSVP to join the fun!',
    targetSelector: '[data-tour="events-nav"]',
    position: 'bottom'
  },
  {
    id: 'create',
    title: 'Create Your Own Hangouts ✨',
    description: 'Plan your own hangouts! Create events, invite friends, and use polls to decide on details together. It\'s that simple!',
    targetSelector: '[data-tour="create-button"]',
    position: 'bottom'
  },
  {
    id: 'complete',
    title: 'You\'re all set! 🎊',
    description: 'You\'re ready to start planning amazing hangouts. Create your first hangout or discover events happening near you. Have fun!',
    targetSelector: 'body',
    position: 'center'
  }
]

export const getMobileOnboardingSteps = (): OnboardingStep[] => [
  {
    id: 'welcome',
    title: 'Welcome to Plans! 📅',
    description: 'Let\'s show you around with a quick tour.',
    targetSelector: 'body',
    position: 'center'
  },
  {
    id: 'discover',
    title: 'Discover 🔍',
    description: 'Find events and hangouts around you.',
    targetSelector: '[data-tour="discover-bottom-nav"]',
    position: 'top'
  },
  {
    id: 'create',
    title: 'Create ✨',
    description: 'Tap here to plan your own hangouts.',
    targetSelector: '[data-tour="create-bottom-nav"]',
    position: 'top'
  },
  {
    id: 'profile',
    title: 'Your Profile 👤',
    description: 'Manage your account and preferences here.',
    targetSelector: '[data-tour="profile-bottom-nav"]',
    position: 'top'
  },
  {
    id: 'complete',
    title: 'You\'re ready! 🎊',
    description: 'Start planning amazing hangouts!',
    targetSelector: 'body',
    position: 'center'
  }
]

