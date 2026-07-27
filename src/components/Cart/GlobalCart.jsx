import React, { useState, useContext } from "react";
import { FaTimes } from "react-icons/fa";
import { CartContext } from "../../context/CartContext";
import { upsertQuote } from "../../api/Quote";
import { getSecureItem } from "../../utils/secureStorage";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import SigninModal from "../Modals/SigninModal";
import { fetchFranchiseeGstInfo, calcGstAmount, splitGst } from "../../utils/gstCalc";

const GlobalCart = () => {
  const { cart, removeFromCart, clearCart } = useContext(CartContext);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showSigninModal, setShowSigninModal] = useState(false);

  // Calculate total
  const total = Object.values(cart).reduce((sum, item) => {
    const price = item?.TotalFee || item?.Price || 0;
    return sum + Number(price);
  }, 0);

  if (Object.keys(cart).length === 0) return null;

  // Request Quote handler
  const handleRequestQuote = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setShowSigninModal(true);
      return;
    }
    try {
      const user = getSecureItem("user");
      const selectedCompany = getSecureItem("selectedCompany");
      const franchiseeId = user?.FranchiseeId || user?.FranchiseeID || 1;
      const employeeId = user?.EmployeeID || 9;
      const employeeName = user?.FirstName || "admin";
      const customerId = user?.CustomerID || 2;
      const customerName = user?.FirstName ? `${user.FirstName} ${user.LastName || ''}`.trim() : "John Doe";
      const stateName = selectedCompany?.State || "";
      const companyName = selectedCompany?.CompanyName || "";
      const companyId = selectedCompany?.CompanyID || null;

      const selectedServiceIds = Object.keys(cart).map(Number);
      // GST eligibility/state is per-franchisee, fetch once for the whole cart.
      const { gstEligible, state: franchiseeState } = await fetchFranchiseeGstInfo(franchiseeId);
      const serviceDetails = selectedServiceIds.map(sid => {
        const item = cart[sid] || {};
        const professionalFee = Number(item.ProfessionalFee ?? 100);
        const vendorFee = Number(item.VendorFee ?? 100);
        const govtFee = Number(item.GovernmentFee ?? 100);
        const contractorFee = Number(item.ContractFee ?? 100);
        const discount = Number(item.Discount ?? 0);
        const rounding = Number(item.Rounding ?? 0);
        const gstAmount = calcGstAmount(professionalFee, vendorFee, gstEligible);
        const { cgst, sgst, igst } = splitGst(gstAmount, franchiseeState, stateName);
        const total = professionalFee + vendorFee + govtFee + contractorFee - discount + gstAmount;
        const advanceAmount = Math.ceil(total * 0.3);
        return {
          ServiceID: sid,
          ItemName: item.ServiceName || item.Name,
          ProfessionalFee: professionalFee,
          VendorFee: vendorFee,
          GovtFee: govtFee,
          ContractorFee: contractorFee,
          GSTPercent: gstEligible ? 18 : 0,
          GstAmount: gstAmount,
          CGST: cgst,
          SGST: sgst,
          IGST: igst,
          Discount: discount,
          Rounding: rounding,
          Total: total,
          AdvanceAmount: advanceAmount,
          IsManual: 0,
          IsIndividual: 1
        };
      });

      // Build SelectedServicePrices from cart
      const selectedServicePrices = {};
      selectedServiceIds.forEach(sid => {
        selectedServicePrices[sid] = cart[sid] || {};
      });

      const payload = {
        IsIndividual: 1,
        IsMonthly: 0,
        FranchiseeID: franchiseeId,
        SelectedCompany: {
          CompanyID: companyId,
          CompanyName: companyName,
          State: stateName
        },
        SelectedCustomer: {
          CustomerID: customerId,
          CustomerName: customerName
        },
        QuoteCRE: {
          EmployeeID: employeeId,
          EmployeeName: employeeName
        },
        SourceOfSale: "Website",
        StateService: stateName,
        Remarks: "Generated from global cart",
        QuoteStatus: "Draft",
        IsDirect: 1,
        ServiceDetails: serviceDetails,
        SelectedServices: selectedServiceIds,
        SelectedServicePrices: selectedServicePrices,
        MailQuoteCustomers: [
          {
            CustomerID: customerId,
            CustomerName: customerName,
            Email: user?.Email || ""
          }
        ],
        PaymentType: 0,
        EmployeeID: employeeId,
        is_manual: 0
      };

      const res = await upsertQuote(payload);
      if (res && (res.success === true || res.success === "true")) {
        toast.success("Quote created successfully!");
        // Clear cart and localStorage
        clearCart && clearCart();
        localStorage.removeItem("SelectedServices");
        localStorage.removeItem("SelectedServicePrices");
        localStorage.removeItem("AllServicesCache");
        setTimeout(() => navigate("/dashboard/bizpoleone"), 1000);
      } else {
        toast.error("Quote creation failed. Please try again.");
      }
    } catch (err) {
      toast.error("Failed to create quote. Please try again.", err);
    }
  };
  return (
    <>
      <SigninModal isOpen={showSigninModal} onClose={() => setShowSigninModal(false)} />
      <div style={{ position: "fixed", bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 1000 }}>
        <button
          onClick={() => setOpen((o) => !o)}
          className="bg-yellow-400 hover:bg-yellow-500 py-2 px-4 text-black rounded-full  flex items-center justify-center shadow-lg text-sm relative"
          title="View Cart"
        >
          <span className="font-normal">Selected Services   </span>
          <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[24px] text-center">
            {Object.keys(cart).length}
          </span>
        </button>
        {open && (
          <div className="bg-white rounded-2xl shadow-2xl p-5 mt-3 min-w-[320px] max-w-xs border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                Selected Services
              </h3>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700">
                <FaTimes size={14} />
              </button>
            </div>
            <ul className="divide-y divide-gray-100 mb-3">
              {Object.entries(cart).map(([id, item]) => (
                <li key={id} className="py-2 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-800 text-sm">{item.ServiceName || item.Name || `Service #${id}`}</div>
                    <div className="text-xs text-gray-500">₹{item.TotalFee || item.Price}</div>
                  </div>
                  <button onClick={() => removeFromCart(id)} className="text-red-400 hover:text-red-600 ml-2">
                    <FaTimes size={14} />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t pt-3 mt-2">
              <span className="font-semibold text-gray-700">Total</span>
              <span className="font-bold text-green-700">₹{total.toLocaleString('en-IN')}</span>
            </div>
            <button
              className="w-full mt-4 bg-gradient-to-r from-yellow-400 to-yellow-500 px-4 py-2 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 font-semibold text-black"
              onClick={handleRequestQuote}
            >
              Request Quote
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default GlobalCart;
