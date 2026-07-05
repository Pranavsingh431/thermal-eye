"use client";

import { useState } from "react";
import { Check, Eye, EyeOff } from "lucide-react";

// Keep these rules in sync with the backend validator
// (apps/api/app/schemas/auth.py :: _validate_password_strength).
const COMMON = new Set(["password", "1234567890", "thermaleye", "admin12345"]);

export function passwordRules(pw: string): { label: string; met: boolean }[] {
  return [
    { label: "At least 10 characters", met: pw.length >= 10 },
    { label: "Contains a letter and a number", met: /[a-zA-Z]/.test(pw) && /\d/.test(pw) },
    { label: "Not a common password", met: pw.length > 0 && !COMMON.has(pw.toLowerCase()) },
  ];
}

export function isPasswordValid(pw: string): boolean {
  return passwordRules(pw).every((r) => r.met);
}

interface PasswordInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  invalid?: boolean;
}

export function PasswordInput({
  value,
  onChange,
  placeholder = "••••••••",
  autoComplete,
  required,
  invalid,
}: PasswordInputProps) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        className={`input pr-11 ${invalid ? "border-red-400 focus:border-red-400 focus:ring-red-400/30" : ""}`}
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        tabIndex={-1}
        aria-label={show ? "Hide password" : "Show password"}
        title={show ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 transition-colors hover:text-gray-700 dark:hover:text-gray-200"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function PasswordRequirements({ value }: { value: string }) {
  const rules = passwordRules(value);
  return (
    <ul className="mt-2 space-y-1">
      {rules.map((r) => (
        <li
          key={r.label}
          className={`flex items-center gap-1.5 text-xs transition-colors ${
            r.met ? "text-green-600 dark:text-green-400" : "text-gray-400"
          }`}
        >
          <span
            className={`grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full ${
              r.met ? "bg-green-500/15" : "border border-gray-300 dark:border-gray-600"
            }`}
          >
            {r.met && <Check className="h-2.5 w-2.5" />}
          </span>
          {r.label}
        </li>
      ))}
    </ul>
  );
}
