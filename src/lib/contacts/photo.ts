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

/**
 * Largest image the API stores, mirroring `MAX_PHOTO_BYTES` in sf-backend.
 * It is small because `photo` is embedded in every contact the API returns,
 * so this cap is what bounds a list response.
 */
export const MAX_PHOTO_BYTES = 512 * 1024;

/**
 * Largest file we will read off disk. A camera original is far bigger than the
 * API's cap, so it is downscaled rather than refused — this only stops us
 * pulling something absurd into memory first.
 */
export const MAX_SOURCE_BYTES = 20 * 1024 * 1024;

/** Longest edge of the stored avatar. Square-cropped displays never need more. */
const MAX_DIMENSION = 512;

const JPEG_QUALITY = 0.85;

export const ACCEPTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
] as const;

/** `accept` attribute for the file input. */
export const PHOTO_ACCEPT = ACCEPTED_IMAGE_TYPES.join(",");

export const MAX_PHOTO_LABEL = `${MAX_PHOTO_BYTES / 1024} KB`;
export const MAX_SOURCE_LABEL = `${MAX_SOURCE_BYTES / 1024 / 1024} MB`;

const PHOTO_DATA_URL =
  /^data:image\/(?:png|jpeg|gif|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

// Base64 inflates by 4/3, so the encoded length bounds the decoded size without
// decoding it.
const MAX_ENCODED_LENGTH = Math.ceil(MAX_PHOTO_BYTES / 3) * 4;

/**
 * Whether a `data:` URL's image is over the API's cap, measured on the base64
 * payload alone so the prefix's length cannot buy extra bytes.
 */
export function photoTooLarge(dataUrl: string): boolean {
  return dataUrl.length - dataUrl.indexOf(",") - 1 > MAX_ENCODED_LENGTH;
}

const TYPE_ERROR = "Choose a PNG, JPEG, GIF, or WebP image.";
const SIZE_ERROR = `Photos must be ${MAX_PHOTO_LABEL} or smaller.`;
const SOURCE_SIZE_ERROR = `That file is too large to read. Pick one under ${MAX_SOURCE_LABEL}.`;

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
    .refine((value) => value === null || !photoTooLarge(value), SIZE_ERROR);
}

/**
 * Check a picked file before reading it. Returns the message to show, or `null`
 * when the file is acceptable.
 */
export function imageFileError(file: File): string | null {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return TYPE_ERROR;
  }
  if (file.size > MAX_SOURCE_BYTES) {
    return SOURCE_SIZE_ERROR;
  }
  return null;
}

/** The message to show when a prepared image is still over the API's cap. */
export const photoTooLargeMessage = SIZE_ERROR;

/**
 * Render an image file down to an avatar-sized JPEG data URL.
 *
 * Returns `null` when the browser cannot do it — no `createImageBitmap`, no 2D
 * context, or a file the decoder rejects — so the caller can fall back to
 * sending the original and let the API have the final say.
 */
async function downscale(file: File): Promise<string | null> {
  if (typeof createImageBitmap !== "function") return null;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return null;
  }

  try {
    const scale = Math.min(
      1,
      MAX_DIMENSION / Math.max(bitmap.width, bitmap.height),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));

    const context = canvas.getContext("2d");
    if (!context) return null;

    // Avatars are shown opaque, and JPEG has no alpha channel — paint white
    // first so a transparent PNG does not come out with a black background.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    return dataUrl.startsWith("data:image/jpeg;base64,") ? dataUrl : null;
  } finally {
    bitmap.close();
  }
}

/**
 * Turn a picked file into the data URL the API stores, downscaling it to an
 * avatar so a camera original does not have to be refused.
 */
export async function prepareImage(file: File): Promise<string> {
  return (await downscale(file)) ?? (await readImageAsDataUrl(file));
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
