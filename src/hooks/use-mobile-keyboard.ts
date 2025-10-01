"use client"

import { useState, useEffect, useCallback } from 'react'

interface MobileKeyboardOptions {
  onKeyboardShow?: () => void
  onKeyboardHide?: () => void
  onHeightChange?: (height: number) => void
}

export function useMobileKeyboard(options: MobileKeyboardOptions = {}) {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [initialViewportHeight, setInitialViewportHeight] = useState(0)

  const { onKeyboardShow, onKeyboardHide, onHeightChange } = options

  useEffect(() => {
    // Store initial viewport height
    setInitialViewportHeight(window.innerHeight)

    const handleResize = () => {
      const currentHeight = window.innerHeight
      const heightDifference = initialViewportHeight - currentHeight

      // Consider keyboard visible if height decreased by more than 150px
      const keyboardVisible = heightDifference > 150
      
      if (keyboardVisible !== isKeyboardVisible) {
        setIsKeyboardVisible(keyboardVisible)
        
        if (keyboardVisible) {
          setKeyboardHeight(heightDifference)
          onKeyboardShow?.()
        } else {
          setKeyboardHeight(0)
          onKeyboardHide?.()
        }
      }

      onHeightChange?.(heightDifference)
    }

    window.addEventListener('resize', handleResize)
    
    // Also listen for visual viewport changes (more accurate on mobile)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize)
    }

    return () => {
      window.removeEventListener('resize', handleResize)
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize)
      }
    }
  }, [initialViewportHeight, isKeyboardVisible, onKeyboardShow, onKeyboardHide, onHeightChange])

  const scrollToInput = useCallback((inputElement: HTMLElement) => {
    if (!isKeyboardVisible) return

    const rect = inputElement.getBoundingClientRect()
    const viewportHeight = window.visualViewport?.height || window.innerHeight
    const inputBottom = rect.bottom
    const viewportBottom = viewportHeight

    // If input is below the visible area, scroll it into view
    if (inputBottom > viewportBottom) {
      inputElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      })
    }
  }, [isKeyboardVisible])

  const adjustViewportForKeyboard = useCallback(() => {
    if (!isKeyboardVisible) return

    // Adjust body height to account for keyboard
    document.body.style.height = `${window.visualViewport?.height || window.innerHeight}px`
  }, [isKeyboardVisible])

  const resetViewport = useCallback(() => {
    document.body.style.height = ''
  }, [])

  useEffect(() => {
    if (isKeyboardVisible) {
      adjustViewportForKeyboard()
    } else {
      resetViewport()
    }
  }, [isKeyboardVisible, adjustViewportForKeyboard, resetViewport])

  return {
    isKeyboardVisible,
    keyboardHeight,
    scrollToInput,
    adjustViewportForKeyboard,
    resetViewport
  }
}

// Mobile input optimization hook
export function useMobileInput(inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement>) {
  const { isKeyboardVisible, scrollToInput } = useMobileKeyboard()

  const focusInput = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus()
      
      // Small delay to ensure keyboard is shown
      setTimeout(() => {
        scrollToInput(inputRef.current!)
      }, 300)
    }
  }, [inputRef, scrollToInput])

  const blurInput = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.blur()
    }
  }, [inputRef])

  return {
    isKeyboardVisible,
    focusInput,
    blurInput
  }
}

// Mobile form optimization hook
export function useMobileForm() {
  const [activeInput, setActiveInput] = useState<HTMLElement | null>(null)
  const { isKeyboardVisible, keyboardHeight } = useMobileKeyboard()

  const handleInputFocus = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setActiveInput(e.target)
  }, [])

  const handleInputBlur = useCallback(() => {
    setActiveInput(null)
  }, [])

  const scrollToActiveInput = useCallback(() => {
    if (activeInput && isKeyboardVisible) {
      activeInput.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      })
    }
  }, [activeInput, isKeyboardVisible])

  useEffect(() => {
    if (isKeyboardVisible) {
      scrollToActiveInput()
    }
  }, [isKeyboardVisible, scrollToActiveInput])

  return {
    activeInput,
    isKeyboardVisible,
    keyboardHeight,
    handleInputFocus,
    handleInputBlur
  }
}

