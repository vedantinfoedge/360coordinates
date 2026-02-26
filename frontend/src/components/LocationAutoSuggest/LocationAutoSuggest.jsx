import React, { useState, useEffect, useRef, useCallback } from 'react';
import './LocationAutoSuggest.css';

// Reuse existing Mapbox token env variable used by map components
const MAPBOX_TOKEN =
  process.env.REACT_APP_MAPBOX_ACCESS_TOKEN ||
  'pk.eyJ1Ijoic3VkaGFrYXJwb3VsIiwiYSI6ImNtaXp0ZmFrNTAxaTQzZHNiODNrYndsdTAifQ.YTMezksySLU7ZpcYkvXyqg';

// Log token status for debugging (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log('🗺️ Mapbox Token Status:', {
    hasEnvToken: !!process.env.REACT_APP_MAPBOX_ACCESS_TOKEN,
    tokenLength: MAPBOX_TOKEN ? MAPBOX_TOKEN.length : 0,
    tokenPrefix: MAPBOX_TOKEN ? MAPBOX_TOKEN.substring(0, 20) + '...' : 'missing'
  });
}

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

// Static fallback locations for India if Mapbox is unavailable
const STATIC_INDIA_LOCATIONS = [
  {
    id: 'state-maharashtra',
    placeName: 'Maharashtra',
    fullAddress: 'Maharashtra, India',
    city: 'Maharashtra',
    state: 'Maharashtra',
    coordinates: { lat: 19.7515, lng: 75.7139 },
  },
  // Maharashtra - major cities
  {
    id: 'city-mumbai',
    placeName: 'Mumbai',
    fullAddress: 'Mumbai, Maharashtra, India',
    city: 'Mumbai',
    state: 'Maharashtra',
    coordinates: { lat: 19.076, lng: 72.8777 },
  },
  {
    id: 'city-pune',
    placeName: 'Pune',
    fullAddress: 'Pune, Maharashtra, India',
    city: 'Pune',
    state: 'Maharashtra',
    coordinates: { lat: 18.5204, lng: 73.8567 },
  },
  {
    id: 'city-nagpur',
    placeName: 'Nagpur',
    fullAddress: 'Nagpur, Maharashtra, India',
    city: 'Nagpur',
    state: 'Maharashtra',
    coordinates: { lat: 21.1458, lng: 79.0882 },
  },
  {
    id: 'city-thane',
    placeName: 'Thane',
    fullAddress: 'Thane, Maharashtra, India',
    city: 'Thane',
    state: 'Maharashtra',
    coordinates: { lat: 19.2183, lng: 72.9781 },
  },
  {
    id: 'city-navi-mumbai',
    placeName: 'Navi Mumbai',
    fullAddress: 'Navi Mumbai, Maharashtra, India',
    city: 'Navi Mumbai',
    state: 'Maharashtra',
    coordinates: { lat: 19.033, lng: 73.0297 },
  },
  {
    id: 'city-kalyan',
    placeName: 'Kalyan',
    fullAddress: 'Kalyan, Maharashtra, India',
    city: 'Kalyan',
    state: 'Maharashtra',
    coordinates: { lat: 19.2437, lng: 73.1355 },
  },
  {
    id: 'city-nashik',
    placeName: 'Nashik',
    fullAddress: 'Nashik, Maharashtra, India',
    city: 'Nashik',
    state: 'Maharashtra',
    coordinates: { lat: 20.011, lng: 73.7903 },
  },
  {
    id: 'city-aurangabad',
    placeName: 'Aurangabad',
    fullAddress: 'Aurangabad, Maharashtra, India',
    city: 'Aurangabad',
    state: 'Maharashtra',
    coordinates: { lat: 19.8762, lng: 75.3433 },
  },
  {
    id: 'city-kolhapur',
    placeName: 'Kolhapur',
    fullAddress: 'Kolhapur, Maharashtra, India',
    city: 'Kolhapur',
    state: 'Maharashtra',
    coordinates: { lat: 16.7049, lng: 74.2433 },
  },
  // Maharashtra - popular hill stations / coastal towns
  {
    id: 'town-mahabaleshwar',
    placeName: 'Mahabaleshwar',
    fullAddress: 'Mahabaleshwar, Maharashtra, India',
    city: 'Mahabaleshwar',
    state: 'Maharashtra',
    coordinates: { lat: 17.925, lng: 73.6575 },
  },
  {
    id: 'town-lonavala',
    placeName: 'Lonavala',
    fullAddress: 'Lonavala, Maharashtra, India',
    city: 'Lonavala',
    state: 'Maharashtra',
    coordinates: { lat: 18.752, lng: 73.405 },
  },
  {
    id: 'town-khandala',
    placeName: 'Khandala',
    fullAddress: 'Khandala, Maharashtra, India',
    city: 'Khandala',
    state: 'Maharashtra',
    coordinates: { lat: 18.758, lng: 73.373 },
  },
  {
    id: 'town-ratnagiri',
    placeName: 'Ratnagiri',
    fullAddress: 'Ratnagiri, Maharashtra, India',
    city: 'Ratnagiri',
    state: 'Maharashtra',
    coordinates: { lat: 16.9902, lng: 73.312 },
  },
  {
    id: 'town-alibag',
    placeName: 'Alibag',
    fullAddress: 'Alibag, Maharashtra, India',
    city: 'Alibag',
    state: 'Maharashtra',
    coordinates: { lat: 18.6411, lng: 72.8722 },
  },
  {
    id: 'town-shirdi',
    placeName: 'Shirdi',
    fullAddress: 'Shirdi, Maharashtra, India',
    city: 'Shirdi',
    state: 'Maharashtra',
    coordinates: { lat: 19.7668, lng: 74.4774 },
  },
  {
    id: 'town-panvel',
    placeName: 'Panvel',
    fullAddress: 'Panvel, Maharashtra, India',
    city: 'Panvel',
    state: 'Maharashtra',
    coordinates: { lat: 18.9886, lng: 73.1175 },
  },
  {
    id: 'town-karjat',
    placeName: 'Karjat',
    fullAddress: 'Karjat, Maharashtra, India',
    city: 'Karjat',
    state: 'Maharashtra',
    coordinates: { lat: 18.9107, lng: 73.3236 },
  },
  // Major cities outside Maharashtra
  {
    id: 'city-delhi',
    placeName: 'Delhi',
    fullAddress: 'Delhi, India',
    city: 'Delhi',
    state: 'Delhi',
    coordinates: { lat: 28.7041, lng: 77.1025 },
  },
  {
    id: 'city-bengaluru',
    placeName: 'Bengaluru',
    fullAddress: 'Bengaluru, Karnataka, India',
    city: 'Bengaluru',
    state: 'Karnataka',
    coordinates: { lat: 12.9716, lng: 77.5946 },
  },
  {
    id: 'city-hyderabad',
    placeName: 'Hyderabad',
    fullAddress: 'Hyderabad, Telangana, India',
    city: 'Hyderabad',
    state: 'Telangana',
    coordinates: { lat: 17.385, lng: 78.4867 },
  },
  {
    id: 'city-ahmedabad',
    placeName: 'Ahmedabad',
    fullAddress: 'Ahmedabad, Gujarat, India',
    city: 'Ahmedabad',
    state: 'Gujarat',
    coordinates: { lat: 23.0225, lng: 72.5714 },
  },
  {
    id: 'city-chennai',
    placeName: 'Chennai',
    fullAddress: 'Chennai, Tamil Nadu, India',
    city: 'Chennai',
    state: 'Tamil Nadu',
    coordinates: { lat: 13.0827, lng: 80.2707 },
  },
  {
    id: 'city-kolkata',
    placeName: 'Kolkata',
    fullAddress: 'Kolkata, West Bengal, India',
    city: 'Kolkata',
    state: 'West Bengal',
    coordinates: { lat: 22.5726, lng: 88.3639 },
  },
  {
    id: 'city-jaipur',
    placeName: 'Jaipur',
    fullAddress: 'Jaipur, Rajasthan, India',
    city: 'Jaipur',
    state: 'Rajasthan',
    coordinates: { lat: 26.9124, lng: 75.7873 },
  },
  {
    id: 'city-surat',
    placeName: 'Surat',
    fullAddress: 'Surat, Gujarat, India',
    city: 'Surat',
    state: 'Gujarat',
    coordinates: { lat: 21.1702, lng: 72.8311 },
  },
];

