// Customer-facing order and service status presentation.
//
// "Expired" is an INTERNAL signal: it means an operations team did not accept a
// service assignment inside its 48h SLA. The work is still owed to the
// customer, so it must never be shown to them — neither as an order status nor
// as a service status. Both are presented as "In Process" here.
//
// This module is the single source of truth for the portal. Three pages used to
// carry their own copy of the list, which is how `8: Expired` (and a stray
// `9: Unknown`) reached customer screens.

export const IN_PROCESS = 3;

// Statuses a customer may see. 8 (Expired) is deliberately absent.
export const orderStatusList = [
  { value: 1, label: 'Not Started' },
  { value: 2, label: 'Action Required' },
  { value: 3, label: 'In Process' },
  { value: 4, label: 'Completed' },
  { value: 5, label: 'On Hold' },
  { value: 6, label: 'Dropped' },
  { value: 7, label: 'Cancelled' },
];

/**
 * Map a raw OrderStatus to one the customer may see.
 * Anything not in the list — 8 (Expired), the legacy 9, nulls, junk — becomes
 * In Process, because an order that still exists still has work outstanding.
 */
export function toCustomerOrderStatus(value) {
  const n = Number(value);
  if (!Number.isInteger(n)) return IN_PROCESS;
  return orderStatusList.some((s) => s.value === n) ? n : IN_PROCESS;
}

export function getOrderStatusLabel(value) {
  const n = toCustomerOrderStatus(value);
  return orderStatusList.find((s) => s.value === n)?.label ?? 'In Process';
}

// The only service statuses a customer may see — same words as the order list.
export const CUSTOMER_SERVICE_STATUSES = ['Not Started', 'In Process', 'On Hold', 'Completed', 'Cancelled', 'Dropped'];

// Internal service states (serviceassignment Status / quoteservicedetails StatusRemark),
// keyed with case, spaces and punctuation stripped. Team routing steps (queue,
// team-lead acceptance, approval) and the 48h-SLA "expired" signal are internal
// workflow — to the customer that is all just "In Process".
const SERVICE_STATUS_TO_CUSTOMER = {
  pending: 'Not Started',
  pendingacceptence: 'Not Started',
  pendingacceptance: 'Not Started',
  serviceinque: 'Not Started',
  assigned: 'In Process',
  teamleadaccepted: 'In Process',
  approved: 'In Process',
  inprogress: 'In Process',
  inprocess: 'In Process',
  expired: 'In Process',
  onhold: 'On Hold',
  completed: 'Completed',
  closed: 'Completed',
  forceclosed: 'Completed',
  cancelled: 'Cancelled',
  dropped: 'Dropped',
};

// Service statuses marked Internal in Status Master (internal app), keyed like
// SERVICE_STATUS_TO_CUSTOMER, with the status to show instead. Loaded once per
// session by loadCustomerStatusMap(); empty until then, which just means the
// fixed mapping below applies on its own.
const internalServiceStatuses = new Map();
const statusKey = (s) => String(s ?? '').toLowerCase().replace(/[^a-z]/g, '');

export function setInternalServiceStatuses(list) {
  internalServiceStatuses.clear();
  for (const { status, showAs } of Array.isArray(list) ? list : []) {
    if (statusKey(status) && showAs) internalServiceStatuses.set(statusKey(status), showAs);
  }
}

/**
 * Map a free-text service status to one of CUSTOMER_SERVICE_STATUSES. These strings
 * reach the portal verbatim and have included "expired", "Pending-Acceptence" and
 * script tags like "backfill-20260724". Anything unrecognised is "In Process" — a
 * service that still exists still has work outstanding.
 */
export function toCustomerServiceStatus(status) {
  // An internal status is shown as the status Status Master points it to.
  const shownAs = internalServiceStatuses.get(statusKey(status));
  const key = statusKey(shownAs ?? status);
  if (!key) return 'Not Started';
  if (SERVICE_STATUS_TO_CUSTOMER[key]) return SERVICE_STATUS_TO_CUSTOMER[key];
  if (key.includes('dropped')) return 'Dropped'; // "client dropped", "customer service dropped"
  return 'In Process';
}
