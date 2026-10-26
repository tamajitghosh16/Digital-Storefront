import { INDIAN_STATES, INDIAN_UNION_TERRITORIES } from "@/lib/india-address";

/**
 * The State dropdown shared by the account address form and the cart's
 * checkout form: all 28 states and 8 union territories, grouped. A saved
 * address from before the dropdown existed may hold a free-text state that
 * isn't in the list — it then shows as unselected and must be picked again.
 */
export function StateSelect({
  id,
  value,
  onChange,
  required,
  disabled,
  autoComplete,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  autoComplete?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-[7px]">
      <label htmlFor={id} className="caps text-ink-muted">
        State
      </label>
      <select
        id={id}
        required={required}
        disabled={disabled}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full min-w-0 rounded-btn border-2 border-line-strong bg-ground px-3.5 text-[15px] focus:border-ink focus:outline-none disabled:bg-tile disabled:opacity-100"
      >
        <option value="">Select a state…</option>
        <optgroup label="States">
          {INDIAN_STATES.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </optgroup>
        <optgroup label="Union territories">
          {INDIAN_UNION_TERRITORIES.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </optgroup>
      </select>
    </div>
  );
}
