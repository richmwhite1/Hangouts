"use client"

import React, { forwardRef } from 'react'
import { useMobileForm } from '@/hooks/use-mobile-keyboard'
import { cn } from '@/lib/utils'

interface MobileInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  required?: boolean
  className?: string
}

export const MobileInput = forwardRef<HTMLInputElement, MobileInputProps>(
  ({ label, error, helperText, required, className, ...props }, ref) => {
    const { handleInputFocus, handleInputBlur } = useMobileForm()

    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            "w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg",
            "bg-white dark:bg-gray-800 text-gray-900 dark:text-white",
            "focus:ring-2 focus:ring-blue-500 focus:border-transparent",
            "placeholder:text-gray-500 dark:placeholder:text-gray-400",
            "transition-colors duration-200",
            error && "border-red-500 focus:ring-red-500",
            className
          )}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
        )}
      </div>
    )
  }
)

MobileInput.displayName = "MobileInput"

interface MobileTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
  required?: boolean
  className?: string
  rows?: number
}

export const MobileTextarea = forwardRef<HTMLTextAreaElement, MobileTextareaProps>(
  ({ label, error, helperText, required, className, rows = 4, ...props }, ref) => {
    const { handleInputFocus, handleInputBlur } = useMobileForm()

    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          rows={rows}
          className={cn(
            "w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg",
            "bg-white dark:bg-gray-800 text-gray-900 dark:text-white",
            "focus:ring-2 focus:ring-blue-500 focus:border-transparent",
            "placeholder:text-gray-500 dark:placeholder:text-gray-400",
            "resize-none transition-colors duration-200",
            error && "border-red-500 focus:ring-red-500",
            className
          )}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
        )}
      </div>
    )
  }
)

MobileTextarea.displayName = "MobileTextarea"

interface MobileSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  helperText?: string
  required?: boolean
  className?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

export const MobileSelect = forwardRef<HTMLSelectElement, MobileSelectProps>(
  ({ label, error, helperText, required, className, options, placeholder, ...props }, ref) => {
    const { handleInputFocus, handleInputBlur } = useMobileForm()

    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <select
          ref={ref}
          className={cn(
            "w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg",
            "bg-white dark:bg-gray-800 text-gray-900 dark:text-white",
            "focus:ring-2 focus:ring-blue-500 focus:border-transparent",
            "transition-colors duration-200",
            error && "border-red-500 focus:ring-red-500",
            className
          )}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
        )}
      </div>
    )
  }
)

MobileSelect.displayName = "MobileSelect"

interface MobileFormProps {
  children: React.ReactNode
  onSubmit: (e: React.FormEvent) => void
  className?: string
}

export function MobileForm({ children, onSubmit, className }: MobileFormProps) {
  const { isKeyboardVisible, keyboardHeight } = useMobileForm()

  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        "space-y-6 p-4",
        isKeyboardVisible && "pb-4",
        className
      )}
      style={{
        paddingBottom: isKeyboardVisible ? `${keyboardHeight + 16}px` : undefined
      }}
    >
      {children}
    </form>
  )
}

// Mobile date/time picker
interface MobileDateTimePickerProps {
  label?: string
  value: string
  onChange: (value: string) => void
  type?: 'date' | 'time' | 'datetime-local'
  error?: string
  helperText?: string
  required?: boolean
  className?: string
}

export function MobileDateTimePicker({
  label,
  value,
  onChange,
  type = 'datetime-local',
  error,
  helperText,
  required,
  className
}: MobileDateTimePickerProps) {
  const { handleInputFocus, handleInputBlur } = useMobileForm()

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg",
          "bg-white dark:bg-gray-800 text-gray-900 dark:text-white",
          "focus:ring-2 focus:ring-blue-500 focus:border-transparent",
          "transition-colors duration-200",
          error && "border-red-500 focus:ring-red-500",
          className
        )}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
      />
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
      )}
    </div>
  )
}

