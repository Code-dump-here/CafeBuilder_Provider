"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { FieldValues, Path, UseFormRegister } from "react-hook-form";

interface InputControlProps<T extends FieldValues>
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "ref"> {
  name: Path<T>;
  register: UseFormRegister<T>;
  label?: string;
  error?: string;
  rules?: Parameters<UseFormRegister<T>>[1];
}

const InputControl = <T extends FieldValues>({
  name,
  register,
  label,
  error,
  type,
  className,
  rules,
  ...rest
}: InputControlProps<T>) => {
  const [showPassword, setShowPassword] = React.useState(false);
  const isPassword = type === "password";
  const effectiveType = isPassword && showPassword ? "text" : type;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs/relaxed font-medium text-foreground">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <input
          type={effectiveType}
          className={cn(
            "h-9 w-full rounded-md border border-input bg-input/20 px-3 pr-10 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
            error && "border-destructive aria-invalid:ring-destructive/20",
            isPassword && "pr-10",
            className
          )}
          {...register(name, rules)}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none"
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        )}
      </div>
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
};

export { InputControl };
