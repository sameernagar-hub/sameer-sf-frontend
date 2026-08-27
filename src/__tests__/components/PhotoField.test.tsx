import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@/lib/contacts/photo", () => {
  const actual = jest.requireActual("@/lib/contacts/photo");
  return {
    ...actual,
    prepareImage: jest.fn(actual.prepareImage),
  };
});

import PhotoField from "@/components/contacts/PhotoField";
import * as photoModule from "@/lib/contacts/photo";
import { MAX_SOURCE_BYTES } from "@/lib/contacts/photo";

const PHOTO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB";

function hiddenPhotoInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>(
    'input[type="hidden"][name="photo"]',
  );
  if (!input) throw new Error("hidden photo input not rendered");
  return input;
}

function imageFile(name: string, type: string, size = 64): File {
  const file = new File(["binary"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

describe("PhotoField", () => {
  it("submits nothing when no photo is chosen", () => {
    const { container } = render(<PhotoField />);

    expect(hiddenPhotoInput(container)).toHaveValue("");
    expect(screen.getByRole("button", { name: /upload photo/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /remove/i })).toBeNull();
  });

  it("carries an existing photo through, so a full replace does not wipe it", () => {
    const { container } = render(<PhotoField defaultValue={PHOTO} />);

    expect(hiddenPhotoInput(container)).toHaveValue(PHOTO);
    expect(screen.getByAltText(/selected profile photo/i)).toHaveAttribute(
      "src",
      PHOTO,
    );
    expect(screen.getByRole("button", { name: /replace photo/i })).toBeInTheDocument();
  });

  it("reads a chosen image into the hidden input as a data URL", async () => {
    const { container } = render(<PhotoField />);

    await userEvent.upload(
      screen.getByLabelText(/profile photo/i),
      imageFile("ada.png", "image/png"),
    );

    await waitFor(() =>
      expect(hiddenPhotoInput(container).value).toMatch(/^data:image\/png;base64,/),
    );
    expect(screen.getByAltText(/selected profile photo/i)).toBeInTheDocument();
  });

  it("offers the file picker only the types the API accepts", () => {
    // The browser filters on `accept`, so an unsupported file never reaches the
    // change handler. `imageFileError` still checks the type for the paths that
    // bypass the picker; that check is covered in lib/contacts/photo.test.ts.
    render(<PhotoField />);

    expect(screen.getByLabelText(/profile photo/i)).toHaveAttribute(
      "accept",
      "image/png,image/jpeg,image/gif,image/webp",
    );
  });

  it("rejects a file too large to be worth reading", async () => {
    const { container } = render(<PhotoField />);

    await userEvent.upload(
      screen.getByLabelText(/profile photo/i),
      imageFile("huge.png", "image/png", MAX_SOURCE_BYTES + 1),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /too large to read/,
    );
    expect(hiddenPhotoInput(container)).toHaveValue("");
  });

  it("clears the photo when removed", async () => {
    const { container } = render(<PhotoField defaultValue={PHOTO} />);

    await userEvent.click(screen.getByRole("button", { name: /remove/i }));

    expect(hiddenPhotoInput(container)).toHaveValue("");
    expect(screen.queryByAltText(/selected profile photo/i)).toBeNull();
  });

  it("does not allow removal to race an in-flight replacement", async () => {
    let resolvePrepared!: (value: string) => void;
    const prepared = new Promise<string>((resolve) => {
      resolvePrepared = resolve;
    });
    const prepareImageMock = photoModule.prepareImage as jest.MockedFunction<
      typeof photoModule.prepareImage
    >;
    prepareImageMock.mockReturnValueOnce(prepared);

    const { container } = render(<PhotoField defaultValue={PHOTO} />);

    await userEvent.upload(
      screen.getByLabelText(/profile photo/i),
      imageFile("ada.png", "image/png"),
    );

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /remove/i })).toBeDisabled(),
    );

    resolvePrepared("data:image/png;base64,replacement");

    await waitFor(() =>
      expect(hiddenPhotoInput(container)).toHaveValue(
        "data:image/png;base64,replacement",
      ),
    );
  });

  it("reports busy while reading, so the form can hold the save", async () => {
    const onBusyChange = jest.fn();
    render(<PhotoField onBusyChange={onBusyChange} />);

    await userEvent.upload(
      screen.getByLabelText(/profile photo/i),
      imageFile("ada.png", "image/png"),
    );

    await waitFor(() => expect(onBusyChange).toHaveBeenCalledWith(false));
    expect(onBusyChange.mock.calls.map(([busy]) => busy)).toEqual([true, false]);
  });

  it("shows a server-side rejection from the form action", () => {
    render(<PhotoField error="The API rejected that image." />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "The API rejected that image.",
    );
  });
});
