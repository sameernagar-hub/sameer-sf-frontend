import React from "react";
import { render, screen } from "@testing-library/react";
import ContactAvatar from "@/components/contacts/ContactAvatar";
import { makeContact } from "../mocks/handlers";

const PHOTO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB";

describe("ContactAvatar", () => {
  it("falls back to initials when the contact has no photo", () => {
    const { container } = render(
      <ContactAvatar contact={makeContact({ photo: null })} />,
    );

    expect(container.textContent).toBe("AL");
    expect(container.querySelector("img")).toBeNull();
  });

  it("renders a circular image when the contact has a photo", () => {
    const { container } = render(
      <ContactAvatar contact={makeContact({ photo: PHOTO })} />,
    );

    const image = container.querySelector("img");
    expect(image).toHaveAttribute("src", PHOTO);
    expect(image).toHaveClass("rounded-full", "object-cover", "aspect-square");
    expect(container.textContent).toBe("");
  });

  it("stays decorative, so the adjacent name is not announced twice", () => {
    render(<ContactAvatar contact={makeContact({ photo: PHOTO })} />);
    expect(screen.queryByRole("img")).toBeNull();
  });
});
