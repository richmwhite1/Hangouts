/**
 * Google Maps Script Loader
 * Singleton pattern to ensure script is only loaded once
 */

let scriptLoadingPromise: Promise<void> | null = null
let isScriptLoaded = false

declare global {
  interface Window {
    google?: {
      maps?: {
        places?: {
          Autocomplete: new (input: HTMLInputElement, options?: any) => any
          PlacesService: new (map: HTMLElement | google.maps.Map) => any
        }
        Map: new (element: HTMLElement | null, options?: any) => any
      }
    }
    initGoogleMaps?: () => void
  }
}

/**
 * Load Google Maps JavaScript API script
 * Returns a promise that resolves when the script is loaded
 */
export function loadGoogleMapsScript(): Promise<void> {
  // If already loaded, return immediately
  if (typeof window !== 'undefined' && window.google?.maps?.places) {
    isScriptLoaded = true
    return Promise.resolve()
  }

  // If already loading, return the existing promise
  if (scriptLoadingPromise) {
    return scriptLoadingPromise
  }

  // Check if script tag already exists
  const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')
  if (existingScript) {
    // Script exists but might not be loaded yet
    scriptLoadingPromise = new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (window.google?.maps?.places) {
          clearInterval(checkInterval)
          isScriptLoaded = true
          resolve()
        }
      }, 100)

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval)
        if (!window.google?.maps?.places) {
          reject(new Error('Google Maps script failed to load'))
        }
      }, 10000)
    })
    return scriptLoadingPromise
  }

  // Create new script loading promise
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    return Promise.reject(new Error('Google Maps API key not configured'))
  }

  scriptLoadingPromise = new Promise((resolve, reject) => {
    // Set up error listener BEFORE loading script
    let errorDetected = false
    const errorListener = (event: ErrorEvent) => {
      // Check if this is a Google Maps API error
      const errorMsg = event.message || ''
      if (errorMsg.includes('ApiNotActivatedMapError') || 
          errorMsg.includes('ApiTargetBlockedMapError') ||
          errorMsg.includes('Google Maps JavaScript API error') ||
          event.filename?.includes('maps.googleapis.com')) {
        errorDetected = true
        scriptLoadingPromise = null
        window.removeEventListener('error', errorListener)
        
        // Check if it's blocked by client (ad blocker)
        if (errorMsg.includes('ApiTargetBlockedMapError') || errorMsg.includes('ERR_BLOCKED_BY_CLIENT')) {
          reject(new Error('Google Maps API is blocked (likely by an ad blocker). Please disable ad blockers for this site or enter location manually.'))
        } else {
          reject(new Error('Maps JavaScript API is not enabled. Please enable it in Google Cloud Console.'))
        }
      }
    }
    
    window.addEventListener('error', errorListener)

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`
    script.async = true
    script.defer = true
    script.id = 'google-maps-script'

    script.onload = () => {
      // Wait a bit for Google Maps to fully initialize
      // Also check for errors during initialization
      let attempts = 0
      const maxAttempts = 50 // 5 seconds max
      
      const checkGoogle = setInterval(() => {
        attempts++
        
        // Check if error was detected
        if (errorDetected) {
          clearInterval(checkGoogle)
          return
        }
        
        // Check if Google Maps is ready
        if (window.google?.maps?.places) {
          clearInterval(checkGoogle)
          window.removeEventListener('error', errorListener)
          isScriptLoaded = true
          resolve()
        } else if (attempts >= maxAttempts) {
          clearInterval(checkGoogle)
          window.removeEventListener('error', errorListener)
          scriptLoadingPromise = null
          reject(new Error('Google Maps API failed to initialize - check API key and enabled APIs'))
        }
      }, 100)
    }

    script.onerror = (error) => {
      errorDetected = true
      scriptLoadingPromise = null
      window.removeEventListener('error', errorListener)
      
      // Check if blocked by client (ad blocker)
      const errorMsg = error?.toString() || ''
      if (errorMsg.includes('ERR_BLOCKED_BY_CLIENT') || errorMsg.includes('blocked')) {
        reject(new Error('Google Maps API is blocked (likely by an ad blocker). Please disable ad blockers for this site or enter location manually.'))
      } else {
        reject(new Error('Failed to load Google Maps script'))
      }
    }

    document.head.appendChild(script)
  })

  return scriptLoadingPromise
}

/**
 * Check if Google Maps is loaded and ready
 */
export function isGoogleMapsLoaded(): boolean {
  return typeof window !== 'undefined' && 
         !!window.google?.maps?.places &&
         isScriptLoaded
}






