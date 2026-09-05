import { useState } from 'react';
import { CURRENCY_OPTIONS, type CurrencySymbol, getCurrency } from '../quiz/session';

interface Props {
  onSubmit: (name: string, currency: CurrencySymbol) => void;
}

export function NamePrompt({ onSubmit }: Props) {
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState<CurrencySymbol>(() => getCurrency());

  const submit = () => {
    const trimmed = name.trim();
    if (trimmed) onSubmit(trimmed, currency);
  };

  return (
    <div className="name-prompt">
      <div className="name-prompt__card">
        <h1 className="hero-title">Math for every mind</h1>
        <p className="hero-subtitle">What should we call you?</p>
        <input
          className="name-prompt__input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Your name"
          autoFocus
          maxLength={30}
        />

        <div className="currency-select">
          <p className="hero-subtitle">Where are you from?</p>
          <select
            id="currency"
            className="currency-select__dropdown"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as CurrencySymbol)}
          >
            {CURRENCY_OPTIONS.map((opt) => (
              <option key={opt.symbol} value={opt.symbol}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="currency-select__hint">
            Questions will use your local currency
          </p>
        </div>

        <button
          className="start-btn"
          onClick={submit}
          disabled={!name.trim()}
        >
          Continue
        </button>
        <p className="name-prompt__notice">
          Your name and currency preference are stored only in this browser's
          local storage on your device. They are never sent anywhere and never
          leave this app. You can remove them anytime using "Not you?" on the
          start screen.
        </p>
      </div>
    </div>
  );
}
