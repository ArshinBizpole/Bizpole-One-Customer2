/**
 * Which GST heads to show on an invoice, and for how much.
 *
 * Port of the admin app's utils/gstSplit.ts (Bizpole-One-Client) — keep the
 * two in sync. Types removed; logic is identical.
 *
 * Under the GST Act a supply is either intra-state or inter-state, and the tax
 * is presented differently in each case:
 *
 *   - supplier and recipient in the SAME state  → CGST + SGST, half the rate each
 *   - supplier and recipient in DIFFERENT states → a single IGST at the full rate
 *
 * Never both.
 */

/**
 * Original quote-preview helper (admin QuotePreviewmodal.tsx). Behaviour is
 * deliberately unchanged — strict `===` on the two state strings. New code
 * should use resolveGstSplit below.
 *
 * @returns {{ CGST: number, SGST: number, IGST: number }}
 */
export function gstSplit(gstAmount, sellerState, receiverState) {
    return sellerState === receiverState
        ? { CGST: gstAmount / 2, SGST: gstAmount / 2, IGST: 0 }
        : { CGST: 0, SGST: 0, IGST: gstAmount };
}

const round2 = (n) => Math.round(n * 100) / 100;

const num = (v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = parseFloat(String(v));
    return Number.isFinite(n) ? n : null;
};

/** Trim, drop the literal "null"/"undefined" strings the API sometimes sends. */
const clean = (v) => {
    const s = String(v ?? "").trim();
    if (!s || s.toLowerCase() === "null" || s.toLowerCase() === "undefined") return "";
    return s;
};

/**
 * The state code that opens a GSTIN (e.g. "32" for Kerala).
 *
 * This is the authoritative intra/inter test when both parties are registered:
 * state *names* are free text and drift, but the GSTIN prefix cannot.
 *
 * @returns {string|null} the two-digit code, or null if not a usable GSTIN.
 */
export function stateCodeFromGstin(gstin) {
    const s = clean(gstin).toUpperCase();
    if (s.length < 15) return null;
    const code = s.slice(0, 2);
    if (!/^\d{2}$/.test(code)) return null;
    if (code === "00") return null; // not a real state code
    return code;
}

/** Fold a state name to a comparable form: letters and digits only, lowercased. */
const normaliseState = (v) => clean(v).toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Are these two states the same?
 *
 * @returns {boolean|null} null when either side is unknown — an undecidable
 *          comparison must not silently collapse to "different".
 */
export function isSameState(a, b) {
    const x = normaliseState(a);
    const y = normaliseState(b);
    if (!x || !y) return null;
    return x === y;
}

/** Render a rate without trailing zeros: 9 → "9", 2.5 → "2.5". */
const fmtPct = (n) => String(round2(n));

/**
 * Decide the tax heads for one invoice.
 *
 * Resolution order:
 *   1. No GST charged at all → no tax lines.
 *   2. Both GSTINs present → compare their state codes.
 *   3. Otherwise → compare the state names.
 *   4. Neither decidable → one neutral "GST" line.
 *
 * @param {{ supplierState?: string|null, recipientState?: string|null,
 *           supplierGstin?: string|null, recipientGstin?: string|null,
 *           gstAmount?: number|string|null, gstPercent?: number|string|null }} input
 * @returns {{ mode: "intra"|"inter"|"unknown"|"none", lines: { label: string, amount: number }[] }}
 */
export function resolveGstSplit(input) {
    const amount = num(input.gstAmount);
    if (amount === null || amount === 0) return { mode: "none", lines: [] };

    const pct = num(input.gstPercent);
    /** " (18%)" — omitted entirely when the rate isn't known. */
    const suffix = pct !== null && pct !== 0 ? ` (${fmtPct(pct)}%)` : "";
    const halfSuffix = pct !== null && pct !== 0 ? ` (${fmtPct(pct / 2)}%)` : "";

    const supplierCode = stateCodeFromGstin(input.supplierGstin);
    const recipientCode = stateCodeFromGstin(input.recipientGstin);

    let same;
    if (supplierCode && recipientCode) {
        same = supplierCode === recipientCode;
    } else {
        same = isSameState(input.supplierState, input.recipientState);
    }

    if (same === null) {
        return { mode: "unknown", lines: [{ label: `GST${suffix}`, amount: round2(amount) }] };
    }

    if (same) {
        // Halve once and take the remainder for the second head, so CGST + SGST is
        // exactly the GST charged even on an odd number of paise.
        const cgst = round2(amount / 2);
        const sgst = round2(amount - cgst);
        return {
            mode: "intra",
            lines: [
                { label: `CGST${halfSuffix}`, amount: cgst },
                { label: `SGST${halfSuffix}`, amount: sgst },
            ],
        };
    }

    return { mode: "inter", lines: [{ label: `IGST${suffix}`, amount: round2(amount) }] };
}
