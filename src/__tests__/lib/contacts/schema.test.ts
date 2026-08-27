import {
  CONTACT_VALUE_NAMES,
  contactInputSchema,
  formDataToValues,
  zodAddressErrors,
  zodFieldErrors,
} from "@/lib/contacts/schema";

function values(overrides: Record<string, unknown> = {}) {
  return {
    first_name: "Ada",
    last_name: "Lovelace",
    email: "Ada@Example.com",
    phone: "",
    company: "",
    job_title: "",
    addresses: [],
    photo: "",
    notes: "",
    ...overrides,
  };
}

function formData(entries: Array<[string, string]>): FormData {
  const data = new FormData();
  for (const [key, value] of entries) data.set(key, value);
  return data;
}

describe("contactInputSchema", () => {
  it("lowercases the email and nulls out blanks", () => {
    const parsed = contactInputSchema.parse(values());

    expect(parsed.email).toBe("ada@example.com");
    expect(parsed.phone).toBeNull();
    expect(parsed.notes).toBeNull();
    expect(parsed.addresses).toEqual([]);
  });

  it("trims what the user typed", () => {
    expect(contactInputSchema.parse(values({ company: "  Acme  " })).company).toBe(
      "Acme",
    );
  });

  it("requires the three fields the API requires", () => {
    const result = contactInputSchema.safeParse(
      values({ first_name: " ", last_name: "", email: "" }),
    );

    expect(result.success).toBe(false);
    expect(zodFieldErrors(result.error!)).toEqual({
      first_name: "First name is required",
      last_name: "Last name is required",
      email: "Email is required",
    });
  });

  it("rejects a malformed email", () => {
    const result = contactInputSchema.safeParse(values({ email: "not-an-email" }));
    expect(zodFieldErrors(result.error!).email).toBe("Enter a valid email address");
  });

  it("enforces address length limits per row", () => {
    const result = contactInputSchema.safeParse(
      values({
        addresses: [
          {
            type: "Home",
            street: "",
            city: "",
            state: "",
            postal_code: "9".repeat(21),
            country: "",
            is_primary: false,
          },
        ],
      }),
    );

    expect(result.success).toBe(false);
    expect(zodAddressErrors(result.error!)[0]).toEqual({
      postal_code: "Postal code must be 20 characters or fewer",
    });
  });

  it("rejects more than twenty addresses", () => {
    const result = contactInputSchema.safeParse(
      values({
        addresses: Array.from({ length: 21 }, () => ({
          type: "Home",
          street: "",
          city: "",
          state: "",
          postal_code: "",
          country: "",
          is_primary: false,
        })),
      }),
    );

    expect(result.success).toBe(false);
    expect(zodFieldErrors(result.error!).addresses).toBe(
      "Use 20 addresses or fewer",
    );
  });

  it("rejects two primary addresses", () => {
    const result = contactInputSchema.safeParse(
      values({
        addresses: [
          {
            type: "Home",
            street: "",
            city: "",
            state: "",
            postal_code: "",
            country: "",
            is_primary: true,
          },
          {
            type: "Work",
            street: "",
            city: "",
            state: "",
            postal_code: "",
            country: "",
            is_primary: true,
          },
        ],
      }),
    );

    expect(result.success).toBe(false);
    expect(zodFieldErrors(result.error!).addresses).toBe(
      "Only one address can be primary",
    );
  });
});

describe("formDataToValues", () => {
  it("pulls every flat field out, defaulting to an empty string", () => {
    const data = formData([
      ["first_name", "Grace"],
      ["email", "grace@example.com"],
      ["ignored", "nope"],
    ]);

    const extracted = formDataToValues(data);

    expect(extracted.first_name).toBe("Grace");
    expect(extracted.last_name).toBe("");
    expect(extracted.addresses).toEqual([]);
    expect(Object.keys(extracted).sort()).toEqual(
      [...CONTACT_VALUE_NAMES, "addresses"].sort(),
    );
  });

  it("reassembles indexed address fields into a sorted dense array", () => {
    const extracted = formDataToValues(
      formData([
        ["addresses.2.type", "Work"],
        ["addresses.2.street", "2 Office Plaza"],
        ["addresses.2.city", "Oakland"],
        ["addresses.0.type", "Home"],
        ["addresses.0.city", "San Francisco"],
        ["addresses.primary", "2"],
      ]),
    );

    expect(extracted.addresses).toEqual([
      {
        type: "Home",
        street: null,
        city: "San Francisco",
        state: null,
        postal_code: null,
        country: null,
        is_primary: false,
      },
      {
        type: "Work",
        street: "2 Office Plaza",
        city: "Oakland",
        state: null,
        postal_code: null,
        country: null,
        is_primary: true,
      },
    ]);
  });
});
