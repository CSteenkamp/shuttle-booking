/**
 * Rating Modal Component
 * Modal for submitting ratings after trip completion
 */

'use client'

import { useState } from 'react'
import RatingStars from './RatingStars'
import toast from 'react-hot-toast'

interface RatingModalProps {
  isOpen: boolean
  onClose: () => void
  bookingId: string
  role: 'CUSTOMER_RATING_DRIVER' | 'DRIVER_RATING_CUSTOMER'
  driverName?: string
  customerName?: string
  onSuccess?: () => void
}

const CUSTOMER_TAGS = [
  'Punctual',
  'Friendly',
  'Professional',
  'Clean Vehicle',
  'Safe Driver',
  'Good Communication',
  'Helpful',
  'Courteous',
  'Smooth Ride',
  'Great Service'
]

const DRIVER_TAGS = [
  'Punctual',
  'Respectful',
  'Friendly',
  'Good Communication',
  'Clean',
  'Polite',
  'Easy Pickup',
  'Would Drive Again'
]

export default function RatingModal({
  isOpen,
  onClose,
  bookingId,
  role,
  driverName,
  customerName,
  onSuccess
}: RatingModalProps) {
  const [stars, setStars] = useState(0)
  const [comment, setComment] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  const isCustomerRating = role === 'CUSTOMER_RATING_DRIVER'
  const ratedName = isCustomerRating ? driverName : customerName
  const availableTags = isCustomerRating ? CUSTOMER_TAGS : DRIVER_TAGS

  const handleToggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const handleSubmit = async () => {
    if (stars === 0) {
      toast.error('Please select a star rating')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bookingId,
          role,
          stars,
          comment: comment.trim() || undefined,
          tags: selectedTags
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Thank you for your rating!')
        onSuccess?.()
        onClose()
        // Reset form
        setStars(0)
        setComment('')
        setSelectedTags([])
      } else {
        toast.error(data.error || 'Failed to submit rating')
      }
    } catch (error) {
      console.error('Error submitting rating:', error)
      toast.error('Error submitting rating')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isCustomerRating ? 'Rate Your Driver' : 'Rate Your Passenger'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Rated Person */}
          {ratedName && (
            <div className="mb-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white text-2xl font-bold">
                  {ratedName.charAt(0).toUpperCase()}
                </span>
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {ratedName}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isCustomerRating ? 'Your driver' : 'Your passenger'}
              </p>
            </div>
          )}

          {/* Star Rating */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 text-center">
              How was your experience?
            </label>
            <div className="flex justify-center">
              <RatingStars
                value={stars}
                onChange={setStars}
                size="lg"
              />
            </div>
            {stars > 0 && (
              <p className="text-center mt-2 text-sm text-gray-600 dark:text-gray-400">
                {stars === 5 && '⭐ Amazing!'}
                {stars === 4 && '👍 Great!'}
                {stars === 3 && '👌 Good'}
                {stars === 2 && '😐 Could be better'}
                {stars === 1 && '😞 Not good'}
              </p>
            )}
          </div>

          {/* Tags */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Select tags (optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleToggleTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Add a comment (optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share more about your experience..."
              rows={4}
              maxLength={500}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white resize-none"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
              {comment.length}/500
            </p>
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Skip
            </button>
            <button
              onClick={handleSubmit}
              disabled={stars === 0 || submitting}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {submitting ? 'Submitting...' : 'Submit Rating'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
