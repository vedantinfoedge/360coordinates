import React, { useState, useEffect, useRef, useCallback } from 'react';
import './StateAutoSuggest.css';

// Reuse existing Mapbox token env variable
const MAPBOX_TOKEN =
  process.env.REACT_APP_MAPBOX_ACCESS_TOKEN ||
  'pk.eyJ1Ijoic3VkaGFrYXJwb3VsIiwiYSI6ImNtaXp0ZmFrNTAxaTQzZHNiODNrYndsdTAifQ.YTMezksySLU7ZpcYkvXyqg';

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

// Indian states list as fallback
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

const StateAutoSuggest = ({
  placeholder = 'Enter state...',
  value = '',
  onChange,
  className = '',
  error,
  disabled = false,
  readOnly = false,
}) => {
  const [inputValue, setInputValue] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [selectedState, setSelectedState] = useState(null);
  const [errorState, setErrorState] = useState(null);

  const containerRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Keep internal input in sync when parent value changes
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Parse Mapbox feature to extract state name
  const parseStateFeature = (feature) => {
    if (!feature || !feature.properties) return null;

    const props = feature.properties;
    const context = feature.context || [];
    const placeType = feature.place_type || [];
    
    // Look for state/region in context or properties
    let stateName = null;
    
    // Check if this is a region type feature
    if (placeType.includes('region')) {
      stateName = props.name || props.text || props.short_code;
    } else {
      // Check context for region (state) - usually in context array
      const regionContext = context.find(ctx => {
        const ctxId = ctx.id || '';
        return ctxId.includes('region') || ctxId.includes('state');
      });
      
      if (regionContext) {
        stateName = regionContext.text || regionContext.name;
      } else if (props.region) {
        stateName = props.region;
      } else if (props.address && props.address.state) {
        stateName = props.address.state;
      }
    }

    if (!stateName) return null;

    // Normalize state name - remove common suffixes
    stateName = stateName.trim();
    
    // Find matching Indian state (case-insensitive, partial match)
    const matchedState = INDIAN_STATES.find(state => {
      const stateLower = state.toLowerCase();
      const nameLower = stateName.toLowerCase();
      return stateLower === nameLower || 
             stateLower.includes(nameLower) || 
             nameLower.includes(stateLower) ||
             stateLower.replace(/\s+/g, '') === nameLower.replace(/\s+/g, '');
    });

    if (matchedState) {
      return {
        id: feature.id,
        stateName: matchedState, // Use the standardized state name
        fullName: `${matchedState}, India`,
        coordinates: feature.center ? { lng: feature.center[0], lat: feature.center[1] } : null
      };
    }

    return null;
  };

  // Fetch state suggestions from Mapbox
  const fetchSuggestions = useCallback(
    async (query) => {
      if (!MAPBOX_TOKEN || !query || query.trim().length < MIN_QUERY_LENGTH) {
        setSuggestions([]);
        setIsOpen(false);
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
        // Search for regions (states) in India
        // Using types=region to get administrative regions (states)
        // Also try without type restriction to catch states mentioned in place names
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query
        )}.json?access_token=${MAPBOX_TOKEN}&country=in&types=region&limit=30&autocomplete=true`;

        const response = await fetch(url, { signal: controller.signal });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch states: ${response.status}`);
        }

        const data = await response.json();
        const features = data.features || [];
        
        // Parse and filter states
        let stateItems = features
          .map(parseStateFeature)
          .filter(Boolean)
          .filter((item, index, self) => 
            // Remove duplicates
            index === self.findIndex(t => t.stateName.toLowerCase() === item.stateName.toLowerCase())
          );

        // If no results from Mapbox, try fallback matching with Indian states
        if (stateItems.length === 0) {
          const queryLower = query.toLowerCase();
          stateItems = INDIAN_STATES
            .filter(state => state.toLowerCase().includes(queryLower))
            .map(state => ({
              id: `state-${state.toLowerCase().replace(/\s+/g, '-')}`,
              stateName: state,
              fullName: `${state}, India`,
              coordinates: null
            }))
            .slice(0, 10);
        }

        if (controller.signal.aborted) return;

        setSuggestions(stateItems);
        setIsOpen(stateItems.length > 0);
        setErrorState(null);
      } catch (err) {
        if (err.name === 'AbortError') return;
        
        console.error('Error fetching state suggestions:', err);
        setErrorState(null);
        
        // Fallback to static list
        const queryLower = query.toLowerCase();
        const fallback = INDIAN_STATES
          .filter(state => state.toLowerCase().includes(queryLower))
          .map(state => ({
            id: `state-${state.toLowerCase().replace(/\s+/g, '-')}`,
            stateName: state,
            fullName: `${state}, India`,
            coordinates: null
          }))
          .slice(0, 10);
        
        setSuggestions(fallback);
        setIsOpen(fallback.length > 0);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Debounce input changes
  useEffect(() => {
    if (!inputValue || inputValue.trim().length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setIsOpen(false);
      setErrorState(null);
      return;
    }

    const timer = setTimeout(() => {
      fetchSuggestions(inputValue.trim());
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [inputValue, fetchSuggestions]);

  const handleInputChange = (e) => {
    if (disabled || readOnly) return;
    const newValue = e.target.value;
    setInputValue(newValue);
    setSelectedState(null);
    setIsOpen(true);

    // If user clears input, notify parent
    if (!newValue && onChange) {
      onChange('');
    }
  };

  const handleSelect = (item) => {
    if (disabled || readOnly || !item) return;

    setSelectedState(item);
    setInputValue(item.stateName);
    setIsOpen(false);
    setSuggestions([]);
    setHighlightedIndex(-1);

    if (onChange) {
      onChange(item.stateName);
    }
  };

  const handleKeyDown = (e) => {
    if (disabled || readOnly) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!suggestions.length) return;
      setIsOpen(true);
      setHighlightedIndex((prev) => {
        const next = prev + 1;
        return next >= suggestions.length ? 0 : next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!suggestions.length) return;
      setIsOpen(true);
      setHighlightedIndex((prev) => {
        const next = prev - 1;
        return next < 0 ? suggestions.length - 1 : next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      
      if (isOpen && suggestions.length > 0) {
        const index = highlightedIndex >= 0 ? highlightedIndex : 0;
        handleSelect(suggestions[index]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const handleClear = () => {
    if (disabled || readOnly) return;
    setInputValue('');
    setSuggestions([]);
    setIsOpen(false);
    setHighlightedIndex(-1);
    setSelectedState(null);
    setErrorState(null);
    if (onChange) {
      onChange('');
    }
  };

  return (
    <div className={`state-autosuggest ${className}`} ref={containerRef}>
      <div className={`state-input-wrapper ${error ? 'state-input-error' : ''}`}>
        <input
          type="text"
          value={inputValue}
          placeholder={placeholder}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className="state-input"
          autoComplete="off"
          disabled={disabled}
          readOnly={readOnly || disabled}
        />
        {isLoading && (
          <span className="state-spinner" aria-label="Loading" />
        )}
        {!isLoading && inputValue && !disabled && !readOnly && (
          <button
            type="button"
            className="state-clear-btn"
            onClick={handleClear}
            aria-label="Clear state"
          >
            ×
          </button>
        )}
      </div>
      {error && <div className="state-error-text">{error}</div>}
      {errorState && !error && (
        <div className="state-error-text">{errorState}</div>
      )}

      {isOpen && suggestions.length > 0 && !disabled && !readOnly && (
        <ul className="state-dropdown" role="listbox">
          {suggestions.map((item, index) => (
            <li
              key={item.id || `${item.stateName}-${index}`}
              className={`state-option ${index === highlightedIndex ? 'active' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(item);
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
              role="option"
              aria-selected={index === highlightedIndex}
            >
              <div className="state-option-primary">{item.stateName}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default StateAutoSuggest;

