"use client";

import { useTranslations } from "next-intl";
import { forwardRef, type RefObject, useState } from "react";
import { BALLOON_COLORS, getColorStyle } from "@/constants/colors";

interface PersonalizationOptions {
  text?: string;
  color?: string;
  number?: string;
}

interface ProductPersonalizationProps {
  availableColors?: string[];
  isNameEnabled: boolean;
  isNumberEnabled: boolean;
  onChange: (options: PersonalizationOptions) => void;
  requireColorSelection?: boolean;
  colorSectionRef?: RefObject<HTMLDivElement>;
}

export const ProductPersonalization = forwardRef<
  HTMLInputElement,
  ProductPersonalizationProps
>(function ProductPersonalization(
  {
    availableColors = [],
    isNameEnabled,
    isNumberEnabled,
    onChange,
    requireColorSelection,
    colorSectionRef,
  },
  numberInputRef,
) {
  const t = useTranslations("product");
  const [text, setText] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [number, setNumber] = useState("");

  const handleTextChange = (value: string) => {
    setText(value);
    onChange({
      text: value || undefined,
      color: selectedColor || undefined,
      number: number || undefined,
    });
  };

  const handleColorChange = (colorName: string) => {
    setSelectedColor(colorName);
    onChange({
      text: text || undefined,
      color: colorName,
      number: number || undefined,
    });
  };

  const handleNumberChange = (value: string) => {
    setNumber(value);
    onChange({
      text: text || undefined,
      color: selectedColor || undefined,
      number: value || undefined,
    });
  };

  const filteredColors = BALLOON_COLORS.filter((c) =>
    availableColors.includes(c.name),
  );

  if (availableColors.length === 0 && !isNameEnabled && !isNumberEnabled) {
    return null;
  }

  return (
    <div className="mt-8 space-y-6 border-t border-black/10 pt-6">
      <h3 className="text-deep text-xl font-bold tracking-wide">
        {t("personalize")}
      </h3>

      {/* Color Selector - show when there are colors available */}
      {availableColors.length > 0 && (
        <div ref={colorSectionRef}>
          <div className="mb-3 flex items-center gap-2">
            <span className="text-deep/70 text-xs font-semibold tracking-wider uppercase">
              {t("color")}
              {requireColorSelection && <span className="text-accent">*</span>}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {filteredColors.map((color) => (
              <button
                key={color.name}
                type="button"
                onClick={() => handleColorChange(color.name)}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all ${selectedColor === color.name
                  ? "border-accent/60 bg-accent/10 shadow-md"
                  : "hover:border-accent/50 border-black/10"
                  }`}
              >
                <div
                  className="h-12 w-12 shrink-0 rounded-full shadow-md"
                  style={{
                    ...getColorStyle(color.name, color.hex),
                    border: color.name === "White" ? "1px solid #ddd" : "none",
                  }}
                />
                <span className="text-deep/70 text-center text-xs font-medium">
                  {t(`colors.${color.name}`)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Number Input - Required if enabled (moved above name) */}
      {isNumberEnabled && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label
              htmlFor="personalization-number"
              className="text-deep/70 text-xs font-semibold tracking-wider uppercase"
            >
              {t("number")}
              <span className="text-accent">*</span>
            </label>
            <span className="text-deep/50 text-[10px] font-medium">
              {t("ageOrSpecialNumber")}
            </span>
          </div>
          <input
            ref={numberInputRef}
            id="personalization-number"
            type="number"
            value={number}
            onChange={(e) => handleNumberChange(e.target.value)}
            placeholder={t("numberPlaceholder")}
            min="0"
            max="99"
            required
            className={`text-deep h-11 w-full rounded-xl border-2 bg-white px-4 font-semibold transition-all outline-none focus:ring-2 ${!number.trim()
              ? "bg-accent/5 focus:border-accent/85 focus:ring-accent/10 border-black/20"
              : "focus:border-accent focus:ring-accent/30 border-black/20"
              }`}
          />
        </div>
      )}

      {/* Name Input - Optional */}
      {isNameEnabled && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label
              htmlFor="personalization-text"
              className="text-deep/70 text-xs font-semibold tracking-wider uppercase"
            >
              {t("customText")}
            </label>
            <span className="text-deep/50 text-[10px] font-medium">
              {t("nameOrMessage")}
            </span>
          </div>
          <input
            id="personalization-text"
            type="text"
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder={t("textPlaceholder")}
            maxLength={50}
            className="text-deep focus:border-accent focus:ring-accent/30 h-11 w-full rounded-xl border-2 border-black/20 bg-white px-4 font-semibold transition-colors outline-none focus:ring-2"
          />
          {text.length > 0 && (
            <p className="text-deep/50 mt-1 text-xs">
              {text.length}/50 {t("characters")}
            </p>
          )}
        </div>
      )}
    </div>
  );
});
