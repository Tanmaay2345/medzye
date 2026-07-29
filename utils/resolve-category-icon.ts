import {
  Activity,
  Cross,
  HeartPulse,
  Pill,
  Stethoscope,
  Syringe,
  Thermometer,
  type LucideIcon,
} from "lucide-react";

const NAME_ICON_MAP: Record<string, LucideIcon> = {
  "cold and flu": Thermometer,
  "first aid": Cross,
  "heart health": HeartPulse,
  "diabetes care": Syringe,
};

const ICON_KEY_MAP: Record<string, LucideIcon> = {
  thermometer: Thermometer,
  stethoscope: Stethoscope,
  cross: Cross,
  "first-aid": Cross,
  "heart-pulse": HeartPulse,
  heartpulse: HeartPulse,
  syringe: Syringe,
  activity: Activity,
  pill: Pill,
};

export type ResolvedCategoryIcon =
  | { type: "image"; src: string }
  | { type: "icon"; Icon: LucideIcon };

/**
 * categories.icon is a free-text column of unknown format. Renders it as an
 * image if it looks like a URL/path, else maps it to a Lucide icon by name,
 * else falls back to the category's display name, else a generic pill icon.
 * Always driven by the real DB value — never a hardcoded per-category icon.
 */
export function resolveCategoryIcon(
  icon: string | null | undefined,
  name: string | null | undefined
): ResolvedCategoryIcon {
  const value = icon?.trim();
  if (value) {
    if (/^https?:\/\//i.test(value) || value.startsWith("/")) {
      return { type: "image", src: value };
    }
    const key = value.toLowerCase().replace(/\s+/g, "-");
    const mapped = ICON_KEY_MAP[key];
    if (mapped) return { type: "icon", Icon: mapped };
  }

  const nameKey = name?.trim().toLowerCase();
  if (nameKey && NAME_ICON_MAP[nameKey]) {
    return { type: "icon", Icon: NAME_ICON_MAP[nameKey] };
  }

  return { type: "icon", Icon: Pill };
}