// Parse Mapbox feature into our standard location object
function parseFeature(feature) {
  if (!feature) return null;

  const [lng, lat] = feature.center || [];
  const placeName = feature.text || '';
  const fullAddress = feature.place_name || placeName;

  let city = '';
  let state = '';

  const context = feature.context || [];
  context.forEach((item) => {
    if (!item || !item.id) return;
    if (!city && (item.id.startsWith('place') || item.id.startsWith('locality') || item.id.startsWith('district'))) {
      city = item.text || city;
    }
    if (!state && item.id.startsWith('region')) {
      state = item.text || state;
    }
  });

  // Fallback: sometimes city is part of the place name
  if (!city && fullAddress) {
    const parts = fullAddress.split(',').map((p) => p.trim());
    if (parts.length >= 2) {
      city = parts[1];
    }
  }

  return {
    id: feature.id,
    placeName,
    fullAddress,
    city,
    state,
    coordinates: {
      lat: typeof lat === 'number' ? lat : null,
      lng: typeof lng === 'number' ? lng : null,
    },
  };
}

function getStaticFallbackSuggestions(query) {
  if (!query) return [];
  const q = query.toLowerCase();

  return STATIC_INDIA_LOCATIONS.filter((loc) => {
    const fields = [
      loc.placeName,
      loc.fullAddress,
      loc.city,
      loc.state,
    ].filter(Boolean);

    return fields.some((field) => field.toLowerCase().includes(q));
  });
}

