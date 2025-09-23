'use client';

import { format, addDays, isSameDay, parseISO, startOfDay } from 'date-fns';

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
  // Generate time slots from 7 AM to 6 PM in 20-minute intervals
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 7; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 20) {
        slots.push(
          `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        );
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Generate week days (Monday to Friday)
  const getWeekDays = (weekStart: Date) => {
    const days = [];
    for (let i = 0; i < 5; i++) { // Monday to Friday
      days.push(addDays(weekStart, i));
    }
    return days;
  };

  const weekDays = getWeekDays(selectedWeekStart);

  // Find trips for a specific day and time slot
  const getTripsForSlot = (day: Date, timeSlot: string) => {
    return trips.filter(trip => {
      const tripDate = parseISO(trip.startTime);
      const tripTime = format(tripDate, 'HH:mm');
      return isSameDay(tripDate, day) && tripTime === timeSlot;
    });
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
        <div className="grid grid-cols-6 gap-4">
          <div className="text-center text-sm font-medium text-white/80">Time</div>
          {weekDays.map((day) => (
            <div key={day.toString()} className="text-center">
              <div className="text-sm font-medium text-white/80">
                {format(day, 'EEE')}
              </div>
              <div className="text-lg font-bold">
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="max-h-96 overflow-y-auto">
        <div className="grid grid-cols-6 gap-0 border-b border-gray-200 dark:border-gray-600">
          {timeSlots.map((timeSlot) => (
            <div key={timeSlot} className="contents">
              {/* Time Label */}
              <div className="bg-gray-50 dark:bg-gray-700 border-r border-gray-200 dark:border-gray-600 p-3 text-center text-sm font-medium text-gray-600 dark:text-gray-300 sticky left-0 min-w-[80px]">
                {timeSlot}
              </div>
              
              {/* Day Slots */}
              {weekDays.map((day) => {
                const slotTrips = getTripsForSlot(day, timeSlot);
                const isEmpty = slotTrips.length === 0;
                const isPastDate = startOfDay(day) < startOfDay(new Date());
                
                return (
                  <div
                    key={`${timeSlot}-${day.toString()}`}
                    className={`min-h-[60px] border-r border-b border-gray-200 dark:border-gray-600 p-1 relative ${
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
                      <div className="w-full h-full min-h-[52px] rounded-lg p-2 flex items-center justify-center text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors duration-200">
                        <div className="text-center">
                          <div className="text-lg mb-1">+</div>
                          <div className="text-xs font-medium">Add Trip</div>
                        </div>
                      </div>
                    )}
                    
                    {slotTrips.map((trip) => {
                      const availableSeats = trip.maxPassengers - trip.currentPassengers;
                      const isFull = availableSeats === 0;

                      return (
                        <div
                          key={trip.id}
                          onClick={() => !isFull && onTripClick(trip)}
                          className={`w-full h-full min-h-[52px] rounded-lg p-2 cursor-pointer transition-all duration-200 text-xs hover:shadow-lg hover:scale-105 relative ${
                            isFull 
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 cursor-not-allowed opacity-60' 
                              : availableSeats <= 1
                                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 hover:bg-yellow-200 dark:hover:bg-yellow-900/50'
                                : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-900/50'
                          }`}
                        >
                          <div className="font-semibold text-xs mb-1 truncate">
                            {trip.destination.name}
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-medium">
                              {trip.currentPassengers}/{trip.maxPassengers}
                            </span>
                            <div className={`w-3 h-3 rounded-full ${
                              availableSeats <= 1 ? 'bg-yellow-500' : 'bg-green-500'
                            }`} />
                          </div>

                          {/* Plus sign in the center */}
                          {!isFull && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none -mt-2">
                              <div className="text-2xl font-bold text-gray-600 dark:text-gray-300 opacity-70">
                                +
                              </div>
                            </div>
                          )}

                          {/* Full trip indicator */}
                          {isFull && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="text-[10px] font-bold text-red-600 dark:text-red-400">
                                BOOKED FULL
                              </div>
                            </div>
                          )}

                          {/* Capacity Progress Bar */}
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
        <div className="flex items-center justify-center space-x-6 text-xs">
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
            <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
            <span className="text-gray-600 dark:text-gray-300">Click to Book</span>
          </div>
        </div>
      </div>
    </div>
  );
}