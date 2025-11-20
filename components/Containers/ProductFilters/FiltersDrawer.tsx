"use client";

import { SlidersHorizontal } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { BALLOON_COLORS, getColorStyle } from "@/constants/colors";

const PRICE_RANGES = [
  { label: "Up to €5", min: 0, max: 5 },
  { label: "Up to €10", min: 0, max: 10 },
  { label: "Up to €15", min: 0, max: 15 },
  { label: "Up to €20", min: 0, max: 20 },
  { label: "Up to €30", min: 0, max: 30 },
  { label: "Up to €50", min: 0, max: 50 },
];

export function FiltersDrawer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const minPriceParam = searchParams.get("minPrice");
  const maxPriceParam = searchParams.get("maxPrice");

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    const queryString = params.toString();
    router.replace(queryString ? `/catalog?${queryString}` : "/catalog");
  };

  const getParam = (key: string) => searchParams.get(key) || "";

  const _hasActiveFilters = () => {
    return !!(
      getParam("search") ||
      getParam("available") ||
      getParam("minPrice") ||
      getParam("maxPrice") ||
      getParam("category") ||
      getParam("color")
    );
  };

  const clearFilters = () => {
    router.replace("/catalog");
  };

  const handlePriceRangeSelect = (min: number, max: number | undefined) => {
    const params = new URLSearchParams(searchParams.toString());

    if (min > 0) {
      params.set("minPrice", min.toString());
    } else {
      params.delete("minPrice");
    }

    if (max !== undefined) {
      params.set("maxPrice", max.toString());
    } else {
      params.delete("maxPrice");
    }

    const queryString = params.toString();
    router.replace(queryString ? `/catalog?${queryString}` : "/catalog");
  };

  const isRangeActive = (min: number, max: number | undefined) => {
    const currentMin = minPriceParam ? Number(minPriceParam) : 0;
    const currentMax = maxPriceParam ? Number(maxPriceParam) : undefined;
    return currentMin === min && currentMax === max;
  };

  return (
    <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
      <DrawerTrigger asChild>
        <button
          type="button"
          className="border-border/50 text-deep flex h-10 items-center gap-2 text-sm font-medium tracking-wide underline-offset-1 transition-colors hover:underline"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </button>
      </DrawerTrigger>
      <DrawerContent className="bg-primary max-h-[85vh] rounded-t-2xl">
        <DrawerHeader className="pb-4">
          <DrawerTitle className="text-deep text-center text-2xl font-bold tracking-wide uppercase">
            Filters
          </DrawerTitle>
          <DrawerDescription className="text-deep/70 text-center">
            Select your preferred filters for balloons
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-8">
            {/* Available Toggle */}
            <div>
              <h3 className="text-deep mb-3 text-lg font-semibold tracking-wide uppercase">
                Availability
              </h3>
              <Button
                size="sm"
                onClick={() =>
                  updateParam("available", getParam("available") ? "" : "true")
                }
                className={`text-deep rounded-xl border-2 px-4 py-4.5 font-medium tracking-wide transition-[background-color,box-shadow] duration-200 ${
                  getParam("available")
                    ? "border-secondary bg-secondary/10"
                    : "border-border/30 hover:border-secondary/50 bg-white/50"
                }`}
              >
                In Stock
              </Button>
            </div>

            {/* Color Filter */}
            <div>
              <h3 className="text-deep mb-3 text-lg font-semibold tracking-wide uppercase">
                Balloon Color
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {BALLOON_COLORS.map((color) => (
                  <button
                    type="button"
                    key={color.name}
                    onClick={() =>
                      updateParam(
                        "color",
                        getParam("color") === color.name ? "" : color.name,
                      )
                    }
                    className={`flex items-center gap-2 rounded-full border-2 px-3 py-2 transition-all ${
                      getParam("color") === color.name
                        ? "border-secondary bg-secondary/10"
                        : "border-border/30 hover:border-secondary/50 bg-white/50"
                    }`}
                  >
                    <div
                      className="h-6 w-6 shrink-0 rounded-full shadow-sm"
                      style={{
                        ...getColorStyle(color.name, color.hex),
                        border:
                          color.name === "White" ? "1px solid #ddd" : "none",
                      }}
                    />
                    <span className="text-deep truncate text-xs font-medium">
                      {color.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range Buttons */}
            <div>
              <h3 className="text-deep mb-3 text-lg font-semibold tracking-wide uppercase">
                Price Range
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {PRICE_RANGES.map((range) => (
                  <Button
                    key={range.label}
                    size="sm"
                    onClick={() =>
                      isRangeActive(range.min, range.max)
                        ? handlePriceRangeSelect(0, undefined)
                        : handlePriceRangeSelect(range.min, range.max)
                    }
                    className={`text-deep rounded-xl border-2 px-4 py-4.5 font-medium tracking-wide transition-[background-color,box-shadow] duration-200 ${
                      isRangeActive(range.min, range.max)
                        ? "border-secondary bg-secondary/10"
                        : "border-border/30 hover:border-secondary/50 bg-white/50"
                    }`}
                  >
                    {range.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <DrawerFooter className="pt-4">
          <Button
            variant="outline"
            onClick={clearFilters}
            className="border-secondary text-deep hover:bg-secondary/10 w-full rounded-xl bg-transparent tracking-wide uppercase transition-[background-color,box-shadow] duration-200 hover:shadow-sm"
          >
            Clear All Filters
          </Button>
          <DrawerClose asChild>
            <Button className="btn-secondary text-on-secondary w-full rounded-xl transition-colors hover:brightness-95">
              Apply Filters
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
