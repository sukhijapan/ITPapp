import React, { useState } from 'react';

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

interface ValidationCriteria {
  label: string;
  met: boolean;
}

function getValidationCriteria(password: string): ValidationCriteria[] {
  return [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'At least one uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'At least one lowercase letter', met: /[a-z]/.test(password) },
    { label: 'At least one digit', met: /\d/.test(password) },
  ];
}

const PasswordInput: React.FC<PasswordInputProps> = ({ value, onChange, label = 'Password' }) => {
  const [touched, setTouched] = useState(false);
  const criteria = getValidationCriteria(value);

  return (
    <div className="form-group">
      <label>{label}</label>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setTouched(true)}
        required
      />
      {(touched || value.length > 0) && (
        <ul className="password-criteria" aria-label="Password requirements">
          {criteria.map((c) => (
            <li
              key={c.label}
              className={c.met ? 'criteria-met' : 'criteria-unmet'}
            >
              <span className="criteria-icon">{c.met ? '✓' : '✗'}</span>
              {c.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PasswordInput;
