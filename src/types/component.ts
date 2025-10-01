// Component prop types and interfaces
import { User, Hangout, FriendRequest, Notification } from './database'
import { ReactNode } from 'react'

// Base component props
export interface BaseComponentProps {
  className?: string
  children?: ReactNode
}

// Layout component props
export interface LayoutProps extends BaseComponentProps {
  title?: string
  description?: string
  showNavigation?: boolean
  showSidebar?: boolean
}

export interface NavigationProps extends BaseComponentProps {
  user?: User | null
  currentPath?: string
}

export interface BottomNavigationProps extends BaseComponentProps {
  currentPath?: string
}

// Card component props
export interface CardProps extends BaseComponentProps {
  title?: string
  subtitle?: string
  image?: string
  actions?: ReactNode
  variant?: 'default' | 'outlined' | 'elevated'
}

export interface HangoutCardProps extends BaseComponentProps {
  hangout: Hangout
  showActions?: boolean
  onJoin?: (hangoutId: string) => void
  onLeave?: (hangoutId: string) => void
  onEdit?: (hangoutId: string) => void
  onDelete?: (hangoutId: string) => void
}

// Form component props
export interface FormProps extends BaseComponentProps {
  onSubmit: (data: Record<string, unknown>) => void
  onCancel?: () => void
  isLoading?: boolean
  submitText?: string
  cancelText?: string
}

export interface InputProps extends BaseComponentProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url'
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  onBlur?: () => void
  onFocus?: () => void
  error?: string
  disabled?: boolean
  required?: boolean
  label?: string
  helperText?: string
}

export interface SelectProps extends BaseComponentProps {
  options: Array<{ value: string; label: string; disabled?: boolean }>
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  error?: string
  disabled?: boolean
  required?: boolean
  label?: string
  helperText?: string
}

export interface TextareaProps extends BaseComponentProps {
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  onBlur?: () => void
  onFocus?: () => void
  error?: string
  disabled?: boolean
  required?: boolean
  label?: string
  helperText?: string
  rows?: number
  maxLength?: number
}

// Button component props
export interface ButtonProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  type?: 'button' | 'submit' | 'reset'
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
}

// Modal component props
export interface ModalProps extends BaseComponentProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  showCloseButton?: boolean
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
}

export interface ConfirmModalProps extends ModalProps {
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel?: () => void
  variant?: 'danger' | 'warning' | 'info'
}

// List component props
export interface ListProps<T = unknown> extends BaseComponentProps {
  items: T[]
  renderItem: (item: T, index: number) => ReactNode
  keyExtractor: (item: T, index: number) => string
  emptyMessage?: string
  loading?: boolean
  error?: string
  onRefresh?: () => void
}

export interface HangoutListProps extends BaseComponentProps {
  hangouts: Hangout[]
  loading?: boolean
  error?: string
  onRefresh?: () => void
  onHangoutPress?: (hangout: Hangout) => void
}

// User component props
export interface UserCardProps extends BaseComponentProps {
  user: User
  showActions?: boolean
  onAddFriend?: (userId: string) => void
  onRemoveFriend?: (userId: string) => void
  onBlockUser?: (userId: string) => void
  onViewProfile?: (userId: string) => void
}

export interface FriendRequestCardProps extends BaseComponentProps {
  request: FriendRequest
  onAccept?: (requestId: string) => void
  onDecline?: (requestId: string) => void
}

// Notification component props
export interface NotificationItemProps extends BaseComponentProps {
  notification: Notification
  onMarkAsRead?: (notificationId: string) => void
  onPress?: (notification: Notification) => void
}

// Search component props
export interface SearchProps extends BaseComponentProps {
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  onSearch?: (query: string) => void
  onClear?: () => void
  suggestions?: string[]
  loading?: boolean
}

export interface FilterProps extends BaseComponentProps {
  filters: Record<string, unknown>
  onFilterChange: (key: string, value: unknown) => void
  onClearFilters: () => void
  availableFilters: Array<{
    key: string
    label: string
    type: 'select' | 'multiselect' | 'date' | 'range'
    options?: Array<{ value: string; label: string }>
  }>
}

// Calendar component props
export interface CalendarProps extends BaseComponentProps {
  events: Array<{
    id: string
    title: string
    date: Date
    color?: string
  }>
  onDateSelect?: (date: Date) => void
  onEventSelect?: (event: { id: string; title: string; date: Date; color?: string }) => void
  selectedDate?: Date
  minDate?: Date
  maxDate?: Date
}

// Map component props
export interface MapProps extends BaseComponentProps {
  center?: { lat: number; lng: number }
  zoom?: number
  markers?: Array<{
    id: string
    position: { lat: number; lng: number }
    title?: string
    description?: string
    color?: string
  }>
  onMarkerPress?: (marker: { id: string; position: { lat: number; lng: number }; title?: string; description?: string; color?: string }) => void
  onMapPress?: (position: { lat: number; lng: number }) => void
}

// Loading component props
export interface LoadingProps extends BaseComponentProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  overlay?: boolean
}

export interface SkeletonProps extends BaseComponentProps {
  width?: string | number
  height?: string | number
  variant?: 'text' | 'rectangular' | 'circular'
  animation?: 'pulse' | 'wave' | 'none'
}

// Error component props
export interface ErrorProps extends BaseComponentProps {
  title?: string
  message?: string
  onRetry?: () => void
  retryText?: string
  variant?: 'error' | 'warning' | 'info'
}

// Empty state component props
export interface EmptyStateProps extends BaseComponentProps {
  title: string
  description?: string
  icon?: ReactNode
  action?: {
    text: string
    onClick: () => void
  }
}
