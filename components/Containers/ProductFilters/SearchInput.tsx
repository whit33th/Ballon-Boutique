"use client";

import { Search as SearchIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

export function SearchInput() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchValue = searchParams.get("search") || "";
  const debounceTimerRef = useRef<NodeJS.Timeout>(null);

  const updateSearch = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (value) {
        params.set("search", value);
      } else {
        params.delete("search");
      }

      router.push(`/catalog?${params.toString()}`);
    },
    [searchParams, router],
  );

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleSearch = (value: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      updateSearch(value);
    }, 300);
  };

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="relative w-full sm:max-w-2xl">
        <SearchIcon className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-black/60" />
        <input
          type="text"
          placeholder="Search balloons..."
          defaultValue={searchValue}
          onChange={(e) => handleSearch(e.target.value)}
          className="focus:border-accent/50 h-10 w-full rounded-full border border-black/20 bg-white/60 py-2 pr-4 pl-10 text-base transition-[border-color] duration-200 outline-none"
        />
      </div>
    </div>
  );
}
