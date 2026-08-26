import { z } from "zod";

/**
 * Contact photos travel as base64 `data:` URLs on the contact itself — the API
 * has no object store, so there is no upload endpoint and nothing to point a
 * URL at.
 *
 * The limits below mirror the API's (`app/photo.py` in sf-backend). Keeping
 * them in sync lets the user hear about a bad image immediately instead of
 * after a round trip; the API stays the authority and re-checks everything,
 * including the magic bytes a browser cannot be trusted to report.
 */

export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
] as const;

/** `accept` attribute for the file input. */
export const PHOTO_ACCEPT = ACCEPTED_IMAGE_TYPES.join(",");

export const MAX_PHOTO_LABEL = `${MAX_PHOTO_BYTES / 1024 / 1024} MB`;

const PHOTO_DATA_URL =
  /^data:image\/(?:png|jpeg|gif|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

// Base64 inflates by 4/3, so the encoded length bounds the decoded size without
// decoding it. The prefix adds a few dozen characters; the API is exact.
const MAX_ENCODED_LENGTH = Math.ceil(MAX_PHOTO_BYTES / 3) * 4 + 64;

const TYPE_ERROR = "Choose a PNG, JPEG, GIF, or WebP image.";
const SIZE_ERROR = `Photos must be ${MAX_PHOTO_LABEL} or smaller.`;

/**
 * Validation for the `photo` form field.
 *
 * Blank means "no photo", which the API stores as `null` and every avatar
 * renders as the contact's initials.
 */
export function photoDataUrl() {
  return z
    .string()
    .trim()
    .transform((value) => value || null)
    .nullable()
    .default(null)
    .refine((value) => value === null || PHOTO_DATA_URL.test(value), TYPE_ERROR)
    .refine(
      (value) => value === null || value.length <= MAX_ENCODED_LENGTH,
      SIZE_ERROR,
    );
}

/**
 * Check a picked file before reading it. Returns the message to show, or `null`
 * when the file is acceptable.
 */
export function imageFileError(file: File): string | null {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return TYPE_ERROR;
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return SIZE_ERROR;
  }
  return null;
}

/** Read a validated image file into the base64 `data:` URL the API expects. */
export function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("expected a data URL"));
      }
    };
    reader.readAsDataURL(file);
  });
}
