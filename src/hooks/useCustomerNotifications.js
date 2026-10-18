import { useSyncExternalStore } from "react";
import {
  getCustomerNotifications,
  markCustomerNotificationRead,
  markAllCustomerNotificationsRead,
  hasCustomerToken,
} from "../api/CustomerNotificationApi";
import { getCompanyIdFromStorage } from "../api/SupportTickets/SupportTicket";

// One shared store for every bell on screen (header desktop + mobile, dashboard),
// so they show the same list and poll the server once, not once per bell.

const POLL_MS = 60000;

let state = { items: [], unread: 0, loading: false, loaded: false };
const listeners = new Set();
let timer = null;
let inFlight = null;

const emit = (patch) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

const currentCompanyId = () => {
  try {
    return getCompanyIdFromStorage() || null;
  } catch {
    return null;
  }
};

export function refreshCustomerNotifications() {
  if (!hasCustomerToken()) return Promise.resolve();
  if (inFlight) return inFlight;
  emit({ loading: !state.loaded });
  inFlight = getCustomerNotifications({ companyId: currentCompanyId() })
    .then(({ items, unread }) => emit({ items, unread, loaded: true }))
    .catch(() => {}) // keep whatever the bell showed last
    .finally(() => {
      inFlight = null;
      emit({ loading: false });
    });
  return inFlight;
}

const onCompanySwitched = () => refreshCustomerNotifications();
const onVisible = () => {
  if (document.visibilityState === "visible") refreshCustomerNotifications();
};

function start() {
  refreshCustomerNotifications();
  timer = setInterval(() => {
    if (document.visibilityState === "visible") refreshCustomerNotifications();
  }, POLL_MS);
  window.addEventListener("company-switched", onCompanySwitched);
  document.addEventListener("visibilitychange", onVisible);
}

function stop() {
  clearInterval(timer);
  timer = null;
  window.removeEventListener("company-switched", onCompanySwitched);
  document.removeEventListener("visibilitychange", onVisible);
}

function subscribe(listener) {
  listeners.add(listener);
  if (listeners.size === 1) start();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stop();
  };
}

export async function markNotificationRead(id) {
  const target = state.items.find((n) => n.id === id);
  if (!target || target.isRead) return;
  // Optimistic: the bell updates immediately, the server catches up.
  emit({
    items: state.items.map((n) => (n.id === id ? { ...n, isRead: 1 } : n)),
    unread: Math.max(state.unread - 1, 0),
  });
  try {
    await markCustomerNotificationRead(id);
  } catch {
    refreshCustomerNotifications();
  }
}

export async function markAllNotificationsRead() {
  if (!state.unread) return;
  emit({ items: state.items.map((n) => ({ ...n, isRead: 1 })), unread: 0 });
  try {
    await markAllCustomerNotificationsRead(currentCompanyId());
  } catch {
    refreshCustomerNotifications();
  }
}

export default function useCustomerNotifications() {
  return useSyncExternalStore(subscribe, () => state);
}
