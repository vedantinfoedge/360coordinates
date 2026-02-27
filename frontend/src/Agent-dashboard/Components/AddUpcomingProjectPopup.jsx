// src/components/AddUpcomingProjectPopup.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useProperty } from "./PropertyContext";
import { sellerPropertiesAPI, authAPI } from "../../services/api.service";
import { API_BASE_URL, API_ENDPOINTS } from "../../config/api.config";
import { validateImageFile } from "../../utils/validation";
import LocationPicker from "../../components/Map/LocationPicker";
import LocationAutoSuggest from "../../components/LocationAutoSuggest/LocationAutoSuggest";
import "../styles/AddPropertyPopup.css";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function ModernDatePicker({ value, onChange, placeholder = "Select date", id, onOpenChange }) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      const [y, m] = value.split("-").map(Number);
      return new Date(y, m - 1, 1);
    }
    return new Date();
  });
  const containerRef = useRef(null);

  useEffect(() => {
    if (value) {
      const [y, m] = value.split("-").map(Number);
      setViewDate(new Date(y, m - 1, 1));
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  useEffect(() => {
    if (onOpenChange) {
      onOpenChange(open);
    }
  }, [open, onOpenChange]);

  const formatDisplay = (val) => {
    if (!val) return "";
    const [y, m, d] = val.split("-").map(Number);
    return `${d} ${MONTHS[m - 1]} ${y}`;
  };

  const toYYYYMMDD = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const days = [];
  for (let i = 0; i < startPad; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const handleSelect = (d) => {
    if (!d) return;
    const date = new Date(year, month, d);
    onChange(toYYYYMMDD(date));
    setOpen(false);
  };

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));
  const handleYearChange = (e) => setViewDate(new Date(parseInt(e.target.value), month, 1));
  const handleMonthChange = (e) => setViewDate(new Date(year, parseInt(e.target.value), 1));
  const selectToday = () => {
    onChange(toYYYYMMDD(new Date()));
    setOpen(false);
  };

  const selectedYMD = value ? value.split("-").map(Number) : null;

  return (
    <div className="modern-date-picker" ref={containerRef}>
      <button
        type="button"
        className="modern-date-picker-input"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={placeholder}
        id={id}
      >
        <CalendarIcon size={18} className="modern-date-picker-icon" />
        <span className={value ? "" : "modern-date-picker-placeholder"}>
          {value ? formatDisplay(value) : placeholder}
        </span>
      </button>
      {open && (
        <div className="modern-date-picker-dropdown" role="dialog" aria-modal="true">
          <div className="modern-date-picker-header">
            <button type="button" className="modern-date-picker-nav" onClick={prevMonth} aria-label="Previous month">
              <ChevronLeft size={18} />
            </button>
            <div className="modern-date-picker-selectors">
              <select
                className="modern-date-picker-select"
                value={month}
                onChange={handleMonthChange}
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>
              <select
                className="modern-date-picker-select"
                value={year}
                onChange={handleYearChange}
              >
                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 3 + i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <button type="button" className="modern-date-picker-nav" onClick={nextMonth} aria-label="Next month">
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="modern-date-picker-weekdays">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((w) => (
              <span key={w} className="modern-date-picker-weekday">{w}</span>
            ))}
          </div>
          <div className="modern-date-picker-grid">
            {days.map((d, i) => {
              const isSelected = selectedYMD && selectedYMD[0] === year && selectedYMD[1] === month + 1 && selectedYMD[2] === d;
              const isToday = (() => {
                const t = new Date();
                return d && t.getFullYear() === year && t.getMonth() === month && t.getDate() === d;
              })();
              return (
                <button
                  key={i}
                  type="button"
                  className={`modern-date-picker-day ${!d ? "empty" : ""} ${isSelected ? "selected" : ""} ${isToday ? "today" : ""}`}
                  onClick={() => handleSelect(d)}
                  disabled={!d}
                >
                  {d || ""}
                </button>
              );
            })}
          </div>
          <div className="modern-date-picker-footer">
            <button type="button" className="modern-date-picker-today" onClick={selectToday}>
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const STEPS = [
  { id: 1, title: "Basic Details", icon: "📝" },
  { id: 2, title: "Location", icon: "📍" },
  { id: 3, title: "Configuration", icon: "🏗️" },
  { id: 4, title: "Pricing & Amenities", icon: "💰" },
  { id: 5, title: "Media & Contact", icon: "📷" }
];

// Same property types as in property form (Seller AddPropertyPopup) for consistency
const PROJECT_TYPES = [
  { value: "Apartment", icon: "🏢" },
  { value: "Villa / Banglow", icon: "🏡" },
  { value: "Independent House", icon: "🏘️" },
  { value: "Row House/ Farm House", icon: "🏘️" },
  { value: "Penthouse", icon: "🌆" },
  { value: "Studio Apartment", icon: "🛏️" },
  { value: "Plot / Land / Indusrtial Property", icon: "📐" },
  { value: "Commercial Office", icon: "🏢" },
  { value: "Commercial Shop", icon: "🏪" },
  { value: "Co-working Space", icon: "🏢" },
  { value: "PG / Hostel", icon: "🛏️" },
  { value: "Warehouse / Godown", icon: "🏪" }
];

const PROJECT_STATUS_OPTIONS = [
  { value: "UNDER CONSTRUCTION", label: "UNDER CONSTRUCTION" },
  { value: "PRE-LAUNCH", label: "PRE-LAUNCH" },
  { value: "COMPLETED", label: "COMPLETED" }
];

// Configuration options per project type — fields in Step 3 change based on this (2BHK style)
const CONFIGURATION_BY_PROJECT_TYPE = {
  "Apartment": ["Studio Apartment", "1BHK", "2BHK", "3BHK", "4BHK", "5+BHK", "Duplex Apartment", "Penthouse"],
  "Villa / Banglow": ["2BHK Villa", "3BHK Villa", "4BHK Villa", "5+BHK Villa", "Luxury Villa"],
  "Independent House": ["1BHK Independent House", "2BHK Independent House", "3BHK Independent House", "4+BHK Independent House"],
  "Row House/ Farm House": ["2BHK Row House", "3BHK Row House", "4BHK Row House", "Farm House Plot", "Luxury Farm House"],
  "Penthouse": ["3BHK Penthouse", "4BHK Penthouse", "5+BHK Penthouse"],
  "Studio Apartment": ["Studio Unit", "Studio + Balcony", "Studio Deluxe"],
  "Plot / Land / Indusrtial Property": ["Residential Plot", "Commercial Plot", "Industrial Plot", "NA Plot", "Agricultural Land"],
  "Commercial Office": ["Office Space (Bare Shell)", "Furnished Office", "IT / Tech Park Office", "Business Center Office"],
  "Commercial Shop": ["Retail Shop", "Showroom", "Food Court Shop", "Kiosk", "Mall Shop"],
  "Co-working Space": ["Hot Desk / Dedicated Desk", "Private Cabins", "Team Rooms (4-10 Seats)", "Large Team Suites (10+ Seats)", "Meeting Room Bundles", "Virtual Office Packages"],
  "PG / Hostel": ["Single Sharing", "Double Sharing", "Triple Sharing", "Dormitory", "Girls Hostel / Boys Hostel"],
  "Warehouse / Godown": ["Small Warehouse", "Medium Warehouse", "Large Warehouse", "Cold Storage", "Logistics Warehouse"]
};

// Same amenities as in property form (Seller AddPropertyPopup) for consistency
const AMENITIES = [
  { id: "parking", label: "Parking", icon: "🚗" },
  { id: "lift", label: "Lift", icon: "🛗" },
  { id: "security", label: "24x7 Security", icon: "👮" },
  { id: "power_backup", label: "Power Backup", icon: "⚡" },
  { id: "gym", label: "Gym", icon: "🏋️" },
  { id: "swimming_pool", label: "Swimming Pool", icon: "🏊" },
  { id: "garden", label: "Garden", icon: "🌳" },
  { id: "clubhouse", label: "Club House", icon: "🏛️" },
  { id: "playground", label: "Children's Play Area", icon: "🎢" },
  { id: "cctv", label: "CCTV", icon: "📹" },
  { id: "intercom", label: "Intercom", icon: "📞" },
  { id: "fire_safety", label: "Fire Safety", icon: "🔥" },
  { id: "water_supply", label: "24x7 Water", icon: "💧" },
  { id: "gas_pipeline", label: "Gas Pipeline", icon: "🔥" },
  { id: "wifi", label: "WiFi", icon: "📶" },
  { id: "ac", label: "Air Conditioning", icon: "❄️" },
  { id: "electricity", label: "Electricity", icon: "⚡" },

  // Plot/Land specific
  { id: "internal_roads", label: "Internal Roads", icon: "🛣️" },
  { id: "led_lighting", label: "LED Street Lighting", icon: "💡" },
  { id: "rainwater_harvesting", label: "Rainwater Harvesting", icon: "🌧️" },
  { id: "underground_drainage", label: "Underground Drainage", icon: "🚰" },
  { id: "stormwater_drainage", label: "Stormwater Drainage", icon: "🌊" },
  { id: "water_line", label: "Water Supply Line/Borewell", icon: "💧" },
  { id: "electricity_provision", label: "Electricity Provision", icon: "⚡" },
  { id: "gated_entrance", label: "Gated Entrance", icon: "🚧" },
  { id: "compound_wall", label: "Compound Wall", icon: "🧱" },
  { id: "security_cabin", label: "Security Cabin", icon: "🏠" },
  { id: "landscaped_garden", label: "Landscaped Garden", icon: "🌳" },
  { id: "jogging_track", label: "Jogging/Walking Track", icon: "🏃" },
  { id: "open_gym", label: "Open Gym/Fitness Zone", icon: "💪" },
  { id: "visitor_parking", label: "Visitor Parking", icon: "🅿️" },

  // Commercial/Office/Coworking
  { id: "power_backup_ups", label: "24/7 Power Backup (UPS/DG)", icon: "⚡" },
  { id: "high_speed_internet", label: "High-Speed Internet/Fiber Ready", icon: "🌐" },
  { id: "centralized_ac", label: "Centralized AC (HVAC)", icon: "❄️" },
  { id: "lifts_high_speed", label: "Elevators/High-Speed Lifts", icon: "🛗" },
  { id: "access_control", label: "Access Control (RFID/Biometric)", icon: "🔐" },
  { id: "security_staff", label: "Security Staff (24×7)", icon: "👮" },
  { id: "reception_desk", label: "Reception Desk", icon: "💁" },
  { id: "lobby_area", label: "Lobby Area", icon: "🛋️" },
  { id: "conference_room", label: "Conference Room", icon: "🤝" },
  { id: "washrooms", label: "Washrooms (Private/Common)", icon: "🚻" },
  { id: "pantry", label: "Pantry/Kitchenette", icon: "☕" },

  // Commercial Shop
  { id: "power_supply_247", label: "24/7 Power Supply", icon: "⚡" },
  { id: "customer_parking", label: "Customer Parking", icon: "🚗" },
  { id: "two_wheeler_parking", label: "Two-Wheeler Parking", icon: "🛵" },
  { id: "wheelchair_accessible", label: "Wheelchair Accessible/Ramp", icon: "♿" },
  { id: "escalator_access", label: "Lift/Escalator Access", icon: "🛗" },
  { id: "display_window", label: "Glass Front/Display Window", icon: "🪟" },
  { id: "shutter_door", label: "Shutter Door", icon: "🚪" },
  { id: "mezzanine_floor", label: "Mezzanine Floor/Storage Room", icon: "📦" },

  // Coworking specific
  { id: "dedicated_desk", label: "Dedicated Desk/Hot Desk", icon: "💻" },
  { id: "private_cabins", label: "Private Cabins", icon: "🏢" },
  { id: "meeting_rooms", label: "Meeting Rooms", icon: "👥" },
  { id: "coffee_tea", label: "Coffee/Tea/Water", icon: "☕" },
  { id: "office_supplies", label: "Printer/Scanner/Office Supplies", icon: "🖨️" },
  { id: "housekeeping", label: "Housekeeping & Daily Cleaning", icon: "🧹" },
  { id: "quiet_zones", label: "Quiet Zones/Phone Booths", icon: "🤫" },
  { id: "mobile_app_access", label: "Mobile App Access", icon: "📱" },
  { id: "event_space", label: "Event Space/Community Area", icon: "🎉" },
  { id: "lounge", label: "Lounge/Breakout Zones", icon: "🛋️" }
];

const RERA_STATUS_OPTIONS = [
  { value: "Applied", label: "Applied" },
  { value: "Approved", label: "Approved" }
];

const LAND_OWNERSHIP_OPTIONS = [
  "Freehold", "Leasehold", "Power of Attorney", "Co-operative Society"
];

const BANK_OPTIONS = [
  "SBI",
  "HDFC Bank",
  "Kotak Mahindra Bank",
  "ICICI Bank",
  "Axis Bank",
  "Bank of Baroda (BoB)",
  "Other"
];

// Indian states for state suggestion dropdown
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

export default function AddUpcomingProjectPopup({ onClose, editData = null }) {
  const { addProperty, updateProperty, refreshData } = useProperty();
  const isEditMode = !!editData;

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [errors, setErrors] = useState({});
  const [isPublished, setIsPublished] = useState(false); // Track if publishing is completed
  const [showCloseWarning, setShowCloseWarning] = useState(false); // Show warning modal when trying to close on final step
  const [isDiscarded, setIsDiscarded] = useState(false); // Track if user discarded the form
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [imageFiles, setImageFiles] = useState([]);
  const [imageValidationStatus, setImageValidationStatus] = useState([]); // Track validation status for each image
  const [isCheckingImages, setIsCheckingImages] = useState(false);
  const [builderName, setBuilderName] = useState('');
  const [stateAutoFilled, setStateAutoFilled] = useState(false); // Track if state was auto-filled from map
  const [stateDropdownOpen, setStateDropdownOpen] = useState(false); // State suggestion dropdown visibility
  const [launchDatePickerOpen, setLaunchDatePickerOpen] = useState(false); // Launch date picker dropdown visibility
  const [possessionDatePickerOpen, setPossessionDatePickerOpen] = useState(false); // Possession date picker dropdown visibility
  const stateDropdownRef = useRef(null);
  const imagesRef = useRef();
  const brochureRef = useRef(null);
  const popupBodyRef = useRef(null);

  // Get builder name from logged-in user
  useEffect(() => {
    const user = authAPI.getUser();
    if (user && user.full_name) {
      setBuilderName(user.full_name);
    }
  }, []);

  // Pre-fill form data when in edit mode
  useEffect(() => {
    if (editData && isEditMode) {
      // Parse upcoming_project_data if it's a string
      let upcomingData = {};
      try {
        if (typeof editData.upcomingProjectData === 'string') {
          upcomingData = JSON.parse(editData.upcomingProjectData);
        } else if (typeof editData.upcomingProjectData === 'object' && editData.upcomingProjectData) {
          upcomingData = editData.upcomingProjectData;
        }
      } catch (e) {
        console.warn('Failed to parse upcoming_project_data:', e);
      }

      // Map legacy project types to current property form values
      const legacyProjectTypeMap = {
        "Villa": "Villa / Banglow",
        "Plot": "Plot / Land / Indusrtial Property",
        "Commercial": "Commercial Office"
      };
      const projectType = legacyProjectTypeMap[editData.propertyType] || editData.propertyType || "";

      // Map legacy amenity ids to current (e.g. play_area -> playground)
      const rawAmenities = Array.isArray(editData.amenities) ? editData.amenities : [];
      const amenities = rawAmenities.map((a) => (a === "play_area" ? "playground" : a));

      // Pre-fill form with existing data
      setFormData({
        // Step 1: Basic Project Information
        projectName: editData.title || "",
        builderName: upcomingData.builderName || builderName || "",
        projectType,
        projectStatus: upcomingData.projectStatus || "UNDER CONSTRUCTION",
        reraNumber: upcomingData.reraNumber || "",
        description: editData.description || "",

        // Step 2: Location Details
        city: "",
        area: editData.location || "",
        location: editData.location || "", // Also set location field for form compatibility
        fullAddress: editData.additionalAddress || "",
        latitude: editData.latitude || "",
        longitude: editData.longitude || "",
        state: editData.state || "",
        pincode: upcomingData.pincode || "",
        mapLink: upcomingData.mapLink || "",

        // Step 3: Configuration & Inventory
        configurations: Array.isArray(upcomingData.configurations) ? upcomingData.configurations : [],
        carpetAreaRange: upcomingData.carpetAreaRange || "",
        numberOfTowers: upcomingData.numberOfTowers || "",
        totalUnits: upcomingData.totalUnits || "",
        floorsCount: upcomingData.floorsCount || "",
        unitsPerFloor: upcomingData.unitsPerFloor || "",
        numberOfVillas: upcomingData.numberOfVillas || "",
        numberOfPlots: upcomingData.numberOfPlots || "",
        bedCapacity: upcomingData.bedCapacity || "",
        loadingDocks: upcomingData.loadingDocks || "",

        // Step 4: Pricing & Timeline
        startingPrice: editData.price ? (parseFloat(editData.price) / 10000000).toFixed(2) + " Cr" : "",
        pricePerSqft: upcomingData.pricePerSqft || "",
        bookingAmount: upcomingData.bookingAmount || "",
        expectedLaunchDate: upcomingData.expectedLaunchDate || "",
        expectedPossessionDate: upcomingData.expectedPossessionDate || "",

        // Step 5: Amenities (normalized for legacy ids)
        amenities,

        // Step 6: Legal & Approval
        reraStatus: upcomingData.reraStatus || "",
        landOwnershipType: upcomingData.landOwnershipType || "",
        bankApproved: upcomingData.bankApproved || "",
        approvedBanks: Array.isArray(upcomingData.approvedBanks) ? upcomingData.approvedBanks : [],
        otherBankName: "",

        // Step 7: Media
        coverImage: editData.images && editData.images.length > 0 ? { url: editData.images[0] } : null,
        projectImages: Array.isArray(editData.images) ? editData.images : [],
        brochure: null,

        // Step 8: Contact & Sales (support both legacy single contact and salesPersons array)
        salesPersons: Array.isArray(upcomingData.salesPersons) && upcomingData.salesPersons.length > 0
          ? upcomingData.salesPersons.map(sp => ({
            name: sp.name || '',
            number: sp.number || '',
            email: sp.email || '',
            landlineNumber: sp.landlineNumber || '',
            whatsappNumber: sp.whatsappNumber || '',
            alternativeNumber: sp.alternativeNumber || ''
          }))
          : [{
            name: upcomingData.salesName || "",
            number: upcomingData.salesNumber || "",
            email: upcomingData.emailId || "",
            landlineNumber: upcomingData.landlineNumber || upcomingData.mobileNumber || "",
            whatsappNumber: upcomingData.whatsappNumber || "",
            alternativeNumber: upcomingData.alternativeNumber || ""
          }].filter(sp => sp.name || sp.number || sp.email).length > 0
            ? [{ name: upcomingData.salesName || "", number: upcomingData.salesNumber || "", email: upcomingData.emailId || "", landlineNumber: upcomingData.landlineNumber || upcomingData.mobileNumber || "", whatsappNumber: upcomingData.whatsappNumber || "", alternativeNumber: upcomingData.alternativeNumber || "" }]
            : [{ name: "", number: "", email: "", landlineNumber: "", whatsappNumber: "", alternativeNumber: "" }],
        landlineNumber: upcomingData.landlineNumber || upcomingData.mobileNumber || "",
        whatsappNumber: upcomingData.whatsappNumber || "",
        alternativeNumber: upcomingData.alternativeNumber || "",

        // Step 9: Marketing
        projectHighlights: upcomingData.projectHighlights || "",
        usp: upcomingData.usp || ""
      });

      // Set image validation status for existing images
      if (editData.images && Array.isArray(editData.images) && editData.images.length > 0) {
        const existingImageStatus = editData.images.map(imgUrl => ({
          file: null,
          preview: imgUrl,
          status: 'approved',
          errorMessage: '',
          imageId: null,
          imageUrl: imgUrl
        }));
        setImageValidationStatus(existingImageStatus);
      }
    }
  }, [editData, isEditMode, builderName]);

  const [formData, setFormData] = useState({
    // Step 1: Basic Project Information
    projectName: "",
    builderName: "",
    projectType: "",
    projectStatus: "UNDER CONSTRUCTION",
    reraNumber: "",
    description: "",

    // Step 2: Location Details
    city: "",
    area: "",
    fullAddress: "",
    latitude: "",
    longitude: "",
    state: "",
    pincode: "",
    mapLink: "",

    // Step 3: Configuration & Inventory
    configurations: [],
    carpetAreaRange: "",
    numberOfTowers: "",
    totalUnits: "",
    floorsCount: "",
    unitsPerFloor: "",
    numberOfVillas: "",
    numberOfPlots: "",
    bedCapacity: "",
    loadingDocks: "",

    // Step 4: Pricing & Timeline
    startingPrice: "",
    pricePerSqft: "",
    bookingAmount: "",
    expectedLaunchDate: "",
    expectedPossessionDate: "",

    // Step 5: Amenities
    amenities: [],

    // Step 6: Legal & Approval
    reraStatus: "",
    landOwnershipType: "",
    bankApproved: "",
    approvedBanks: [],
    otherBankName: "",

    // Step 7: Media
    coverImage: null,
    projectImages: [],
    brochure: null,

    // Step 8: Contact & Sales (multiple sales persons)
    salesPersons: [{ name: "", number: "", email: "", landlineNumber: "", whatsappNumber: "", alternativeNumber: "" }],
    landlineNumber: "",
    whatsappNumber: "",
    alternativeNumber: "",

    // Step 9: Marketing
    projectHighlights: "",
    usp: ""
  });

  // Reset all form state (for hard discard)
  const resetFormState = useCallback(() => {
    setFormData({
      projectName: "",
      builderName: "",
      projectType: "",
      projectStatus: "UNDER CONSTRUCTION",
      reraNumber: "",
      description: "",
      city: "",
      area: "",
      fullAddress: "",
      latitude: "",
      longitude: "",
      state: "",
      pincode: "",
      mapLink: "",
      configurations: [],
      carpetAreaRange: "",
      numberOfTowers: "",
      totalUnits: "",
      floorsCount: "",
      unitsPerFloor: "",
      numberOfVillas: "",
      numberOfPlots: "",
      bedCapacity: "",
      loadingDocks: "",
      startingPrice: "",
      pricePerSqft: "",
      bookingAmount: "",
      expectedLaunchDate: "",
      expectedPossessionDate: "",
      amenities: [],
      reraStatus: "",
      landOwnershipType: "",
      bankApproved: "",
      approvedBanks: [],
      otherBankName: "",
      coverImage: null,
      projectImages: [],
      brochure: null,
      salesPersons: [{ name: "", number: "", email: "", landlineNumber: "", whatsappNumber: "", alternativeNumber: "" }],
      landlineNumber: "",
      whatsappNumber: "",
      alternativeNumber: "",
      projectHighlights: "",
      usp: ""
    });
    setCurrentStep(1);
    setErrors({});
    setImageFiles([]);
    setImageValidationStatus([]);
    setIsCheckingImages(false);
    setStateAutoFilled(false);
    setIsSubmitting(false);
    setUploadingImages(false);
    setIsPublished(false);
  }, []);

  // Handle discard and close - HARD DISCARD
  const handleDiscardAndClose = useCallback(() => {
    setIsDiscarded(true);
    resetFormState();
    setShowCloseWarning(false);
    onClose();
  }, [resetFormState, onClose]);

  // Handle close attempt - check if on final step and not published
  const handleCloseAttempt = useCallback(() => {
    const isFinalStep = currentStep === STEPS.length;
    if (isFinalStep && !isPublished) {
      // Show warning modal instead of closing
      setShowCloseWarning(true);
      return;
    }
    // Allow closing if not on final step or already published
    onClose();
  }, [currentStep, isPublished, onClose]);

  // Close on escape
  useEffect(() => {
    if (showCloseWarning) return; // Don't close main popup when warning modal is open
    const onKey = (e) => {
      if (e.key === "Escape") {
        handleCloseAttempt();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleCloseAttempt, showCloseWarning]);

  // Close state dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (stateDropdownRef.current && !stateDropdownRef.current.contains(e.target)) {
        setStateDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (formData.projectImages) {
        formData.projectImages.forEach(img => {
          if (typeof img === 'string' && img.startsWith('blob:')) {
            URL.revokeObjectURL(img);
          }
        });
      }
    };
  }, []);

  const handleChange = (field, value) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      // When project type changes, keep only configurations valid for the new type
      if (field === "projectType") {
        const options = CONFIGURATION_BY_PROJECT_TYPE[value] || [];
        next.configurations = (prev.configurations || []).filter((c) => options.includes(c));
      }
      return next;
    });
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Handle price input - only allow numbers, dashes, and decimal points
  const handlePriceChange = (field, value) => {
    // Allow numbers, dots, dashes, spaces, and commas for flexible price ranges
    const sanitized = value.replace(/[^\d.\-\s,]/g, '');
    handleChange(field, sanitized);
  };

  // Handle carpet area range input - strip sq.ft if user types it, store numeric only
  const handleCarpetAreaChange = (value) => {
    // Remove "sq.ft" if user typed it
    const cleanValue = value.replace(/\s*sq\.ft\s*/gi, '').trim();
    handleChange('carpetAreaRange', cleanValue);
  };

  const toggleConfiguration = (config) => {
    setFormData(prev => ({
      ...prev,
      configurations: prev.configurations.includes(config)
        ? prev.configurations.filter(c => c !== config)
        : [...prev.configurations, config]
    }));
    if (errors.configurations) {
      setErrors(prev => ({ ...prev, configurations: null }));
    }
  };

  const toggleAmenity = (amenityId) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenityId)
        ? prev.amenities.filter(a => a !== amenityId)
        : [...prev.amenities, amenityId]
    }));
    // Clear amenities error when user selects/deselects an amenity
    if (errors.amenities) {
      setErrors(prev => ({ ...prev, amenities: null }));
    }
  };

  const toggleBank = (bank) => {
    setFormData(prev => ({
      ...prev,
      approvedBanks: (prev.approvedBanks || []).includes(bank)
        ? (prev.approvedBanks || []).filter(b => b !== bank)
        : [...(prev.approvedBanks || []), bank]
    }));
  };

  const defaultSalesPerson = () => ({ name: '', number: '', email: '', landlineNumber: '', whatsappNumber: '', alternativeNumber: '' });

  const updateSalesPerson = (index, field, value) => {
    setFormData(prev => {
      const next = [...(prev.salesPersons || [defaultSalesPerson()])];
      if (!next[index]) next[index] = defaultSalesPerson();
      next[index] = { ...next[index], [field]: value };
      return { ...prev, salesPersons: next };
    });
    setErrors(prev => {
      const next = { ...prev };
      ['name', 'number', 'email'].forEach(f => {
        if (next[`salesPerson_${f}_${index}`]) delete next[`salesPerson_${f}_${index}`];
      });
      return next;
    });
  };

  const addSalesPerson = () => {
    setFormData(prev => {
      const currentSalesPersons = prev.salesPersons || [];
      if (currentSalesPersons.length >= 5) return prev;
      return {
        ...prev,
        salesPersons: [...currentSalesPersons, defaultSalesPerson()]
      };
    });
  };

  const removeSalesPerson = (index) => {
    setFormData(prev => {
      const next = (prev.salesPersons || []).filter((_, i) => i !== index);
      if (next.length === 0) next.push(defaultSalesPerson());
      return { ...prev, salesPersons: next };
    });
    setErrors(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        if (k.startsWith('salesPerson_')) delete next[k];
      });
      return next;
    });
  };

  // Handle location selection from LocationPicker (map)
  const handleLocationSelect = (locationData) => {
    // Auto-populate state from map selection if available
    const stateFromMap = locationData.state || '';
    const wasStateAutoFilled = !!stateFromMap;

    setFormData(prev => ({
      ...prev,
      latitude: locationData.latitude.toString(),
      longitude: locationData.longitude.toString(),
      location: locationData.fullAddress || prev.location || prev.area,
      // DO NOT auto-fill fullAddress - it should remain NULL unless manually entered
      // fullAddress: locationData.fullAddress || prev.fullAddress, // REMOVED
      // Always update state from map (even if empty) to reflect the new location
      state: stateFromMap
    }));

    // Track if state was auto-filled from map
    setStateAutoFilled(wasStateAutoFilled);
    setShowLocationPicker(false);
    if (errors.location || errors.area || errors.state) {
      setErrors(prev => ({ ...prev, location: null, area: null, state: null }));
    }
  };

  // Handle location selection from LocationAutoSuggest dropdown
  const handleLocationDropdownSelect = (locationData) => {
    if (!locationData) {
      // Clear location and state when location is cleared
      setFormData(prev => ({
        ...prev,
        location: '',
        area: '',
        state: '',
        latitude: '',
        longitude: ''
      }));
      setStateAutoFilled(false);
      if (errors.location || errors.area || errors.state) {
        setErrors(prev => ({ ...prev, location: null, area: null, state: null }));
      }
      return;
    }

    // Auto-populate state from location dropdown selection
    const stateFromLocation = locationData.state || '';
    const wasStateAutoFilled = !!stateFromLocation;

    setFormData(prev => ({
      ...prev,
      location: locationData.placeName || locationData.fullAddress || prev.location || prev.area,
      area: locationData.placeName || locationData.fullAddress || prev.area,
      latitude: locationData.coordinates?.lat?.toString() || prev.latitude || '',
      longitude: locationData.coordinates?.lng?.toString() || prev.longitude || '',
      // Always update state from location dropdown (even if empty) to reflect the new location
      state: stateFromLocation
      // DO NOT auto-fill fullAddress - it should remain NULL unless manually entered
      // fullAddress is NOT updated here - user must manually enter it
    }));

    // Track if state was auto-filled from location dropdown
    setStateAutoFilled(wasStateAutoFilled);
    if (errors.location || errors.area || errors.state) {
      setErrors(prev => ({ ...prev, location: null, area: null, state: null }));
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    const currentCount = formData.projectImages?.length || 0;
    if (currentCount + files.length > 20) {
      setErrors(prev => ({
        ...prev,
        projectImages: `You can upload a maximum of 20 images. You have ${currentCount} and trying to add ${files.length}`
      }));
      return;
    }

    // Basic file validation first
    const validFiles = [];
    for (const file of files) {
      const fileValidation = validateImageFile(file);
      if (!fileValidation.valid) {
        setErrors(prev => ({
          ...prev,
          projectImages: fileValidation.message
        }));
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      return;
    }

    // Create image objects with pending status
    const newImageObjects = validFiles.map(file => ({
      file: file,
      preview: URL.createObjectURL(file),
      status: 'pending', // pending, checking, approved, rejected
      errorMessage: '',
      imageId: null,
      imageUrl: null
    }));

    // Add to state immediately
    setImageFiles(prev => [...prev, ...validFiles].slice(0, 20));
    setImageValidationStatus(prev => [...prev, ...newImageObjects].slice(0, 20));

    // Create blob URLs for preview
    const newImages = validFiles.map(f => URL.createObjectURL(f));
    setFormData(prev => ({
      ...prev,
      projectImages: [...(prev.projectImages || []), ...newImages].slice(0, 20)
    }));

    // Clear any previous errors
    if (errors.projectImages) {
      setErrors(prev => ({ ...prev, projectImages: null }));
    }

    // Immediately validate each image through moderation API (in parallel for speed)
    setIsCheckingImages(true);
    const startIndex = imageValidationStatus.length;

    // Validate all images in parallel for faster processing
    const validationPromises = newImageObjects.map((imgObj, i) =>
      validateImageThroughModeration(imgObj, startIndex + i)
    );

    // Wait for all validations to complete
    await Promise.all(validationPromises);

    setIsCheckingImages(false);
  };

  // Validate single image through moderation API
  const validateImageThroughModeration = async (imageObj, index) => {
    // Update status to checking
    setImageValidationStatus(prev => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = {
          ...updated[index],
          status: 'checking'
        };
      }
      return updated;
    });

    try {
      // Use 0 for property ID (validation-only mode for new projects)
      const propertyId = 0;

      const formData = new FormData();
      formData.append('image', imageObj.file);
      formData.append('property_id', propertyId);
      formData.append('validate_only', 'true');

      const token = localStorage.getItem('authToken');
      console.log(`[Image ${index + 1}] Starting validation...`);

      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.MODERATE_AND_UPLOAD}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      console.log(`[Image ${index + 1}] Response status:`, response.status);

      // Check if response is OK
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Image ${index + 1}] HTTP Error ${response.status}:`, errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { message: errorText || `HTTP ${response.status} Error` };
        }

        setImageValidationStatus(prev => {
          const updated = [...prev];
          if (updated[index]) {
            updated[index] = {
              ...updated[index],
              status: 'rejected',
              errorMessage: errorData.message || 'Validation failed',
              fullErrorMessage: errorData.message || `HTTP ${response.status} Error`
            };
          }
          return updated;
        });
        return;
      }

      const result = await response.json();
      console.log(`[Image ${index + 1}] API Response:`, result);

      // CRITICAL: Check moderation_status explicitly, not just response status
      // Backend returns: { status: "success", data: { moderation_status: "PENDING" | "NEEDS_REVIEW" | "SAFE" } }
      const moderationStatus = result.data?.moderation_status;

      // Update status based on result
      setImageValidationStatus(prev => {
        const updated = [...prev];
        if (updated[index]) {
          // AUTO-APPROVE FOR AGENT: If upload was successful and not explicitly rejected,
          // mark as approved even if moderation_status is 'PENDING' or 'NEEDS_REVIEW'
          // This ensures property submission doesn't fail for valid uploaded images
          // Agents uploading in Add Upcoming Projects popup should have images auto-approved
          if (result.status === 'success' && result.data?.image_url) {
            // Only reject if explicitly rejected by moderation (error response already handled above)
            // For Agent uploads in Add Upcoming Projects, auto-approve successful uploads
            console.log(`[Image ${index + 1}] ✅ Auto-approved for Agent (moderation_status: ${moderationStatus || 'N/A'})`);
            updated[index] = {
              ...updated[index],
              status: 'approved', // Auto-approve for Agent
              imageId: result.data?.image_id,
              imageUrl: result.data?.image_url,
              moderationStatus: moderationStatus || 'SAFE' // Store actual moderation status for reference
            };
          }
          // Only mark as approved when moderation_status is explicitly "SAFE" (fallback for explicit SAFE status)
          else if (moderationStatus === 'SAFE') {
            console.log(`[Image ${index + 1}] ✅ Approved (SAFE)`);
            updated[index] = {
              ...updated[index],
              status: 'approved',
              imageId: result.data?.image_id,
              imageUrl: result.data?.image_url,
              moderationStatus: 'SAFE'
            };
          }
          // Handle PENDING or NEEDS_REVIEW - mark as pending/reviewing, NOT approved
          // (This should rarely happen now due to auto-approval above, but keep as fallback)
          else if (moderationStatus === 'PENDING' || moderationStatus === 'NEEDS_REVIEW' || result.status === 'pending_review') {
            console.log(`[Image ${index + 1}] ⏳ Under Review (${moderationStatus || 'PENDING'})`);
            updated[index] = {
              ...updated[index],
              status: 'pending',
              errorMessage: result.message || 'Image is under review',
              moderationStatus: moderationStatus || 'PENDING',
              imageUrl: result.data?.image_url || null
            };
          }
          // Legacy support: If status is success but no moderation_status, treat as approved (auto-approve for Agent)
          else if (result.status === 'success') {
            console.log(`[Image ${index + 1}] ✅ Auto-approved for Agent (missing moderation_status, treating as approved)`);
            updated[index] = {
              ...updated[index],
              status: 'approved', // Auto-approve for Agent when status is success
              imageId: result.data?.image_id,
              imageUrl: result.data?.image_url || null,
              moderationStatus: 'SAFE' // Default to SAFE for successful uploads
            };
          }
          else {
            // Extract specific error reason from message
            let errorReason = result.message || 'Image was rejected';
            console.log(`[Image ${index + 1}] ❌ Rejected:`, errorReason);

            // Make error message more concise for display
            if (errorReason.includes('animal appearance')) {
              const match = errorReason.match(/\(([^)]+)\)/);
              errorReason = match ? `${match[1]} detected` : 'Animal detected';
            } else if (errorReason.includes('human appearance')) {
              errorReason = 'Human detected';
            } else if (errorReason.includes('blurry')) {
              errorReason = 'Image is too blurry';
            } else if (errorReason.includes('low quality')) {
              errorReason = 'Image quality too low';
            }

            updated[index] = {
              ...updated[index],
              status: 'rejected',
              errorMessage: errorReason, // Show EXACT error from API
              fullErrorMessage: result.message || 'Image was rejected'
            };
          }
        }
        return updated;
      });

    } catch (error) {
      console.error(`[Image ${index + 1}] ❌ Validation error:`, error);
      console.error(`[Image ${index + 1}] Error details:`, {
        name: error.name,
        message: error.message,
        stack: error.stack
      });

      setImageValidationStatus(prev => {
        const updated = [...prev];
        if (updated[index]) {
          updated[index] = {
            ...updated[index],
            status: 'rejected',
            errorMessage: error.message || 'Validation failed. Please check console for details.',
            fullErrorMessage: error.message || 'Failed to validate image. Please try again.'
          };
        }
        return updated;
      });
    }
  };

  const removeImage = (idx) => {
    // Revoke blob URL to free memory
    if (formData.projectImages && formData.projectImages[idx] && formData.projectImages[idx].startsWith('blob:')) {
      URL.revokeObjectURL(formData.projectImages[idx]);
    }

    // Also revoke preview URL from validation status
    if (imageValidationStatus[idx]?.preview && imageValidationStatus[idx].preview.startsWith('blob:')) {
      URL.revokeObjectURL(imageValidationStatus[idx].preview);
    }

    setFormData(prev => ({
      ...prev,
      projectImages: prev.projectImages.filter((_, i) => i !== idx)
    }));

    // Also remove from imageFiles array
    setImageFiles(prev => prev.filter((_, i) => i !== idx));

    // Remove from validation status
    setImageValidationStatus(prev => prev.filter((_, i) => i !== idx));
  };

  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case 1:
        if (!formData.projectName?.trim()) newErrors.projectName = "Project name is required";
        if (!formData.projectType) newErrors.projectType = "Project type is required";
        if (!formData.projectStatus) newErrors.projectStatus = "Project status is required";
        if (!formData.description?.trim()) {
          newErrors.description = "Project description is required";
        } else if (formData.description.trim().length < 100) {
          newErrors.description = "Project description must be at least 100 characters";
        }
        break;
      case 2:
        if (!formData.location?.trim() && !formData.area?.trim()) {
          newErrors.location = "Location is required";
        }
        if (!formData.state?.trim()) {
          newErrors.state = "State is required";
        }
        if (!formData.fullAddress?.trim()) {
          newErrors.fullAddress = "Additional address is required";
        }
        if (!formData.pincode?.trim()) {
          newErrors.pincode = "Pincode is required";
        } else if (!/^\d{6}$/.test(formData.pincode.trim())) {
          newErrors.pincode = "Pincode must be 6 digits";
        }
        break;
      case 3: {
        const configOptions = formData.projectType ? (CONFIGURATION_BY_PROJECT_TYPE[formData.projectType] || []) : [];
        if (configOptions.length === 0) {
          newErrors.configurations = "Select a project type in Step 1 first.";
        } else if (formData.configurations.length === 0) {
          newErrors.configurations = "At least one configuration is required";
        }
        if (!formData.carpetAreaRange?.trim()) newErrors.carpetAreaRange = "Area range is required";
        break;
      }
      case 4:
        if (!formData.startingPrice?.trim()) newErrors.startingPrice = "Starting price is required";
        if (!formData.amenities || formData.amenities.length === 0) {
          newErrors.amenities = "At least one amenity must be selected";
        }
        break;
      case 5:
        // Validate images
        const imageCount = Math.max(
          imageValidationStatus.length,
          formData.projectImages.length || 0
        );
        if (imageCount < 2) {
          newErrors.projectImages = `Please upload at least 2 images. Currently uploaded: ${imageCount}`;
        } else if (imageCount > 20) {
          newErrors.projectImages = `You can upload a maximum of 20 images. Currently uploaded: ${imageCount}`;
        } else {
          // Check if any images are still being validated
          if (isCheckingImages) {
            newErrors.projectImages = "Please wait for all images to be validated";
          }
          // Check if any images were rejected
          const rejectedCount = imageValidationStatus.filter(img => img.status === 'rejected').length;
          if (rejectedCount > 0) {
            newErrors.projectImages = `Please remove ${rejectedCount} rejected image(s) before proceeding`;
          }
          // Check if at least one image is approved
          const approvedCount = imageValidationStatus.filter(img => img.status === 'approved').length;
          if (approvedCount === 0 && imageValidationStatus.length > 0 && !isCheckingImages) {
            newErrors.projectImages = "At least one image must be approved";
          }
        }
        // Validate contact fields (at least one sales person with all required fields)
        const salesPersons = formData.salesPersons || [];
        if (salesPersons.length === 0) {
          newErrors.salesPersons = "At least one sales person is required";
        } else {
          salesPersons.forEach((sp, idx) => {
            if (!sp.name?.trim()) newErrors[`salesPerson_name_${idx}`] = "Sales person name is required";
            else if (/[^a-zA-Z\s]/.test(sp.name)) newErrors[`salesPerson_name_${idx}`] = "Name should contain only letters";
            if (!sp.number?.trim()) newErrors[`salesPerson_number_${idx}`] = "Sales number is required";
            else if (sp.number.replace(/\D/g, '').length !== 10) newErrors[`salesPerson_number_${idx}`] = "Sales number must be 10 digits";
            if (!sp.email?.trim()) newErrors[`salesPerson_email_${idx}`] = "Email ID is required";
          });
        }
        break;
      default:
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 5));
    } else {
      setTimeout(() => {
        if (popupBodyRef.current) {
          const firstErrorField = popupBodyRef.current.querySelector('.error, .error-text');
          if (firstErrorField) {
            firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else {
            popupBodyRef.current.scrollTop = 0;
          }
        }
      }, 100);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const isStepCompleted = (stepId) => {
    return currentStep > stepId;
  };

  const handleStepClick = (stepId) => {
    if (stepId === currentStep) return;
    if (stepId < currentStep) {
      setCurrentStep(stepId);
    }
  };

  useEffect(() => {
    if (popupBodyRef.current) {
      popupBodyRef.current.scrollTop = 0;
    }
  }, [currentStep]);

  // Format price in words (same as List Property) - handles ranges
  const formatPriceInWords = (price) => {
    if (!price) return '';

    // Check if it's a range (contains "-" or "to" or " - ")
    const isRange = /[-–—]|to/i.test(price);

    if (isRange) {
      // Split by common range separators
      const rangeParts = price.split(/[-–—]|to/i).map(p => p.trim()).filter(p => p);
      if (rangeParts.length === 2) {
        const startPrice = formatSinglePrice(rangeParts[0]);
        const endPrice = formatSinglePrice(rangeParts[1]);
        if (startPrice && endPrice) {
          return `${startPrice} - ${endPrice}`;
        }
      }
    }

    // Single price
    return formatSinglePrice(price);
  };

  // Helper function to format a single price value
  const formatSinglePrice = (priceStr) => {
    if (!priceStr) return '';
    // Extract numeric value from string (e.g., "₹45 Lakhs" -> 4500000)
    let num = 0;
    const cleanStr = priceStr.toString().replace(/[^\d.]/g, '');
    num = parseFloat(cleanStr) || 0;

    // If the string contains "lakh" or "lac", multiply by 100000
    if (priceStr.toString().toLowerCase().includes('lakh') || priceStr.toString().toLowerCase().includes('lac')) {
      num = num * 100000;
    } else if (priceStr.toString().toLowerCase().includes('crore') || priceStr.toString().toLowerCase().includes('cr')) {
      num = num * 10000000;
    }

    if (isNaN(num) || num === 0) return '';

    if (num >= 10000000) {
      return `₹${(num / 10000000).toFixed(2)} Crore`;
    } else if (num >= 100000) {
      return `₹${(num / 100000).toFixed(2)} Lakh`;
    } else if (num >= 1000) {
      return `₹${(num / 1000).toFixed(2)} Thousand`;
    }
    return `₹${num}`;
  };

  const handleSubmit = async () => {
    // CRITICAL: Block all publishing if form was discarded
    if (isDiscarded) {
      console.log('Publishing blocked: Form was discarded');
      return;
    }

    // Always validate step 5 (images and contact) before submission
    if (!validateStep(5)) {
      // Switch to step 5 if validation fails
      setCurrentStep(5);
      return;
    }

    setIsSubmitting(true);
    setUploadingImages(true);

    try {
      // Convert form data to property format
      // Extract numeric price value from string (e.g., "₹45 Lakhs onwards" -> 4500000)
      let priceValue = 0;
      if (formData.startingPrice) {
        const priceStr = formData.startingPrice.replace(/[^\d.]/g, '');
        priceValue = parseFloat(priceStr) || 0;
        // If the string contains "lakh" or "lac", multiply by 100000
        if (formData.startingPrice.toLowerCase().includes('lakh') || formData.startingPrice.toLowerCase().includes('lac')) {
          priceValue = priceValue * 100000;
        } else if (formData.startingPrice.toLowerCase().includes('crore') || formData.startingPrice.toLowerCase().includes('cr')) {
          priceValue = priceValue * 10000000;
        }
      }

      // Validate required fields before submission
      if (!priceValue || priceValue <= 0) {
        throw new Error('Starting price is required and must be greater than 0');
      }

      const propertyData = {
        title: formData.projectName,
        property_type: formData.projectType,
        status: "sale", // Upcoming projects are always for sale
        location: formData.location || formData.area || '',
        latitude: formData.latitude || null,
        longitude: formData.longitude || null,
        state: formData.state || null,
        additional_address: formData.fullAddress || null,
        description: formData.description,
        price: priceValue,
        area: 1, // Required field, set minimum value for upcoming projects (1 sq ft as placeholder)
        project_type: "upcoming", // CRITICAL FLAG
        // Additional upcoming project fields stored as JSON
        upcoming_project_data: {
          builderName: formData.builderName || builderName,
          projectStatus: formData.projectStatus,
          startingPrice: formData.startingPrice || null,
          reraNumber: formData.reraNumber || null,
          configurations: formData.configurations,
          carpetAreaRange: formData.carpetAreaRange || null,
          numberOfTowers: formData.numberOfTowers || null,
          totalUnits: formData.totalUnits || null,
          floorsCount: formData.floorsCount || null,
          unitsPerFloor: formData.unitsPerFloor || null,
          numberOfVillas: formData.numberOfVillas || null,
          numberOfPlots: formData.numberOfPlots || null,
          bedCapacity: formData.bedCapacity || null,
          loadingDocks: formData.loadingDocks || null,
          pricePerSqft: formData.pricePerSqft || null,
          bookingAmount: formData.bookingAmount || null,
          expectedLaunchDate: formData.expectedLaunchDate || null,
          expectedPossessionDate: formData.expectedPossessionDate || null,
          reraStatus: formData.reraStatus || null,
          landOwnershipType: formData.landOwnershipType || null,
          bankApproved: formData.bankApproved || null,
          approvedBanks: (() => {
            // Combine selected banks and custom bank names
            const banks = [...(formData.approvedBanks || [])];
            // Remove "Other" from the array as it's just a trigger
            const banksWithoutOther = banks.filter(b => b !== 'Other');
            if (formData.otherBankName && formData.otherBankName.trim()) {
              // Parse comma-separated custom bank names and add them
              const customBanks = formData.otherBankName.split(',').map(b => b.trim()).filter(b => b);
              banksWithoutOther.push(...customBanks);
            }
            return banksWithoutOther;
          })(),
          salesPersons: (formData.salesPersons || []).filter(sp => sp.name?.trim() || sp.number?.trim() || sp.email?.trim()).map(sp => ({
            name: sp.name || null,
            number: sp.number || null,
            email: sp.email || null,
            landlineNumber: sp.landlineNumber?.trim() || null,
            whatsappNumber: sp.whatsappNumber?.trim() || null,
            alternativeNumber: sp.alternativeNumber?.trim() || null
          })),
          salesName: formData.salesPersons?.[0]?.name || null,
          salesNumber: formData.salesPersons?.[0]?.number || null,
          emailId: formData.salesPersons?.[0]?.email || null,
          landlineNumber: formData.salesPersons?.[0]?.landlineNumber?.trim() || formData.landlineNumber || null,
          whatsappNumber: formData.salesPersons?.[0]?.whatsappNumber?.trim() || formData.whatsappNumber || null,
          alternativeNumber: formData.salesPersons?.[0]?.alternativeNumber?.trim() || formData.alternativeNumber || null,
          projectHighlights: formData.projectHighlights || null,
          usp: formData.usp || null,
          pincode: formData.pincode || null,
          mapLink: formData.mapLink || null
        },
        images: [],
        amenities: formData.amenities || []
      };

      let propertyId;

      if (isEditMode && editData && editData.id) {
        // UPDATE MODE: Update existing upcoming project
        try {
          console.log('Updating upcoming project:', editData.id, propertyData);

          // Call API directly with the same structure as create
          const response = await sellerPropertiesAPI.update(editData.id, propertyData);

          if (!response.success) {
            throw new Error(response.message || 'Failed to update upcoming project');
          }

          propertyId = editData.id;
          console.log('Upcoming project updated successfully:', propertyId);

          // Refresh data after successful update
          if (refreshData) {
            await refreshData();
          }
        } catch (error) {
          console.error('Upcoming project update failed - Full error:', error);
          console.error('Error details:', {
            message: error.message,
            status: error.status,
            errors: error.errors,
            data: error.data,
            response: error.response
          });

          // Extract validation errors if available
          let errorMessage = 'Failed to update project. Please try again.';

          // Check various error formats
          if (error.message) {
            errorMessage = error.message;
          } else if (error.errors && typeof error.errors === 'object') {
            const errorList = Object.values(error.errors).join(', ');
            errorMessage = `Validation failed: ${errorList}`;
          } else if (error.data?.errors && typeof error.data.errors === 'object') {
            const errorList = Object.values(error.data.errors).join(', ');
            errorMessage = `Validation failed: ${errorList}`;
          } else if (error.data?.message) {
            errorMessage = error.data.message;
          } else if (error.response?.data?.errors) {
            const errorList = Object.values(error.response.data.errors).join(', ');
            errorMessage = `Validation failed: ${errorList}`;
          } else if (error.response?.data?.message) {
            errorMessage = error.response.data.message;
          }

          console.error('Final error message:', errorMessage);
          throw new Error(errorMessage);
        }
      } else {
        // CREATE MODE: Create new upcoming project
        let createdProperty;
        try {
          console.log('Submitting property data:', propertyData);
          createdProperty = await addProperty(propertyData);
          console.log('Property created successfully:', createdProperty);
        } catch (error) {
          console.error('Property creation failed - Full error:', error);
          console.error('Error details:', {
            message: error.message,
            status: error.status,
            errors: error.errors,
            data: error.data,
            response: error.response
          });

          // Extract validation errors if available
          let errorMessage = 'Failed to create project. Please try again.';

          // Check various error formats
          if (error.message) {
            errorMessage = error.message;
          } else if (error.errors && typeof error.errors === 'object') {
            const errorList = Object.values(error.errors).join(', ');
            errorMessage = `Validation failed: ${errorList}`;
          } else if (error.data?.errors && typeof error.data.errors === 'object') {
            const errorList = Object.values(error.data.errors).join(', ');
            errorMessage = `Validation failed: ${errorList}`;
          } else if (error.data?.message) {
            errorMessage = error.data.message;
          } else if (error.response?.data?.errors) {
            const errorList = Object.values(error.response.data.errors).join(', ');
            errorMessage = `Validation failed: ${errorList}`;
          } else if (error.response?.data?.message) {
            errorMessage = error.response.data.message;
          }

          console.error('Final error message:', errorMessage);
          throw new Error(errorMessage);
        }

        if (!createdProperty || !createdProperty.id) {
          throw new Error('Failed to get project ID after creation.');
        }

        propertyId = createdProperty.id;
      }

      // Upload images with moderation (images already validated on selection)
      // Get approved images from validation status
      const approvedImages = imageValidationStatus.filter(img => img.status === 'approved');

      if (approvedImages.length > 0) {
        setUploadingImages(true);
        try {
          // Upload each approved image with property ID
          const uploadPromises = approvedImages.map(async (imgObj, index) => {
            try {
              console.log(`Uploading image ${index + 1}/${approvedImages.length}:`, imgObj.file.name);
              const response = await sellerPropertiesAPI.uploadImage(imgObj.file, propertyId);
              console.log(`Image ${index + 1} upload response:`, response);

              if (response.success && response.data) {
                const imageUrl = response.data.image_url || response.data.url;
                if (imageUrl) {
                  return { success: true, url: imageUrl };
                }
              }
              return { success: false, error: response.message || 'Upload failed - no URL returned' };
            } catch (error) {
              console.error(`Image ${index + 1} upload error:`, error);
              return {
                success: false,
                error: error.message || error.status || 'Upload failed',
                details: error
              };
            }
          });

          const results = await Promise.all(uploadPromises);
          const successful = results.filter(r => r.success);
          const failed = results.filter(r => !r.success);

          console.log(`Image upload results: ${successful.length} successful, ${failed.length} failed`);

          if (failed.length > 0) {
            console.warn('Failed image uploads:', failed);
            // Show warning but don't fail the entire project creation
            const errorMessages = failed.map((f, i) => `Image ${i + 1}: ${f.error}`).join('; ');
            console.warn(`Some images failed to upload: ${errorMessages}`);
          }

          if (successful.length === 0 && approvedImages.length > 0) {
            console.warn('All images failed to upload, but project was created successfully');
          }
        } catch (uploadError) {
          console.error('Image upload batch error:', uploadError);
          // Don't throw - project was created successfully
        } finally {
          setUploadingImages(false);
        }
      } else if (imageFiles.length > 0) {
        // Images were selected but none approved
        console.warn('No approved images found. Project created without images.');
      }

      setUploadingImages(false);
      setIsPublished(true); // Mark as published before closing
      alert(isEditMode
        ? 'Upcoming project updated successfully!'
        : 'Upcoming project published successfully! It is now visible to buyers.');

      // Refresh data after successful update/create
      if (refreshData) {
        await refreshData();
      }

      onClose();
    } catch (error) {
      console.error('Project save error:', error);
      alert(error.message || 'Failed to save project. Please try again.');
    } finally {
      setIsSubmitting(false);
      setUploadingImages(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="step-indicator">
      {STEPS.map((step, idx) => {
        const isCompleted = isStepCompleted(step.id);
        const isClickable = isCompleted || step.id === currentStep;

        return (
          <div
            key={step.id}
            className={`step-item ${currentStep === step.id ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isClickable ? 'clickable' : ''}`}
          >
            <div
              className="step-circle"
              onClick={() => isClickable && handleStepClick(step.id)}
              style={{ cursor: isClickable ? 'pointer' : 'default' }}
            >
              {isCompleted ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <span>{step.icon}</span>
              )}
            </div>
            <span className="step-title">{step.title}</span>
            {idx < STEPS.length - 1 && <div className="step-line" />}
          </div>
        );
      })}
    </div>
  );

  // Step 1: Basic Project Information
  const renderStep1 = () => (
    <div className="step-content">
      <div style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500' }}>
          Step {currentStep} of {STEPS.length} — {STEPS[currentStep - 1].title}
        </span>
      </div>
      <h3 className="step-heading">Basic Details</h3>
      <p className="step-subheading">Let's start with the basic details of your upcoming project</p>

      <div className="form-group">
        <label>Project Name <span className="required">*</span></label>
        <input
          type="text"
          value={formData.projectName}
          onChange={(e) => handleChange('projectName', e.target.value)}
          placeholder="e.g., Green Valley Residency"
          className={errors.projectName ? 'error' : ''}
        />
        {errors.projectName && <span className="error-text">{errors.projectName}</span>}
      </div>

      <div className="form-group">
        <label>Builder / Developer Name</label>
        <input
          type="text"
          value={formData.builderName || builderName}
          onChange={(e) => handleChange('builderName', e.target.value)}
          placeholder="Auto-filled from your account"
          disabled
          style={{ background: '#f3f4f6', cursor: 'not-allowed' }}
        />
      </div>

      <div className="form-group">
        <label>Project Type <span className="required">*</span></label>
        <div className={`property-type-grid ${errors.projectType ? 'error' : ''}`}>
          {PROJECT_TYPES.map(type => (
            <button
              key={type.value}
              type="button"
              className={`property-type-btn ${formData.projectType === type.value ? 'active' : ''}`}
              onClick={() => handleChange('projectType', type.value)}
            >
              <span className="type-icon">{type.icon}</span>
              <span className="type-label">{type.value}</span>
            </button>
          ))}
        </div>
        {errors.projectType && <span className="error-text">{errors.projectType}</span>}
      </div>

      <div className="form-group">
        <label>Project Status <span className="required">*</span></label>
        <select
          value={formData.projectStatus}
          onChange={(e) => handleChange('projectStatus', e.target.value)}
          className={errors.projectStatus ? 'error' : ''}
        >
          {PROJECT_STATUS_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        {errors.projectStatus && <span className="error-text">{errors.projectStatus}</span>}
      </div>

      <div className="form-group">
        <label>RERA Number (Optional but recommended)</label>
        <input
          type="text"
          value={formData.reraNumber}
          onChange={(e) => handleChange('reraNumber', e.target.value)}
          placeholder="e.g., RERA/PKR/2019/001234"
        />
      </div>

      <div className="form-group">
        <label>Project Description <span className="required">*</span></label>
        <textarea
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Provide a detailed overview of your project (minimum 100 characters)"
          rows={6}
          maxLength={1000}
          className={errors.description ? 'error' : ''}
        />
        <div className="char-count" style={{
          color: formData.description.length < 100 ? '#dc2626' : 'inherit'
        }}>
          {formData.description.length}/1000 {formData.description.length < 100 && `(minimum 100 required)`}
        </div>
        {errors.description && <span className="error-text">{errors.description}</span>}
      </div>
    </div>
  );

  // Step 2: Location Details
  const renderStep2 = () => (
    <div className="step-content">
      <div style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500' }}>
          Step {currentStep} of {STEPS.length} — {STEPS[currentStep - 1].title}
        </span>
      </div>
      <h3 className="step-heading">Location</h3>
      <p className="step-subheading">Where is your project located?</p>

      <div className="form-group">
        <label>Location <span className="required">*</span></label>
        <LocationAutoSuggest
          placeholder="Enter locality, area or landmark"
          value={formData.location || formData.area || ''}
          onChange={handleLocationDropdownSelect}
          className={errors.location || errors.area ? 'error' : ''}
          error={errors.location || errors.area}
        />
        {(errors.location || errors.area) && (
          <span className="error-text">{errors.location || errors.area}</span>
        )}
      </div>

      {/* Location Picker Button */}
      <div className="form-group-map">
        <label>Project Location on Map (Optional)</label>
        {!formData.latitude || !formData.longitude ? (
          <>
            <button
              type="button"
              className="location-picker-btn"
              onClick={() => setShowLocationPicker(true)}
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                background: 'white',
                border: '2px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: '600',
                color: 'var(--text-primary)',
                transition: 'all var(--transition-fast)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-color)';
                e.currentTarget.style.color = 'var(--accent-color)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" />
                <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" />
              </svg>
              <span>Add Location on Map</span>
            </button>
            <span className="hint-text" style={{
              display: 'block',
              marginTop: '0.5rem',
              fontSize: '0.85rem',
              color: 'var(--text-muted)'
            }}>
              Select exact location on map for better visibility
            </span>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="location-icon" style={{ fontSize: '18px' }}>📍</span>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.875rem', color: '#059669', fontWeight: '500' }}>
                  Location set on map
                </span>
              </div>
            </div>
            <small className="location-picker-coordinates" style={{
              marginLeft: '26px',
              fontSize: '0.75rem',
              color: '#059669',
              fontFamily: 'monospace'
            }}>
              Coordinates: {parseFloat(formData.latitude).toFixed(6)}, {parseFloat(formData.longitude).toFixed(6)}
            </small>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                className="location-picker-change-btn"
                onClick={() => setShowLocationPicker(true)}
                style={{
                  padding: '6px 12px',
                  fontSize: '0.875rem',
                  backgroundColor: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: '#374151',
                  fontWeight: '500'
                }}
              >
                Change Location
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormData(prev => ({ ...prev, latitude: '', longitude: '' }));
                }}
                style={{
                  padding: '6px 12px',
                  fontSize: '0.875rem',
                  backgroundColor: '#fee2e2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: '#991b1b',
                  fontWeight: '500'
                }}
              >
                Remove
              </button>
            </div>
          </div>
        )}
      </div>

      {/* State and Additional Address Fields */}
      <div className={`form-row two-cols ${stateDropdownOpen ? 'state-dropdown-row-active' : ''}`}>
        <div className={`form-group ${stateDropdownOpen ? 'state-dropdown-open' : ''}`}>
          <label>
            State <span className="required">*</span>
            {stateAutoFilled && (
              <span style={{
                fontSize: '0.75rem',
                color: '#059669',
                marginLeft: '8px',
                fontWeight: 'normal'
              }}>
                (Auto-filled from location)
              </span>
            )}
          </label>
          <div style={{ position: 'relative' }} ref={stateDropdownRef}>
            <input
              type="text"
              placeholder="Enter state or select from list"
              value={formData.state || ''}
              onChange={(e) => {
                handleChange('state', e.target.value);
                if (stateAutoFilled && e.target.value !== formData.state) setStateAutoFilled(false);
                setStateDropdownOpen(true);
              }}
              onFocus={() => !stateAutoFilled && setStateDropdownOpen(true)}
              className={errors.state ? 'error' : ''}
              readOnly={stateAutoFilled}
              disabled={stateAutoFilled}
              style={stateAutoFilled ? {
                background: '#f3f4f6',
                cursor: 'not-allowed',
                color: '#374151'
              } : {}}
              autoComplete="off"
            />
            {stateAutoFilled && (
              <button
                type="button"
                onClick={() => {
                  setStateAutoFilled(false);
                  setStateDropdownOpen(true);
                }}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#7c3aed',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  zIndex: 10
                }}
                title="Edit state manually"
              >
                Edit
              </button>
            )}
            {!stateAutoFilled && stateDropdownOpen && (formData.state || '').trim().length >= 2 && (
              <ul
                className="state-suggestions-dropdown"
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  margin: 0,
                  padding: 0,
                  listStyle: 'none',
                  background: '#fff',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  maxHeight: '220px',
                  overflowY: 'auto',
                  zIndex: 100
                }}
              >
                {INDIAN_STATES.filter(s =>
                  s.toLowerCase().includes((formData.state || '').toLowerCase())
                ).slice(0, 15).map(state => (
                  <li
                    key={state}
                    onClick={() => {
                      handleChange('state', state);
                      setStateDropdownOpen(false);
                      if (errors.state) setErrors(prev => ({ ...prev, state: null }));
                    }}
                    style={{
                      padding: '10px 12px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      borderBottom: '1px solid #f3f4f6'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f3f4f6'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
                  >
                    {state}
                  </li>
                ))}
                {INDIAN_STATES.filter(s =>
                  s.toLowerCase().includes((formData.state || '').toLowerCase())
                ).length === 0 && (
                    <li style={{ padding: '10px 12px', color: '#6b7280', fontSize: '0.9rem' }}>
                      No matching state
                    </li>
                  )}
              </ul>
            )}
          </div>
          {errors.state && <span className="error-text">{errors.state}</span>}
        </div>

        <div className="form-group">
          <label>Additional Address <span className="required">*</span></label>
          <input
            type="text"
            placeholder="Enter additional address details"
            value={formData.fullAddress || ''}
            onChange={(e) => handleChange('fullAddress', e.target.value)}
            className={errors.fullAddress ? 'error' : ''}
          />
          {errors.fullAddress && <span className="error-text">{errors.fullAddress}</span>}
        </div>
      </div>

      <div className="form-group">
        <label>Pincode <span className="required">*</span></label>
        <input
          type="text"
          value={formData.pincode || ''}
          onChange={(e) => handleChange('pincode', e.target.value.replace(/\D/g, ''))}
          placeholder="Enter 6-digit pincode"
          maxLength={6}
          className={errors.pincode ? 'error' : ''}
        />
        {errors.pincode && <span className="error-text">{errors.pincode}</span>}
      </div>
    </div>
  );

  // Step 3: Configuration & Inventory — options and fields depend on project type
  const configurationOptions = formData.projectType
    ? (CONFIGURATION_BY_PROJECT_TYPE[formData.projectType] || [])
    : [];
  const pt = formData.projectType;
  const isPlotOrLand = pt === "Plot / Land / Indusrtial Property";
  const isWarehouse = pt === "Warehouse / Godown";
  const isCommercialOffice = pt === "Commercial Office";
  const isCoworking = pt === "Co-working Space";
  const isVilla = pt === "Villa / Banglow";
  const isIndependentHouse = pt === "Independent House";
  const isPGHostel = pt === "PG / Hostel";
  const isApartment = pt === "Apartment";
  // Area label by type
  const areaLabel = isPlotOrLand ? "Plot Size Range (sq.ft)" : (isCommercialOffice || isCoworking || pt === "Commercial Shop") ? "Area Range" : isWarehouse ? "Built-up Area Range" : isPGHostel ? "Carpet Area Range" : "Carpet Area Range (sq.ft)";
  const areaSuffix = "sq.ft";

  const renderStep3 = () => (
    <div className="step-content">
      <div style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500' }}>
          Step {currentStep} of {STEPS.length} — {STEPS[currentStep - 1].title}
        </span>
      </div>
      <h3 className="step-heading">Configuration</h3>
      <p className="step-subheading">
        {formData.projectType
          ? `Configurations for ${formData.projectType}`
          : "Select project type in Step 1 to see configuration options"}
      </p>

      <div className="form-group">
        <label>Property Configurations <span className="required">*</span></label>
        {configurationOptions.length > 0 ? (
          <>
            <div className={`amenities-grid ${errors.configurations ? 'error' : ''}`}>
              {configurationOptions.map(config => (
                <button
                  key={config}
                  type="button"
                  className={`amenity-btn ${formData.configurations.includes(config) ? 'active' : ''}`}
                  onClick={() => toggleConfiguration(config)}
                >
                  {config}
                </button>
              ))}
            </div>
            {errors.configurations && <span className="error-text">{errors.configurations}</span>}
          </>
        ) : (
          <p className="step-subheading" style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
            Please select a project type in Step 1 (Basic Details) first.
          </p>
        )}
      </div>

      <div className="form-group">
        <label>{areaLabel} <span className="required">*</span></label>
        <div className="input-with-suffix">
          <input
            type="text"
            value={formData.carpetAreaRange}
            onChange={(e) => handleCarpetAreaChange(e.target.value)}
            placeholder={isPlotOrLand ? "e.g., 500 - 2000" : "e.g., 650 - 1200"}
            className={errors.carpetAreaRange ? 'error' : ''}
          />
          <span className="suffix">{areaSuffix}</span>
        </div>
        {errors.carpetAreaRange && <span className="error-text">{errors.carpetAreaRange}</span>}
      </div>

      {/* Apartment: Number of Towers, Units per floor (optional) */}
      {isApartment && (
        <div className="form-row">
          <div className="form-group">
            <label>Number of Towers</label>
            <input
              type="number"
              value={formData.numberOfTowers}
              onChange={(e) => handleChange('numberOfTowers', e.target.value)}
              placeholder="e.g., 3"
              min="1"
            />
          </div>
          <div className="form-group">
            <label>Units per floor (optional)</label>
            <input
              type="number"
              value={formData.unitsPerFloor}
              onChange={(e) => handleChange('unitsPerFloor', e.target.value)}
              placeholder="e.g., 4"
              min="1"
            />
          </div>
        </div>
      )}

      {/* Villa: Number of Villas */}
      {isVilla && (
        <div className="form-group">
          <label>Number of Villas</label>
          <input
            type="number"
            value={formData.numberOfVillas}
            onChange={(e) => handleChange('numberOfVillas', e.target.value)}
            placeholder="e.g., 24"
            min="1"
          />
        </div>
      )}

      {/* Independent House: Total Units */}
      {isIndependentHouse && (
        <div className="form-group">
          <label>Total Units</label>
          <input
            type="number"
            value={formData.totalUnits}
            onChange={(e) => handleChange('totalUnits', e.target.value)}
            placeholder="e.g., 50"
            min="1"
          />
        </div>
      )}

      {/* Row House / Farm House: Total Units */}
      {pt === "Row House/ Farm House" && (
        <div className="form-group">
          <label>Total Units</label>
          <input
            type="number"
            value={formData.totalUnits}
            onChange={(e) => handleChange('totalUnits', e.target.value)}
            placeholder="e.g., 30"
            min="1"
          />
        </div>
      )}

      {/* Penthouse: Number of Towers (optional for standalone) */}
      {pt === "Penthouse" && (
        <div className="form-group">
          <label>Number of Towers</label>
          <input
            type="number"
            value={formData.numberOfTowers}
            onChange={(e) => handleChange('numberOfTowers', e.target.value)}
            placeholder="e.g., 2"
            min="1"
          />
        </div>
      )}

      {/* Studio Apartment: Number of Towers, Units per floor (optional) */}
      {pt === "Studio Apartment" && (
        <div className="form-row">
          <div className="form-group">
            <label>Number of Towers</label>
            <input
              type="number"
              value={formData.numberOfTowers}
              onChange={(e) => handleChange('numberOfTowers', e.target.value)}
              placeholder="e.g., 1"
              min="1"
            />
          </div>
          <div className="form-group">
            <label>Units per floor (optional)</label>
            <input
              type="number"
              value={formData.unitsPerFloor}
              onChange={(e) => handleChange('unitsPerFloor', e.target.value)}
              placeholder="e.g., 8"
              min="1"
            />
          </div>
        </div>
      )}

      {/* Plot / Land: Number of Plots — no towers */}
      {isPlotOrLand && (
        <div className="form-group">
          <label>Number of Plots</label>
          <input
            type="number"
            value={formData.numberOfPlots}
            onChange={(e) => handleChange('numberOfPlots', e.target.value)}
            placeholder="e.g., 100"
            min="1"
          />
        </div>
      )}

      {/* Commercial Office: Number of Floors / Towers */}
      {isCommercialOffice && (
        <div className="form-group">
          <label>Number of Floors / Towers</label>
          <input
            type="number"
            value={formData.numberOfTowers}
            onChange={(e) => handleChange('numberOfTowers', e.target.value)}
            placeholder="e.g., 5"
            min="1"
          />
        </div>
      )}

      {/* PG / Hostel: Bed Capacity — no towers */}
      {isPGHostel && (
        <div className="form-group">
          <label>Bed Capacity</label>
          <input
            type="number"
            value={formData.bedCapacity}
            onChange={(e) => handleChange('bedCapacity', e.target.value)}
            placeholder="e.g., 50"
            min="1"
          />
        </div>
      )}

      {/* Warehouse: Loading Docks (optional) */}
      {isWarehouse && (
        <div className="form-group">
          <label>Loading Docks (optional)</label>
          <input
            type="number"
            value={formData.loadingDocks}
            onChange={(e) => handleChange('loadingDocks', e.target.value)}
            placeholder="e.g., 4"
            min="0"
          />
        </div>
      )}
    </div>
  );

  // Step 4: Pricing & Amenities
  const renderStep4 = () => (
    <div className="step-content">
      <div style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500' }}>
          Step {currentStep} of {STEPS.length} — {STEPS[currentStep - 1].title}
        </span>
      </div>
      <h3 className="step-heading">Pricing & Amenities</h3>
      <p className="step-subheading">Set pricing details and select amenities for your project</p>

      <div className="form-group">
        <label>Starting Price <span className="required">*</span></label>
        <div className="price-input-wrapper">
          <span className="currency">₹</span>
          <input
            type="text"
            value={formData.startingPrice}
            onChange={(e) => handlePriceChange('startingPrice', e.target.value)}
            placeholder="e.g., 4500000 or 45-60"
            className={errors.startingPrice ? 'error' : ''}
          />
        </div>
        {formData.startingPrice && (
          <span className="price-words">
            Price: {formatPriceInWords(formData.startingPrice)}
          </span>
        )}
        {errors.startingPrice && <span className="error-text">{errors.startingPrice}</span>}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Price per Sq.ft (Optional)</label>
          <div className="price-input-wrapper">
            <span className="currency">₹</span>
            <input
              type="text"
              value={formData.pricePerSqft}
              onChange={(e) => handlePriceChange('pricePerSqft', e.target.value)}
              placeholder="e.g., 5000 or 5000-6000"
            />
          </div>
          {formData.pricePerSqft && (
            <span className="price-words">
              Price: {formatPriceInWords(formData.pricePerSqft)}/sq.ft
            </span>
          )}
        </div>

        <div className="form-group">
          <label>Booking Amount Price (Optional)</label>
          <div className="price-input-wrapper">
            <span className="currency">₹</span>
            <input
              type="text"
              value={formData.bookingAmount}
              onChange={(e) => handlePriceChange('bookingAmount', e.target.value)}
              placeholder="e.g., 200000 or 1.5-2.5"
            />
          </div>
          {formData.bookingAmount && (
            <span className="price-words">
              Price: {formatPriceInWords(formData.bookingAmount)}
            </span>
          )}
        </div>
      </div>

      <div className={`form-row ${launchDatePickerOpen || possessionDatePickerOpen ? 'state-dropdown-row-active' : ''}`}>
        <div className={`form-group ${launchDatePickerOpen ? 'state-dropdown-open' : ''}`}>
          <label>Launch Date</label>
          <ModernDatePicker
            value={formData.expectedLaunchDate}
            onChange={(val) => handleChange('expectedLaunchDate', val)}
            placeholder="Select launch date"
            onOpenChange={setLaunchDatePickerOpen}
          />
        </div>

        <div className={`form-group ${possessionDatePickerOpen ? 'state-dropdown-open' : ''}`}>
          <label>Expected Possession Date</label>
          <ModernDatePicker
            value={formData.expectedPossessionDate}
            onChange={(val) => handleChange('expectedPossessionDate', val)}
            placeholder="Select possession date"
            onOpenChange={setPossessionDatePickerOpen}
          />
        </div>
      </div>

      <div className="form-group" style={{ marginTop: '2rem' }}>
        <label>Amenities <span className="required">*</span></label>
        <div className={`amenities-grid ${errors.amenities ? 'error' : ''}`}>
          {AMENITIES.map(amenity => (
            <button
              key={amenity.id}
              type="button"
              className={`amenity-btn ${formData.amenities.includes(amenity.id) ? 'active' : ''}`}
              onClick={() => toggleAmenity(amenity.id)}
            >
              <span className="amenity-icon">{amenity.icon}</span>
              <span className="amenity-label">{amenity.label}</span>
              {formData.amenities.includes(amenity.id) && (
                <span className="check-icon">✓</span>
              )}
            </button>
          ))}
        </div>
        {errors.amenities && <span className="error-text">{errors.amenities}</span>}
      </div>
    </div>
  );

  // Step 5: Media & Contact
  const renderStep5 = () => (
    <div className="step-content">
      <div style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500' }}>
          Step {currentStep} of {STEPS.length} — {STEPS[currentStep - 1].title}
        </span>
      </div>
      <h3 className="step-heading">Media & Contact</h3>
      <p className="step-subheading">Upload project images and provide contact information</p>

      <div className="form-group">
        <label>Project Cover Image</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const url = URL.createObjectURL(file);
              handleChange('coverImage', { file, url });
            }
          }}
        />
        {formData.coverImage && (
          <div style={{ marginTop: '10px' }}>
            <img src={formData.coverImage.url} alt="Cover" style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: '8px' }} />
          </div>
        )}
      </div>

      <div className="form-group">
        <label>Project Images <span className="required">*</span> (Concept images / 3D renders allowed)</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <input
            ref={imagesRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            style={{ display: 'none' }}
            disabled={formData.projectImages?.length >= 20}
          />
          <button
            type="button"
            className="cancel-btn"
            onClick={() => imagesRef.current?.click()}
            disabled={formData.projectImages?.length >= 20}
            style={{
              background: formData.projectImages?.length >= 20 ? '#f3f4f6' : 'white',
              border: '2px solid var(--border-color)',
              cursor: formData.projectImages?.length >= 20 ? 'not-allowed' : 'pointer',
              opacity: formData.projectImages?.length >= 20 ? 0.6 : 1
            }}
          >
            📷 Upload Images (Max 20)
          </button>
          <span style={{
            fontSize: '0.875rem',
            color: formData.projectImages?.length < 2 ? '#dc2626' : '#059669',
            fontWeight: '500'
          }}>
            Images uploaded: {formData.projectImages?.length || 0} / 20
          </span>
        </div>
        {formData.projectImages?.length < 2 && (
          <div style={{
            marginBottom: '8px',
            padding: '8px 12px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '4px',
            color: '#991b1b',
            fontSize: '0.875rem'
          }}>
            ⚠️ Please upload at least 2 images to continue.
          </div>
        )}
        {errors.projectImages && <span className="error-text">{errors.projectImages}</span>}

        <div className="image-preview-grid" style={{ marginTop: '15px' }}>
          {formData.projectImages.map((img, idx) => {
            const validationStatus = imageValidationStatus[idx] || { status: 'pending', errorMessage: '' };

            return (
              <div key={idx} className={`preview-item image-validation-item ${validationStatus.status}`}>
                <img src={img} alt={`Project ${idx + 1}`} />

                {/* Validation Overlays */}
                {validationStatus.status === 'checking' && (
                  <div className="validation-overlay checking-overlay">
                    <div className="overlay-content">
                      <div className="spinner"></div>
                      <p className="status-message-text">Checking...</p>
                    </div>
                  </div>
                )}

                {validationStatus.status === 'approved' && (
                  <div className="validation-overlay approved-overlay">
                    <div className="overlay-content">
                      <svg className="checkmark" width="32" height="32" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <p className="approved-text">Approved</p>
                    </div>
                  </div>
                )}

                {validationStatus.status === 'rejected' && (
                  <div className="validation-overlay rejected-overlay">
                    <div className="overlay-content">
                      <svg className="x-icon" width="32" height="32" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                      <p className="rejected-title">REJECTED</p>
                      <p className="rejected-message">{validationStatus.errorMessage || 'Image rejected'}</p>
                      <button
                        type="button"
                        className="remove-rejected-btn"
                        onClick={() => removeImage(idx)}
                      >
                        Remove & Try Again
                      </button>
                    </div>
                  </div>
                )}

                {/* Status Badge */}
                {validationStatus.status === 'approved' && (
                  <div className="status-badge approved-badge">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}

                {validationStatus.status === 'rejected' && (
                  <div className="status-badge rejected-badge">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                )}

                {/* Remove Button - ALWAYS visible (except when checking) */}
                {validationStatus.status !== 'checking' && (
                  <button
                    type="button"
                    className="remove-image-btn"
                    onClick={() => removeImage(idx)}
                    title="Remove image"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Warning if rejected images exist */}
        {imageValidationStatus.some(img => img.status === 'rejected') && (
          <div className="image-validation-warning">
            <strong>⚠️ Remove rejected images to continue</strong>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>
              {imageValidationStatus.filter(img => img.status === 'rejected').length} image(s) were rejected.
              Please remove them and upload valid property images only.
            </p>
          </div>
        )}

        {/* Success message if all approved */}
        {imageValidationStatus.length > 0 &&
          imageValidationStatus.every(img => img.status === 'approved') &&
          !isCheckingImages && (
            <div className="image-validation-success" style={{
              background: '#e8f5e9',
              color: '#2e7d32',
              padding: '12px',
              borderRadius: '4px',
              marginTop: '16px',
              fontSize: '14px',
              border: '1px solid #4CAF50',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>✅</span>
              <span>All images approved!</span>
            </div>
          )}
      </div>

      <div className="form-group">
        <label>Brochure (PDF)</label>
        <input
          ref={brochureRef}
          type="file"
          accept=".pdf"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleChange('brochure', { file, name: file.name });
            }
          }}
          style={{ display: 'none' }}
        />
        <button
          type="button"
          className="cancel-btn"
          onClick={() => brochureRef.current?.click()}
          style={{ background: 'white', border: '2px solid var(--border-color)' }}
        >
          📑 Upload Brochure
        </button>
        {formData.brochure && <div style={{ marginTop: '10px' }}>📄 {formData.brochure.name}</div>}
      </div>

      {/* Contact Information Section */}
      <div className="form-group" style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--border-color)' }}>
        <h3 className="step-heading" style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Contact Information</h3>
        <p className="step-subheading" style={{ fontSize: '0.9rem', marginBottom: '1.25rem' }}>How can buyers reach you? Add one or more sales person details.</p>

        {(formData.salesPersons || [{ name: '', number: '', email: '', landlineNumber: '', whatsappNumber: '', alternativeNumber: '' }]).map((sp, idx) => (
          <div key={idx} style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: '#fafafa' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Sales Person {idx + 1}</span>
              {(formData.salesPersons || []).length > 1 && (
                <button
                  type="button"
                  onClick={() => removeSalesPerson(idx)}
                  style={{ padding: '4px 10px', fontSize: '0.8rem', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Remove
                </button>
              )}
            </div>
            <div className="form-row two-cols">
              <div className="form-group">
                <label>Name <span className="required">*</span></label>
                <input
                  type="text"
                  value={sp.name}
                  onChange={(e) => updateSalesPerson(idx, 'name', e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                  placeholder="Sales person name (letters only)"
                  className={errors[`salesPerson_name_${idx}`] ? 'error' : ''}
                />
                {errors[`salesPerson_name_${idx}`] && <span className="error-text">{errors[`salesPerson_name_${idx}`]}</span>}
              </div>
              <div className="form-group">
                <label>Contact Number <span className="required">*</span></label>
                <input
                  type="tel"
                  value={sp.number}
                  onChange={(e) => updateSalesPerson(idx, 'number', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  className={errors[`salesPerson_number_${idx}`] ? 'error' : ''}
                />
                {errors[`salesPerson_number_${idx}`] && <span className="error-text">{errors[`salesPerson_number_${idx}`]}</span>}
              </div>
            </div>
            <div className="form-group">
              <label>Email ID <span className="required">*</span></label>
              <input
                type="email"
                value={sp.email}
                onChange={(e) => updateSalesPerson(idx, 'email', e.target.value)}
                placeholder="Email address"
                className={errors[`salesPerson_email_${idx}`] ? 'error' : ''}
              />
              {errors[`salesPerson_email_${idx}`] && <span className="error-text">{errors[`salesPerson_email_${idx}`]}</span>}
            </div>
            <div className="form-group">
              <label>Landline Number (Optional)</label>
              <input
                type="tel"
                value={sp.landlineNumber ?? ''}
                onChange={(e) => updateSalesPerson(idx, 'landlineNumber', e.target.value.replace(/[^\d\s\-]/g, ''))}
                placeholder="e.g. 020-12345678 or 0123-1234567"
                maxLength={15}
              />
            </div>
            <div className="form-row two-cols">
              <div className="form-group">
                <label>WhatsApp Number (Optional)</label>
                <input
                  type="tel"
                  value={sp.whatsappNumber ?? ''}
                  onChange={(e) => updateSalesPerson(idx, 'whatsappNumber', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit Mobile number"
                  maxLength={10}
                />
              </div>
              <div className="form-group">
                <label>Alternative Number (Optional)</label>
                <input
                  type="tel"
                  value={sp.alternativeNumber ?? ''}
                  onChange={(e) => updateSalesPerson(idx, 'alternativeNumber', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit mobile number"
                  maxLength={10}
                />
              </div>
            </div>
          </div>
        ))}

        {(formData.salesPersons || []).length < 5 && (
          <button
            type="button"
            onClick={addSalesPerson}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              marginBottom: '1.25rem',
              background: 'white',
              border: '2px dashed var(--border-color)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '600',
              color: 'var(--accent-color, #7c3aed)'
            }}
          >
            <span>+ Add another sales person</span>
          </button>
        )}
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      default: return renderStep1();
    }
  };

  return (
    <>
      {/* Close Warning Modal - Show when trying to close on final step without publishing */}
      {showCloseWarning && (
        <div className="popup-overlay" style={{ zIndex: 10000 }}>
          <div className="popup-container" style={{ maxWidth: '500px' }}>
            <div className="popup-header">
              <h2>Publishing Not Completed</h2>
              <button
                className="close-btn"
                onClick={() => setShowCloseWarning(false)}
                aria-label="Close"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="popup-body" style={{ padding: '2rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 1rem', color: 'var(--warning-color, #f59e0b)' }}>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                  <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <p style={{ fontSize: '1rem', lineHeight: '1.6', color: 'var(--text-color, #333)' }}>
                  You haven't published this project yet.
                  <br />
                  Please publish before closing, or your data will be lost.
                </p>
              </div>
            </div>
            <div className="popup-footer" style={{ justifyContent: 'center', gap: '1rem' }}>
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setShowCloseWarning(false)}
              >
                Continue Editing
              </button>

            </div>
          </div>
        </div>
      )}

      {/* Main Popup Overlay - Only show if close warning not shown */}
      {!showCloseWarning && (
        <div className="popup-overlay">
          <div className="popup-container" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="popup-header">
              <h2>{isEditMode ? 'Edit Upcoming Project' : 'Add Upcoming Project'}</h2>
              <button className="close-btn" onClick={handleCloseAttempt}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Step Indicator */}
            {renderStepIndicator()}

            {/* Body */}
            <div className="popup-body" ref={popupBodyRef}>
              {renderCurrentStep()}
            </div>

            {/* Footer */}
            <div className="popup-footer">
              {currentStep > 1 && (
                <button type="button" className="back-btn" onClick={handleBack}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Back
                </button>
              )}

              <div className="footer-right">
                <button type="button" className="cancel-btn" onClick={handleCloseAttempt}>
                  Cancel
                </button>

                {currentStep < 5 ? (
                  <button type="button" className="next-btn" onClick={handleNext}>
                    Next
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="submit-btn"
                    onClick={handleSubmit}
                    disabled={isSubmitting || isDiscarded || (formData.projectImages?.length || 0) < 2 || (formData.projectImages?.length || 0) > 20}
                    style={{
                      opacity: (isSubmitting || isDiscarded || (formData.projectImages?.length || 0) < 2 || (formData.projectImages?.length || 0) > 20) ? 0.6 : 1,
                      cursor: (isSubmitting || isDiscarded || (formData.projectImages?.length || 0) < 2 || (formData.projectImages?.length || 0) > 20) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="spinner"></span>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        Publish Project
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Location Picker Modal */}
      {showLocationPicker && (
        <div className="location-picker-modal-overlay" onClick={(e) => {
          if (e.target.classList.contains('location-picker-modal-overlay')) {
            setShowLocationPicker(false);
          }
        }}>
          <LocationPicker
            initialLocation={formData.latitude && formData.longitude ? {
              latitude: parseFloat(formData.latitude),
              longitude: parseFloat(formData.longitude),
              fullAddress: formData.location || formData.fullAddress
            } : null}
            onLocationChange={handleLocationSelect}
            onClose={() => setShowLocationPicker(false)}
          />
        </div>
      )}
    </>
  );
}
