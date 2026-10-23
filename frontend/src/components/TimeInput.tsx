import { useEffect, useState } from 'react';

interface TimeInputProps {
  /** Committed "HH:MM" value. */
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/**
 * Time-of-day field with the same look as the native picker, but reliable
 * keyboard entry in every browser.
 *
 * A native <input type="time"> was used here originally; Firefox applies
 * typed digits only inside its segment editor, and React-controlled values
 * reset that editor mid-keystroke — users saw the segment highlight while
 * their digits were silently dropped. This masked text input accepts plain
 * digit typing ("1200" → 12:00, "930" → 09:30 on blur), arrow-free, and
 * commits a validated HH:MM on blur; external value changes (quick ranges,
 * reset) still sync in via the value prop.
 */
export function TimeInput({ value, onChange, className }: TimeInputProps) {
  const [text, setText] = useState(value);

  useEffect(() => {
    setText(value);
  }, [value]);

  const handleChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    setText(digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits);
  };

  const commit = () => {
    const digits = text.replace(/\D/g, '');
    if (digits.length === 0) {
      setText(value);
      return;
    }
    const padded = digits.padEnd(4, '0').slice(0, 4);
    const hour = Number(padded.slice(0, 2));
    const minute = Number(padded.slice(2));
    if (hour > 23 || minute > 59) {
      setText(value);
      return;
    }
    const next = `${padded.slice(0, 2)}:${padded.slice(2)}`;
    setText(next);
    if (next !== value) onChange(next);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      spellCheck={false}
      value={text}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={commit}
      onFocus={(e) => e.target.select()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
      placeholder="HH:MM"
      className={className}
    />
  );
}
