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

    return (
      <label
        className={cn(
          "relative flex h-11 items-center gap-2.5 rounded-lg border border-[rgba(15,23,42,0.06)] bg-white px-2.5 py-0 transition focus-within:border-slate-300",
          isInvalid && "border-destructive/70 ring-destructive/20 ring-1",
        )}
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
            "flex-1 border-none bg-transparent text-slate-900 outline-none focus:outline-none",
            isInvalid && "placeholder:text-destructive/70 text-destructive",
            className,
          )}
        />
      </label>
    );
  },
);

Input.displayName = "Input";

export default Input;
