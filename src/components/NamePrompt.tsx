import { useState } from 'react';

interface Props {
  onSubmit: (name: string) => void;
}

export function NamePrompt({ onSubmit }: Props) {
  const [name, setName] = useState('');

  const submit = () => {
    const trimmed = name.trim();
    if (trimmed) onSubmit(trimmed);
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
        <button
          className="start-btn"
          onClick={submit}
          disabled={!name.trim()}
        >
          Continue
        </button>
        <p className="name-prompt__notice">
          Your name is stored only in this browser's local storage on your
          device. It is never sent anywhere and never leaves this app. You can
          remove it anytime using "Not you?" on the start screen.
        </p>
      </div>
    </div>
  );
}
