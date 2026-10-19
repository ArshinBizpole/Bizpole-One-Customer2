import { BUSINESS_TYPE_SERVICE_ID, STATES } from "../components/ExixistingCompany/existingCompanyData";

// A new customer has no customer/company data to quote against yet, so
// "Proceed to Quote" / "Sign up" from a service opens the Start New Company
// application matching that service (it collects their details and makes the
// quote at the end). Returns the route state for /startbusiness/apply, or null
// when no application fits — the "What would you like to register?" menu then.
const BUSINESS_TYPE_BY_SERVICE_ID = Object.fromEntries(
  Object.entries(BUSINESS_TYPE_SERVICE_ID).map(([type, id]) => [id, type])
);
export const newCustomerFlowFor = (service) => {
  const id = Number(service?.ServiceID);
  const name = String(service?.ServiceName || service?.Name || "");
  const category = String(service?.Category?.CategoryName || "");
  if (BUSINESS_TYPE_BY_SERVICE_ID[id]) {
    return { flowId: "newco", initialSet: { businessType: BUSINESS_TYPE_BY_SERVICE_ID[id] } };
  }
  if (id === 281 || /gst\s*regist/i.test(name)) return { flowId: "gst" };
  if (id === 344 || /trade\s*mark/i.test(name)) return { flowId: "trademark" };
  if (/msme|udyam/i.test(name)) return { flowId: "msme" };
  if (/\biec\b|import\s*(&|and|\/)?\s*export/i.test(name)) return { flowId: "iec" };
  if (/fssai|food/i.test(name)) return { flowId: "fssai" };
  if (/business\s*regist|incorporat/i.test(category)) return { flowId: "newco" };
  return null;
};

// The address State field of each application (addressFields prefix + "state").
const ADDRESS_STATE_KEY = { newco: "state", gst: "gst_state", msme: "msme_state", iec: "iec_state", fssai: "other_state" };

// Carries the state picked on the services pages into the application: the
// Details tab's State (leadState) and the address step's State. Only names
// spelled as the application's own state list are passed on.
export const withPickedState = (flow, stateName) => {
  if (!STATES.includes(stateName) || stateName === "Other") return flow;
  const addressKey = ADDRESS_STATE_KEY[flow.flowId];
  return {
    ...flow,
    initialSet: { ...flow.initialSet, leadState: stateName, ...(addressKey && { [addressKey]: stateName }) },
  };
};

/**
 * Sends a new customer to the application for the first of `services` that has
 * one (state prefilled), or to the services menu when none does.
 */
export const goToNewCustomerFlow = (navigate, services, stateName) => {
  const flow = (services || []).map(newCustomerFlowFor).find(Boolean);
  if (flow) navigate("/startbusiness/apply", { state: withPickedState(flow, stateName || "") });
  else navigate("/startbusiness/services");
};
