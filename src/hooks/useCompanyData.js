import { useContext } from 'react';
import { CompanyDataContext } from '../context/CompanyDataContext';

export const useCompanyData = () => {
  const context = useContext(CompanyDataContext);
  if (!context) {
    throw new Error('useCompanyData must be used within CompanyDataProvider');
  }
  return context;
};

export const useSelectedCompany = () => {
  const { selectedCompany, selectedCompanyId } = useCompanyData();
  return { selectedCompany, selectedCompanyId };
};

export const useSwitchCompany = () => {
  const { switchCompany } = useCompanyData();
  return switchCompany;
};

export const useCompanyDetails = () => {
  const { companyDetails, isLoading, error } = useCompanyData();
  return { companyDetails, isLoading, error };
};

export const useCompanyCustomers = () => {
  const { companyCustomers } = useCompanyData();
  return companyCustomers;
};

export const useCompanyDocuments = () => {
  const { companyDocuments, fetchCompanyDocuments } = useCompanyData();
  return { documents: companyDocuments, fetch: fetchCompanyDocuments };
};

export const useCompanyEvents = () => {
  const { companyEvents, fetchCompanyEvents } = useCompanyData();
  return { events: companyEvents, fetch: fetchCompanyEvents };
};

export const useCompanyInvoices = () => {
  const { companyInvoices, fetchCompanyInvoices } = useCompanyData();
  return { invoices: companyInvoices, fetch: fetchCompanyInvoices };
};

export const useCompanyOrders = () => {
  const { companyOrders, fetchCompanyOrders } = useCompanyData();
  return { orders: companyOrders, fetch: fetchCompanyOrders };
};

export default useCompanyData;
