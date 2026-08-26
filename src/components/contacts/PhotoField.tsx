"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, User } from "lucide-react";
import Button from "@/components/ui/Button";
import {
  MAX_PHOTO_LABEL,
  PHOTO_ACCEPT,
  imageFileError,
  readImageAsDataUrl,
} from "@/lib/contacts/photo";

/**
 * Profile-photo picker for the contact form.
 *
 * The API carries the image as a base64 `data:` URL on the contact itself, so
 * there is no upload endpoint: the file is read in the browser and submitted in
 * a hidden input alongside the text fields. Seeding that input from
 * `defaultValue` is what keeps an edit — a full `PUT` — from wiping the photo
 * of a contact whose picture the user never touched.
 */
export default function PhotoField({
  defaultValue,
  error,
}: {
  defaultValue?: string | null;
  error?: string;
}) {
  const [photo, setPhoto] = useState<string | null>(defaultValue ?? null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const message = localError ?? error;

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Clear the input so removing a photo and re-picking the same file still
    // fires a change event.
    event.target.value = "";
    if (!file) return;

    const problem = imageFileError(file);
    if (problem) {
      setLocalError(problem);
      return;
    }

    setLocalError(null);
    setReading(true);
    try {
      setPhoto(await readImageAsDataUrl(file));
    } catch {
      setLocalError("That image could not be read. Try another file.");
    } finally {
      setReading(false);
    }
  }

  function removePhoto() {
    setPhoto(null);
    setLocalError(null);
  }

  return (
    <div className="sm:col-span-2">
      {/* What the form actually submits. */}
      <input type="hidden" name="photo" value={photo ?? ""} />

      <div className="flex items-center gap-4">
        <span className="relative inline-flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-secondary/40">
          {photo ? (
            // A data URL, so next/image would have nothing to optimise.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt="Selected profile photo"
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <User
              className="h-8 w-8 text-muted-foreground/50"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          )}

          {reading ? (
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70">
              <Loader2
                className="h-5 w-5 animate-spin text-muted-foreground"
                aria-hidden="true"
              />
            </span>
          ) : null}
        </span>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={reading}
              onClick={() => inputRef.current?.click()}
            >
              <ImagePlus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              {photo ? "Replace photo" : "Upload photo"}
            </Button>

            {photo ? (
              <Button variant="ghost" size="sm" onClick={removePhoto}>
                <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                Remove
              </Button>
            ) : null}
          </div>

          <p className="text-[13px] text-muted-foreground">
            PNG, JPEG, GIF, or WebP, up to {MAX_PHOTO_LABEL}. Without a photo,
            contacts show their initials.
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={PHOTO_ACCEPT}
        className="sr-only"
        aria-label="Profile photo"
        onChange={handleFile}
      />

      {message ? (
        <p role="alert" className="mt-2 text-[13px] text-destructive">
          {message}
        </p>
      ) : null}
    </div>
  );
}
