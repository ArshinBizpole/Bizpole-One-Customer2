import { createContext, useCallback, useEffect, useState } from 'react';
import { getSecureItem, setSecureItem } from '../utils/secureStorage';
import * as CompanyApi from '../api/CompanyApi';

export const CompanyDataContext = createContext();

export const CompanyDataProvider = ({ children }) => {
  // Company Selection State
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companies, setCompanies] = useState([]);

  // Company-Specific Data States
  const [companyDetails, setCompanyDetails] = useState(null);
  const [companyCustomers, setCompanyCustomers] = useState([]);
  const [companyDocuments, setCompanyDocuments] = useState([]);
  const [companyEvents, setCompanyEvents] = useState([]);
  const [companyInvoices, setCompanyInvoices] = useState([]);
  const [companyOrders, setCompanyOrders] = useState([]);

  // Loading & Error States
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize companies from user data
  useEffect(() => {
    try {
      const user = getSecureItem('user');
      if (user?.Companies && Array.isArray(user.Companies)) {
        setCompanies(user.Companies);

        // Try to restore previously selected company
        const savedSelected = getSecureItem('selectedCompany');
        let targetCompany = null;

        if (savedSelected?.CompanyID) {
          targetCompany = user.Companies.find(
            (c) => String(c.CompanyID) === String(savedSelected.CompanyID)
          );
        }

        // Fallback to first company
        if (!targetCompany && user.Companies.length > 0) {
          targetCompany = user.Companies[0];
        }

        if (targetCompany) {
          setSelectedCompanyId(targetCompany.CompanyID);
          setSelectedCompany(targetCompany);
          setSecureItem('selectedCompany', JSON.stringify({
            CompanyID: targetCompany.CompanyID,
            CompanyName: targetCompany.BusinessName || targetCompany.CompanyName,
            State: targetCompany.State || "",
          }));
          setSecureItem('CompanyId', targetCompany.CompanyID.toString());
        }
      }
    } catch (err) {
      console.error('Error initializing companies:', err);
      setError('Failed to load companies');
    }
  }, []);

  // Fetch company details when selectedCompanyId changes
  useEffect(() => {
    if (!selectedCompanyId) return;

    const fetchCompanyDetails = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await CompanyApi.getCompanyDetails(selectedCompanyId);
        if (response.success) {
          setCompanyDetails(response.data);
          setCompanyCustomers(response.data?.Customers || []);
        } else {
          setError(response.message || 'Failed to fetch company details');
        }
      } catch (err) {
        console.error('Error fetching company details:', err);
        setError('Failed to fetch company details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompanyDetails();
  }, [selectedCompanyId]);

  // Fetch company documents
  const fetchCompanyDocuments = useCallback(async () => {
    if (!selectedCompanyId) return;
    try {
      console.log('Fetching documents for company:', selectedCompanyId);
    } catch (err) {
      console.error('Error fetching documents:', err);
    }
  }, [selectedCompanyId]);

  // Fetch company events
  const fetchCompanyEvents = useCallback(async () => {
    if (!selectedCompanyId) return;
    try {
      console.log('Fetching events for company:', selectedCompanyId);
    } catch (err) {
      console.error('Error fetching events:', err);
    }
  }, [selectedCompanyId]);

  // Fetch company invoices
  const fetchCompanyInvoices = useCallback(async () => {
    if (!selectedCompanyId) return;
    try {
      console.log('Fetching invoices for company:', selectedCompanyId);
    } catch (err) {
      console.error('Error fetching invoices:', err);
    }
  }, [selectedCompanyId]);

  // Fetch company orders
  const fetchCompanyOrders = useCallback(async () => {
    if (!selectedCompanyId) return;
    try {
      console.log('Fetching orders for company:', selectedCompanyId);
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
  }, [selectedCompanyId]);

  // Handle company change
  const switchCompany = useCallback((companyId) => {
    const company = companies.find((c) => String(c.CompanyID) === String(companyId));
    if (company) {
      setSelectedCompanyId(company.CompanyID);
      setSelectedCompany(company);
      setSecureItem('selectedCompany', JSON.stringify({
        CompanyID: company.CompanyID,
        CompanyName: company.BusinessName || company.CompanyName,
        State: company.State || "",
      }));
      setSecureItem('CompanyId', company.CompanyID.toString());
    }
  }, [companies]);

  const value = {
    selectedCompanyId,
    selectedCompany,
    companies,
    switchCompany,
    companyDetails,
    companyCustomers,
    companyDocuments,
    companyEvents,
    companyInvoices,
    companyOrders,
    fetchCompanyDocuments,
    fetchCompanyEvents,
    fetchCompanyInvoices,
    fetchCompanyOrders,
    isLoading,
    error,
    setError,
  };

  return (
    <CompanyDataContext.Provider value={value}>
      {children}
    </CompanyDataContext.Provider>
  );
};
