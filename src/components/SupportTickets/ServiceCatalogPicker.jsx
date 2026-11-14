import React, { useEffect, useState } from "react";
import { getServices, getServicePackages } from "../../api/ServicesApi";
import { getPackageOrders, getIndividualOrders } from "../../api/Orders/Order";
import YellowSelect from "../YellowSelect";

/**
 * Shared Package/Individual service picker.
 *
 * - source="catalog": lists sellable services/packages from the catalog
 *   (used by the Lead and Deal call-back branches — a new service).
 * - source="own-orders": lists the customer's own purchased orders
 *   (used by the Support Ticket call-back branch — an existing service).
 *
 * Calls onSelect(null) when the selection is cleared, or
 * onSelect({ dealType, id, name, orderId, quoteId, raw }) once an item is chosen.
 */
const ServiceCatalogPicker = ({ source, onSelect }) => {
  const [dealType, setDealType] = useState("Individual");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedKey, setSelectedKey] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      setSelectedKey("");
      onSelect(null);
      try {
        let list = [];
        if (source === "catalog") {
          if (dealType === "Package") {
            const res = await getServicePackages();
            list = res?.data || res?.packages || [];
          } else {
            const res = await getServices({ page: 1, limit: 100 });
            list = res?.data || [];
          }
        } else {
          const res =
            dealType === "Package"
              ? await getPackageOrders({ page: 1, limit: 100 })
              : await getIndividualOrders({ page: 1, limit: 100 });
          list = res?.data || res?.orders || [];
        }
        if (!cancelled) setItems(list);
      } catch (err) {
        if (!cancelled) {
          setItems([]);
          setError(err?.response?.data?.message || err?.message || "Failed to load services.");
        }
      }
      if (!cancelled) setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, dealType]);

  const normalize = (item) => {
    if (source === "catalog") {
      return dealType === "Package"
        ? {
            dealType,
            id: item.PackageID ?? item.id ?? item.packageId,
            name: item.PackageName ?? item.name ?? item.packageName ?? "Unnamed Package",
            raw: item,
          }
        : {
            dealType,
            id: item.ServiceID,
            name: item.ServiceName,
            raw: item,
          };
    }
    return {
      dealType,
      id: item.OrderPK ?? item.id,
      orderId: item.OrderPK ?? item.id,
      quoteId: item.QuoteID,
      name: item.PackageName || item.ItemName || `Order #${item.OrderID ?? item.id}`,
      raw: item,
    };
  };

  const keyOf = (item) => String(item.OrderPK ?? item.OrderID ?? item.id ?? item.PackageID ?? item.ServiceID);

  const handleChange = (e) => {
    const key = e.target.value;
    setSelectedKey(key);
    if (!key) {
      onSelect(null);
      return;
    }
    const found = items.find((i) => keyOf(i) === key);
    onSelect(found ? normalize(found) : null);
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Type *</label>
        <div className="flex gap-2">
          {["Individual", "Package"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setDealType(t)}
              className={`px-3 py-1.5 text-sm rounded-lg border ${
                dealType === t
                  ? "bg-yellow-400 border-yellow-400 text-gray-900 font-semibold"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          {source === "catalog" ? "Select a service *" : "Select your purchased service *"}
        </label>
        <YellowSelect
          value={selectedKey}
          onChange={(key) => handleChange({ target: { value: key } })}
          disabled={loading}
          placeholder={loading ? "Loading…" : "— Select —"}
          options={[
            { value: "", label: loading ? "Loading…" : "— Select —" },
            ...items.map((item) => ({
              value: keyOf(item),
              label:
                source === "catalog"
                  ? dealType === "Package"
                    ? item.PackageName ?? item.name ?? item.packageName
                    : item.ServiceName
                  : `${item.PackageName || item.ItemName || `Order #${item.OrderID ?? item.id}`}`,
            })),
          ]}
        />
        {!loading && items.length === 0 && !error && (
          <p className="text-xs text-gray-400 mt-1">
            {source === "catalog" ? "No services available." : "No purchased services found."}
          </p>
        )}
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>
    </div>
  );
};

export default ServiceCatalogPicker;
