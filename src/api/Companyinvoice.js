import axios from "./axiosInstance";

// Fetch orders for a company
export const getCompanyOrders = async ({ companyId, limit = 10, page = 1 }) => {
	try {
		// Only send companyId, limit, and page. Do NOT send IsIndividual.
		const res = await axios.post("/order/company", { companyId, limit, page });
		return res.data;
	} catch (error) {
		console.error("Error fetching company orders:", error);
		return { success: false, data: [], message: "Failed to fetch orders" };
	}
};

// Fetch invoice details for given orderIds
export const getInvoiceDetails = async (orderIds) => {
	try {
		const res = await axios.post("/company/invoice-details", { orderIds });
		return res.data;
	} catch (error) {
		console.error("Error fetching invoice details:", error);
		return { success: false, data: [], message: "Failed to fetch invoice details" };
	}
};

// Utility: Get invoice details for all orders of a company
export const getCompanyInvoices = async ({ companyId, limit = 10, page = 1 }) => {
	const ordersRes = await getCompanyOrders({ companyId, limit, page });
	if (!ordersRes.success || !Array.isArray(ordersRes.data) || ordersRes.data.length === 0) {
		return { success: false, data: [], message: ordersRes.message || "No orders found" };
	}
	const orderIds = ordersRes.data.map(order => order.OrderID || order.orderId || order.id).filter(Boolean);
	if (orderIds.length === 0) {
		return { success: false, data: [], message: "No valid order IDs found" };
	}
	return await getInvoiceDetails(orderIds);
};

// Fetch franchisee details (display name, address, CIN/PAN/GST) by FranchiseeID.
// Public endpoint, no auth required.
export const getFranchiseeById = async (franchiseeId) => {
	try {
		const res = await axios.get(`/franchisee/${franchiseeId}`);
		return res.data?.data ?? null;
	} catch (error) {
		console.error("Error fetching franchisee details:", error);
		return null;
	}
};
