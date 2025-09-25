'use client';

import { format, addDays, isSameDay, parseISO, startOfDay } from 'date-fns';
import { useState, useEffect } from 'react';

interface Trip {
  id: string;
  destination: {
    id: string;
    name: string;
    address: string;
  };
  startTime: string;
  endTime: string;
  maxPassengers: number;
  currentPassengers: number;
  status: string;
}

interface PersonalEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  duration: number;
  blockedSlots: string[];
}

interface TripPricing {
  tripId: string;
  costPerPerson: number;
  totalCost: number;
  savings?: number;
}

interface WeeklyCalendarProps {
  trips: Trip[];
  selectedWeekStart: Date;
  onWeekChange: (weekStart: Date) => void;
  onTimeSlotClick: (date: Date, time: string) => void;
  onTripClick: (trip: Trip) => void;
}

export default function WeeklyCalendar({
  trips,
  selectedWeekStart,
  onWeekChange,
  onTimeSlotClick,
  onTripClick
}: WeeklyCalendarProps) {
  const [personalEvents, setPersonalEvents] = useState<Record<string, PersonalEvent[]>>({});
  const [blockedSlots, setBlockedSlots] = useState<Record<string, string[]>>({});
  const [tripPricing, setTripPricing] = useState<Record<string, TripPricing>>({});

  // Fetch personal events for the current week
  useEffect(() => {
    const fetchPersonalEvents = async () => {
      const weekDays = getWeekDays(selectedWeekStart);
      const eventsData: Record<string, PersonalEvent[]> = {};
      const blockedData: Record<string, string[]> = {};

      for (const day of weekDays) {
        try {
          const response = await fetch(`/api/calendar/personal-events?date=${day.toISOString()}`);
          const data = await response.json();
          
          if (data.success) {
            const dayKey = format(day, 'yyyy-MM-dd');
            eventsData[dayKey] = data.events || [];
            blockedData[dayKey] = data.blockedSlots || [];
          }
        } catch (error) {
          console.error(`Error fetching personal events for ${day.toDateString()}:`, error);
        }
      }

      setPersonalEvents(eventsData);
      setBlockedSlots(blockedData);
    };

    fetchPersonalEvents();
    fetchTripPricing();
  }, [selectedWeekStart, trips]);

  // Fetch pricing information for all trips
  const fetchTripPricing = async () => {
    const pricingData: Record<string, TripPricing> = {};
    
    for (const trip of trips) {
      try {
        const passengerCount = trip.currentPassengers + 1; // Assume 1 additional passenger
        const response = await fetch(`/api/trips/${trip.id}/pricing?passengerCount=${passengerCount}`);
        if (response.ok) {
          const data = await response.json();
          pricingData[trip.id] = {
            tripId: trip.id,
            costPerPerson: data.costPerPerson || 30,
            totalCost: data.totalCost || 30,
            savings: data.savings
          };
        } else {
          // Fallback pricing if API fails
          pricingData[trip.id] = {
            tripId: trip.id,
            costPerPerson: 30,
            totalCost: 30
          };
        }
      } catch (error) {
        console.error(`Error fetching pricing for trip ${trip.id}:`, error);
        // Fallback pricing
        pricingData[trip.id] = {
          tripId: trip.id,
          costPerPerson: 30,
          totalCost: 30
        };
      }
    }
    
    setTripPricing(pricingData);
  };

  // Generate week days (Monday to Friday) - moved up for use in useEffect
  const getWeekDays = (weekStart: Date) => {
    const days = [];
    for (let i = 0; i < 5; i++) { // Monday to Friday
      days.push(addDays(weekStart, i));
    }
    return days;
  };

  // Generate time slots from 6 AM to 9 PM in 20-minute intervals
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 6; hour < 21; hour++) {
      for (let minute = 0; minute < 60; minute += 20) {
        slots.push(
          `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        );
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  const weekDays = getWeekDays(selectedWeekStart);

  // Find trips for a specific day and time slot
  const getTripsForSlot = (day: Date, timeSlot: string) => {
    return trips.filter(trip => {
      const tripStart = parseISO(trip.startTime);
      const tripEnd = parseISO(trip.endTime);
      
      if (!isSameDay(tripStart, day)) {
        return false;
      }
      
      // Create Date objects for the current time slot
      const [hours, minutes] = timeSlot.split(':').map(Number);
      const slotStart = new Date(day);
      slotStart.setHours(hours, minutes, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + 20 * 60 * 1000); // 20 minutes later
      
      // Check if this trip overlaps with this 20-minute slot
      return tripStart < slotEnd && tripEnd > slotStart;
    });
  };

  // Check if a time slot is blocked by personal events
  const isSlotBlockedByPersonalEvents = (day: Date, timeSlot: string) => {
    const dayKey = format(day, 'yyyy-MM-dd');
    const dayBlockedSlots = blockedSlots[dayKey] || [];
    return dayBlockedSlots.includes(timeSlot);
  };

  // Get personal events that block a specific time slot
  const getPersonalEventsForSlot = (day: Date, timeSlot: string) => {
    const dayKey = format(day, 'yyyy-MM-dd');
    const dayEvents = personalEvents[dayKey] || [];
    return dayEvents.filter(event => event.blockedSlots.includes(timeSlot));
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeekStart = addDays(selectedWeekStart, direction === 'next' ? 7 : -7);
    onWeekChange(newWeekStart);
  };

  return (
    <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">📅</span>
            </div>
            <h2 className="text-2xl font-bold">Select Your Trip</h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigateWeek('prev')}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-lg font-semibold px-4">
              {format(selectedWeekStart, 'MMM d')} - {format(addDays(selectedWeekStart, 6), 'MMM d, yyyy')}
            </span>
            <button
              onClick={() => navigateWeek('next')}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Week Days Header */}
        <div className="grid gap-4 min-w-[1200px]" style={{gridTemplateColumns: '150px repeat(5, 1fr)'}}>
          <div className="text-center text-base font-medium text-white/80 w-[150px]">Time</div>
          {weekDays.map((day) => (
            <div key={day.toString()} className="text-center min-w-[200px]">
              <div className="text-base font-semibold text-white/90">
                {format(day, 'EEE')}
              </div>
              <div className="text-2xl font-bold">
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="max-h-[800px] overflow-auto">
        <div className="grid gap-0 border-b border-gray-200 dark:border-gray-600 min-w-[1200px]" style={{gridTemplateColumns: '150px repeat(5, 1fr)'}}>
          {timeSlots.map((timeSlot) => (
            <div key={timeSlot} className="contents">
              {/* Time Label */}
              <div className="bg-gray-50 dark:bg-gray-700 border-r border-gray-200 dark:border-gray-600 p-4 text-center text-base font-medium text-gray-600 dark:text-gray-300 sticky left-0 w-[150px]">
                {timeSlot}
              </div>
              
              {/* Day Slots */}
              {weekDays.map((day) => {
                const slotTrips = getTripsForSlot(day, timeSlot);
                const personalEventsInSlot = getPersonalEventsForSlot(day, timeSlot);
                const isBlockedByPersonalEvents = isSlotBlockedByPersonalEvents(day, timeSlot);
                const isEmpty = slotTrips.length === 0 && !isBlockedByPersonalEvents;
                const isPastDate = startOfDay(day) < startOfDay(new Date());
                
                return (
                  <div
                    key={`${timeSlot}-${day.toString()}`}
                    className={`min-h-[80px] min-w-[200px] border-r border-b border-gray-200 dark:border-gray-600 p-3 relative ${
                      isEmpty && !isPastDate 
                        ? 'hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer transition-colors duration-200' 
                        : ''
                    }`}
                    onClick={() => {
                      if (isEmpty && !isPastDate) {
                        onTimeSlotClick(day, timeSlot);
                      }
                    }}
                  >
                    {isEmpty && !isPastDate && (
                      <div className="w-full h-full min-h-[72px] rounded-lg p-3 flex items-center justify-center text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors duration-200">
                        <div className="text-center">
                          <div className="text-xl mb-2">+</div>
                          <div className="text-sm font-medium">Add Trip</div>
                        </div>
                      </div>
                    )}
                    
                    {/* Personal Events */}
                    {personalEventsInSlot.map((event) => {
                      const eventStart = new Date(event.start);
                      const eventStartTime = format(eventStart, 'HH:mm');
                      const isStartingSlot = eventStartTime === timeSlot;

                      return (
                        <div
                          key={event.id}
                          className={`w-full h-full min-h-[72px] rounded-lg p-3 transition-all duration-200 text-sm relative bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 cursor-not-allowed ${
                            !isStartingSlot ? 'opacity-75 border-l-4 border-orange-400 dark:border-orange-500' : ''
                          }`}
                        >
                          <div className="font-semibold text-sm mb-2 truncate">
                            📅 {event.summary}
                            {!isStartingSlot && (
                              <span className="text-[9px] text-orange-600 dark:text-orange-400 ml-1">
                                (ongoing)
                              </span>
                            )}
                          </div>
                          
                          {isStartingSlot && (
                            <div className="text-[9px] text-orange-700 dark:text-orange-300">
                              Personal Event
                            </div>
                          )}

                          {!isStartingSlot && (
                            <div className="text-[9px] text-orange-600 dark:text-orange-400">
                              Started at {eventStartTime}
                            </div>
                          )}

                          {/* Unavailable indicator */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-[10px] font-bold text-orange-700 dark:text-orange-300 opacity-50">
                              UNAVAILABLE
                            </div>
                          </div>

                          {/* Personal event indicator for ongoing slots */}
                          {!isStartingSlot && (
                            <div className="absolute top-1 right-1">
                              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {slotTrips.map((trip) => {
                      const availableSeats = trip.maxPassengers - trip.currentPassengers;
                      const isFull = availableSeats === 0;
                      
                      // Check if this is the starting slot for this trip
                      const tripStart = parseISO(trip.startTime);
                      const tripStartTime = format(tripStart, 'HH:mm');
                      const isStartingSlot = tripStartTime === timeSlot;

                      return (
                        <div
                          key={trip.id}
                          onClick={() => !isFull && onTripClick(trip)}
                          className={`w-full h-full min-h-[72px] rounded-lg p-3 cursor-pointer transition-all duration-200 text-sm hover:shadow-lg hover:scale-105 relative ${
                            isFull 
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 cursor-not-allowed opacity-60' 
                              : availableSeats <= 1
                                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 hover:bg-yellow-200 dark:hover:bg-yellow-900/50'
                                : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-900/50'
                          } ${!isStartingSlot ? 'opacity-75 border-l-4 border-indigo-400 dark:border-indigo-500' : ''}`}
                        >
                          <div className="font-semibold text-sm mb-2 truncate">
                            {trip.destination.name}
                            {!isStartingSlot && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                                (ongoing)
                              </span>
                            )}
                          </div>
                          
                          {isStartingSlot && (
                            <div className="space-y-1 mb-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium">
                                  {trip.currentPassengers}/{trip.maxPassengers}
                                </span>
                                <div className={`w-3 h-3 rounded-full ${
                                  availableSeats <= 1 ? 'bg-yellow-500' : 'bg-green-500'
                                }`} />
                              </div>
                              {/* Simplified Pricing Display */}
                              {tripPricing[trip.id] && (
                                <div className="text-xs font-bold text-center">
                                  <div className={`${
                                    isFull 
                                      ? 'text-red-600 dark:text-red-400' 
                                      : availableSeats <= 1
                                        ? 'text-yellow-700 dark:text-yellow-300'
                                        : 'text-green-700 dark:text-green-300'
                                  }`}>
                                    {tripPricing[trip.id].costPerPerson} credits
                                  </div>
                                  {tripPricing[trip.id].savings && tripPricing[trip.id].savings! > 0 && (
                                    <div className="text-[9px] text-emerald-600 dark:text-emerald-400">
                                      Save {tripPricing[trip.id].savings}!
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {!isStartingSlot && (
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              Started at {tripStartTime}
                            </div>
                          )}

                          {/* Plus sign in the center - only for starting slot */}
                          {!isFull && isStartingSlot && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none -mt-2">
                              <div className="text-2xl font-bold text-gray-600 dark:text-gray-300 opacity-70">
                                +
                              </div>
                            </div>
                          )}

                          {/* Full trip indicator */}
                          {isFull && isStartingSlot && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="text-[10px] font-bold text-red-600 dark:text-red-400">
                                BOOKED FULL
                              </div>
                            </div>
                          )}

                          {/* Capacity Progress Bar - only for starting slot */}
                          {isStartingSlot && (
                            <div className="w-full h-1 rounded-full mt-1 bg-gray-200 dark:bg-gray-600">
                              <div 
                                className={`h-1 rounded-full transition-all duration-300 ${
                                  isFull 
                                    ? 'bg-red-500' 
                                    : availableSeats <= 1 
                                      ? 'bg-yellow-500' 
                                      : 'bg-green-500'
                                }`}
                                style={{ width: `${(trip.currentPassengers / trip.maxPassengers) * 100}%` }}
                              />
                            </div>
                          )}

                          {/* Duration indicator for ongoing slots */}
                          {!isStartingSlot && (
                            <div className="absolute top-1 right-1">
                              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-center space-x-4 text-xs flex-wrap">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-600 dark:text-gray-300">Available</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-gray-600 dark:text-gray-300">Almost Full</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-gray-600 dark:text-gray-300">Full</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <span className="text-gray-600 dark:text-gray-300">Personal Event (blocks bookings)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
            <span className="text-gray-600 dark:text-gray-300">Click to Book</span>
          </div>
        </div>
      </div>
    </div>
  );
}