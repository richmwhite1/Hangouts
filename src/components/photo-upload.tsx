'use client'

import { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { 
  Upload, 
  X, 
  Image as ImageIcon, 
  Plus, 
  Tag, 
  Eye, 
  EyeOff,
  Loader2,
  CheckCircle,
  AlertCircle,
  Camera,
  FolderOpen
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface PhotoUploadProps {
  onUpload: (files: File[], metadata: PhotoMetadata) => Promise<void>
  onCancel?: () => void
  maxFiles?: number
  maxFileSize?: number // in MB
  allowedTypes?: string[]
  className?: string
}

interface PhotoMetadata {
  caption?: string
  tags: string[]
  isPublic: boolean
  albumId?: string
  hangoutId?: string
}

interface UploadFile extends File {
  id: string
  preview: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
}

export function PhotoUpload({
  onUpload,
  onCancel,
  maxFiles = 10,
  maxFileSize = 20,
  allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'],
  className
}: PhotoUploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [metadata, setMetadata] = useState<PhotoMetadata>({
    caption: '',
    tags: [],
    isPublic: false
  })
  const [newTag, setNewTag] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

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
        console.warn(`File ${file.name} is not a supported image type`)
        return false
      }
      if (file.size > maxFileSize * 1024 * 1024) {
        console.warn(`File ${file.name} is too large. Maximum size is ${maxFileSize}MB`)
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

  const addTag = () => {
    if (newTag.trim() && !metadata.tags.includes(newTag.trim())) {
      setMetadata(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag('')
    }
  }

  const removeTag = (tag: string) => {
    setMetadata(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  const handleUpload = async () => {
    if (files.length === 0) return

    setIsUploading(true)
    
    // Update file statuses to uploading
    setFiles(prev => prev.map(f => ({ ...f, status: 'uploading' as const })))

    try {
      await onUpload(files, metadata)
      
      // Update file statuses to success
      setFiles(prev => prev.map(f => ({ ...f, status: 'success' as const })))
      
      // Clear files after successful upload
      setTimeout(() => {
        setFiles([])
        setMetadata({
          caption: '',
          tags: [],
          isPublic: false
        })
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

  return (
    <div className={cn('space-y-6', className)}>
      {/* Upload Area */}
      <Card
        className={cn(
          'border-2 border-dashed transition-colors',
          isDragOver 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
            : 'border-gray-300 hover:border-gray-400'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="p-8">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <ImageIcon className="w-8 h-8 text-gray-400" />
            </div>
            
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {isDragOver ? 'Drop photos here' : 'Upload Photos'}
            </h3>
            
            <p className="text-gray-500 mb-4">
              Drag and drop your photos here, or click to select files
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={files.length >= maxFiles}
              >
                <Camera className="w-4 h-4 mr-2" />
                Choose Photos
              </Button>
              
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={files.length >= maxFiles}
              >
                <FolderOpen className="w-4 h-4 mr-2" />
                Browse Files
              </Button>
            </div>
            
            <p className="text-sm text-gray-400 mt-3">
              Supports JPEG, PNG, WebP, GIF, HEIC, HEIF up to {maxFileSize}MB each
            </p>
            
            {files.length > 0 && (
              <p className="text-sm text-gray-400">
                {files.length} of {maxFiles} files selected
              </p>
            )}
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={allowedTypes.join(',')}
            onChange={handleFileSelect}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Selected Files */}
      {files.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Selected Photos</h4>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {files.map(file => (
              <div key={file.id} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={file.preview}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Status Overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    {file.status === 'uploading' && (
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    )}
                    {file.status === 'success' && (
                      <CheckCircle className="w-6 h-6 text-green-400" />
                    )}
                    {file.status === 'error' && (
                      <AlertCircle className="w-6 h-6 text-red-400" />
                    )}
                  </div>
                  
                  {/* Remove Button */}
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeFile(file.id)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                
                <div className="mt-2">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)}
                  </p>
                  {file.error && (
                    <p className="text-xs text-red-500 mt-1">{file.error}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metadata Form */}
      {files.length > 0 && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <h4 className="font-medium text-gray-900">Photo Details</h4>
            
            {/* Caption */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Caption
              </label>
              <Textarea
                placeholder="Add a caption for your photos..."
                value={metadata.caption}
                onChange={(e) => setMetadata(prev => ({ ...prev, caption: e.target.value }))}
                rows={3}
              />
            </div>
            
            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="Add a tag..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
                <Button onClick={addTag} disabled={!newTag.trim()}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              
              {metadata.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {metadata.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      {tag}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-4 h-4 p-0 ml-1"
                        onClick={() => removeTag(tag)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            
            {/* Privacy */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {metadata.isPublic ? (
                  <Eye className="w-4 h-4 text-green-500" />
                ) : (
                  <EyeOff className="w-4 h-4 text-gray-400" />
                )}
                <span className="text-sm font-medium text-gray-700">
                  {metadata.isPublic ? 'Public' : 'Private'}
                </span>
              </div>
              
              <Switch
                checked={metadata.isPublic}
                onCheckedChange={(checked) => setMetadata(prev => ({ ...prev, isPublic: checked }))}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {files.length > 0 && (
        <div className="flex justify-end gap-3">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          
          <Button
            onClick={handleUpload}
            disabled={isUploading || files.some(f => f.status === 'error')}
            className="min-w-24"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload {files.length} Photo{files.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
