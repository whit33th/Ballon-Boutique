"use client";

import { useTranslations } from 'next-intl';
import { palette } from "./palette";

export function PreferencesPanel() {
  const t = useTranslations('profile.settings.preferences');
  
  const preferenceItems = [
    { label: t('shippingUpdates'), defaultChecked: true },
    { label: t('promotionsInspiration'), defaultChecked: false },
    { label: t('restockAlerts'), defaultChecked: false },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {preferenceItems.map((item) => (
        <label
          key={item.label}
          className={`flex items-center justify-between gap-3 rounded-3xl border px-5 py-4 text-sm ${palette.softBorder} ${palette.softSurface} ${palette.mutedText}`}
        >
          <span>{item.label}</span>
          <input
            type="checkbox"
            defaultChecked={item.defaultChecked}
            className="accent-accent h-5 w-5"
          />
        </label>
      ))}
    </div>
  );
}
