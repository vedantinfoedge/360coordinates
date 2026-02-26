import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Filter, X } from 'lucide-react';
import LocationAutoSuggest from '../../components/LocationAutoSuggest/LocationAutoSuggest';
import '../styles/CompactSearchBar.css';
//Edite by tejas to check git conflict issue wwe are facing
const CompactSearchBar = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const [searchData, setSearchData] = useState({
    location: searchParams.get('location') || '',
    propertyType: searchParams.get('type') || searchParams.get('property_type') || '',
    budget: searchParams.get('budget') || '',
    bedrooms: searchParams.get('bedrooms') || '',
    area: searchParams.get('area') || '',
    uploadTime: searchParams.get('upload_time') || '',
    listingType: (() => {
      const statusParam = searchParams.get('status');
      if (statusParam === 'For Sale') return 'Buy';
      if (statusParam === 'For Rent') return 'Rent';
      return 'All';
    })(),
    // Upcoming-projects mode only
    expectedPossession: searchParams.get('expected_possession') || '',
    projectStatus: searchParams.get('project_status') || ''
  });

  const [selectedLocation, setSelectedLocation] = useState(null);

  // Controlled location dropdown: prevent auto-open when arriving with pre-filled location from Buyer Home
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const [isLocationLocked, setIsLocationLocked] = useState(
    () => !!(searchParams.get('location') || searchParams.get('city'))
  );
  
  // Mobile detection and filters modal state
  const [isMobile, setIsMobile] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  // Mobile detection - check window width (≤767px for mobile)
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 767);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle escape key to close filters modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && showFiltersModal) {
        setShowFiltersModal(false);
      }
    };
    
    if (showFiltersModal) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [showFiltersModal]);

  // Initialize selectedLocation from URL params if city or location exists
  useEffect(() => {
    const cityParam = searchParams.get('city');
    const locationParam = searchParams.get('location');
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');
    
    if (cityParam || locationParam) {
      // Extract city from location string if city param is not available
      let extractedCity = cityParam || '';
      if (!extractedCity && locationParam) {
        const locationStr = locationParam.trim();
        const parts = locationStr.split(',').map(p => p.trim()).filter(p => p.length > 0);
        
        // For formats like "Locality, City, State, Country" - city is usually the second part
        // For formats like "City, State, Country" - city is the first part
        if (parts.length >= 3) {
          // "Locality, City, State, Country" - take second part (city)
          extractedCity = parts[1];
        } else if (parts.length === 2) {
          // "City, State" - take first part (city)
          extractedCity = parts[0];
        } else if (parts.length === 1) {
          // Just "City" - use the only part
          extractedCity = parts[0];
        }
      }
      
      setSelectedLocation({
        city: extractedCity,
        placeName: locationParam || '',
        fullAddress: locationParam || '',
        coordinates: (latParam && lngParam) ? {
          lat: parseFloat(latParam),
          lng: parseFloat(lngParam)
        } : null
      });
      // Lock dropdown so it does not open when arriving from Buyer Home with selected location
      setIsLocationLocked(true);
      setIsLocationDropdownOpen(false);
    }
  }, []); // Only run once on mount

  // Determine search type based on current route
  const getSearchType = () => {
    const path = location.pathname.toLowerCase();
    // Check if we're on search results page FIRST (before checking for /buy or /rent)
    // This ensures listing type remains visible on search results page
    if (path.includes('/buyer-dashboard/search') || path.includes('/searchresults')) {
      // Don't change searchType based on status param if we're already on search results
      // This allows listing type to remain visible
      return 'home';
    }
    // Only check for /buy or /rent if NOT on search results page
    if (path.includes('/buy')) return 'buy';
    if (path.includes('/rent')) return 'rent';
    if (path.includes('/pghostel')) return 'pg';
    return 'home'; // Default to home
  };

  const searchType = useMemo(() => getSearchType(), [location.pathname, searchParams]);

  // Search mode: "properties" (Explore) vs "upcoming-projects" (View All from Upcoming Projects)
  const searchMode = useMemo(() => {
    const mode = searchParams.get('searchMode');
    const projectType = searchParams.get('project_type');
    if (mode === 'upcoming-projects' || projectType === 'upcoming') return 'upcoming-projects';
    return 'properties';
  }, [searchParams]);

  // Sync all filters from URL (single source of truth). When Active Filters remove one,
  // URL updates and this effect keeps compact-search-filters in sync.
  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam === 'For Sale') {
      setSearchData(prev => ({ ...prev, listingType: 'Buy' }));
    } else if (statusParam === 'For Rent') {
      setSearchData(prev => ({ ...prev, listingType: 'Rent' }));
    } else if (!statusParam) {
      setSearchData(prev => ({ ...prev, listingType: 'All' }));
    }
    
    // Sync uploadTime from URL params
    const uploadTimeParam = searchParams.get('upload_time') || '';
    setSearchData(prev => {
      if (prev.uploadTime !== uploadTimeParam) {
        return { ...prev, uploadTime: uploadTimeParam };
      }
      return prev;
    });

    // Sync type, budget, bedrooms, area from URL so removing them in Active Filters
    // immediately clears them in compact-search-filters
    const typeVal = searchParams.get('type') || searchParams.get('property_type') || '';
    const budgetVal = searchParams.get('budget') || '';
    const bedroomsVal = searchParams.get('bedrooms') || '';
    const areaVal = searchParams.get('area') || '';
    const expectedPossessionVal = searchParams.get('expected_possession') || '';
    const projectStatusVal = searchParams.get('project_status') || '';
    setSearchData(prev => {
      if (prev.propertyType === typeVal && prev.budget === budgetVal &&
          prev.bedrooms === bedroomsVal && prev.area === areaVal &&
          prev.expectedPossession === expectedPossessionVal && prev.projectStatus === projectStatusVal) return prev;
      return { ...prev, propertyType: typeVal, budget: budgetVal, bedrooms: bedroomsVal, area: areaVal, expectedPossession: expectedPossessionVal, projectStatus: projectStatusVal };
    });

    // Sync location from URL params (and clear when removed from Active Filters)
    const cityParam = searchParams.get('city');
    const locationParam = searchParams.get('location');
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');
    
    if (cityParam || locationParam) {
      // Extract city from location string if city param is not available
      let extractedCity = cityParam || '';
      if (!extractedCity && locationParam) {
        const locationStr = locationParam.trim();
        const parts = locationStr.split(',').map(p => p.trim()).filter(p => p.length > 0);
        
        // For formats like "Locality, City, State, Country" - city is usually the second part
        // For formats like "City, State, Country" - city is the first part
        if (parts.length >= 3) {
          // "Locality, City, State, Country" - take second part (city)
          extractedCity = parts[1];
        } else if (parts.length === 2) {
          // "City, State" - take first part (city)
          extractedCity = parts[0];
        } else if (parts.length === 1) {
          // Just "City" - use the only part
          extractedCity = parts[0];
        }
      }
      
      const newLocation = {
        city: extractedCity,
        placeName: locationParam || '',
        fullAddress: locationParam || '',
        coordinates: (latParam && lngParam) ? {
          lat: parseFloat(latParam),
          lng: parseFloat(lngParam)
        } : null
      };
      
      setSelectedLocation(prev => {
        if (!prev || prev.city !== newLocation.city || prev.placeName !== newLocation.placeName) {
          return newLocation;
        }
        return prev;
      });
      
      // Always sync searchData.location to URL value (including '' when location was removed)
      setSearchData(prev => {
        const newLoc = locationParam || '';
        if (prev.location !== newLoc) return { ...prev, location: newLoc };
        return prev;
      });
      // Lock dropdown when location comes from URL (e.g. from Active Filters or navigation)
      setIsLocationLocked(true);
      setIsLocationDropdownOpen(false);
    } else {
      // URL has no city or location — clear so compact-search-filters stays in sync with Active Filters
      setSelectedLocation(null);
      setSearchData(prev => (prev.location ? { ...prev, location: '' } : prev));
      setIsLocationLocked(false);
    }
  }, [searchParams]);

  // Budget range definitions
  const rentResidentialBudget = [
    '0K-5K',
    '5K-10K',
    '10K-20K',
    '20K-30K',
    '30K-50K',
    '50K-75K',
    '75K-1L',
    '1L-2L',
    '2L+'
  ];

  const rentResidentialBudgetRentPage = [
    '5K-10K',
    '10K-20K',
    '20K-30K',
    '30K-50K',
    '50K-75K',
    '75K-1L',
    '1L-2L',
    '2L+'
  ];

  const saleResidentialBudget = [
    '0-25L',
    '25L-50L',
    '50L-75L',
    '75L-1Cr',
    '1Cr-2Cr',
    '2Cr-5Cr',
    '5Cr+'
  ];

  const commercialBudget = [
    '0-50L',
    '50L-1Cr',
    '1Cr-2Cr',
    '2Cr-5Cr',
    '5Cr-10Cr',
    '10Cr-25Cr',
    '25Cr+'
  ];

  const commercialRentBudget = [
    '0-10K',
    '10K-25K',
    '25K-50K',
    '50K-1L',
    '1L-2L',
    '2L-5L',
    '5L+'
  ];

  const commercialRentBudgetRentPage = [
    '10K-25K',
    '25K-50K',
    '50K-1L',
    '1L-2L',
    '2L-5L',
    '5L+'
  ];

  // Property type configurations based on search type
  const getPropertyTypes = () => {
    const allPropertyTypes = [
      'Apartment',
      'Studio Apartment',
      'Villa / Row House / Bungalow / Farm House',
      'Penthouse',
      'Plot / Land / Industrial Property',
      'Commercial Office',
      'Commercial Shop',
      'Co-working Space',
      'Warehouse / Godown',
      'PG / Hostel'
    ];

    // PG/Hostel page only allows Apartment and PG / Hostel
    if (searchType === 'pg') {
      return allPropertyTypes; // Show all but only enable specific ones
    }

    return allPropertyTypes;
  };

  const propertyTypes = useMemo(() => getPropertyTypes(), [searchType]);

  const expectedPossessionOptions = [
    { value: '6', label: '6 Months' },
    { value: '12', label: '12 Months' },
    { value: '18', label: '18 Months' },
    { value: '24', label: '24 Months+' }
  ];
  const projectStatusOptions = [
    { value: 'Pre-Launch', label: 'Pre-Launch' },
    { value: 'Under Construction', label: 'Under Construction' },
    { value: 'Completed', label: 'Completed' }
  ];

  // Check if a property type is enabled (for PG/Hostel page)
  const isPropertyTypeEnabled = (type) => {
    if (searchType === 'pg') {
      return ['Apartment', 'PG / Hostel'].includes(type);
    }
    return true;
  };

  const bedroomBasedTypes = [
    'Apartment',
    'Studio Apartment',
    'Villa / Row House / Bungalow / Farm House',
    'Penthouse',
    'PG / Hostel'
  ];

  const areaBasedTypes = [
    'Plot / Land / Industrial Property',
    'Commercial Office',
    'Commercial Shop',
    'Co-working Space',
    'Warehouse / Godown'
  ];

  // Bedroom options - PG/Hostel page includes "1RK"
  const getBedroomOptions = () => {
    if (searchType === 'pg') {
      return ['1RK', '1 BHK', '2 BHK', '3 BHK', '4 BHK', '5+ BHK'];
    }
    return ['1 BHK', '2 BHK', '3 BHK', '4 BHK', '5+ BHK'];
  };

  const bedroomOptions = useMemo(() => getBedroomOptions(), [searchType]);

  const areaRanges = [
    '0-500 sq ft',
    '500-1000 sq ft',
    '1000-2000 sq ft',
    '2000-5000 sq ft',
    '5000-10000 sq ft',
    '10000+ sq ft'
  ];

  const isBedroomBased = useMemo(() => bedroomBasedTypes.includes(searchData.propertyType), [searchData.propertyType]);
  const isAreaBased = useMemo(() => areaBasedTypes.includes(searchData.propertyType), [searchData.propertyType]);

  // Get budget ranges based on search type, listing type, and property type
  const getBudgetRanges = () => {
    // Determine if we should use Buy or Rent budgets based on listingType or searchType
    const useBuyBudgets = searchType === 'buy' || searchData.listingType === 'Buy';
    const useRentBudgets = searchType === 'rent' || searchType === 'pg' || searchData.listingType === 'Rent';
    
    // For Buy page or Buy selected - must match BuyerSearchBar.jsx exactly
    if (useBuyBudgets && searchData.listingType !== 'Rent') {
      if (!searchData.propertyType) {
        return saleResidentialBudget;
      }

      const propertyBudgetMap = {
        'Apartment': saleResidentialBudget,
        'Studio Apartment': saleResidentialBudget,
        'Villa / Row House / Bungalow / Farm House': saleResidentialBudget,
        'Penthouse': saleResidentialBudget,
        'PG / Hostel': rentResidentialBudget, // Matches BuyerSearchBar.jsx line 114
        'Plot / Land / Industrial Property': commercialBudget,
        'Commercial Office': commercialBudget,
        'Commercial Shop': commercialBudget,
        'Co-working Space': commercialRentBudget, // Matches BuyerSearchBar.jsx line 118
        'Warehouse / Godown': commercialRentBudget, // Matches BuyerSearchBar.jsx line 119
      };

      return propertyBudgetMap[searchData.propertyType] || saleResidentialBudget;
    }

    // For Rent page or Rent selected
    if (useRentBudgets && searchData.listingType !== 'Buy') {
      if (!searchData.propertyType) {
        return searchType === 'rent' ? rentResidentialBudgetRentPage : rentResidentialBudget;
      }

      const rentBudget = searchType === 'rent' ? rentResidentialBudgetRentPage : rentResidentialBudget;
      const commercialRentBudgetForPage = searchType === 'rent' ? commercialRentBudgetRentPage : commercialRentBudget;

      const propertyBudgetMap = {
        'Apartment': rentBudget,
        'Studio Apartment': rentBudget,
        'Villa / Row House / Bungalow / Farm House': rentBudget,
        'Penthouse': rentBudget,
        'PG / Hostel': rentBudget,
        'Plot / Land / Industrial Property': commercialRentBudgetForPage,
        'Commercial Office': commercialRentBudgetForPage,
        'Commercial Shop': commercialRentBudgetForPage,
        'Co-working Space': commercialRentBudgetForPage,
        'Warehouse / Godown': commercialRentBudgetForPage,
      };

      return propertyBudgetMap[searchData.propertyType] || rentBudget;
    }

    // For PG/Hostel page
    if (searchType === 'pg') {
      if (!searchData.propertyType) {
        return rentResidentialBudget;
      }

      const propertyBudgetMap = {
        'Apartment': rentResidentialBudget,
        'PG / Hostel': rentResidentialBudget,
      };

      return propertyBudgetMap[searchData.propertyType] || rentResidentialBudget;
    }

    // For Home page (default) - use Buy budgets as default
    if (!searchData.propertyType) {
      return saleResidentialBudget;
    }

    const propertyBudgetMap = {
      'Apartment': saleResidentialBudget,
      'Studio Apartment': saleResidentialBudget,
      'Villa / Row House / Bungalow / Farm House': saleResidentialBudget,
      'Penthouse': saleResidentialBudget,
      'PG / Hostel': rentResidentialBudget,
      'Plot / Land / Industrial Property': commercialBudget,
      'Commercial Office': commercialBudget,
      'Commercial Shop': commercialBudget,
      'Co-working Space': commercialRentBudget,
      'Warehouse / Godown': commercialRentBudget
    };

    return propertyBudgetMap[searchData.propertyType] || saleResidentialBudget;
  };
