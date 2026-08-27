"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { ADDRESS_TYPES, type AddressInput } from "@/lib/contacts/types";

type AddressDraft = AddressInput & { key: string };

const CONTROL =
  "w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors focus:border-primary focus:bg-input";

const TEXT_FIELDS = [
  ["street", "Street address", "1 Market St, Suite 400"],
  ["city", "City", "San Francisco"],
  ["state", "State / region", "CA"],
  ["postal_code", "Postal code", "94105"],
  ["country", "Country", "USA"],
] as const;

let nextAddressKey = 0;

function blankAddress(isPrimary: boolean): AddressDraft {
  return {
    key: `new-${nextAddressKey++}`,
    type: "Home",
    street: null,
    city: null,
    state: null,
    postal_code: null,
    country: null,
    is_primary: isPrimary,
  };
}

function toDraft(address: AddressInput, index: number): AddressDraft {
  return { ...address, key: `${index}-${address.type}-${address.street ?? ""}` };
}

export default function AddressFields({
  addresses,
  errors,
  collectionError,
}: {
  addresses: AddressInput[];
  errors?: Array<Partial<Record<keyof AddressInput, string>>>;
  collectionError?: string;
}) {
  const initialRows = useMemo(
    () => addresses.map((address, index) => toDraft(address, index)),
    [addresses],
  );
  const [rows, setRows] = useState<AddressDraft[]>(initialRows);

  function addAddress() {
    setRows((current) => [...current, blankAddress(current.length === 0)]);
  }

  function removeAddress(key: string) {
    setRows((current) => current.filter((row) => row.key !== key));
  }

  return (
    <fieldset className="space-y-4">
      <legend className="sr-only">Addresses</legend>

      <div className="border-b border-hairline pb-2">
        <h2 className="font-display text-sm font-semibold text-foreground">
          Addresses
        </h2>
        <p className="text-[13px] text-muted-foreground">
          Home, work, and other places for this contact.
        </p>
      </div>

      {collectionError ? (
        <p role="alert" className="text-[13px] text-destructive">
          {collectionError}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-dashed border-border px-3 py-3">
          <p className="text-sm text-muted-foreground">No addresses saved.</p>
          <Button variant="secondary" size="sm" onClick={addAddress}>
            <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            Add address
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row, index) => (
            <div key={row.key} className="rounded-md border border-border p-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <label className="flex min-w-40 flex-col gap-1 text-[13px] font-medium text-foreground">
                  Type
                  <select
                    name={`addresses.${index}.type`}
                    defaultValue={row.type}
                    className={CONTROL}
                  >
                    {ADDRESS_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="inline-flex items-center gap-2 text-[13px] text-foreground">
                  <input
                    type="radio"
                    name="addresses.primary"
                    value={index}
                    defaultChecked={row.is_primary}
                    className="h-4 w-4 accent-primary"
                  />
                  Primary
                </label>

                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove address ${index + 1}`}
                  onClick={() => removeAddress(row.key)}
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                  Remove
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {TEXT_FIELDS.map(([name, label, placeholder]) => {
                  const error = errors?.[index]?.[name];
                  const id = `address-${index}-${name}`;
                  return (
                    <div key={name} className={name === "street" ? "sm:col-span-2" : undefined}>
                      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-foreground">
                        {label}
                        <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                          optional
                        </span>
                      </label>
                      <input
                        id={id}
                        name={`addresses.${index}.${name}`}
                        defaultValue={row[name] ?? ""}
                        maxLength={name === "postal_code" ? 20 : name === "street" ? 300 : 120}
                        placeholder={placeholder}
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? `${id}-error` : undefined}
                        className={`${CONTROL} ${error ? "border-destructive focus:border-destructive" : ""}`}
                      />
                      {error ? (
                        <p id={`${id}-error`} role="alert" className="mt-1.5 text-[13px] text-destructive">
                          {error}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <Button variant="secondary" size="sm" onClick={addAddress}>
            <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            Add address
          </Button>
        </div>
      )}
    </fieldset>
  );
}