const LocationAutoSuggest = ({
  placeholder = 'Enter location...',
  value = '',
  onChange,
  onSearch,
  onInputChange,
  className = '',
  error,
  disabled = false,
  // Optional controlled dropdown (e.g. for CompactSearchBar: lock when arriving with pre-filled location)
  dropdownOpen,
  onDropdownOpenChange,
  onInputFocus: onInputFocusProp,
}) => {
  const [inputValue, setInputValue] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const isControlled = dropdownOpen !== undefined;
  const effectiveOpen = isControlled ? dropdownOpen : isOpen;
  const setOpen = useCallback((open) => {
    if (isControlled) {
      onDropdownOpenChange?.(open);
    } else {
      setIsOpen(open);
    }
  }, [isControlled, onDropdownOpenChange]);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [errorState, setErrorState] = useState(null);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const abortControllerRef = useRef(null);
  const justSelectedRef = useRef(false); // Track if location was just selected
  const lastSelectionValueRef = useRef(null); // Value we sent to parent on selection; used to detect echo-back

  // Keep internal input in sync when parent value changes
  useEffect(() => {
    const newVal = value || '';
    setInputValue(newVal);
    // Only suppress dropdown when parent is echoing back the value we sent on selection (not when user is typing)
    if (lastSelectionValueRef.current !== null && newVal === lastSelectionValueRef.current) {
      lastSelectionValueRef.current = null; // Consume so we don't treat future syncs as selection
      justSelectedRef.current = true;
      setSuggestions([]);
      setOpen(false);
      const t = setTimeout(() => {
        justSelectedRef.current = false;
      }, 400); // Longer than DEBOUNCE_MS so debounce never fires for this update
      return () => clearTimeout(t);
    }
  }, [value, setOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setOpen]);

  const fetchSuggestions = useCallback(
    async (query) => {
      if (!MAPBOX_TOKEN || !query || query.trim().length < MIN_QUERY_LENGTH) {
        setSuggestions([]);
        setOpen(false);
        setErrorState(null);
        return;
      }

      // Cancel previous request if any
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      try {
        // Validate token before making request
        if (!MAPBOX_TOKEN || MAPBOX_TOKEN.trim() === '') {
          throw new Error('Mapbox token is not configured');
        }

        // Search all of India - removed types restriction to get all location types including smaller cities
        // Increased limit to 30 and enabled autocomplete for better matching
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query
        )}.json?access_token=${MAPBOX_TOKEN}&country=in&limit=30&autocomplete=true`;

        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 Fetching Mapbox suggestions for:', query);
        }

        const response = await fetch(url, { signal: controller.signal });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Mapbox API error:', {
            status: response.status,
            statusText: response.statusText,
            error: errorText.substring(0, 200)
          });
          
          // Check if it's a token-related error
          if (response.status === 401 || response.status === 403) {
            throw new Error('Invalid Mapbox token. Please check your configuration.');
          }
          throw new Error(`Failed to fetch locations: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Accept all Indian locations returned by Mapbox (already filtered by country=in)
        const indiaFeatures = (data.features || []).filter((feature) => {
          return feature != null;
        });

        let items = indiaFeatures.map(parseFeature).filter(Boolean);
        
        // Sort by relevance (Mapbox relevance score) - higher is better
        // This helps smaller cities that match the query appear
        items.sort((a, b) => {
          // If we have relevance scores, use them (Mapbox doesn't always provide this in the parsed data)
          // Otherwise keep original order which is already sorted by relevance
          return 0;
        });

        // Fallback to static list if Mapbox returns no results
        if (!items.length) {
          items = getStaticFallbackSuggestions(query);
        }

        setSuggestions(items);
        // Only auto-open if we didn't just select a location
        if (!justSelectedRef.current) {
          setOpen(items.length > 0);
          setHighlightedIndex(items.length > 0 ? 0 : -1);
        }
        setErrorState(null);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('❌ Location suggestions error:', err);
          console.error('Error details:', {
            message: err.message,
            name: err.name,
            hasToken: !!MAPBOX_TOKEN,
            tokenLength: MAPBOX_TOKEN ? MAPBOX_TOKEN.length : 0
          });
          
          // On error, try static fallback suggestions
          const fallback = getStaticFallbackSuggestions(query);
          setSuggestions(fallback);
          // Only auto-open if we didn't just select a location
          if (!justSelectedRef.current) {
            setOpen(fallback.length > 0);
            setHighlightedIndex(fallback.length > 0 ? 0 : -1);
          }
          
          // Provide more specific error messages
          if (!fallback.length) {
            if (err.message && err.message.includes('token')) {
              setErrorState('Mapbox token error. Please check your configuration.');
            } else if (err.message && err.message.includes('network') || err.message.includes('fetch')) {
              setErrorState('Unable to load suggestions. Please check your internet connection.');
            } else {
              setErrorState(`Unable to load suggestions: ${err.message}`);
            }
          } else {
            setErrorState(null);
            if (process.env.NODE_ENV === 'development') {
              console.log('✅ Using fallback suggestions:', fallback.length);
            }
          }
        }
      } finally {
        setIsLoading(false);
      }
    },
    [setOpen]
  );

  // Debounce input changes
  useEffect(() => {
    // If we just selected a location, reset the flag after a delay and don't fetch suggestions
    if (justSelectedRef.current) {
      // Reset flag after a short delay to prevent any race conditions
      const resetTimer = setTimeout(() => {
        justSelectedRef.current = false;
      }, 100);
      return () => clearTimeout(resetTimer);
    }

    if (!inputValue || inputValue.trim().length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setOpen(false);
      setErrorState(null);
      return;
    }

    const timer = setTimeout(() => {
      // Double-check flag before fetching to prevent race conditions
      if (!justSelectedRef.current) {
        fetchSuggestions(inputValue.trim());
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [inputValue, fetchSuggestions]);

  const handleInputChange = (e) => {
    if (disabled) return; // Prevent changes when disabled
    const newValue = e.target.value;
    
    // Reset selection flag when user actively types; clear so value sync won't treat parent echo as selection
    justSelectedRef.current = false;
    lastSelectionValueRef.current = null;
    
    setInputValue(newValue);
    setSelectedLocation(null);
    
    // Notify parent of current input so Search can use typed location (manual search)
    if (onInputChange) {
      onInputChange(newValue || '');
    }
    
    // Only open dropdown if user is typing (not after selection)
    if (newValue && newValue.trim().length >= MIN_QUERY_LENGTH) {
      setOpen(true);
    } else {
      setOpen(false);
    }

    // If user clears input, notify parent
    if (!newValue && onChange) {
      onChange(null);
    }
  };

  const handleInputFocus = () => {
    onInputFocusProp?.();
    // Don't open dropdown if we just selected a location
    if (justSelectedRef.current) {
      return;
    }
    
    // Only open dropdown if there's a valid query and suggestions exist
    if (inputValue && inputValue.trim().length >= MIN_QUERY_LENGTH && suggestions.length > 0) {
      setOpen(true);
    }
  };

  const handleSelect = (item) => {
    if (disabled || !item) return; // Prevent selection when disabled

    // Cancel any pending fetch requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const selectedText = item.fullAddress || item.placeName || '';
    // So value-sync effect can treat parent's echo of this value as "just selected"
    lastSelectionValueRef.current = selectedText;
    justSelectedRef.current = true;

    setSelectedLocation(item);
    setInputValue(selectedText);
    setOpen(false); // Close dropdown immediately
    setSuggestions([]); // Clear suggestions immediately
    setHighlightedIndex(-1);
    setErrorState(null); // Clear any error state

    // Blur the input to prevent immediate refocus and dropdown reopening
    // Use setTimeout to ensure this happens after the click event completes
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.blur();
      }
    }, 0);

    if (onChange) {
      onChange(item);
    }

    if (onSearch) {
      onSearch(item);
    }
  };

  const handleKeyDown = (e) => {
    if (disabled) return; // Prevent keyboard navigation when disabled
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!suggestions.length) return;
      setOpen(true);
      setHighlightedIndex((prev) => {
        const next = prev + 1;
        return next >= suggestions.length ? 0 : next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!suggestions.length) return;
      setOpen(true);
      setHighlightedIndex((prev) => {
        const next = prev - 1;
        return next < 0 ? suggestions.length - 1 : next;
      });
    } else if (e.key === 'Enter') {
      // Always prevent default to avoid form submission and scroll jumps
      e.preventDefault();
      e.stopPropagation();
      
      // Store state before closing dropdown
      const wasOpen = effectiveOpen;
      const hasSuggestions = suggestions.length > 0;
      
      // Always close dropdown when Enter is pressed
      setOpen(false);
      setHighlightedIndex(-1);
      
      if (wasOpen && hasSuggestions) {
        const index = highlightedIndex >= 0 ? highlightedIndex : 0;
        handleSelect(suggestions[index]);
      } else if (onSearch && selectedLocation) {
        onSearch(selectedLocation);
      } else if (onSearch && inputValue.trim()) {
        // If there's input but no selection, trigger search with current input
        // This allows searching with typed text even if no suggestion was selected
        const locationData = {
          placeName: inputValue.trim(),
          fullAddress: inputValue.trim(),
          city: inputValue.trim().split(',')[0].trim(),
          coordinates: null
        };
        setSelectedLocation(locationData);
        if (onChange) {
          onChange(locationData);
        }
        onSearch(locationData);
      }
      // If no suggestions and no selected location, don't submit form
      // User should select from dropdown or type more
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const handleClear = () => {
    if (disabled) return; // Prevent clearing when disabled
    justSelectedRef.current = false; // Reset selection flag
    lastSelectionValueRef.current = null;
    setInputValue('');
    setSuggestions([]);
    setOpen(false);
    setHighlightedIndex(-1);
    setSelectedLocation(null);
    setErrorState(null);
    if (onChange) {
      onChange(null);
    }
  };

  return (
    <div className={`location-autosuggest ${className}`} ref={containerRef}>
      <div className={`location-input-wrapper ${error ? 'location-input-error' : ''}`}>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          placeholder={placeholder}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          className="location-input"
          autoComplete="off"
          disabled={disabled}
          readOnly={disabled}
        />
        {isLoading && (
          <span className="location-spinner" aria-label="Loading" />
        )}
        {!isLoading && inputValue && !disabled && (
          <button
            type="button"
            className="location-clear-btn"
            onClick={handleClear}
            aria-label="Clear location"
          >
            ×
          </button>
        )}
      </div>
      {error && <div className="location-error-text">{error}</div>}
      {errorState && !error && (
        <div className="location-error-text">{errorState}</div>
      )}

      {effectiveOpen && suggestions.length > 0 && !disabled && (
        <ul className="location-dropdown" role="listbox">
          {suggestions.map((item, index) => (
            <li
              key={item.id || `${item.placeName}-${index}`}
              className={`location-option ${index === highlightedIndex ? 'active' : ''}`}
              onMouseDown={(e) => {
                // prevent input blur before click handler
                e.preventDefault();
                handleSelect(item);
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
              role="option"
              aria-selected={index === highlightedIndex}
            >
              <div className="location-option-primary">{item.placeName}</div>
              <div className="location-option-secondary">{item.fullAddress}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LocationAutoSuggest;