'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Camera, Upload, X, Image as ImageIcon, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

import { logger } from '@/lib/logger'
interface UploadFile extends File {
  id: string
  preview: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
}

interface EnhancedPhotoUploadProps {
  onUpload: (files: File[]) => Promise<void>
  maxFiles?: number
  maxFileSize?: number // in MB
  className?: string
}

export function EnhancedPhotoUpload({
  onUpload,
  maxFiles = 10,
  maxFileSize = 10,
  className
}: EnhancedPhotoUploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const droppedFiles = Array.from(e.dataTransfer.files)
    addFiles(droppedFiles)
  }, [])

  const addFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter(file => {
      if (!allowedTypes.includes(file.type)) {
        logger.warn(`File ${file.name} is not a supported image type`);
        return false
      }
      if (file.size > maxFileSize * 1024 * 1024) {
        logger.warn(`File ${file.name} is too large. Maximum size is ${maxFileSize}MB`);
        return false
      }
      return true
    })

    const uploadFiles: UploadFile[] = validFiles.map(file => ({
      ...file,
      id: Math.random().toString(36).substr(2, 9),
      preview: URL.createObjectURL(file),
      status: 'pending'
    }))

    setFiles(prev => [...prev, ...uploadFiles].slice(0, maxFiles))
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files))
    }
  }

  const removeFile = (id: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id)
      if (file) {
        URL.revokeObjectURL(file.preview)
      }
      return prev.filter(f => f.id !== id)
    })
  }

  const handleUpload = async () => {
    if (files.length === 0) return

    setIsUploading(true)
    
    // Update file statuses to uploading
    setFiles(prev => prev.map(f => ({ ...f, status: 'uploading' as const })))

    try {
      const fileObjects = files.map(f => {
        const { id, preview, status, error, ...file } = f
        return file as File
      })
      
      await onUpload(fileObjects)
      
      // Update file statuses to success
      setFiles(prev => prev.map(f => ({ ...f, status: 'success' as const })))
      
      // Clear files after successful upload
      setTimeout(() => {
        setFiles([])
      }, 2000)
    } catch (error) {
      // Update file statuses to error
      setFiles(prev => prev.map(f => ({ 
        ...f, 
        status: 'error' as const,
        error: error instanceof Error ? error.message : 'Upload failed'
      })))
    } finally {
      setIsUploading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'uploading':
        return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      case 'success':
        return <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
          <div className="w-2 h-2 bg-white rounded-full" />
        </div>
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return <ImageIcon className="w-4 h-4 text-gray-400" />
    }
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upload Area */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer',
          isDragOver 
            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
            : 'border-gray-300 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-500'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={allowedTypes.join(',')}
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <div className="space-y-2">
          <Upload className="w-8 h-8 mx-auto text-gray-400" />
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">Click to upload</span> or drag and drop
          </div>
          <div className="text-xs text-gray-500">
            PNG, JPG, WebP, GIF up to {maxFileSize}MB each (max {maxFiles} files)
          </div>
        </div>
      </div>

      {/* File Previews */}
      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Selected Photos ({files.length})</h4>
            <Button
              onClick={handleUpload}
              disabled={isUploading || files.length === 0}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isUploading ? 'Uploading...' : `Upload ${files.length} Photo${files.length === 1 ? '' : 's'}`}
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {files.map((file) => (
              <Card key={file.id} className="relative overflow-hidden">
                <CardContent className="p-2">
                  <div className="aspect-square relative">
                    <img
                      src={file.preview}
                      alt={file.name}
                      className="w-full h-full object-cover rounded"
                    />
                    
                    {/* Status Overlay */}
                    <div className="absolute top-2 right-2">
                      {getStatusIcon(file.status)}
                    </div>

                    {/* Remove Button */}
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute top-2 left-2 w-6 h-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeFile(file.id)
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>

                    {/* Error Message */}
                    {file.status === 'error' && file.error && (
                      <div className="absolute bottom-0 left-0 right-0 bg-red-500 text-white text-xs p-1">
                        {file.error}
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-2 space-y-1">
                    <div className="text-xs font-medium truncate" title={file.name}>
                      {file.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}



























