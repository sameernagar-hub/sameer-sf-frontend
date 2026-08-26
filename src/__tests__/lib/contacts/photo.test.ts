import {
  ACCEPTED_IMAGE_TYPES,
  MAX_PHOTO_BYTES,
  MAX_SOURCE_BYTES,
  imageFileError,
  photoDataUrl,
} from "@/lib/contacts/photo";

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB";

function file(type: string, size: number): File {
  const blob = new File(["x"], "photo", { type });
  Object.defineProperty(blob, "size", { value: size });
  return blob;
}

describe("imageFileError", () => {
  it("accepts every type the API allows", () => {
    for (const type of ACCEPTED_IMAGE_TYPES) {
      expect(imageFileError(file(type, 1024))).toBeNull();
    }
  });

  it("rejects a type the API does not accept", () => {
    expect(imageFileError(file("image/svg+xml", 1024))).toMatch(/PNG, JPEG/);
    expect(imageFileError(file("application/pdf", 1024))).toMatch(/PNG, JPEG/);
  });

  it("accepts a camera original, which gets downscaled rather than refused", () => {
    expect(imageFileError(file("image/png", MAX_PHOTO_BYTES * 8))).toBeNull();
  });

  it("rejects a file too large to be worth reading at all", () => {
    expect(imageFileError(file("image/png", MAX_SOURCE_BYTES + 1))).toMatch(
      /too large to read/,
    );
  });
});

describe("photoDataUrl", () => {
  const schema = photoDataUrl();

  it("treats blank as no photo", () => {
    expect(schema.parse("")).toBeNull();
    expect(schema.parse("   ")).toBeNull();
  });

  it("accepts a base64 image data URL", () => {
    expect(schema.parse(PNG)).toBe(PNG);
  });

  it("rejects anything that is not a supported data URL", () => {
    expect(schema.safeParse("https://example.com/ada.png").success).toBe(false);
    expect(
      schema.safeParse("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=").success,
    ).toBe(false);
  });

  it("rejects an image over the size limit", () => {
    const huge = `data:image/png;base64,${"A".repeat(
      Math.ceil(MAX_PHOTO_BYTES / 3) * 4 + 256,
    )}`;
    expect(schema.safeParse(huge).success).toBe(false);
  });
});
