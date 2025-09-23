'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface Location {
  id: string;
  name: string;
  address: string;
  isFrequent: boolean;
}

interface Rider {
  id: string;
  name: string;
  phone: string | null;
  relationship: string | null;
}

interface NewTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  selectedTime: string;
  locations: Location[];
  riders: Rider[];
  onCreateTrip: (tripData: {
    destination: string;
    customDestination?: string;
    pickupAddress: string;
    riderId?: string;
  }) => void;
}

export default function NewTripModal({
  isOpen,
  onClose,
  selectedDate,
  selectedTime,
  locations,
  riders,
  onCreateTrip
}: NewTripModalProps) {
  const [destination, setDestination] = useState('');
  const [customDestination, setCustomDestination] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [selectedRider, setSelectedRider] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-select first rider when modal opens and riders are available
  useEffect(() => {
    if (isOpen && riders.length > 0 && selectedRider === '') {
      setSelectedRider(riders[0].id);
    }
  }, [isOpen, riders, selectedRider]);

  const handleSubmit = async () => {
    if (!destination || !pickupAddress.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await onCreateTrip({
        destination,
        customDestination: destination === 'custom' ? customDestination : undefined,
        pickupAddress: pickupAddress.trim(),
        riderId: selectedRider || undefined,
      });
      
      // Reset form
      setDestination('');
      setCustomDestination('');
      setPickupAddress('');
      setSelectedRider('');
      onClose();
    } catch (error) {
      console.error('Error creating trip:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold">🚗</span>
              </div>
              <div>
                <h2 className="text-xl font-bold">Create New Trip</h2>
                <p className="text-sm text-white/80">
                  {format(selectedDate, 'EEEE, MMM d, yyyy')} at {selectedTime}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Destination */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
              Activity/Destination *
            </label>
            <div className="relative">
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full appearance-none border-2 border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 pr-10 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-gradient-to-r from-white to-gray-50 dark:from-gray-700 dark:to-gray-800 backdrop-blur-sm text-gray-900 dark:text-white shadow-sm hover:shadow-md font-medium cursor-pointer"
              >
              <option value="">Select activity destination</option>
              {locations.filter(loc => loc.isFrequent).map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
              <option value="custom">Custom destination</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            {destination === 'custom' && (
              <input
                type="text"
                placeholder="Enter destination address"
                value={customDestination}
                onChange={(e) => setCustomDestination(e.target.value)}
                className="w-full mt-2 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white"
              />
            )}
          </div>

          {/* Pickup Address */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
              Pickup Address <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter your pickup street address"
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              e.g., &quot;123 Main Street, Stellenbosch&quot; or &quot;456 Oak Avenue, Somerset West&quot;
            </p>
          </div>


          {/* Rider Selection */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 border-2 border-purple-200 dark:border-purple-600 rounded-xl p-4">
            <div className="flex items-center mb-3">
              <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center mr-2">
                <span className="text-white text-xs font-bold">👥</span>
              </div>
              <h4 className="font-semibold text-purple-900 dark:text-purple-200">Who&apos;s Riding?</h4>
            </div>
            <p className="text-xs text-purple-700 dark:text-purple-300 mb-3">
              Select who will be taking this trip
            </p>
            
            <div className="space-y-2">
              {riders.map((rider) => (
                <label key={rider.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-purple-100/50 dark:hover:bg-purple-800/20 transition-colors cursor-pointer">
                  <input
                    type="radio"
                    name="rider"
                    value={rider.id}
                    checked={selectedRider === rider.id}
                    onChange={(e) => setSelectedRider(e.target.value)}
                    className="w-4 h-4 text-purple-600 focus:ring-purple-500 focus:ring-2"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-purple-800 dark:text-purple-200 text-sm">{rider.name}</div>
                    <div className="text-xs text-purple-600 dark:text-purple-400">
                      {rider.relationship}{rider.phone ? ` • ${rider.phone}` : ''}
                    </div>
                  </div>
                </label>
              ))}
              
              {riders.length > 0 && (
                <div className="border-t border-purple-200 dark:border-purple-600 pt-2 mt-3">
                  <label className="flex items-center space-x-3 p-2 rounded-lg hover:bg-purple-100/50 dark:hover:bg-purple-800/20 transition-colors cursor-pointer">
                    <input
                      type="radio"
                      name="rider"
                      value=""
                      checked={selectedRider === ''}
                      onChange={(e) => setSelectedRider(e.target.value)}
                      className="w-4 h-4 text-purple-600 focus:ring-purple-500 focus:ring-2"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-purple-800 dark:text-purple-200 text-sm">You</div>
                      <div className="text-xs text-purple-600 dark:text-purple-400">Account holder (traveling yourself)</div>
                    </div>
                  </label>
                </div>
              )}
              
              {riders.length === 0 && (
                <div className="text-center py-4">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-800 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-lg">👥</span>
                  </div>
                  <p className="text-purple-600 dark:text-purple-400 mb-1 font-medium text-sm">No riders added yet</p>
                  <p className="text-xs text-purple-500 dark:text-purple-500 mb-3">
                    Add family members in your profile to book rides for them
                  </p>
                  <label className="flex items-center space-x-3 p-2 rounded-lg hover:bg-purple-100/50 dark:hover:bg-purple-800/20 transition-colors cursor-pointer">
                    <input
                      type="radio"
                      name="rider"
                      value=""
                      checked={selectedRider === ''}
                      onChange={(e) => setSelectedRider(e.target.value)}
                      className="w-4 h-4 text-purple-600 focus:ring-purple-500 focus:ring-2"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-purple-800 dark:text-purple-200 text-sm">You</div>
                      <div className="text-xs text-purple-600 dark:text-purple-400">Book for yourself</div>
                    </div>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-600 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 text-blue-500 mt-0.5">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-1">
                  Creating a shared trip
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Other users can join your trip (up to 4 total passengers). Cost: 1 credit per rider.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-b-2xl">
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-3 rounded-xl transition-all duration-200 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !destination || !pickupAddress.trim()}
              className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white px-4 py-3 rounded-xl transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating...</span>
                </div>
              ) : (
                'Create Trip'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}