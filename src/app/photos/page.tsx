'use client'

import { useState, useEffect } from 'react'

// Force dynamic rendering to avoid build-time issues
export const dynamic = 'force-dynamic'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PhotoGallery } from '@/components/photo-gallery'
import { PhotoLightbox } from '@/components/photo-lightbox'
import { PhotoUpload } from '@/components/photo-upload'
import { 
  Plus, 
  Grid3X3, 
  List, 
  Upload, 
  FolderOpen,
  Heart,
  MessageCircle,
  Share2,
  Download,
  Camera,
  Image as ImageIcon
} from 'lucide-react'

interface Photo {
  id: string
  caption?: string
  isPublic: boolean
  originalUrl: string
  thumbnailUrl: string
  smallUrl: string
  mediumUrl: string
  largeUrl: string
  originalWidth: number
  originalHeight: number
  fileSize: number
  createdAt: string
  creator: {
    id: string
    name: string
    username: string
    avatar?: string
  }
  hangout?: {
    id: string
    title: string
  }
  album?: {
    id: string
    name: string
  }
  tags: Array<{
    id: string
    name: string
  }>
  likes: Array<{
    id: string
    user: {
      id: string
      name: string
      username: string
      avatar?: string
    }
  }>
  _count: {
    likes: number
    comments: number
  }
}

interface Album {
  id: string
  name: string
  description?: string
  isPublic: boolean
  coverPhoto?: {
    id: string
    thumbnailUrl: string
    smallUrl: string
    mediumUrl: string
    originalUrl: string
  }
  photos: Photo[]
  _count: {
    photos: number
  }
  creator: {
    id: string
    name: string
    username: string
    avatar?: string
  }
  createdAt: string
  updatedAt: string
}

