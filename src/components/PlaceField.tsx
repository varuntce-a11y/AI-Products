import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { autocompletePlaces, getPlaceDetails, type PlaceDetail } from "@/lib/maps.functions";
import { cn } from "@/lib/utils";

type PlaceFieldProps = {
  id: string;
  label: string;
  placeholder: string;
  dotClassName: string;
  value: PlaceDetail | null;
  onChange: (place: PlaceDetail | null) => void;
};

function newToken() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function PlaceField({
  id,
  label,
  placeholder,
  dotClassName,
  value,
  onChange,
}: PlaceFieldProps) {
  const suggest = useServerFn(autocompletePlaces);
  const details = useServerFn(getPlaceDetails);

  const [text, setText] = useState(value?.label ?? "");
  const [options, setOptions] = useState<Array<{ placeId: string; label: string }>>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const tokenRef = useRef(newToken());
  const requestRef = useRef(0);

  useEffect(() => {
    setText(value?.label ?? "");
  }, [value?.label]);

  useEffect(() => {
    if (!open) return;
    const query = text.trim();
    if (query.length < 3 || query === value?.label) {
      setOptions([]);
      return;
    }
    const requestId = ++requestRef.current;
    const timer = setTimeout(() => {
      setBusy(true);
      suggest({ data: { input: query, sessionToken: tokenRef.current } })
        .then((results) => {
          if (requestId === requestRef.current) setOptions(results);
        })
        .catch((error) => console.error(error))
        .finally(() => {
          if (requestId === requestRef.current) setBusy(false);
        });
    }, 300);
    return () => clearTimeout(timer);
  }, [text, open, value?.label, suggest]);

  async function pick(placeId: string) {
    try {
      setBusy(true);
      const place = await details({ data: { placeId, sessionToken: tokenRef.current } });
      tokenRef.current = newToken();
      onChange(place);
      setText(place.label);
      setOptions([]);
      setOpen(false);
    } catch (error) {
      console.error(error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <label htmlFor={id} className="mb-1.5 block text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      <div className="flex items-center gap-3 rounded-md border border-border bg-input px-3 py-2.5 focus-within:border-primary">
        <span className={cn("size-2.5 shrink-0 rounded-full", dotClassName)} />
        <input
          id={id}
          value={text}
          placeholder={placeholder}
          autoComplete="off"
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={(event) => {
            setText(event.target.value);
            setOpen(true);
            if (value) onChange(null);
          }}
          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        {busy ? <span className="size-3 animate-spin rounded-full border-2 border-primary border-t-transparent" /> : null}
      </div>

      {open && options.length > 0 ? (
        <ul className="absolute z-30 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-panel">
          {options.map((option) => (
            <li key={option.placeId}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => void pick(option.placeId)}
                className="block w-full px-3 py-2.5 text-left text-sm text-popover-foreground transition-colors hover:bg-accent"
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
