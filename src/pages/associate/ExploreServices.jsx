import { useState, useEffect, useRef } from "react";
import {
  getServiceCategories,
  getServices,
  getServicesByCategory,
  getServicePackages,
} from "../../api/ServicesApi";
import { useSearchParams } from "react-router-dom";
import { Oval } from "react-loader-spinner";

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

function ServiceModal({ service, onClose }) {
  const [stateSearch, setStateSearch] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const stateInputRef = useRef(null);

  const filteredStates = INDIAN_STATES.filter((state) =>
    state.toLowerCase().includes(stateSearch.toLowerCase()),
  );

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleStateSelect = (state) => {
    setSelectedState(state);
    setStateSearch(state);
    setIsDropdownOpen(false);
  };

  const handleCreateDeal = () => {
    const queryParams = new URLSearchParams({
      create: "true",
      state: selectedState,
      category: service.CategoryID || "",
      serviceId: service.ServiceID || "",
      packageId: service.PackageID || "",
      type: service.PackageID ? "package" : "individual",
    });

    window.location.href = `/associate/deals?${queryParams.toString()}`;
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(6px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "white",
          borderRadius: "24px",
          padding: "40px",
          width: "100%",
          maxWidth: "520px",
          boxShadow: "0 32px 64px rgba(0,0,0,0.18)",
          animation: "slideUp 0.25s cubic-bezier(0.4,0,0.2,1)",
          position: "relative",
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            border: "1px solid #e2e8f0",
            backgroundColor: "white",
            cursor: "pointer",
            fontSize: "18px",
            color: "#64748b",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#f8fafc";
            e.currentTarget.style.color = "#0f172a";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "white";
            e.currentTarget.style.color = "#64748b";
          }}
        >
          ×hbt6hb6
        </button>

        {/* Service Header */}
        <div style={{ marginBottom: "28px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "#f0f9ff",
              border: "1px solid #bae6fd",
              borderRadius: "20px",
              padding: "4px 12px",
              marginBottom: "14px",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: "600",
                color: "#0284c7",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              {service.ServiceCode ||
                (service.PackageID ? `PKG-${service.PackageID}` : "SERVICE")}
            </span>
          </div>

          <h2
            style={{
              fontSize: "26px",
              fontWeight: "700",
              color: "#0f172a",
              marginBottom: "10px",
              letterSpacing: "-0.02em",
              lineHeight: "1.3",
            }}
          >
            {service.ServiceName || service.PackageName}
          </h2>

          <p
            style={{
              fontSize: "15px",
              color: "#64748b",
              lineHeight: "1.7",
              marginBottom: "0",
            }}
          >
            {service.Description ||
              "No description available for this service."}
          </p>
        </div>

        {/* Service Meta Info */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            marginBottom: "28px",
            flexWrap: "wrap",
          }}
        >
          {(service.ServiceID || service.PackageID) && (
            <div
              style={{
                backgroundColor: "#f8fafc",
                borderRadius: "10px",
                padding: "10px 16px",
                flex: 1,
                minWidth: "120px",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  color: "#94a3b8",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "4px",
                }}
              >
                {service.PackageID ? "Package ID" : "Service ID"}
              </div>
              <div
                style={{
                  fontSize: "14px",
                  color: "#334155",
                  fontWeight: "600",
                }}
              >
                {service.ServiceID || service.PackageID}
              </div>
            </div>
          )}
          {service.CategoryID && (
            <div
              style={{
                backgroundColor: "#f8fafc",
                borderRadius: "10px",
                padding: "10px 16px",
                flex: 1,
                minWidth: "120px",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  color: "#94a3b8",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "4px",
                }}
              >
                Category ID
              </div>
              <div
                style={{
                  fontSize: "14px",
                  color: "#334155",
                  fontWeight: "600",
                }}
              >
                {service.CategoryID}
              </div>
            </div>
          )}
        </div>

        {/* Package Services List */}
        {service.PackageID &&
          service.services &&
          service.services.length > 0 && (
            <div style={{ marginBottom: "28px" }}>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "#0f172a",
                  marginBottom: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.02em",
                }}
              >
                Included Services
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                  maxHeight: "120px",
                  overflowY: "auto",
                  padding: "4px",
                }}
              >
                {service.services.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      backgroundColor: "#f1f5f9",
                      color: "#475569",
                      padding: "6px 12px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: "500",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    {s.ServiceName}
                  </div>
                ))}
              </div>
            </div>
          )}

        {/* Divider */}
        <div
          style={{
            height: "1px",
            backgroundColor: "#f1f5f9",
            marginBottom: "28px",
          }}
        />

        {/* State Selector */}
        <div style={{ marginBottom: "28px" }}>
          <label
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "600",
              color: "#334155",
              marginBottom: "10px",
            }}
          >
            Select State
            <span
              style={{
                color: "#94a3b8",
                fontWeight: "400",
                marginLeft: "4px",
                fontSize: "13px",
              }}
            >
              (required to proceed)
            </span>
          </label>

          <div ref={dropdownRef} style={{ position: "relative" }}>
            <div
              onClick={() => {
                setIsDropdownOpen(!isDropdownOpen);
                setTimeout(() => stateInputRef.current?.focus(), 50);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                border: `1.5px solid ${isDropdownOpen ? "#3b82f6" : "#e2e8f0"}`,
                borderRadius: "12px",
                padding: "12px 16px",
                cursor: "pointer",
                backgroundColor: "white",
                boxShadow: isDropdownOpen
                  ? "0 0 0 3px rgba(59,130,246,0.12)"
                  : "0 1px 2px rgba(0,0,0,0.05)",
                transition: "all 0.2s",
              }}
            >
              <span style={{ fontSize: "16px", marginRight: "10px" }}>📍</span>
              <input
                ref={stateInputRef}
                type="text"
                placeholder="Search for a state..."
                value={stateSearch}
                onChange={(e) => {
                  setStateSearch(e.target.value);
                  setSelectedState("");
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                style={{
                  border: "none",
                  outline: "none",
                  fontSize: "15px",
                  color: "#0f172a",
                  flex: 1,
                  backgroundColor: "transparent",
                  cursor: "text",
                }}
              />
              <span
                style={{
                  color: "#94a3b8",
                  fontSize: "12px",
                  transform: isDropdownOpen ? "rotate(180deg)" : "rotate(0)",
                  transition: "transform 0.2s",
                }}
              >
                ▼
              </span>
            </div>

            {isDropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  left: 0,
                  right: 0,
                  backgroundColor: "white",
                  border: "1.5px solid #e2e8f0",
                  borderRadius: "12px",
                  maxHeight: "220px",
                  overflowY: "auto",
                  zIndex: 100,
                  boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                  animation: "slideDown 0.15s ease",
                }}
              >
                {filteredStates.length === 0 ? (
                  <div
                    style={{
                      padding: "16px",
                      textAlign: "center",
                      color: "#94a3b8",
                      fontSize: "14px",
                    }}
                  >
                    No states found
                  </div>
                ) : (
                  filteredStates.map((state) => (
                    <div
                      key={state}
                      onClick={() => handleStateSelect(state)}
                      style={{
                        padding: "11px 16px",
                        cursor: "pointer",
                        fontSize: "14px",
                        color: state === selectedState ? "#3b82f6" : "#334155",
                        backgroundColor:
                          state === selectedState ? "#eff6ff" : "transparent",
                        fontWeight: state === selectedState ? "600" : "400",
                        transition: "background-color 0.1s",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                      onMouseEnter={(e) => {
                        if (state !== selectedState)
                          e.currentTarget.style.backgroundColor = "#f8fafc";
                      }}
                      onMouseLeave={(e) => {
                        if (state !== selectedState)
                          e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      {state === selectedState && (
                        <span style={{ fontSize: "12px" }}>✓</span>
                      )}
                      {state}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Create Deal Button */}
        {selectedState && (
          <div style={{ animation: "fadeInUp 0.25s ease" }}>
            <button
              onClick={handleCreateDeal}
              style={{
                width: "100%",
                padding: "16px",
                background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
                color: "white",
                border: "none",
                borderRadius: "14px",
                fontSize: "16px",
                fontWeight: "700",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                boxShadow: "0 8px 20px rgba(99,102,241,0.35)",
                transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
                letterSpacing: "-0.01em",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow =
                  "0 14px 28px rgba(99,102,241,0.45)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow =
                  "0 8px 20px rgba(99,102,241,0.35)";
              }}
            >
              <span style={{ fontSize: "18px" }}>🤝</span>
              Create Deal
              <span
                style={{ opacity: 0.85, fontSize: "14px", fontWeight: "500" }}
              >
                — {selectedState}
              </span>
            </button>
          </div>
        )}

        {!selectedState && (
          <div
            style={{
              width: "100%",
              padding: "16px",
              backgroundColor: "#f8fafc",
              border: "1.5px dashed #e2e8f0",
              borderRadius: "14px",
              fontSize: "14px",
              color: "#94a3b8",
              textAlign: "center",
              fontWeight: "500",
            }}
          >
            Select a state above to create a deal
          </div>
        )}
      </div>

      <style>{`
                @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
                @keyframes slideUp { from { transform: translateY(24px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
                @keyframes slideDown { from { transform: translateY(-8px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
                @keyframes fadeInUp { from { transform: translateY(10px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
            `}</style>
    </div>
  );
}

function ExploreServices() {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get("category") || "",
  );
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("services"); // 'services' or 'packages'
  const [servicePackages, setServicePackages] = useState([]);
  const [packagesLoading, setPackagesLoading] = useState(false);

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    limit: 9,
    total: 0,
  });

  const fetchCategories = async () => {
    try {
      const data = await getServiceCategories();
      setCategories(data.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setCategoriesLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat) {
      setSelectedCategory(cat);
      setPagination((prev) => ({ ...prev, currentPage: 1 }));
    }
  }, [searchParams]);

  const { currentPage, limit } = pagination;

  useEffect(() => {
    if (categoriesLoading) return;

    const fetchServices = async () => {
      setLoading(true);

      try {
        let servicesData = [];
        let totalItems = 0;

        if (selectedCategory) {
          const response = await getServicesByCategory(selectedCategory, {
            page: currentPage,
            limit: limit,
          });

          servicesData = response.data || [];
          totalItems = response.total || 0;
        } else {
          const data = await getServices({
            page: currentPage,
            limit: limit,
            filter: searchQuery,
          });

          servicesData = data.data || data;
          totalItems = data.pagination?.total || servicesData.length || 0;
        }

        const totalPages = Math.max(1, Math.ceil(totalItems / limit));

        setServices(servicesData);
        setPagination((prev) => ({
          ...prev,
          total: totalItems,
          totalPages,
        }));
      } catch (error) {
        console.error("Error fetching services:", error);
        setServices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, [currentPage, limit, searchQuery, selectedCategory, categoriesLoading]);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    setPagination((prev) => ({ ...prev, currentPage: newPage }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("");
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  useEffect(() => {
    const fetchPackages = async () => {
      setPackagesLoading(true);
      try {
        const response = await getServicePackages();
        setServicePackages(response.data || []);
      } catch (error) {
        console.error("Error fetching packages:", error);
      } finally {
        setPackagesLoading(false);
      }
    };
    fetchPackages();
  }, []);

  const handleLearnMore = (service) => {
    // Look up CategoryID from the already-fetched categories list
    // categories response: { CategoryID, CategoryName, Services: [{ ServiceID, ServiceName }] }
    const matchedCategory = categories.find((cat) =>
      cat.Services?.some((s) => s.ServiceID === service.ServiceID),
    );
    const categoryId = matchedCategory?.CategoryID;

    console.log("Service ID:", service.ServiceID);
    console.log("Category ID:", categoryId);

    setSelectedService({ ...service, CategoryID: categoryId });
  };

  const getServiceColor = (index) => {
    const colors = [
      "#6366f1",
      "#8b5cf6",
      "#ec4899",
      "#14b8a6",
      "#f59e0b",
      "#10b981",
      "#3b82f6",
      "#ef4444",
      "#6366f1",
    ];
    return colors[index % colors.length];
  };

  const getPaginationButtons = () => {
    const buttons = [];
    const maxButtons = 5;
    let startPage = Math.max(
      1,
      pagination.currentPage - Math.floor(maxButtons / 2),
    );
    let endPage = Math.min(pagination.totalPages, startPage + maxButtons - 1);
    if (endPage - startPage < maxButtons - 1) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }
    for (let i = startPage; i <= endPage; i++) buttons.push(i);
    return buttons;
  };

  return (
    <>
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#fafafa",
          padding: "60px 20px",
        }}
      >
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          {/* Header */}
          <div style={{ marginBottom: "56px", textAlign: "center" }}>
            <h1
              style={{
                fontSize: "48px",
                fontWeight: "600",
                marginBottom: "12px",
                color: "#0f172a",
                letterSpacing: "-0.02em",
              }}
            >
              Our Services
            </h1>
            <p
              style={{
                color: "#64748b",
                fontSize: "16px",
                maxWidth: "600px",
                margin: "0 auto",
              }}
            >
              Discover our comprehensive range of professional services tailored
              to meet your needs
            </p>
          </div>

          {/* Search and Filter Bar */}
          <div
            style={{
              display: "flex",
              gap: "16px",
              marginBottom: "48px",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                position: "relative",
                flex: "1",
                maxWidth: "400px",
                minWidth: "250px",
              }}
            >
              <input
                type="text"
                placeholder="Search services..."
                value={searchQuery}
                onChange={handleSearchChange}
                style={{
                  width: "100%",
                  padding: "14px 40px 14px 18px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  fontSize: "15px",
                  outline: "none",
                  backgroundColor: "white",
                  transition: "all 0.2s",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#3b82f6";
                  e.currentTarget.style.boxShadow =
                    "0 0 0 3px rgba(59,130,246,0.1)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#e2e8f0";
                  e.currentTarget.style.boxShadow =
                    "0 1px 2px rgba(0,0,0,0.05)";
                }}
              />
              <span
                style={{
                  position: "absolute",
                  right: "18px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#94a3b8",
                  fontSize: "18px",
                }}
              >
                🔍
              </span>
            </div>

            <select
              value={selectedCategory}
              onChange={handleCategoryChange}
              disabled={activeTab === "packages"}
              style={{
                padding: "14px 18px",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                fontSize: "15px",
                backgroundColor: activeTab === "packages" ? "#f8fafc" : "white",
                cursor: activeTab === "packages" ? "not-allowed" : "pointer",
                minWidth: "180px",
                color: "#334155",
                outline: "none",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                opacity: activeTab === "packages" ? 0.6 : 1,
              }}
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category.CategoryID} value={category.CategoryID}>
                  {category.CategoryName}
                </option>
              ))}
            </select>

            <button
              onClick={handleClearFilters}
              style={{
                padding: "14px 28px",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                fontSize: "15px",
                backgroundColor: "white",
                cursor: "pointer",
                color: "#64748b",
                fontWeight: "500",
                transition: "all 0.2s",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#f8fafc";
                e.currentTarget.style.borderColor = "#cbd5e1";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "white";
                e.currentTarget.style.borderColor = "#e2e8f0";
              }}
            >
              Clear Filters
            </button>
          </div>

          {/* Tab Switcher */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "40px",
              gap: "8px",
              backgroundColor: "#f1f5f9",
              padding: "6px",
              borderRadius: "16px",
              width: "fit-content",
              margin: "0 auto 48px",
            }}
          >
            <button
              onClick={() => setActiveTab("services")}
              style={{
                padding: "10px 24px",
                borderRadius: "12px",
                border: "none",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
                backgroundColor:
                  activeTab === "services" ? "white" : "transparent",
                color: activeTab === "services" ? "#4b49ac" : "#64748b",
                boxShadow:
                  activeTab === "services"
                    ? "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)"
                    : "none",
                transition: "all 0.2s",
              }}
            >
              Individual Services
            </button>
            <button
              onClick={() => setActiveTab("packages")}
              style={{
                padding: "10px 24px",
                borderRadius: "12px",
                border: "none",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
                backgroundColor:
                  activeTab === "packages" ? "white" : "transparent",
                color: activeTab === "packages" ? "#4b49ac" : "#64748b",
                boxShadow:
                  activeTab === "packages"
                    ? "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)"
                    : "none",
                transition: "all 0.2s",
              }}
            >
              Packages
            </button>
          </div>

          {(loading || categoriesLoading || packagesLoading) && (
            <div
              style={{
                textAlign: "center",
                padding: "80px 0",
                color: "#64748b",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "16px",
                }}
              >
                <Oval
                  height={40}
                  width={40}
                  color="#4b49ac"
                  wrapperStyle={{}}
                  wrapperClass=""
                  visible={true}
                  ariaLabel="oval-loading"
                  secondaryColor="#4b49ac33"
                  strokeWidth={4}
                  strokeWidthSecondary={4}
                />
                <div style={{ fontSize: "16px", fontWeight: "500" }}>
                  Loading services...
                </div>
              </div>
            </div>
          )}

          {activeTab === "services" &&
            !loading &&
            !categoriesLoading &&
            services.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 0",
                  color: "#64748b",
                }}
              >
                <div style={{ fontSize: "18px", marginBottom: "8px" }}>
                  No services found
                </div>
                <div style={{ fontSize: "14px" }}>
                  Try adjusting your search or filters
                </div>
              </div>
            )}

          {activeTab === "packages" &&
            !packagesLoading &&
            servicePackages.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 0",
                  color: "#64748b",
                }}
              >
                <div style={{ fontSize: "18px", marginBottom: "8px" }}>
                  No service packages found
                </div>
              </div>
            )}

          {/* Services Grid */}
          {activeTab === "services" &&
            !loading &&
            !categoriesLoading &&
            services.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                  gap: "32px",
                  marginBottom: "64px",
                }}
              >
                {services.map((service, index) => (
                  <div
                    key={service.ServiceID}
                    style={{
                      backgroundColor: "white",
                      borderRadius: "16px",
                      padding: "32px",
                      border: "1px solid #f1f5f9",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      cursor: "pointer",
                      position: "relative",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-8px)";
                      e.currentTarget.style.boxShadow =
                        "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)";
                      e.currentTarget.style.borderColor = "#e2e8f0";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow =
                        "0 1px 3px rgba(0,0,0,0.05)";
                      e.currentTarget.style.borderColor = "#f1f5f9";
                    }}
                  >
                    <div
                      style={{
                        width: "56px",
                        height: "56px",
                        background: `linear-gradient(135deg, ${getServiceColor(index)}15 0%, ${getServiceColor(index)}25 100%)`,
                        borderRadius: "14px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: "20px",
                      }}
                    >
                      <svg
                        width="28"
                        height="28"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={getServiceColor(index)}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect
                          x="2"
                          y="3"
                          width="20"
                          height="14"
                          rx="2"
                          ry="2"
                        ></rect>
                        <line x1="8" y1="21" x2="16" y2="21"></line>
                        <line x1="12" y1="17" x2="12" y2="21"></line>
                      </svg>
                    </div>

                    {service.ServiceCode && (
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#94a3b8",
                          marginBottom: "8px",
                          fontWeight: "500",
                        }}
                      >
                        {service.ServiceCode}
                      </div>
                    )}

                    <h3
                      style={{
                        fontSize: "20px",
                        fontWeight: "600",
                        color: "#0f172a",
                        marginBottom: "10px",
                        lineHeight: "1.3",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {service.ServiceName}
                    </h3>

                    <p
                      style={{
                        fontSize: "14px",
                        color: "#64748b",
                        marginBottom: "24px",
                        lineHeight: "1.6",
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {service.Description}
                    </p>

                    <button
                      onClick={() => handleLearnMore(service)}
                      style={{
                        padding: "0",
                        backgroundColor: "transparent",
                        color: getServiceColor(index),
                        border: "none",
                        fontSize: "14px",
                        fontWeight: "600",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        transition: "gap 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.gap = "10px";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.gap = "6px";
                      }}
                    >
                      Learn More <span style={{ fontSize: "14px" }}>→</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

          {/* Packages Grid */}
          {activeTab === "packages" &&
            !packagesLoading &&
            servicePackages.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
                  gap: "32px",
                  marginBottom: "64px",
                }}
              >
                {servicePackages.map((pkg, index) => (
                  <div
                    key={pkg.PackageID}
                    style={{
                      backgroundColor: "white",
                      borderRadius: "24px",
                      padding: "40px",
                      border: "1px solid #f1f5f9",
                      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      cursor: "pointer",
                      position: "relative",
                      display: "flex",
                      flexDirection: "column",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-8px)";
                      e.currentTarget.style.boxShadow =
                        "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)";
                      e.currentTarget.style.borderColor = "#e2e8f0";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow =
                        "0 4px 6px -1px rgba(0,0,0,0.05)";
                      e.currentTarget.style.borderColor = "#f1f5f9";
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "24px",
                      }}
                    >
                      <div
                        style={{
                          width: "64px",
                          height: "64px",
                          background: `linear-gradient(135deg, ${getServiceColor(index)}15 0%, ${getServiceColor(index)}25 100%)`,
                          borderRadius: "18px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <svg
                          width="32"
                          height="32"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke={getServiceColor(index)}
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
                        </svg>
                      </div>
                      {pkg.Discount > 0 && (
                        <div
                          style={{
                            backgroundColor: "#fef2f2",
                            color: "#ef4444",
                            padding: "6px 14px",
                            borderRadius: "30px",
                            fontSize: "12px",
                            fontWeight: "700",
                            letterSpacing: "0.02em",
                            border: "1px solid #fee2e2",
                          }}
                        >
                          SAVE {pkg.Discount}%
                        </div>
                      )}
                    </div>

                    <h3
                      style={{
                        fontSize: "24px",
                        fontWeight: "700",
                        color: "#0f172a",
                        marginBottom: "12px",
                        lineHeight: "1.2",
                      }}
                    >
                      {pkg.PackageName}
                    </h3>

                    <p
                      style={{
                        fontSize: "15px",
                        color: "#64748b",
                        marginBottom: "28px",
                        lineHeight: "1.6",
                        flex: 1,
                      }}
                    >
                      {pkg.Description}
                    </p>

                    <div style={{ marginBottom: "28px" }}>
                      <p
                        style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          color: "#94a3b8",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          marginBottom: "12px",
                        }}
                      >
                        Includes Services:
                      </p>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "8px",
                        }}
                      >
                        {pkg.services?.slice(0, 3).map((s, i) => (
                          <span
                            key={i}
                            style={{
                              backgroundColor: "#f8fafc",
                              padding: "6px 12px",
                              borderRadius: "8px",
                              fontSize: "12px",
                              color: "#475569",
                              fontWeight: "500",
                              border: "1px solid #f1f5f9",
                            }}
                          >
                            {s.ServiceName}
                          </span>
                        ))}
                        {pkg.services?.length > 3 && (
                          <span
                            style={{
                              fontSize: "12px",
                              color: "#94a3b8",
                              padding: "6px",
                            }}
                          >
                            +{pkg.services.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        paddingTop: "28px",
                        borderTop: "1px solid #f1f5f9",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <span
                          style={{
                            fontSize: "14px",
                            color: "#94a3b8",
                            fontWeight: "500",
                          }}
                        >
                          Starting from
                        </span>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "baseline",
                            gap: "4px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "24px",
                              fontWeight: "800",
                              color: "#0f172a",
                            }}
                          >
                            ₹{Math.floor(pkg.MonthlyFinalAmount || 0)}
                          </span>
                          <span style={{ fontSize: "13px", color: "#64748b" }}>
                            /mo
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedService(pkg)}
                        style={{
                          backgroundColor: "#4b49ac",
                          color: "white",
                          border: "none",
                          padding: "12px 20px",
                          borderRadius: "12px",
                          fontSize: "14px",
                          fontWeight: "600",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          boxShadow: "0 4px 12px rgba(75, 73, 172, 0.2)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#3f3da0";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "#4b49ac";
                        }}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

          {/* Pagination */}
          {activeTab === "services" &&
            !loading &&
            !categoriesLoading &&
            services.length > 0 &&
            pagination.totalPages > 1 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  marginTop: "48px",
                }}
              >
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                  style={{
                    padding: "10px 18px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    backgroundColor: "white",
                    cursor:
                      pagination.currentPage === 1 ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    color: pagination.currentPage === 1 ? "#cbd5e1" : "#64748b",
                    fontWeight: "500",
                    transition: "all 0.2s",
                    opacity: pagination.currentPage === 1 ? 0.5 : 1,
                  }}
                >
                  ← Previous
                </button>

                {getPaginationButtons().map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    style={{
                      width: "40px",
                      height: "40px",
                      border:
                        page === pagination.currentPage
                          ? "none"
                          : "1px solid #e2e8f0",
                      borderRadius: "10px",
                      backgroundColor:
                        page === pagination.currentPage ? "#3b82f6" : "white",
                      color:
                        page === pagination.currentPage ? "white" : "#64748b",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight:
                        page === pagination.currentPage ? "600" : "500",
                      transition: "all 0.2s",
                    }}
                  >
                    {page}
                  </button>
                ))}

                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage >= pagination.totalPages}
                  style={{
                    padding: "10px 18px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    backgroundColor: "white",
                    cursor:
                      pagination.currentPage === pagination.totalPages
                        ? "not-allowed"
                        : "pointer",
                    fontSize: "14px",
                    color:
                      pagination.currentPage === pagination.totalPages
                        ? "#cbd5e1"
                        : "#64748b",
                    fontWeight: "500",
                    transition: "all 0.2s",
                    opacity:
                      pagination.currentPage === pagination.totalPages
                        ? 0.5
                        : 1,
                  }}
                >
                  Next →
                </button>
              </div>
            )}
        </div>

        {/* Service Detail Modal */}
        {selectedService && (
          <ServiceModal
            service={selectedService}
            onClose={() => setSelectedService(null)}
          />
        )}
      </div>
    </>
  );
}

export default ExploreServices;
