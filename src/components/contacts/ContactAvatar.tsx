import type { CSSProperties } from "react";
import { avatarHue, initials } from "@/lib/contacts/format";
import type { Contact } from "@/lib/contacts/types";

const SIZES = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
} as const;

/**
 * Circular profile image when the contact has a photo, otherwise an initials
 * bubble tinted with a hue derived from their email.
 */
export default function ContactAvatar({
  contact,
  size = "md",
}: {
  contact: Pick<Contact, "first_name" | "last_name" | "email" | "photo">;
  size?: keyof typeof SIZES;
}) {
  const style = {
    "--avatar-hue": avatarHue(contact.email),
  } as CSSProperties;

  if (contact.photo) {
    return (
      // The photo is a base64 data URL, so next/image has nothing to optimise
      // or to fetch — it is already inline in the payload.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={contact.photo}
        alt=""
        aria-hidden="true"
        className={`inline-block aspect-square shrink-0 rounded-full border border-hairline object-cover ${SIZES[size]}`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      style={style}
      className={`contact-avatar inline-flex shrink-0 select-none items-center justify-center rounded-full font-display font-semibold ${SIZES[size]}`}
    >
      {initials(contact)}
    </span>
  );
}
