'use client';

import { useState } from 'react';

interface CalendarIntegrationProps {
  bookingId: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function CalendarIntegration({ 
  bookingId, 
  onSuccess, 
  onError 
}: CalendarIntegrationProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateEvent = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/calendar/create-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create calendar event');
      }

      onSuccess?.();
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleCreateEvent}
      disabled={isLoading}
      className="flex items-center space-x-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
    >
      {isLoading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          <span>Syncing...</span>
        </>
      ) : (
        <>
          <span>📅</span>
          <span>Add to Google Calendar</span>
        </>
      )}
    </button>
  );
}