// hahaha
  const budgetRanges = useMemo(() => getBudgetRanges(), [searchData.propertyType, searchData.listingType, searchType]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Prevent selecting disabled property types (for PG/Hostel page)
    if (name === 'propertyType' && value && !isPropertyTypeEnabled(value)) {
      return; // Don't update state if disabled type is selected
    }

    if (name === 'propertyType') {
      setSearchData(prev => ({
        ...prev,
        propertyType: value,
        bedrooms: '',
        area: '',
        budget: ''
      }));
    } else if (name === 'listingType') {
      // When listing type changes, reset budget since budget ranges differ for Buy vs Rent
      setSearchData(prev => ({
        ...prev,
        listingType: value,
        budget: ''
      }));
    } else if (name === 'location') {
      setSearchData(prev => ({
        ...prev,
        location: value
      }));
    } else if (name === 'uploadTime') {
      // For uploadTime, update state and trigger search if on search results page
      setSearchData(prev => ({
        ...prev,
        uploadTime: value
      }));
      // Trigger search immediately when filter changes (only on search results page)
      if (location.pathname.includes('/buyer-dashboard/search') || location.pathname.includes('/searchresults')) {
        setTimeout(() => {
          const syntheticEvent = { preventDefault: () => {}, stopPropagation: () => {} };
          handleSearch(syntheticEvent);
        }, 0);
      }
    } else if (name === 'expectedPossession' || name === 'projectStatus') {
      setSearchData(prev => ({ ...prev, [name]: value }));
      if (location.pathname.includes('/buyer-dashboard/search') || location.pathname.includes('/searchresults')) {
        setTimeout(() => {
          const syntheticEvent = { preventDefault: () => {}, stopPropagation: () => {} };
          handleSearch(syntheticEvent);
        }, 0);
      }
    } else {
      setSearchData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSearch = (e, override) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Prevent search if disabled property type is selected (for PG/Hostel page)
    if (searchMode !== 'upcoming-projects' && searchData.propertyType && !isPropertyTypeEnabled(searchData.propertyType)) {
      return;
    }

    const queryParams = new URLSearchParams();

    // Upcoming-projects mode: preserve mode and project_type on every search
    if (searchMode === 'upcoming-projects') {
      queryParams.set('searchMode', 'upcoming-projects');
      queryParams.set('project_type', 'upcoming');
    }
    // When a suggestion is selected, use it directly so we don't read stale state (typed "pu").
    // This ensures Active Filters and URL get the full selected value (e.g. "Pune").
    const loc = override?.selectedLocationOverride ?? selectedLocation;

    // Add city if available (from selectedLocation or URL params)
    // Priority: selectedLocation.city > extract from location string > URL params city
    let cityToAdd = null;

    // 1. loc.city (from selectedLocation or override)
    if (loc?.city && loc.city.trim() !== '') {
      cityToAdd = loc.city.trim();
    }
    // 2a. Override but no city: derive from loc.placeName/fullAddress
    else if (override?.selectedLocationOverride && (loc?.placeName || loc?.fullAddress)) {
      const locationStr = (loc.placeName || loc.fullAddress || '').trim();
      const parts = locationStr.split(',').map(p => p.trim()).filter(p => p.length > 0);
      if (parts.length >= 2) cityToAdd = parts[1];
      else if (parts.length === 1) cityToAdd = parts[0];
    }
    // 2b. Derive from typed location (only when no override; avoid stale searchData)
    else if (!override?.selectedLocationOverride && searchData.location && searchData.location.trim() !== '') {
      const locationStr = searchData.location.trim();
      const parts = locationStr.split(',').map(p => p.trim()).filter(p => p.length > 0);
      
      // For formats like "Locality, City, State, Country" - city is usually the second part
      // For formats like "City, State, Country" - city is the first part
      // For formats like "City" - city is the only part
      if (parts.length >= 3) {
        // "Locality, City, State, Country" - take second part (city)
        cityToAdd = parts[1];
      } else if (parts.length === 2) {
        // "City, State" - take first part (city)
        cityToAdd = parts[0];
      } else if (parts.length === 1) {
        // Just "City" - use the only part
        cityToAdd = parts[0];
      }
    }
    // 3. Preserve city from URL as last fallback
    else {
      const cityParam = searchParams.get('city');
      if (cityParam && cityParam.trim() !== '') {
        cityToAdd = cityParam.trim();
      }
    }

    // Add city param (only once, using set to avoid duplicates)
    if (cityToAdd && cityToAdd.trim() !== '') {
      queryParams.set('city', cityToAdd.trim());
    }
    
    // Add location: use full selected value (placeName/fullAddress) when we have loc; otherwise typed/URL
    if (loc && (loc.placeName || loc.fullAddress)) {
      queryParams.append('location', loc.placeName || loc.fullAddress);
    } else if (!override?.selectedLocationOverride && searchData.location && searchData.location.trim() !== '') {
      queryParams.append('location', searchData.location.trim());
    } else {
      // Fallback: check if location exists in current URL params
      const locationParam = searchParams.get('location');
      if (locationParam) {
        queryParams.append('location', locationParam);
      }
    }

    // Add coordinates if available
    if (loc && loc.coordinates && loc.coordinates.lat && loc.coordinates.lng) {
      queryParams.append('lat', String(loc.coordinates.lat));
      queryParams.append('lng', String(loc.coordinates.lng));
      queryParams.append('radius', '10');
    } else {
      // Fallback: preserve coordinates from URL if they exist
      const latParam = searchParams.get('lat');
      const lngParam = searchParams.get('lng');
      if (latParam && lngParam) {
        queryParams.append('lat', latParam);
        queryParams.append('lng', lngParam);
        queryParams.append('radius', searchParams.get('radius') || '10');
      }
    }

    // Property type and filters: different logic for upcoming-projects vs properties
    if (searchMode === 'upcoming-projects') {
      if (searchData.propertyType && searchData.propertyType.trim() !== '') {
        queryParams.append('property_type', searchData.propertyType);
      }
      if (searchData.expectedPossession && searchData.expectedPossession.trim() !== '') {
        queryParams.append('expected_possession', searchData.expectedPossession);
      }
      if (searchData.projectStatus && searchData.projectStatus.trim() !== '') {
        queryParams.append('project_status', searchData.projectStatus);
      }
    } else {
      // Add property type (with special handling for PG/Hostel page and Home page)
      if (searchData.propertyType && searchData.propertyType.trim() !== '') {
        if (searchType === 'pg' && isPropertyTypeEnabled(searchData.propertyType)) {
          queryParams.append('type', searchData.propertyType);
        } else if (searchType === 'pg') {
          queryParams.append('type', 'Apartment / PG / Hostel');
        } else if (searchType === 'home') {
          queryParams.append('property_type', searchData.propertyType);
        } else {
          queryParams.append('type', searchData.propertyType);
        }
      } else if (searchType === 'pg') {
        queryParams.append('type', 'Apartment / PG / Hostel');
      }

      // Add budget
      if (searchData.budget && searchData.budget.trim() !== '') {
        queryParams.append('budget', searchData.budget);
      }

      // Add bedrooms or area based on property type
      if (isBedroomBased && searchData.bedrooms && searchData.bedrooms.trim() !== '') {
        queryParams.append('bedrooms', searchData.bedrooms);
      } else if (isAreaBased && searchData.area && searchData.area.trim() !== '') {
        queryParams.append('area', searchData.area);
      }

      // Add upload time filter
      if (searchData.uploadTime && searchData.uploadTime.trim() !== '') {
        queryParams.append('upload_time', searchData.uploadTime);
      }

      // Add status parameter based on search type and listingType
      if (searchType === 'buy') {
        queryParams.append('status', 'For Sale');
      } else if (searchType === 'rent' || searchType === 'pg') {
        queryParams.append('status', 'For Rent');
      } else {
        if (searchData.listingType === 'Buy') {
          queryParams.append('status', 'For Sale');
        } else if (searchData.listingType === 'Rent') {
          queryParams.append('status', 'For Rent');
        }
      }
    }

    const queryString = queryParams.toString();
    const searchUrl = queryString ? `/buyer-dashboard/search?${queryString}` : '/buyer-dashboard/search';
    
    navigate(searchUrl);
  };

  // Calculate applied filter count (exclude location and empty/default values)
  const appliedFilterCount = useMemo(() => {
    let count = 0;
    if (searchMode === 'upcoming-projects') {
      if (searchData.propertyType && searchData.propertyType.trim() !== '') count++;
      if (searchData.expectedPossession && searchData.expectedPossession.trim() !== '') count++;
      if (searchData.projectStatus && searchData.projectStatus.trim() !== '') count++;
      return count;
    }
    if (searchData.propertyType && searchData.propertyType.trim() !== '') count++;
    if (searchData.budget && searchData.budget.trim() !== '') count++;
    if (searchData.bedrooms && searchData.bedrooms.trim() !== '') count++;
    else if (searchData.area && searchData.area.trim() !== '') count++;
    if (searchData.uploadTime && searchData.uploadTime.trim() !== '') count++;
    if (searchData.listingType && searchData.listingType !== 'All') count++;
    return count;
  }, [searchMode, searchData.propertyType, searchData.budget, searchData.bedrooms, searchData.area, searchData.uploadTime, searchData.listingType, searchData.expectedPossession, searchData.projectStatus]);

  // Helper function to render all filters (used in both main view and modal)
  const renderFilters = () => {
    // Upcoming-projects mode: only these filters
    if (searchMode === 'upcoming-projects') {
      return (
        <>
          <div className="compact-search-field">
            <label htmlFor="propertyType" className="compact-search-label">
              Property Type
            </label>
            <select
              id="propertyType"
              name="propertyType"
              value={searchData.propertyType}
              onChange={handleInputChange}
              className="compact-search-select"
            >
              <option value="">All Types</option>
              {propertyTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div className="compact-search-field">
            <label htmlFor="expectedPossession" className="compact-search-label">
              Expected Possession Date
            </label>
            <select
              id="expectedPossession"
              name="expectedPossession"
              value={searchData.expectedPossession}
              onChange={handleInputChange}
              className="compact-search-select"
            >
              <option value="">Any</option>
              {expectedPossessionOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="compact-search-field">
            <label htmlFor="projectStatus" className="compact-search-label">
              Project Status
            </label>
            <select
              id="projectStatus"
              name="projectStatus"
              value={searchData.projectStatus}
              onChange={handleInputChange}
              className="compact-search-select"
            >
              <option value="">Any</option>
              {projectStatusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </>
      );
    }

    // Properties mode (Explore Properties)
    return (
      <>
        {/* Listing Type - Buy / Rent / All - Only show when coming from home page, not from Buy/Rent pages */}
        {searchType === 'home' && (location.pathname.includes('/buyer-dashboard/search') || location.pathname.includes('/searchresults')) && (
          <div className="compact-search-field">
            <label htmlFor="listingType" className="compact-search-label">
              Listing Type
            </label>
            <select
              id="listingType"
              name="listingType"
              value={searchData.listingType}
              onChange={handleInputChange}
              className="compact-search-select"
            >
              <option value="All">All</option>
              <option value="Buy">Buy</option>
              <option value="Rent">Rent</option>
            </select>
          </div>
        )}

        {/* Property Type */}
        <div className="compact-search-field">
          <label htmlFor="propertyType" className="compact-search-label">
            Property Type
          </label>
          <select
            id="propertyType"
            name="propertyType"
            value={searchData.propertyType}
            onChange={handleInputChange}
            className="compact-search-select"
            title={searchData.propertyType && !isPropertyTypeEnabled(searchData.propertyType) ? 'Available only for Rent properties' : ''}
          >
            <option value="">All Types</option>
            {propertyTypes.map(type => {
              const isEnabled = isPropertyTypeEnabled(type);
              return (
                <option 
                  key={type} 
                  value={type}
                  disabled={!isEnabled}
                  className={!isEnabled ? 'buyer-disabled-option' : ''}
                >
                  {type}
                </option>
              );
            })}
          </select>
          {searchType === 'pg' && (
            <small style={{ 
              fontSize: '0.75rem', 
              color: '#94a3b8', 
              marginTop: '0.25rem',
              display: 'block'
            }}>
              Only Apartment and PG / Hostel are available. Other types are available on the Rent page.
            </small>
          )}
        </div>

        {/* Budget Range */}
        <div className="compact-search-field">
          <label htmlFor="budget" className="compact-search-label">
            Budget
          </label>
          <select
            id="budget"
            name="budget"
            value={searchData.budget}
            onChange={handleInputChange}
            className="compact-search-select"
          >
            <option value="">Any Budget</option>
            {budgetRanges.map(range => (
              <option key={range} value={range}>{range}</option>
            ))}
          </select>
        </div>

        {/* Bedrooms / Area - Dynamic based on property type */}
        <div className="compact-search-field">
          {isBedroomBased ? (
            <>
              <label htmlFor="bedrooms" className="compact-search-label">
                {searchType === 'pg' ? 'Bedroom / Room Type' : 'Bedrooms'}
              </label>
              <select
                id="bedrooms"
                name="bedrooms"
                value={searchData.bedrooms}
                onChange={handleInputChange}
                className="compact-search-select"
              >
                <option value="">Any</option>
                {bedroomOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </>
          ) : isAreaBased ? (
            <>
              <label htmlFor="area" className="compact-search-label">
                Area
              </label>
              <select
                id="area"
                name="area"
                value={searchData.area}
                onChange={handleInputChange}
                className="compact-search-select"
              >
                <option value="">Any Area</option>
                {areaRanges.map(range => (
                  <option key={range} value={range}>{range}</option>
                ))}
              </select>
            </>
          ) : (
            <>
              <label htmlFor="bedrooms" className="compact-search-label">
                {searchType === 'pg' ? 'Bedroom / Room Type' : 'Bedroom / Area'}
              </label>
              <select
                id="bedrooms"
                name="bedrooms"
                value={searchData.bedrooms}
                onChange={handleInputChange}
                className="compact-search-select"
                disabled={!searchData.propertyType || !isBedroomBased}
              >
                <option value="">Select Property Type</option>
                {searchData.propertyType && isBedroomBased && bedroomOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </>
          )}
        </div>

        {/* Upload Time Filter */}
        <div className="compact-search-field">
          <label htmlFor="StoredBy" className="compact-search-label">
            Stored By
          </label>
          <select
            id="uploadTime"
            name="uploadTime"
            value={searchData.uploadTime}
            onChange={handleInputChange}
            className="compact-search-select"
          >
            <option value="">Any Time</option>
            <option value="7">Within 7 days</option>
            <option value="14">Within 2 weeks</option>
            <option value="30">Within 1 month</option>
          </select>
        </div>
      </>
    );
  };

  return (
    <div className="compact-search-bar">
      <form 
        className="compact-search-form" 
        onSubmit={handleSearch}
        noValidate
      >
        <div className="compact-search-filters">
          {/* Location Input - Always visible */}
          <div className="compact-search-field">
            <label htmlFor="location" className="compact-search-label">
              Location
            </label>
            <LocationAutoSuggest
              placeholder="City / Locality"
              value={searchData.location}
              dropdownOpen={isLocationLocked ? false : isLocationDropdownOpen}
              onDropdownOpenChange={(open) => {
                if (isLocationLocked && open) return;
                setIsLocationDropdownOpen(open);
              }}
              onInputFocus={() => setIsLocationLocked(false)}
              onInputChange={(v) => {
                setSearchData(prev => ({ ...prev, location: v || '' }));
                setSelectedLocation(null);
                if (!v || v.trim() === '') setIsLocationLocked(false);
              }}
              onChange={(locationData) => {
                if (!locationData) {
                  setSelectedLocation(null);
                  setSearchData(prev => ({ ...prev, location: '' }));
                  setIsLocationLocked(false);
                  return;
                }
                
                // Extract city from locationData or location string
                let extractedCity = locationData.city || '';
                
                // If locationData doesn't have city, try to extract from location string
                if (!extractedCity && (locationData.fullAddress || locationData.placeName)) {
                  const locationStr = (locationData.fullAddress || locationData.placeName || '').trim();
                  const parts = locationStr.split(',').map(p => p.trim()).filter(p => p.length > 0);
                  
                  // For formats like "Locality, City, State" - city is usually the second part
                  if (parts.length >= 2) {
                    extractedCity = parts[1];
                  } else if (parts.length === 1) {
                    extractedCity = parts[0];
                  }
                }
                
                setSelectedLocation({
                  ...locationData,
                  city: extractedCity
                });
                
                setSearchData(prev => ({
                  ...prev,
                  location: locationData.fullAddress || locationData.placeName || ''
                }));
                setIsLocationLocked(true);
                setIsLocationDropdownOpen(false);
              }}
              onSearch={(locationData) => {
                if (locationData) {
                  // Extract city from locationData or location string
                  let extractedCity = locationData.city || '';
                  
                  // If locationData doesn't have city, try to extract from location string
                  if (!extractedCity && (locationData.fullAddress || locationData.placeName)) {
                    const locationStr = (locationData.fullAddress || locationData.placeName || '').trim();
                    const parts = locationStr.split(',').map(p => p.trim()).filter(p => p.length > 0);
                    
                    // For formats like "Locality, City, State" - city is usually the second part
                    if (parts.length >= 2) {
                      extractedCity = parts[1];
                    } else if (parts.length === 1) {
                      extractedCity = parts[0];
                    }
                  }
                  
                  setSelectedLocation({
                    ...locationData,
                    city: extractedCity
                  });
                  
                  setSearchData(prev => ({
                    ...prev,
                    location: locationData.fullAddress || locationData.placeName || ''
                  }));
                  setIsLocationLocked(true);
                  setIsLocationDropdownOpen(false);
                }
                // Pass selected suggestion so handleSearch uses it for URL/filters instead of stale typed value ("pu").
                // State updates above are async; override ensures Active Filters gets full value (e.g. "Pune").
                handleSearch(null, { selectedLocationOverride: locationData || undefined });
              }}
              className="compact-search-input"
            />
          </div>

          {/* Filters Button - Mobile Only */}
          {isMobile && (
            <button
              type="button"
              className="compact-filters-button"
              onClick={() => setShowFiltersModal(true)}
            >
              <Filter size={18} />
              <span>Filters</span>
              {appliedFilterCount > 0 && (
                <span className="compact-filters-badge">{appliedFilterCount}</span>
              )}
            </button>
          )}

          {/* All Other Filters - Desktop/Tablet Only */}
          {!isMobile && renderFilters()}

          {/* Search Button */}
          <button 
            type="submit" 
            className="compact-search-button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>Search</span>
          </button>
        </div>
      </form>

      {/* Filters Modal - Mobile Only */}
      {isMobile && showFiltersModal && (
        <div className="compact-filters-modal-overlay" onClick={() => setShowFiltersModal(false)}>
          <div className="compact-filters-modal" onClick={(e) => e.stopPropagation()}>
            <div className="compact-filters-modal-header">
              <h2>Filters</h2>
              <button
                type="button"
                className="compact-filters-modal-close"
                onClick={() => setShowFiltersModal(false)}
                aria-label="Close filters"
              >
                <X size={20} />
              </button>
            </div>
            <div className="compact-filters-modal-content">
              {renderFilters()}
            </div>
            <div className="compact-filters-modal-footer">
              <button
                type="button"
                className="compact-filters-modal-apply"
                onClick={() => {
                  setShowFiltersModal(false);
                  handleSearch(null);
                }}
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompactSearchBar;

