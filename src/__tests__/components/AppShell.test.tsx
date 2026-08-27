import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ThemeProvider from "@/components/ThemeProvider";
import AppShell from "@/components/AppShell";

const mockPathname = jest.fn(() => "/contacts");
jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}));

function renderShell() {
  return render(
    <ThemeProvider>
      <AppShell>
        <p>page body</p>
      </AppShell>
    </ThemeProvider>,
  );
}

beforeEach(() => {
  mockPathname.mockReturnValue("/contacts");
  window.localStorage.clear();
  delete document.documentElement.dataset.simpleHelp;
  delete document.documentElement.dataset.textSize;
  delete document.documentElement.dataset.contrast;
});

describe("AppShell", () => {
  it("renders the branding, nav, children and version footer", () => {
    renderShell();

    expect(screen.getByRole("link", { name: "SF Contacts" })).toHaveAttribute(
      "href",
      "/contacts",
    );
    expect(screen.getByRole("link", { name: "Contacts" })).toHaveAttribute(
      "href",
      "/contacts",
    );
    expect(screen.getByRole("link", { name: "New contact" })).toHaveAttribute(
      "href",
      "/contacts/new",
    );
    expect(screen.getByText("page body")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toHaveTextContent(/^web v/);
    expect(screen.getByRole("link", { name: /skip to contacts/i })).toHaveAttribute(
      "href",
      "#main-content",
    );
  });

  it("marks the current route as active", () => {
    renderShell();
    expect(screen.getByRole("link", { name: "Contacts" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("ignores the trailing slash Next adds", () => {
    mockPathname.mockReturnValue("/contacts/");
    renderShell();
    expect(screen.getByRole("link", { name: "Contacts" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("keeps Contacts active on a detail route", () => {
    mockPathname.mockReturnValue("/contacts/7");
    renderShell();
    expect(screen.getByRole("link", { name: "Contacts" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("link", { name: "New contact" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("switches the active link on the create route", () => {
    mockPathname.mockReturnValue("/contacts/new/");
    renderShell();
    expect(screen.getByRole("link", { name: "New contact" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Contacts" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("opens accessibility help and applies reader-friendly settings", async () => {
    renderShell();

    await userEvent.click(screen.getByRole("button", { name: /accessibility and help/i }));

    expect(
      screen.getByRole("dialog", { name: /accessibility and plain language help/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/quick guide/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("switch", { name: /plain words/i }));
    await userEvent.click(screen.getByRole("switch", { name: /larger text/i }));
    await userEvent.click(screen.getByRole("switch", { name: /more contrast/i }));

    expect(document.documentElement.dataset.simpleHelp).toBe("on");
    expect(document.documentElement.dataset.textSize).toBe("large");
    expect(document.documentElement.dataset.contrast).toBe("more");
  });

  it("closes the accessibility help with Escape and returns focus", async () => {
    renderShell();

    const trigger = screen.getByRole("button", { name: /accessibility and help/i });
    await userEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it("keeps accessibility toggles working when storage is blocked", async () => {
    const setItem = jest
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("storage blocked");
      });
    renderShell();

    await userEvent.click(screen.getByRole("button", { name: /accessibility and help/i }));
    await userEvent.click(screen.getByRole("switch", { name: /larger text/i }));

    expect(document.documentElement.dataset.textSize).toBe("large");
    setItem.mockRestore();
  });

  it("ignores malformed saved accessibility settings", async () => {
    window.localStorage.setItem(
      "sfcontacts-accessibility",
      JSON.stringify({
        plain: true,
        large: "false",
        contrast: null,
      }),
    );

    renderShell();

    await userEvent.click(screen.getByRole("button", { name: /accessibility and help/i }));

    expect(screen.getByRole("switch", { name: /plain words/i })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("switch", { name: /larger text/i })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    expect(screen.getByRole("switch", { name: /more contrast/i })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    expect(document.documentElement.dataset.simpleHelp).toBe("on");
    expect(document.documentElement.dataset.textSize).toBe("normal");
    expect(document.documentElement.dataset.contrast).toBe("normal");
  });
});
