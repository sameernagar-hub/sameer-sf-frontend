import {
  addressLine,
  avatarHue,
  formatTimestamp,
  generatedAvatarDataUrl,
  groupAddressesByType,
  initials,
  jobLine,
} from "@/lib/contacts/format";
import type { Address } from "@/lib/contacts/types";
import { makeContact } from "../../mocks/handlers";

const ADDRESS: Address = {
  id: 1,
  type: "Home",
  street: "1 Market St",
  city: "San Francisco",
  state: "CA",
  postal_code: "94105",
  country: "USA",
  is_primary: true,
};

describe("initials", () => {
  it("takes the first letter of each name", () => {
    expect(initials({ first_name: "ada", last_name: "lovelace" })).toBe("AL");
  });
});

describe("avatarHue", () => {
  it("is stable for the same seed and within the hue range", () => {
    expect(avatarHue("ada@example.com")).toBe(avatarHue("ada@example.com"));
    expect(avatarHue("ada@example.com")).toBeGreaterThanOrEqual(0);
    expect(avatarHue("ada@example.com")).toBeLessThan(360);
  });

  it("separates different seeds", () => {
    expect(avatarHue("ada@example.com")).not.toBe(avatarHue("grace@example.com"));
  });
});

describe("generatedAvatarDataUrl", () => {
  it("builds a deterministic local SVG avatar", () => {
    const contact = makeContact({ photo: null });

    expect(generatedAvatarDataUrl(contact)).toBe(generatedAvatarDataUrl(contact));
    expect(decodeURIComponent(generatedAvatarDataUrl(contact))).toContain("<text");
    expect(decodeURIComponent(generatedAvatarDataUrl(contact))).toContain("AL</text>");
  });

  it("escapes initials before embedding them in SVG text", () => {
    const src = decodeURIComponent(
      generatedAvatarDataUrl({
        first_name: "<",
        last_name: "&",
        email: "symbols@example.com",
      }),
    );

    expect(src).toContain("&lt;&amp;</text>");
    expect(src).not.toContain("<&</text>");
  });
});

describe("formatTimestamp", () => {
  it("renders UTC regardless of the machine's zone", () => {
    expect(formatTimestamp("2026-08-19T17:04:53.743932Z")).toBe(
      "19 Aug 2026, 17:04 UTC",
    );
  });

  it("degrades to a dash on garbage input", () => {
    expect(formatTimestamp("not a date")).toBe("—");
  });
});

describe("jobLine", () => {
  it("joins the title and the company", () => {
    expect(jobLine(makeContact())).toBe("Mathematician at Analytical Engines");
  });

  it("falls back to whichever one is set", () => {
    expect(jobLine(makeContact({ company: null }))).toBe("Mathematician");
    expect(jobLine(makeContact({ job_title: null }))).toBe("Analytical Engines");
    expect(jobLine(makeContact({ job_title: null, company: null }))).toBeNull();
  });
});

describe("addressLine", () => {
  it("skips the parts that are not filled in", () => {
    expect(addressLine({ ...ADDRESS, street: null, postal_code: null })).toBe(
      "San Francisco, CA, USA",
    );
  });

  it("pairs the state with the postal code", () => {
    expect(addressLine(ADDRESS)).toBe("1 Market St, San Francisco, CA 94105, USA");
  });

  it("returns null when there is no address at all", () => {
    expect(
      addressLine({
        ...ADDRESS,
        street: null,
        city: null,
        state: null,
        postal_code: null,
        country: null,
      }),
    ).toBeNull();
  });
});

describe("groupAddressesByType", () => {
  it("orders groups by type and primary rows first", () => {
    const groups = groupAddressesByType([
      { ...ADDRESS, id: 1, type: "Work", is_primary: false },
      { ...ADDRESS, id: 2, type: "Home", is_primary: false },
      { ...ADDRESS, id: 3, type: "Work", is_primary: true },
    ]);

    expect(groups.map(([type]) => type)).toEqual(["Home", "Work"]);
    expect(groups[1][1].map((address) => address.id)).toEqual([3, 1]);
  });
});
