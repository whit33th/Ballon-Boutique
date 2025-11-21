import * as React from "react";

import { cn } from "@/lib/utils";

type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>;

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  Icon?: IconComponent;
  /**
   * Size in px for the icon (will be applied to width/height).
   * Defaults to 18.
   */
  iconSize?: number;
  /**
   * Additional className for the native input element.
   */
  className?: string;
}

/**
 * Минималистичный переиспользуемый инпут.
 * Переключил внешний контейнер на <label> и убрал absolute для иконки:
 * теперь иконка и input находятся в потоке flex с gap — при клике по любой части
 * лейбла будет фокусироваться именно инпут.
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ Icon, iconSize = 18, className = "", ...props }, ref) => {
    const isInvalid =
      props["aria-invalid"] === true || props["aria-invalid"] === "true";

    // Merge any provided input styles and ensure text color uses site variable
    const mergedInputStyle = {
      color: "var(--deep)",
      ...(props.style as React.CSSProperties),
    };

    return (
      <label
        className={cn(
          "relative flex items-center gap-2.5 rounded-lg transition focus-within:border-slate-300",
          isInvalid && "border-destructive/70 ring-destructive/20 ring-1",
        )}
        // Use semantic tokens defined in `globals.css` so inputs match the site's palette
        style={{
          backgroundColor: "var(--input)",
          border: "1px solid var(--border)",
          height: "3rem",
        }}
      >
        {Icon ? (
          <Icon
            width={iconSize}
            height={iconSize}
            className="shrink-0 text-slate-700"
            aria-hidden={true}
          />
        ) : null}

        <input
          ref={ref}
          {...props}
          className={cn(
            "h-full w-full flex-1 rounded-lg border-none bg-transparent outline-none focus:outline-none",
            isInvalid && "placeholder:text-destructive/70 text-destructive",
            className,
          )}
          style={mergedInputStyle}
        />
      </label>
    );
  },
);

Input.displayName = "Input";

export default Input;
