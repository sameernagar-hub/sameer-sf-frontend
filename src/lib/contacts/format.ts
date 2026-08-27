import { ADDRESS_TYPES, type Address, type AddressType, type Contact } from "./types";

/** Presentation helpers shared by the list, the detail page, and the cards. */

/** Up to two letters for the avatar bubble. */
export function initials(contact: Pick<Contact, "first_name" | "last_name">) {
  return `${contact.first_name.at(0) ?? ""}${contact.last_name.at(0) ?? ""}`
    .toUpperCase()
    .trim();
}

/**
 * Stable hue per contact so the same person keeps the same avatar colour
 * across renders and machines (no randomness, no hydration mismatch).
 */
export function avatarHue(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 360;
  }
  return hash;
}

function escapeSvgText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/** Local generated avatar image for contacts without an uploaded photo. */
export function generatedAvatarDataUrl(
  contact: Pick<Contact, "first_name" | "last_name" | "email">,
): string {
  const hue = avatarHue(contact.email);
  const label = escapeSvgText(initials(contact) || "?");
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
  <rect width="96" height="96" rx="48" fill="hsl(${hue} 72% 34%)"/>
  <circle cx="24" cy="24" r="18" fill="hsl(${(hue + 42) % 360} 70% 48%)" opacity=".72"/>
  <circle cx="74" cy="72" r="26" fill="hsl(${(hue + 184) % 360} 68% 42%)" opacity=".58"/>
  <text x="48" y="57" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="700" fill="white">${label}</text>
</svg>`.trim();

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// Rendered on the server and hydrated on the client, so pin the locale and zone
// rather than letting each side pick its own and mismatch.
const TIMESTAMP_FORMAT = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return `${TIMESTAMP_FORMAT.format(date)} UTC`;
}

/** "Ada Lovelace · Mathematician at Analytical Engines"-style subtitle. */
export function jobLine(contact: Contact): string | null {
  if (contact.job_title && contact.company) {
    return `${contact.job_title} at ${contact.company}`;
  }
  return contact.job_title ?? contact.company ?? null;
}

/** Single-line postal address, skipping the parts that are not filled in. */
export function addressLine(address: Address): string | null {
  const parts = [
    address.street,
    address.city,
    [address.state, address.postal_code].filter(Boolean).join(" "),
    address.country,
  ].filter((part): part is string => Boolean(part && part.trim()));

  return parts.length ? parts.join(", ") : null;
}

export function groupAddressesByType(addresses: Address[]): Array<[AddressType, Address[]]> {
  return ADDRESS_TYPES.map(
    (type): [AddressType, Address[]] => [
      type,
      addresses
        .filter((address) => address.type === type)
        .sort((left, right) => Number(right.is_primary) - Number(left.is_primary)),
    ],
  ).filter(([, rows]) => rows.length > 0);
}
