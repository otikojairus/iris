"use client";

import { THEMES } from "@/lib/generate/themes";

type Props = {
  value: string;
  onChange: (id: string) => void;
};

/** Horizontal theme selector showing each theme's palette swatches. */
export function ThemePicker({ value, onChange }: Props) {
  return (
    <div className="iris-themes">
      {THEMES.map((theme) => {
        const swatches = [
          theme.palette.primary,
          theme.palette.accent,
          theme.palette.bg,
          theme.palette.dark,
        ];
        return (
          <button
            key={theme.id}
            type="button"
            className="iris-theme"
            data-active={value === theme.id}
            aria-pressed={value === theme.id}
            onClick={() => onChange(theme.id)}
          >
            <span className="iris-theme-swatches">
              {swatches.map((c, i) => (
                <i key={i} style={{ background: c }} />
              ))}
            </span>
            <span className="iris-theme-name">{theme.label}</span>
            <span className="iris-theme-desc">{theme.description}</span>
          </button>
        );
      })}
    </div>
  );
}