export default function PhotosPage() {
  const { user, token } = useAuth()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [albums, setAlbums] = useState<Album[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0)
  const [showUpload, setShowUpload] = useState(false)
  const [showLightbox, setShowLightbox] = useState(false)

  useEffect(() => {
    if (user && token) {
      fetchPhotos()
      fetchAlbums()
    }
  }, [user, token])

  const fetchPhotos = async () => {
    try {
      const response = await fetch('/api/photos', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setPhotos(data.data.photos)
        }
      }
    } catch (error) {
      console.error('Error fetching photos:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAlbums = async () => {
    try {
      const response = await fetch('/api/albums', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setAlbums(data.data.albums)
        }
      }
    } catch (error) {
      console.error('Error fetching albums:', error)
    }
  }

  const handlePhotoClick = (photo: Photo) => {
    const index = photos.findIndex(p => p.id === photo.id)
    setSelectedPhoto(photo)
    setSelectedPhotoIndex(index)
    setShowLightbox(true)
  }

  const handleNext = () => {
    if (selectedPhotoIndex < photos.length - 1) {
      const nextIndex = selectedPhotoIndex + 1
      setSelectedPhoto(photos[nextIndex])
      setSelectedPhotoIndex(nextIndex)
    }
  }

  const handlePrev = () => {
    if (selectedPhotoIndex > 0) {
      const prevIndex = selectedPhotoIndex - 1
      setSelectedPhoto(photos[prevIndex])
      setSelectedPhotoIndex(prevIndex)
    }
  }

  const handleLike = async (photoId: string) => {
    // TODO: Implement like functionality
    console.log('Like photo:', photoId)
  }

  const handleComment = async (photoId: string) => {
    // TODO: Implement comment functionality
    console.log('Comment on photo:', photoId)
  }

  const handleShare = async (photoId: string) => {
    // TODO: Implement share functionality
    console.log('Share photo:', photoId)
  }

  const handleDownload = async (photoId: string) => {
    const photo = photos.find(p => p.id === photoId)
    if (photo) {
      const link = document.createElement('a')
      link.href = photo.originalUrl
      link.download = `photo-${photo.id}.webp`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleUpload = async (files: File[], metadata: any) => {
    try {
      const formData = new FormData()
      
      files.forEach(file => {
        formData.append('files', file)
      })
      
      formData.append('caption', metadata.caption || '')
      formData.append('tags', metadata.tags.join(','))
      formData.append('isPublic', metadata.isPublic.toString())

      const response = await fetch('/api/photos', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // Refresh photos
          await fetchPhotos()
          setShowUpload(false)
        }
      }
    } catch (error) {
      console.error('Error uploading photos:', error)
      throw error
    }
  }

  const filteredPhotos = photos.filter(photo => {
    switch (activeTab) {
      case 'public':
        return photo.isPublic
      case 'private':
        return !photo.isPublic
      case 'recent':
        const oneWeekAgo = new Date()
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
        return new Date(photo.createdAt) > oneWeekAgo
      default:
        return true
    }
  })

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please sign in</h1>
          <p className="text-gray-600">You need to be signed in to view photos.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Photos</h1>
            <p className="text-gray-600 mt-1">
              Manage and organize your photo collection
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowUpload(!showUpload)}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Photos
            </Button>
          </div>
        </div>

        {/* Upload Section */}
        {showUpload && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Upload New Photos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PhotoUpload
                onUpload={handleUpload}
                onCancel={() => setShowUpload(false)}
                maxFiles={10}
                maxFileSize={20}
              />
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All Photos</TabsTrigger>
            <TabsTrigger value="public">Public</TabsTrigger>
            <TabsTrigger value="private">Private</TabsTrigger>
            <TabsTrigger value="recent">Recent</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <PhotoGallery
                photos={filteredPhotos}
                onPhotoClick={handlePhotoClick}
                onLike={handleLike}
                onComment={handleComment}
                onShare={handleShare}
                onDownload={handleDownload}
                layout="grid"
                columns={4}
              />
            )}
          </TabsContent>

          <TabsContent value="public" className="space-y-6">
            <PhotoGallery
              photos={filteredPhotos}
              onPhotoClick={handlePhotoClick}
              onLike={handleLike}
              onComment={handleComment}
              onShare={handleShare}
              onDownload={handleDownload}
              layout="grid"
              columns={4}
            />
          </TabsContent>

          <TabsContent value="private" className="space-y-6">
            <PhotoGallery
              photos={filteredPhotos}
              onPhotoClick={handlePhotoClick}
              onLike={handleLike}
              onComment={handleComment}
              onShare={handleShare}
              onDownload={handleDownload}
              layout="grid"
              columns={4}
            />
          </TabsContent>

          <TabsContent value="recent" className="space-y-6">
            <PhotoGallery
              photos={filteredPhotos}
              onPhotoClick={handlePhotoClick}
              onLike={handleLike}
              onComment={handleComment}
              onShare={handleShare}
              onDownload={handleDownload}
              layout="grid"
              columns={4}
            />
          </TabsContent>
        </Tabs>

        {/* Albums Section */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Albums</h2>
            <Button variant="outline">
              <FolderOpen className="w-4 h-4 mr-2" />
              Create Album
            </Button>
          </div>

          {albums.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No albums yet</h3>
                <p className="text-gray-500 mb-4">
                  Create your first album to organize your photos
                </p>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Album
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {albums.map(album => (
                <Card key={album.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="aspect-square bg-gray-100">
                    {album.coverPhoto ? (
                      <img
                        src={album.coverPhoto.mediumUrl}
                        alt={album.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                  </div>
                  
                  <CardContent className="p-4">
                    <h3 className="font-medium text-gray-900 mb-1">{album.name}</h3>
                    <p className="text-sm text-gray-500 mb-2">
                      {album._count.photos} photo{album._count.photos !== 1 ? 's' : ''}
                    </p>
                    {album.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">{album.description}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Photo Lightbox */}
      {showLightbox && selectedPhoto && (
        <PhotoLightbox
          photos={photos}
          currentIndex={selectedPhotoIndex}
          isOpen={showLightbox}
          onClose={() => setShowLightbox(false)}
          onNext={handleNext}
          onPrev={handlePrev}
          onLike={handleLike}
          onComment={handleComment}
          onShare={handleShare}
          onDownload={handleDownload}
        />
      )}
    </div>
  )
}


















