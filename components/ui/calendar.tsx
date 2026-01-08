"use client";

import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";
import * as React from "react";
import {
  type DayButton,
  DayPicker,
  getDefaultClassNames,
} from "react-day-picker";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  fixedWeeks = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"];
}) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      fixedWeeks={fixedWeeks}
      className={cn(
        "bg-card group/calendar rounded-xl p-4 shadow-sm [--cell-size:2.5rem] in-data-[slot=card-content]:bg-transparent in-data-[slot=popover-content]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className,
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString("default", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn("relative flex flex-col gap-4", defaultClassNames.months),
        month: cn(
          "relative flex w-full flex-col gap-4",
          defaultClassNames.month,
        ),
        nav: cn(
          "absolute inset-x-0 top-0 z-10 flex h-10 items-center justify-between gap-2",
          defaultClassNames.nav,
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-9 select-none rounded-lg transition-colors aria-disabled:opacity-50 hover:bg-muted",
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-9 select-none rounded-lg transition-colors aria-disabled:opacity-50 hover:bg-muted",
          defaultClassNames.button_next,
        ),
        month_caption: cn(
          "relative z-0 flex h-10 w-full items-center justify-center px-10",
          defaultClassNames.month_caption,
        ),
        dropdowns: cn(
          "flex h-8 w-full items-center justify-center gap-1.5 text-sm font-semibold",
          defaultClassNames.dropdowns,
        ),
        dropdown_root: cn(
          "has-focus:border-ring border-input shadow-xs has-focus:ring-ring/50 has-focus:ring-[3px] relative rounded-lg border",
          defaultClassNames.dropdown_root,
        ),
        dropdown: cn("absolute inset-0 opacity-0", defaultClassNames.dropdown),
        caption_label: cn(
          "select-none font-semibold tracking-tight",
          captionLayout === "label"
            ? "text-base"
            : "[&>svg]:text-muted-foreground flex h-8 items-center gap-1 rounded-lg pl-2 pr-1 text-sm [&>svg]:size-3.5",
          defaultClassNames.caption_label,
        ),
        month_grid: cn(
          "w-full border-collapse border-spacing-0",
          defaultClassNames.month_grid,
        ),
        weekdays: cn(defaultClassNames.weekdays),
        weekday: cn(
          "text-muted-foreground h-[--cell-size] w-[--cell-size] select-none text-center text-xs font-medium uppercase tracking-wide",
          defaultClassNames.weekday,
        ),
        week: cn("", defaultClassNames.week),
        week_number_header: cn(
          "w-[--cell-size] select-none",
          defaultClassNames.week_number_header,
        ),
        week_number: cn(
          "text-muted-foreground select-none text-xs",
          defaultClassNames.week_number,
        ),
        day: cn(
          "relative h-[--cell-size] w-[--cell-size] p-0.5 text-center [&:last-child[data-selected=true]_button]:rounded-r-lg group/day select-none",
          props.showWeekNumber
            ? "[&:nth-child(2)[data-selected=true]_button]:rounded-l-lg"
            : "[&:first-child[data-selected=true]_button]:rounded-l-lg",
          defaultClassNames.day,
        ),
        range_start: cn(
          "bg-accent/50 rounded-l-lg",
          defaultClassNames.range_start,
        ),
        range_middle: cn(
          "rounded-none bg-accent/30",
          defaultClassNames.range_middle,
        ),
        range_end: cn("bg-accent/50 rounded-r-lg", defaultClassNames.range_end),

        today: cn(defaultClassNames.today),

        outside: cn(
          "text-muted-foreground/50 aria-selected:text-muted-foreground/70",
          defaultClassNames.outside,
        ),
        disabled: cn(
          "text-muted-foreground/40 cursor-not-allowed",
          defaultClassNames.disabled,
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          );
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon
                className={cn("text-muted-foreground size-4", className)}
                {...props}
              />
            );
          }

          if (orientation === "right") {
            return (
              <ChevronRightIcon
                className={cn("text-muted-foreground size-4", className)}
                {...props}
              />
            );
          }

          return (
            <ChevronDownIcon
              className={cn("text-muted-foreground size-4", className)}
              {...props}
            />
          );
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex size-[--cell-size] items-center justify-center text-center">
                {children}
              </div>
            </td>
          );
        },
        ...components,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames();

  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      data-today={modifiers.today}
      className={cn(
        "relative box-border size-[calc(var(--cell-size))] rounded-lg border-2 border-transparent text-sm font-normal transition-[background-color,box-shadow] duration-150",
        "text-foreground",
        "pointer-fine:hover:bg-muted pointer-fine:hover:text-foreground",
        "pointer-coarse:active:bg-muted pointer-coarse:active:text-foreground",
        "data-[today=true]:bg-accent/40 data-[today=true]:border-accent",
        "data-[today=true]:after:bg-primary data-[today=true]:after:absolute data-[today=true]:after:rounded-full data-[today=true]:after:content-['']",
        "data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground data-[selected-single=true]:hover:bg-primary/90 data-[selected-single=true]:shadow-sm",
        "data-[selected-single=true]:pointer-fine:hover:text-primary-foreground data-[selected-single=true]:pointer-coarse:active:text-primary-foreground",
        "data-[selected-single=true]:data-[today=true]:bg-primary data-[selected-single=true]:data-[today=true]:border-primary data-[selected-single=true]:data-[today=true]:after:bg-primary-foreground",
        "data-[range-middle=true]:bg-accent/60 data-[range-middle=true]:text-accent-foreground data-[range-middle=true]:rounded-none",
        "data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[range-start=true]:rounded-lg data-[range-start=true]:shadow-sm",
        "data-[range-start=true]:pointer-fine:hover:text-primary-foreground data-[range-start=true]:pointer-coarse:active:text-primary-foreground",
        "data-[range-start=true]:data-[today=true]:after:bg-primary-foreground",
        "data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground data-[range-end=true]:rounded-lg data-[range-end=true]:shadow-sm",
        "data-[range-end=true]:pointer-fine:hover:text-primary-foreground data-[range-end=true]:pointer-coarse:active:text-primary-foreground",
        "data-[range-end=true]:data-[today=true]:after:bg-primary-foreground",
        "group-data-[focused=true]/day:ring-ring group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-2 group-data-[focused=true]/day:ring-offset-1",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none",
        defaultClassNames.day,
        className,
      )}
      {...props}
    />
  );
}

export { Calendar, CalendarDayButton };
