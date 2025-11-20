export const BALLOON_COLORS = [
  { name: "Gold", hex: "#FFD700", label: "Gold" },
  { name: "Rose Gold", hex: "#E0BFB8", label: "Rose Gold" },
  { name: "Silver", hex: "#C0C0C0", label: "Silver" },
  { name: "Pink", hex: "#FFC0CB", label: "Pink" },
  { name: "Hot Pink", hex: "#FF69B4", label: "Hot Pink" },
  { name: "Blush", hex: "#FFB6C1", label: "Blush" },
  { name: "Blue", hex: "#4169E1", label: "Blue" },
  { name: "Light Blue", hex: "#87CEEB", label: "Light Blue" },
  { name: "Navy", hex: "#000080", label: "Navy" },
  { name: "Red", hex: "#DC143C", label: "Red" },
  { name: "White", hex: "#FFFFFF", label: "White" },
  { name: "Black", hex: "#000000", label: "Black" },
  { name: "Purple", hex: "#9370DB", label: "Purple" },
  { name: "Lavender", hex: "#E6E6FA", label: "Lavender" },
  { name: "Green", hex: "#32CD32", label: "Green" },
  { name: "Mint", hex: "#98FF98", label: "Mint" },
  { name: "Yellow", hex: "#FFD93D", label: "Yellow" },
  { name: "Orange", hex: "#FFA500", label: "Orange" },
  { name: "Peach", hex: "#FFE5B4", label: "Peach" },
  { name: "Coral", hex: "#FF7F50", label: "Coral" },
  { name: "Teal", hex: "#008080", label: "Teal" },
  { name: "Turquoise", hex: "#40E0D0", label: "Turquoise" },
  { name: "Champagne", hex: "#F7E7CE", label: "Champagne" },
  { name: "Burgundy", hex: "#800020", label: "Burgundy" },
  { name: "Emerald", hex: "#50C878", label: "Emerald" },
  { name: "Mix", hex: "#CCCCCC", label: "Mix" },
] as const;

export type BalloonColor = (typeof BALLOON_COLORS)[number]["name"];

export const isMixColor = (name?: string | null) =>
  !!name && name.toLowerCase() === "mix";

export function getColorStyle(name?: string | null, hex?: string | null) {
  if (isMixColor(name)) {
    return {
      background:
        "radial-gradient(circle at 20% 18%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 22%), radial-gradient(circle at 72% 72%, rgba(255,235,205,0.40) 0%, rgba(255,235,205,0) 40%), linear-gradient(135deg, #FF7FA6 0%, #70B8FF 50%, #67E0B0 100%)",
    } as React.CSSProperties;
  }

  return {
    backgroundColor: hex ?? undefined,
  } as React.CSSProperties;
}
