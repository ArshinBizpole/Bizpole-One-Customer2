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

/**
 * Same masking for the free-text service status strings (serviceassignment
 * Status / quoteservicedetails StatusRemark), which reach the portal verbatim
 * and can literally read "expired".
 */
export function toCustomerServiceStatus(status) {
  const raw = String(status ?? '').trim();
  if (!raw) return 'Pending';
  if (raw.toLowerCase().replace(/\s+/g, '').includes('expir')) return 'In Process';
  return raw;
}
