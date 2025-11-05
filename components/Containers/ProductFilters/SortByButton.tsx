"use client";

import { ArrowUpDown } from "lucide-react";
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

const sortOptions = [
  { value: "default", label: "Default" },
  { value: "price-low", label: "Price: Low to High" },
  { value: "price-high", label: "Price: High to Low" },
  { value: "name-asc", label: "Name: A to Z" },
  { value: "name-desc", label: "Name: Z to A" },
];

export function SortByButton() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get("sort") || "default";
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleSortChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value === "default") {
      params.delete("sort");
    } else {
      params.set("sort", value);
    }

    const queryString = params.toString();
    router.push(queryString ? `/catalog?${queryString}` : "/catalog");
    setDrawerOpen(false);
  };

  const currentSortLabel =
    sortOptions.find((opt) => opt.value === currentSort)?.label ?? "Sort by";

  return (
    <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
      <DrawerTrigger asChild>
        <button
          type="button"
          className="border-border/50 text-deep flex h-10 items-center justify-center gap-2 text-sm font-medium tracking-wide underline-offset-1 transition-colors hover:underline"
        >
          <ArrowUpDown className="h-4 w-4" />
          Sort By: {currentSortLabel}
        </button>
      </DrawerTrigger>
      <DrawerContent className="bg-primary max-h-[70vh] rounded-t-2xl">
        <DrawerHeader className="pb-4">
          <DrawerTitle className="text-deep text-center text-2xl font-bold tracking-wide uppercase">
            Sort By
          </DrawerTitle>
          <DrawerDescription className="text-deep/70 text-center">
            Choose how to sort your products
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-3">
            {sortOptions.map((option) => (
              <Button
                key={option.value}
                variant={currentSort === option.value ? "secondary" : "outline"}
                onClick={() => handleSortChange(option.value)}
                className={`w-full justify-start rounded-sm border text-white transition-[opacity,background-color,box-shadow] duration-200 hover:opacity-80 ${
                  currentSort === option.value
                    ? "btn-secondary text-on-secondary text-background"
                    : "border-secondary text-deep hover:bg-secondary/10 bg-transparent hover:shadow-sm"
                }`}
              >
                <span>{option.label}</span>
              </Button>
            ))}
          </div>
        </div>

        <DrawerFooter className="pt-4">
          <DrawerClose asChild>
            <Button className="btn-accent text-on-accent w-full rounded-sm">
              Close
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
