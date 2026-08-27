import { z } from "zod";
import { photoDataUrl } from "./photo";
import { ADDRESS_TYPES, type AddressInput, type ContactInput } from "./types";

/**
 * Client/server-shared validation for the contact form.
 *
 * The rules mirror the API's Pydantic models (`ContactCreate` / `ContactReplace`)
 * so the user sees a mistake before a round trip — the API stays the authority,
 * and anything it rejects anyway is surfaced by `toFieldErrors` in `./api.ts`.
 */

/** Optional text: trimmed, and blank becomes `null` (the API clears the field). */
function optionalText(max: number, label: string) {
  return z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer`)
    .transform((value) => value || null)
    .nullable()
    .default(null);
}

function requiredText(max: number, label: string) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be ${max} characters or fewer`);
}

export const contactInputSchema = z.object({
  first_name: requiredText(100, "First name"),
  last_name: requiredText(100, "Last name"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .max(320, "Email must be 320 characters or fewer")
    .pipe(z.email("Enter a valid email address"))
    .transform((value) => value.toLowerCase()),
  phone: optionalText(40, "Phone"),
  company: optionalText(200, "Company"),
  job_title: optionalText(200, "Job title"),
  addresses: z
    .array(
      z.object({
        type: z.enum(ADDRESS_TYPES),
        street: optionalText(300, "Street address"),
        city: optionalText(120, "City"),
        state: optionalText(120, "State / region"),
        postal_code: optionalText(20, "Postal code"),
        country: optionalText(120, "Country"),
        is_primary: z.coerce.boolean().default(false),
      }) satisfies z.ZodType<AddressInput, unknown>,
    )
    .max(20, "Use 20 addresses or fewer")
    .refine(
      (addresses) => addresses.filter((address) => address.is_primary).length <= 1,
      "Only one address can be primary",
    ),
  photo: photoDataUrl(),
  notes: z
    .string()
    .trim()
    .transform((value) => value || null)
    .nullable()
    .default(null),
}) satisfies z.ZodType<ContactInput, unknown>;

export type ContactFormValues = z.input<typeof contactInputSchema>;

/** Collapse a ZodError into one message per field, keyed by input name. */
export function zodFieldErrors(
  error: z.ZodError,
): Partial<Record<keyof ContactInput, string>> {
  const fieldErrors: Partial<Record<keyof ContactInput, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (key === "addresses" && issue.path.length > 1) continue;
    if (typeof key === "string" && !(key in fieldErrors)) {
      fieldErrors[key as keyof ContactInput] = issue.message;
    }
  }
  return fieldErrors;
}

export function zodAddressErrors(
  error: z.ZodError,
): Array<Partial<Record<keyof AddressInput, string>>> {
  const addressErrors: Array<Partial<Record<keyof AddressInput, string>>> = [];
  for (const issue of error.issues) {
    const [scope, index, field] = issue.path;
    if (scope === "addresses" && typeof index === "number" && typeof field === "string") {
      addressErrors[index] ??= {};
      addressErrors[index][field as keyof AddressInput] ??= issue.message;
    }
  }
  return addressErrors;
}

/* ------------------------------------------------------------------ */
/* Form metadata — one source of truth for the fields and their limits */
/* ------------------------------------------------------------------ */

export interface ContactFieldSpec {
  name: keyof ContactInput;
  label: string;
  type?: "text" | "email" | "tel" | "textarea";
  required?: boolean;
  maxLength: number;
  placeholder?: string;
  autoComplete?: string;
  /** Column span inside the section grid. */
  wide?: boolean;
}

export interface ContactFieldGroup {
  title: string;
  description: string;
  fields: ContactFieldSpec[];
}

export const CONTACT_FIELD_GROUPS: ContactFieldGroup[] = [
  {
    title: "Identity",
    description: "First name, last name, and email are required.",
    fields: [
      {
        name: "first_name",
        label: "First name",
        required: true,
        maxLength: 100,
        placeholder: "Ada",
        autoComplete: "given-name",
      },
      {
        name: "last_name",
        label: "Last name",
        required: true,
        maxLength: 100,
        placeholder: "Lovelace",
        autoComplete: "family-name",
      },
      {
        name: "email",
        label: "Email",
        type: "email",
        required: true,
        maxLength: 320,
        placeholder: "ada@example.com",
        autoComplete: "email",
      },
      {
        name: "phone",
        label: "Phone",
        type: "tel",
        maxLength: 40,
        placeholder: "+1-415-555-0101",
        autoComplete: "tel",
      },
    ],
  },
  {
    title: "Work",
    description: "Where they work and what they do.",
    fields: [
      {
        name: "company",
        label: "Company",
        maxLength: 200,
        placeholder: "Analytical Engines",
        autoComplete: "organization",
      },
      {
        name: "job_title",
        label: "Job title",
        maxLength: 200,
        placeholder: "Mathematician",
        autoComplete: "organization-title",
      },
    ],
  },
  {
    title: "Notes",
    description: "Anything worth remembering. No length limit.",
    fields: [
      {
        name: "notes",
        label: "Notes",
        type: "textarea",
        maxLength: 10_000,
        placeholder: "Met at the SF hackathon.",
        wide: true,
      },
    ],
  },
];

export const CONTACT_FIELDS: ContactFieldSpec[] = CONTACT_FIELD_GROUPS.flatMap(
  (group) => group.fields,
);

/**
 * Every key the form submits: the text fields above, plus `photo`, which is
 * picked with a file input and submitted as a hidden base64 value by
 * `PhotoField` and so has no `ContactFieldSpec` of its own.
 */
export const CONTACT_VALUE_NAMES: (keyof ContactInput)[] = [
  ...CONTACT_FIELDS.map((field) => field.name),
  "photo",
];

const ADDRESS_FIELD_NAMES = [
  "type",
  "street",
  "city",
  "state",
  "postal_code",
  "country",
] as const satisfies readonly (keyof AddressInput)[];

function emptyAddress(): AddressInput {
  return {
    type: "Home",
    street: null,
    city: null,
    state: null,
    postal_code: null,
    country: null,
    is_primary: false,
  };
}

/** Pull the contact fields out of a submitted form, preserving address rows. */
export function formDataToValues(
  formData: FormData,
): ContactInput {
  const values = Object.fromEntries(
    CONTACT_VALUE_NAMES.map((name) => [
      name,
      String(formData.get(name) ?? ""),
    ]),
  ) as Omit<ContactInput, "addresses">;

  const buckets = new Map<number, Partial<AddressInput>>();
  for (const key of formData.keys()) {
    const match = /^addresses\.(\d+)\.(\w+)$/.exec(key);
    if (!match) continue;
    const [, rawIndex, rawField] = match;
    const field = rawField as keyof AddressInput;
    if (!ADDRESS_FIELD_NAMES.includes(field as never)) continue;

    const index = Number(rawIndex);
    const row = buckets.get(index) ?? {};
    row[field] = String(formData.get(key) ?? "") as never;
    buckets.set(index, row);
  }

  const primary = formData.get("addresses.primary");
  const primaryIndex = primary === null || primary === "" ? null : Number(primary);
  return {
    ...values,
    addresses: [...buckets.entries()]
      .sort(([left], [right]) => left - right)
      .map(([index, row]) => ({
        ...emptyAddress(),
        ...row,
        is_primary: primaryIndex === index,
      })),
  };
}
