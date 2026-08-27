"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";
import Field from "@/components/ui/Field";
import AddressFields from "./AddressFields";
import PhotoField from "./PhotoField";
import Button, { buttonClasses } from "@/components/ui/Button";
import { CONTACT_FIELD_GROUPS } from "@/lib/contacts/schema";
import {
  EMPTY_FORM_STATE,
  type Contact,
  type ContactInput,
  type FormState,
} from "@/lib/contacts/types";

export type ContactFormAction = (
  state: FormState,
  formData: FormData,
) => Promise<FormState>;

function SubmitButton({
  label,
  disabled = false,
}: {
  label: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending || disabled}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : null}
      {pending ? "Saving…" : label}
    </Button>
  );
}

/**
 * Create/edit form. The field list comes from `CONTACT_FIELD_GROUPS`, and the
 * action is a bound server action — so a submit is a plain POST that works
 * before hydration and reports errors through `useActionState`.
 */
export default function ContactForm({
  action,
  contact,
  submitLabel,
  cancelHref,
}: {
  action: ContactFormAction;
  contact?: Contact;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction] = useActionState(action, EMPTY_FORM_STATE);
  // A photo is read in the browser before it can be submitted, so saving waits
  // for it rather than posting the value it is about to replace.
  const [photoBusy, setPhotoBusy] = useState(false);

  function valueFor(name: keyof ContactInput): string {
    const value = state.values?.[name] ?? contact?.[name] ?? "";
    return typeof value === "string" ? value : "";
  }

  const addresses = state.values?.addresses ?? contact?.addresses ?? [];
  const addressKey = JSON.stringify(addresses);

  return (
    <form action={formAction} noValidate className="space-y-8">
      {state.status === "error" && state.message ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-foreground"
        >
          <AlertCircle
            className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
            strokeWidth={2}
            aria-hidden="true"
          />
          <span>{state.message}</span>
        </div>
      ) : null}

      <fieldset className="space-y-4">
        <legend className="sr-only">Photo</legend>

        <div className="border-b border-hairline pb-2">
          <h2 className="font-display text-sm font-semibold text-foreground">
            Photo
          </h2>
          <p className="text-[13px] text-muted-foreground">
            A profile picture for this contact. Optional.
          </p>
        </div>

        <PhotoField
          defaultValue={state.values?.photo ?? contact?.photo ?? null}
          error={state.fieldErrors?.photo}
          onBusyChange={setPhotoBusy}
        />
      </fieldset>

      {CONTACT_FIELD_GROUPS.map((group) => (
        <div key={group.title} className="space-y-8">
          <fieldset className="space-y-4">
            <legend className="sr-only">{group.title}</legend>

            <div className="border-b border-hairline pb-2">
              <h2 className="font-display text-sm font-semibold text-foreground">
                {group.title}
              </h2>
              <p className="text-[13px] text-muted-foreground">
                {group.description}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {group.fields.map((field) => (
                <Field
                  key={field.name}
                  field={field}
                  defaultValue={valueFor(field.name)}
                  error={state.fieldErrors?.[field.name]}
                />
              ))}
            </div>
          </fieldset>

          {group.title === "Work" ? (
            <AddressFields
              key={addressKey}
              addresses={addresses}
              errors={state.addressErrors}
              collectionError={state.fieldErrors?.addresses}
            />
          ) : null}
        </div>
      ))}

      <div className="flex items-center gap-2 border-t border-hairline pt-4">
        <SubmitButton label={submitLabel} disabled={photoBusy} />
        <Link href={cancelHref} className={buttonClasses("secondary")}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
