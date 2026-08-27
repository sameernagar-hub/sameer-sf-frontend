import type { CSSProperties } from "react";
import { avatarHue, generatedAvatarDataUrl } from "@/lib/contacts/format";
import type { Contact } from "@/lib/contacts/types";

const SIZES = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
} as const;

/**
 * Circular profile image when the contact has a photo, otherwise a local SVG
 * avatar generated from their name and email. No external avatar API is used.
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
  const source = contact.photo || generatedAvatarDataUrl(contact);

  return (
    // The source is either an inline uploaded photo or an inline generated SVG,
    // so next/image has nothing to optimise or fetch.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={source}
      alt=""
      aria-hidden="true"
      style={style}
      className={`contact-avatar inline-block aspect-square shrink-0 select-none rounded-full border border-hairline object-cover ${SIZES[size]}`}
    />
  );
}
