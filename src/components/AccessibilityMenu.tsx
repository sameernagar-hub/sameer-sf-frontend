"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Accessibility, BookOpen, Check, Languages, Type } from "lucide-react";
import Button from "@/components/ui/Button";

type Setting = "plain" | "large" | "contrast";
type Settings = Record<Setting, boolean>;

const STORAGE_KEY = "sfcontacts-accessibility";

const DEFAULT_SETTINGS: Settings = {
  plain: false,
  large: false,
  contrast: false,
};

function normalizeSettings(value: unknown): Settings {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return DEFAULT_SETTINGS;
  }

  const stored = value as Partial<Record<Setting, unknown>>;

  return {
    plain: typeof stored.plain === "boolean" ? stored.plain : DEFAULT_SETTINGS.plain,
    large: typeof stored.large === "boolean" ? stored.large : DEFAULT_SETTINGS.large,
    contrast:
      typeof stored.contrast === "boolean" ? stored.contrast : DEFAULT_SETTINGS.contrast,
  };
}

function readSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;

  try {
    return normalizeSettings(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}"));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function writeSettings(settings: Settings) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage can be blocked; keep the in-memory setting working for this page.
  }
}

function applySettings(settings: Settings) {
  document.documentElement.dataset.simpleHelp = settings.plain ? "on" : "off";
  document.documentElement.dataset.textSize = settings.large ? "large" : "normal";
  document.documentElement.dataset.contrast = settings.contrast ? "more" : "normal";
}

function ToggleRow({
  active,
  children,
  description,
  onClick,
}: {
  active: boolean;
  children: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-md border border-border bg-card px-3 py-2 text-left text-sm text-foreground hover:bg-secondary/50"
    >
      <span
        aria-hidden="true"
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
          active
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-input text-transparent"
        }`}
      >
        <Check className="h-3.5 w-3.5" strokeWidth={2.25} />
      </span>
      <span>
        <span className="block font-medium">{children}</span>
        <span className="mt-0.5 block text-[12px] leading-5 text-muted-foreground">
          {description}
        </span>
      </span>
    </button>
  );
}

export default function AccessibilityMenu() {
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>(() => readSettings());

  useEffect(() => {
    applySettings(settings);
  }, [settings]);

  useEffect(() => {
    if (!open) return undefined;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function setSetting(name: Setting) {
    setSettings((current) => {
      const next = { ...current, [name]: !current[name] };
      writeSettings(next);
      return next;
    });
  }

  return (
    <div className="relative">
      <Button
        ref={triggerRef}
        variant="ghost"
        size="sm"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="Accessibility and help"
        onClick={() => setOpen((value) => !value)}
      >
        <Accessibility className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        Help
      </Button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Accessibility and plain language help"
          className="absolute right-0 top-10 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-xl"
        >
          <div className="space-y-3">
            <div>
              <h2 className="font-display text-sm font-semibold">Make this easier to use</h2>
              <p className="mt-1 text-[13px] leading-5 text-muted-foreground">
                Change how the app reads and looks. Your choices stay on this device.
              </p>
            </div>

            <div className="space-y-2">
              <ToggleRow
                active={settings.plain}
                description="Shows short directions near search, forms, and addresses."
                onClick={() => setSetting("plain")}
              >
                Plain words
              </ToggleRow>
              <ToggleRow
                active={settings.large}
                description="Uses bigger text and roomier controls."
                onClick={() => setSetting("large")}
              >
                Larger text
              </ToggleRow>
              <ToggleRow
                active={settings.contrast}
                description="Strengthens borders, focus rings, and muted text."
                onClick={() => setSetting("contrast")}
              >
                More contrast
              </ToggleRow>
            </div>

            <div className="rounded-md border border-hairline bg-secondary/35 p-3">
              <h3 className="flex items-center gap-2 text-[13px] font-semibold">
                <BookOpen className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                Quick guide
              </h3>
              <ul className="mt-2 space-y-1.5 text-[13px] leading-5 text-muted-foreground">
                <li>Search: type any part of a name, email, company, or phone.</li>
                <li>Open: choose a person&apos;s name to see all details.</li>
                <li>Edit: use the pencil button, then Save changes.</li>
                <li>Keyboard: press Tab to move, Enter to choose, Escape to leave menus.</li>
              </ul>
            </div>

            <p className="flex items-start gap-2 text-[12px] leading-5 text-muted-foreground">
              <Languages className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
              Labels avoid idioms where possible. The plain-word hints use short sentences for
              people who read English differently or use translation tools.
            </p>
            <p className="flex items-start gap-2 text-[12px] leading-5 text-muted-foreground">
              <Type className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
              Screen reader updates announce searches, errors, and save progress.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
