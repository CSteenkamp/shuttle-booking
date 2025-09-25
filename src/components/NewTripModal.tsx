'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface Location {
  id: string;
  name: string;
  address: string;
  isFrequent: boolean;
  defaultDuration?: number;
  baseCost?: number;
}

interface DestinationPricing {
  destinationName: string;
  duration?: number;
  baseCost?: number;
  tiers: Array<{
    passengers: number;
    costPerPerson: number;
    totalCost: number;
    savings?: number;
  }>;
}

interface Rider {
  id: string;
  name: string;
  phone: string | null;
  relationship: string | null;
}

interface GuestRider {
  id: string;
  name: string;
  phone?: string;
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
    riderIds: string[];
    guestRiders: GuestRider[];
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
  const [selectedRiders, setSelectedRiders] = useState<string[]>([]);
  const [guestRiders, setGuestRiders] = useState<GuestRider[]>([]);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [destinationPricing, setDestinationPricing] = useState<DestinationPricing | null>(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setDestination('');
      setCustomDestination('');
      setPickupAddress('');
      setSelectedRiders([]);
      setGuestRiders([]);
      setShowGuestForm(false);
      setGuestName('');
      setGuestPhone('');
    }
  }, [isOpen]);

  // Fetch pricing when destination changes
  useEffect(() => {
    if (destination && destination !== 'custom') {
      fetchDestinationPricing(destination);
    } else {
      setDestinationPricing(null);
    }
  }, [destination]);

  // Fetch pricing information for a destination
  const fetchDestinationPricing = async (destinationId: string) => {
    try {
      const response = await fetch(`/api/locations/${destinationId}/pricing`);
      if (response.ok) {
        const data = await response.json();
        setDestinationPricing(data);
      } else {
        setDestinationPricing(null);
      }
    } catch (error) {
      console.error('Error fetching destination pricing:', error);
      setDestinationPricing(null);
    }
  };

  const handleSubmit = async () => {
    if (!destination || !pickupAddress.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    if (totalSelectedRiders === 0) {
      alert('Please select at least one rider');
      return;
    }

    setLoading(true);
    try {
      await onCreateTrip({
        destination,
        customDestination: destination === 'custom' ? customDestination : undefined,
        pickupAddress: pickupAddress.trim(),
        riderIds: selectedRiders,
        guestRiders: guestRiders,
      });
      
      onClose();
    } catch (error) {
      console.error('Error creating trip:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRiderSelection = (riderId: string) => {
    setSelectedRiders(prev => {
      const totalSelectedRiders = prev.length + guestRiders.length;
      
      if (prev.includes(riderId)) {
        return prev.filter(id => id !== riderId);
      } else if (totalSelectedRiders < 4) {
        return [...prev, riderId];
      } else {
        alert('Maximum 4 riders allowed per trip');
        return prev;
      }
    });
  };

  const toggleAccountHolderSelection = () => {
    setSelectedRiders(prev => {
      const totalSelectedRiders = prev.length + guestRiders.length;
      
      if (prev.includes('')) {
        return prev.filter(id => id !== '');
      } else if (totalSelectedRiders < 4) {
        return [...prev, ''];
      } else {
        alert('Maximum 4 riders allowed per trip');
        return prev;
      }
    });
  };

  const addGuestRider = () => {
    if (!guestName.trim()) {
      alert('Please enter guest name');
      return;
    }
    
    const totalSelectedRiders = selectedRiders.length + guestRiders.length;
    
    if (totalSelectedRiders >= 4) {
      alert('Maximum 4 riders allowed per trip');
      return;
    }
    
    const newGuest: GuestRider = {
      id: `guest-${Date.now()}`,
      name: guestName.trim(),
      phone: guestPhone.trim() || undefined
    };
    
    setGuestRiders(prev => [...prev, newGuest]);
    setGuestName('');
    setGuestPhone('');
    setShowGuestForm(false);
  };

  const removeGuestRider = (guestId: string) => {
    setGuestRiders(prev => prev.filter(g => g.id !== guestId));
  };

  if (!isOpen) return null;

  const totalSelectedRiders = selectedRiders.length + guestRiders.length;

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
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center mr-2">
                  <span className="text-white text-xs font-bold">👥</span>
                </div>
                <h4 className="font-semibold text-purple-900 dark:text-purple-200 text-sm">Trip Riders</h4>
              </div>
              <div className="text-xs text-purple-600 dark:text-purple-400">
                {totalSelectedRiders}/4 selected
              </div>
            </div>

            {/* Selected Riders */}
            {(selectedRiders.length > 0 || guestRiders.length > 0) && (
              <div className="space-y-2 mb-3">
                {selectedRiders.map(riderId => {
                  const rider = riderId === '' ? null : riders.find(r => r.id === riderId);
                  const riderName = rider ? rider.name : 'You';
                  const riderInfo = rider ? `${rider.relationship}${rider.phone ? ` • ${rider.phone}` : ''}` : 'Account holder';
                  
                  return (
                    <div key={riderId || 'account-holder'} className="bg-white/70 dark:bg-gray-700/70 border border-purple-200 dark:border-purple-600 rounded-lg p-2 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-purple-900 dark:text-purple-100 text-sm">{riderName}</div>
                        <div className="text-xs text-purple-600 dark:text-purple-400">{riderInfo}</div>
                      </div>
                      <button
                        onClick={() => riderId === '' ? toggleAccountHolderSelection() : toggleRiderSelection(riderId)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
                
                {/* Guest Riders */}
                {guestRiders.map(guest => (
                  <div key={guest.id} className="bg-white/70 dark:bg-gray-700/70 border border-purple-200 dark:border-purple-600 rounded-lg p-2 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-purple-900 dark:text-purple-100 text-sm">{guest.name}</div>
                      <div className="text-xs text-purple-600 dark:text-purple-400">
                        Guest{guest.phone ? ` • ${guest.phone}` : ''}
                      </div>
                    </div>
                    <button
                      onClick={() => removeGuestRider(guest.id)}
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Rider Buttons */}
            {totalSelectedRiders < 4 && (
              <div className="space-y-2">
                <p className="text-xs text-purple-700 dark:text-purple-300 mb-2">
                  Add riders to this trip:
                </p>
                
                {/* Add Account Holder */}
                {!selectedRiders.includes('') && (
                  <button
                    onClick={() => toggleAccountHolderSelection()}
                    className="w-full flex items-center space-x-3 p-2 rounded-lg border-2 border-dashed border-purple-300 dark:border-purple-600 hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-200"
                  >
                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-700 rounded-full flex items-center justify-center">
                      <span className="text-purple-600 dark:text-purple-300 font-bold text-lg">+</span>
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-purple-800 dark:text-purple-200 text-sm">You</div>
                      <div className="text-xs text-purple-600 dark:text-purple-400">Account holder</div>
                    </div>
                  </button>
                )}

                {/* Add Family Members */}
                {riders.filter(rider => !selectedRiders.includes(rider.id)).map(rider => (
                  <button
                    key={rider.id}
                    onClick={() => toggleRiderSelection(rider.id)}
                    className="w-full flex items-center space-x-3 p-2 rounded-lg border-2 border-dashed border-purple-300 dark:border-purple-600 hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-200"
                  >
                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-700 rounded-full flex items-center justify-center">
                      <span className="text-purple-600 dark:text-purple-300 font-bold text-lg">+</span>
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-purple-800 dark:text-purple-200 text-sm">{rider.name}</div>
                      <div className="text-xs text-purple-600 dark:text-purple-400">
                        {rider.relationship}{rider.phone ? ` • ${rider.phone}` : ''}
                      </div>
                    </div>
                  </button>
                ))}

                {/* Add Guest Rider Button */}
                {!showGuestForm && (
                  <button
                    onClick={() => setShowGuestForm(true)}
                    className="w-full flex items-center space-x-3 p-2 rounded-lg border-2 border-dashed border-emerald-300 dark:border-emerald-600 hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all duration-200"
                  >
                    <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-700 rounded-full flex items-center justify-center">
                      <span className="text-emerald-600 dark:text-emerald-300 font-bold text-lg">+</span>
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-emerald-800 dark:text-emerald-200 text-sm">Add Guest</div>
                      <div className="text-xs text-emerald-600 dark:text-emerald-400">Book for friends, colleagues, etc.</div>
                    </div>
                  </button>
                )}

                {/* Guest Form */}
                {showGuestForm && (
                  <div className="border-2 border-emerald-300 dark:border-emerald-600 rounded-lg p-3 bg-emerald-50 dark:bg-emerald-900/20">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-emerald-800 dark:text-emerald-200 mb-1">
                          Guest Name *
                        </label>
                        <input
                          type="text"
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          placeholder="Enter guest's full name"
                          className="w-full text-xs border border-emerald-300 dark:border-emerald-600 rounded-md px-2 py-1 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-emerald-800 dark:text-emerald-200 mb-1">
                          Phone Number (optional)
                        </label>
                        <input
                          type="text"
                          value={guestPhone}
                          onChange={(e) => setGuestPhone(e.target.value)}
                          placeholder="Enter guest's phone"
                          className="w-full text-xs border border-emerald-300 dark:border-emerald-600 rounded-md px-2 py-1 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={addGuestRider}
                          className="flex-1 bg-emerald-600 text-white text-xs py-1.5 px-3 rounded-md hover:bg-emerald-700 transition-colors font-medium"
                        >
                          Add Guest
                        </button>
                        <button
                          onClick={() => {
                            setShowGuestForm(false);
                            setGuestName('');
                            setGuestPhone('');
                          }}
                          className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs py-1.5 px-3 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {riders.length === 0 && totalSelectedRiders === 0 && (
                  <div className="text-center py-3">
                    <p className="text-xs text-purple-500 dark:text-purple-500">
                      Add family members in your profile or create guests here
                    </p>
                  </div>
                )}
              </div>
            )}

            {totalSelectedRiders >= 4 && (
              <div className="text-center py-2">
                <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                  🚐 Maximum capacity reached (4 riders)
                </p>
              </div>
            )}
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
                  Creating a {totalSelectedRiders > 1 ? 'multi-rider' : 'shared'} trip
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  {totalSelectedRiders > 0 
                    ? `${totalSelectedRiders} rider${totalSelectedRiders > 1 ? 's' : ''} selected. Other users can still join your trip.`
                    : 'Other users can join your trip (up to 4 total passengers).'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Pricing Summary */}
          {totalSelectedRiders > 0 && destinationPricing && (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 border-2 border-emerald-200 dark:border-emerald-600 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-emerald-900 dark:text-emerald-200 text-sm flex items-center">
                  <span className="text-emerald-500 mr-2">💰</span>
                  Trip Cost
                </h4>
              </div>
              <div className="space-y-2">
                {destinationPricing.tiers && destinationPricing.tiers.length > 1 ? (
                  // Dynamic pricing display
                  <>
                    <div className="flex justify-between text-xs">
                      <span className="text-emerald-700 dark:text-emerald-300">Cost per rider:</span>
                      <span className="font-semibold text-emerald-800 dark:text-emerald-200">
                        {destinationPricing.tiers[0]?.costPerPerson || destinationPricing.baseCost || 30} credits
                      </span>
                    </div>
                    {destinationPricing.tiers[0]?.savings && destinationPricing.tiers[0].savings > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-emerald-700 dark:text-emerald-300">Savings per rider:</span>
                        <span className="font-semibold text-green-600 dark:text-green-400">
                          -{destinationPricing.tiers[0].savings} credits
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  // Standard pricing display
                  <div className="flex justify-between text-xs">
                    <span className="text-emerald-700 dark:text-emerald-300">Cost per rider:</span>
                    <span className="font-semibold text-emerald-800 dark:text-emerald-200">
                      {destinationPricing.baseCost || 30} credits
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-xs">
                  <span className="text-emerald-700 dark:text-emerald-300">Total riders:</span>
                  <span className="font-semibold text-emerald-800 dark:text-emerald-200">{totalSelectedRiders}</span>
                </div>
                <hr className="border-emerald-200 dark:border-emerald-600" />
                <div className="flex justify-between">
                  <span className="font-bold text-emerald-800 dark:text-emerald-200 text-sm">Total Credits Required:</span>
                  <span className="font-bold text-emerald-800 dark:text-emerald-200 text-base">
                    {destinationPricing.tiers && destinationPricing.tiers.length > 1
                      ? (destinationPricing.tiers[0]?.costPerPerson || 30) * totalSelectedRiders
                      : (destinationPricing.baseCost || 30) * totalSelectedRiders
                    } credits
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Fallback pricing for destinations without specific pricing */}
          {totalSelectedRiders > 0 && !destinationPricing && destination && destination !== 'custom' && (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 border-2 border-emerald-200 dark:border-emerald-600 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-emerald-900 dark:text-emerald-200 text-sm flex items-center">
                  <span className="text-emerald-500 mr-2">💰</span>
                  Trip Cost
                </h4>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-emerald-700 dark:text-emerald-300">Cost per rider:</span>
                  <span className="font-semibold text-emerald-800 dark:text-emerald-200">30 credits</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-emerald-700 dark:text-emerald-300">Total riders:</span>
                  <span className="font-semibold text-emerald-800 dark:text-emerald-200">{totalSelectedRiders}</span>
                </div>
                <hr className="border-emerald-200 dark:border-emerald-600" />
                <div className="flex justify-between">
                  <span className="font-bold text-emerald-800 dark:text-emerald-200 text-sm">Total Credits Required:</span>
                  <span className="font-bold text-emerald-800 dark:text-emerald-200 text-base">
                    {30 * totalSelectedRiders} credits
                  </span>
                </div>
              </div>
            </div>
          )}
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
              disabled={loading || !destination || !pickupAddress.trim() || totalSelectedRiders === 0}
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