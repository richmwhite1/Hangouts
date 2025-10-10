export class NotificationSoundService {
  private static audioContext: AudioContext | null = null
  private static isEnabled = true
  private static volume = 0.5

  // Initialize audio context
  static init() {
    if (typeof window !== 'undefined' && !this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
  }

  // Play notification sound
  static playSound(type: 'message' | 'hangout' | 'event' | 'system' = 'message') {
    if (!this.isEnabled || !this.audioContext) return

    try {
      const oscillator = this.audioContext.createOscillator()
      const gainNode = this.audioContext.createGain()

      // Different frequencies for different notification types
      const frequencies = {
        message: [800, 600], // Two-tone for messages
        hangout: [1000, 800, 600], // Three-tone for hangouts
        event: [1200, 1000], // Two-tone for events
        system: [600] // Single tone for system
      }

      const freq = frequencies[type]
      const duration = 0.2
      const now = this.audioContext.currentTime

      oscillator.connect(gainNode)
      gainNode.connect(this.audioContext.destination)

      // Create a sequence of tones
      freq.forEach((frequency, index) => {
        const startTime = now + (index * duration * 0.8)
        const endTime = startTime + duration

        oscillator.frequency.setValueAtTime(frequency, startTime)
        gainNode.gain.setValueAtTime(0, startTime)
        gainNode.gain.linearRampToValueAtTime(this.volume, startTime + 0.01)
        gainNode.gain.exponentialRampToValueAtTime(0.001, endTime)
      })

      oscillator.start(now)
      oscillator.stop(now + (freq.length * duration * 0.8) + duration)
    } catch (error) {
      console.warn('Failed to play notification sound:', error)
    }
  }

  // Play custom sound with frequency and duration
  static playCustomSound(frequency: number, duration: number = 0.2) {
    if (!this.isEnabled || !this.audioContext) return

    try {
      const oscillator = this.audioContext.createOscillator()
      const gainNode = this.audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(this.audioContext.destination)

      const now = this.audioContext.currentTime
      const endTime = now + duration

      oscillator.frequency.setValueAtTime(frequency, now)
      gainNode.gain.setValueAtTime(0, now)
      gainNode.gain.linearRampToValueAtTime(this.volume, now + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.001, endTime)

      oscillator.start(now)
      oscillator.stop(endTime)
    } catch (error) {
      console.warn('Failed to play custom sound:', error)
    }
  }

  // Enable/disable sounds
  static setEnabled(enabled: boolean) {
    this.isEnabled = enabled
  }

  // Set volume (0.0 to 1.0)
  static setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume))
  }

  // Get current settings
  static getSettings() {
    return {
      enabled: this.isEnabled,
      volume: this.volume
    }
  }

  // Test sound
  static testSound() {
    this.playSound('message')
  }
}
