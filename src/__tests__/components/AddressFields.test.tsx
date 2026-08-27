import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddressFields from "@/components/contacts/AddressFields";

describe("AddressFields", () => {
  it("starts empty and adds a primary home address", async () => {
    const { container } = render(<AddressFields addresses={[]} />);

    expect(screen.getByText("No addresses saved.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /add address/i }));

    expect(screen.getByLabelText("Type")).toHaveValue("Home");
    expect(screen.getByLabelText("Primary")).toBeChecked();
    expect(
      container.querySelector('input[name="addresses.0.street"]'),
    ).toBeInTheDocument();
  });

  it("removes a row and keeps accessible remove names", async () => {
    render(
      <AddressFields
        addresses={[
          {
            type: "Home",
            street: "1 Market St",
            city: "San Francisco",
            state: "CA",
            postal_code: "94105",
            country: "USA",
            is_primary: true,
          },
        ]}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Remove address 1" }));

    expect(screen.getByText("No addresses saved.")).toBeInTheDocument();
  });

  it("uses one primary radio group across all rows", async () => {
    render(
      <AddressFields
        addresses={[
          {
            type: "Home",
            street: null,
            city: null,
            state: null,
            postal_code: null,
            country: null,
            is_primary: true,
          },
          {
            type: "Work",
            street: null,
            city: null,
            state: null,
            postal_code: null,
            country: null,
            is_primary: false,
          },
        ]}
      />,
    );

    const radios = screen.getAllByLabelText("Primary");
    expect(radios[0]).toBeChecked();
    expect(radios[1]).not.toBeChecked();

    await userEvent.click(radios[1]);

    expect(radios[0]).not.toBeChecked();
    expect(radios[1]).toBeChecked();
  });

  it("renders collection and row-level errors", () => {
    render(
      <AddressFields
        addresses={[
          {
            type: "Home",
            street: null,
            city: null,
            state: null,
            postal_code: "123456",
            country: null,
            is_primary: false,
          },
        ]}
        collectionError="Only one address can be primary"
        errors={[{ postal_code: "Postal code is too long" }]}
      />,
    );

    expect(screen.getByText("Only one address can be primary")).toHaveAttribute(
      "role",
      "alert",
    );
    expect(screen.getByText("Postal code is too long")).toHaveAttribute(
      "role",
      "alert",
    );
    expect(screen.getByLabelText(/postal code/i)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("renders type errors on the type select", () => {
    render(
      <AddressFields
        addresses={[
          {
            type: "Home",
            street: null,
            city: null,
            state: null,
            postal_code: null,
            country: null,
            is_primary: false,
          },
        ]}
        errors={[{ type: "Invalid address type" }]}
      />,
    );

    expect(screen.getByText("Invalid address type")).toHaveAttribute("role", "alert");
    expect(screen.getByLabelText("Type")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Type")).toHaveAccessibleDescription(
      "Invalid address type",
    );
  });

  it("keeps errors attached to their row after removing a preceding row", async () => {
    render(
      <AddressFields
        addresses={[
          {
            type: "Home",
            street: "1 Market St",
            city: null,
            state: null,
            postal_code: null,
            country: null,
            is_primary: false,
          },
          {
            type: "Work",
            street: "1355 Market St",
            city: null,
            state: null,
            postal_code: null,
            country: null,
            is_primary: false,
          },
        ]}
        errors={[
          { street: "Home street is invalid" },
          { city: "Work city is required" },
        ]}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Remove address 1" }));

    expect(screen.queryByText("Home street is invalid")).toBeNull();
    expect(screen.getByText("Work city is required")).toHaveAttribute("role", "alert");
    expect(screen.getByLabelText(/city/i)).toHaveAccessibleDescription(
      "Work city is required",
    );
  });
});
