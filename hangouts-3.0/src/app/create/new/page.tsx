'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import NewHangoutForm, { NewHangoutFormData } from '@/components/create/NewHangoutForm'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'

function CreateHangoutContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { isSignedIn, isLoaded, getToken } = useAuth()
    const [isCreating, setIsCreating] = useState(false)
    const [isClient, setIsClient] = useState(false)
    const [prefillData, setPrefillData] = useState<any>(null)

    useEffect(() => {
        setIsClient(true)

        // Parse query params for prefill data
        const title = searchParams.get('title')
        const date = searchParams.get('date')
        const time = searchParams.get('time')
        const location = searchParams.get('location')
        const description = searchParams.get('description')

        if (title || date || time || location) {
            // Construct dateTime if both date and time are present
            let dateTime = ''
            if (date && time) {
                // Simple parsing, assuming YYYY-MM-DD and HH:mm
                // But the API might return "tomorrow" or "7pm" which needs parsing if not handled by API
                // The API returns YYYY-MM-DD and HH:mm if successful
                try {
                    // Combine date and time
                    // If date is YYYY-MM-DD and time is HH:mm
                    const d = new Date(`${date}T${time}`)
                    if (!isNaN(d.getTime())) {
                        dateTime = d.toISOString()
                    }
                } catch (e) {
                    console.error('Error parsing date/time', e)
                }
            }

            setPrefillData({
                id: 'new', // Dummy ID
                title: title || '',
                description: description || '',
                location: location || '',
                dateTime: dateTime,
                price: 0,
                options: []
            })
        }
    }, [searchParams])

    // Show sign-in prompt immediately if not authenticated
    if (!isSignedIn) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="max-w-md mx-auto p-6">
                    <div className="bg-gray-900 rounded-lg p-8 text-center">
                        <h2 className="text-2xl font-bold text-white mb-4">Sign In Required</h2>
                        <p className="text-gray-300 mb-6">
                            Please sign in to create hangouts and events
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button
                                onClick={() => window.location.href = '/signup'}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
                            >
                                Sign Up
                            </button>
                            <button
                                onClick={() => window.location.href = '/signin'}
                                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium"
                            >
                                Sign In
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // Wait for client-side hydration
    if (!isClient) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto mb-4"></div>
                    <p className="text-white">Loading...</p>
                </div>
            </div>
        )
    }

    const handleCreateHangout = async (formData: NewHangoutFormData) => {
        try {
            setIsCreating(true)
            // Validate required fields
            if (!formData.title.trim()) {
                toast.error('Title is required')
                return
            }
            let imageUrl = null
            // Upload image if provided
            if (formData.image) {
                try {
                    const uploadFormData = new FormData()
                    uploadFormData.append('file', formData.image)
                    uploadFormData.append('type', 'hangout')
                    const token = await getToken()

                    if (!token) {
                        toast.error('Authentication required. Please sign in.')
                        return
                    }
                    const uploadResponse = await fetch('/api/upload', {
                        method: 'POST',
                        headers: {
                            ...(token && { 'Authorization': `Bearer ${token}` })
                        },
                        body: uploadFormData
                    })
                    if (uploadResponse.ok) {
                        const uploadData = await uploadResponse.json()
                        imageUrl = uploadData.url
                    } else {
                        logger.error('Image upload failed:', uploadResponse.status);
                        toast.error('Failed to upload image')
                        return
                    }
                } catch (uploadError) {
                    logger.error('Error uploading image:', uploadError);
                    toast.error('Failed to upload image')
                    return
                }
            }
            const hangoutData = {
                title: formData.title,
                description: formData.description || null,
                location: formData.location || null,
                privacyLevel: formData.privacyLevel,
                image: imageUrl,
                participants: formData.participants,
                type: formData.type,
                options: formData.options
                    .filter(option => option.title.trim() !== '')
                    .map(option => ({
                        id: option.id,
                        title: option.title,
                        description: option.description || '',
                        location: option.location || '',
                        dateTime: option.dateTime || new Date().toISOString(),
                        price: option.price || 0,
                        eventImage: option.eventImage || ''
                    }))
            }

            const token = await getToken()
            if (!token) {
                toast.error('Authentication required. Please sign in.')
                return
            }
            const response = await fetch('/api/hangouts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                },
                body: JSON.stringify(hangoutData)
            })
            const responseData = await response.json()
            if (responseData.success) {
                toast.success('Hangout created successfully!')
                router.push(`/hangout/${responseData.data.id}`)
            } else {
                toast.error(responseData.error || 'Failed to create hangout')
            }
        } catch (error) {
            logger.error('Error creating hangout:', error);
            toast.error('An unexpected error occurred')
        } finally {
            setIsCreating(false)
        }
    }
    return (
        <div className="min-h-screen bg-black">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-2xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-3xl font-bold text-white">Create New Hangout</h1>
                    </div>
                    <p className="text-gray-400 mb-8">
                        Plan an amazing hangout with your friends
                    </p>
                    <NewHangoutForm
                        onSubmit={handleCreateHangout}
                        isLoading={isCreating}
                        prefillEvent={prefillData}
                    />
                </div>
            </div>
        </div>
    )
}

export default function CreateHangoutPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>}>
            <CreateHangoutContent />
        </Suspense>
    )
}
