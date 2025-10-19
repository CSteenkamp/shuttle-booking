'use client';

import { useState, useEffect, useRef } from 'react';

interface AddressSuggestion {
  formattedAddress: string;
  latitude: number;
  longitude: number;
  street?: string;
  city?: string;
  postalCode?: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string, verified: boolean, coordinates?: { lat: number; lng: number }) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  city?: string; // City to limit address search
}

export default function AddressAutocomplete({
  value,
  onChange,
  placeholder = 'Start typing an address...',
  required = false,
  className = '',
  city
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Fetch address suggestions
  const fetchSuggestions = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const url = city
        ? `/api/geocoding/autocomplete?query=${encodeURIComponent(query)}&city=${encodeURIComponent(city)}`
        : `/api/geocoding/autocomplete?query=${encodeURIComponent(query)}`;

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.suggestions) {
          setSuggestions(data.suggestions);
          setShowSuggestions(true);
        }
      }
    } catch (error) {
      console.error('Error fetching address suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Debounced input handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue, false);

    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer
    debounceTimer.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 300); // 300ms debounce
  };

  // Handle suggestion selection
  const selectSuggestion = (suggestion: AddressSuggestion) => {
    onChange(
      suggestion.formattedAddress,
      true,
      { lat: suggestion.latitude, lng: suggestion.longitude }
    );
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          selectSuggestion(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        suggestionsRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative">
      {/* Input Field */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          placeholder={placeholder}
          required={required}
          className={`w-full border-2 ${
            value && !loading
              ? 'border-gray-300 dark:border-gray-600'
              : 'border-gray-200 dark:border-gray-600'
          } rounded-xl px-4 py-3 pr-10 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white ${className}`}
        />

        {/* Loading Spinner */}
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
          </div>
        )}

        {/* Search Icon */}
        {!loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-xl shadow-2xl max-h-64 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => selectSuggestion(suggestion)}
              className={`w-full text-left px-4 py-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors duration-150 border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                index === selectedIndex
                  ? 'bg-indigo-50 dark:bg-indigo-900/30'
                  : ''
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5">
                  <svg fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-white truncate">
                    {suggestion.formattedAddress}
                  </div>
                  {(suggestion.city || suggestion.postalCode) && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {suggestion.city}
                      {suggestion.postalCode && ` • ${suggestion.postalCode}`}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No Results Message */}
      {showSuggestions && !loading && suggestions.length === 0 && value.length >= 3 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-xl shadow-2xl p-4"
        >
          <div className="flex items-center space-x-3 text-gray-500 dark:text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-sm">No addresses found. Try a different search.</span>
          </div>
        </div>
      )}

      {/* Helper Text */}
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
        Start typing your street address (e.g., &quot;11 Tarentaal&quot;)
      </p>
    </div>
  );
}
