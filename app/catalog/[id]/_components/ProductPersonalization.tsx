"use client";

import { useState } from "react";
import { BALLOON_COLORS } from "@/constants/colors";

interface PersonalizationOptions {
  text?: string;
  color?: string;
  number?: string;
}

interface ProductPersonalizationProps {
  availableColors?: string[];
  onChange: (options: PersonalizationOptions) => void;
}

export function ProductPersonalization({
  availableColors = [],
  onChange,
}: ProductPersonalizationProps) {
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

  if (availableColors.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 space-y-6 border-t pt-6">
      <h3 className="text-lg font-semibold">Personalize Your Balloon</h3>

      {/* Text Input */}
      <div>
        <label
          htmlFor="personalization-text"
          className="mb-2 block text-sm font-medium"
        >
          Custom Text (Optional)
        </label>
        <input
          id="personalization-text"
          type="text"
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="e.g., Happy Birthday Anna"
          maxLength={50}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-pink-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          {text.length}/50 characters
        </p>
      </div>

      {/* Color Selector */}
      <div>
        <p className="mb-3 block text-sm font-medium">
          Choose Color {selectedColor && `(${selectedColor})`}
        </p>
        <div className="grid grid-cols-4 gap-3">
          {filteredColors.map((color) => (
            <button
              key={color.name}
              type="button"
              onClick={() => handleColorChange(color.name)}
              className={`flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all ${
                selectedColor === color.name
                  ? "border-pink-500 bg-pink-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div
                className="h-12 w-12 shrink-0 rounded-full shadow-md"
                style={{
                  backgroundColor: color.hex,
                  border: color.name === "White" ? "1px solid #ddd" : "none",
                }}
              />
              <span className="text-center text-xs">{color.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Number Input */}
      <div>
        <label
          htmlFor="personalization-number"
          className="mb-2 block text-sm font-medium"
        >
          Number (Optional)
        </label>
        <input
          id="personalization-number"
          type="number"
          value={number}
          onChange={(e) => handleNumberChange(e.target.value)}
          placeholder="e.g., 18, 25, 30"
          min="0"
          max="99"
          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-pink-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          For age or special number balloons
        </p>
      </div>
    </div>
  );
}
