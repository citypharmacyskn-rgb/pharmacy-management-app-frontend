import React from "react";

// Minimal functional 6-digit code input: a real <input> per slot, with
// auto-advance/backspace handling. Not a pixel-match for shadcn's OTP
// component, but fully usable.
export function InputOTP({ maxLength = 6, value, onChange, children, autoFocus, autoComplete }) {
  const refs = React.useRef([]);
  const digits = value.split("").concat(Array(maxLength).fill("")).slice(0, maxLength);

  const setDigit = (i, d) => {
    const next = digits.slice();
    next[i] = d;
    onChange(next.join(""));
    if (d && i < maxLength - 1) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };

  return (
    <div className="flex gap-2">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          value={d}
          autoFocus={autoFocus && i === 0}
          autoComplete={i === 0 ? autoComplete : "off"}
          onChange={(e) => setDigit(i, e.target.value.replace(/\D/g, "").slice(-1))}
          onKeyDown={(e) => handleKeyDown(i, e)}
          inputMode="numeric"
          maxLength={1}
          className="w-11 h-12 text-center text-lg rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      ))}
    </div>
  );
}
export function InputOTPGroup({ children }) { return <>{children}</>; }
export function InputOTPSlot() { return null; } // slots are rendered directly by InputOTP above
