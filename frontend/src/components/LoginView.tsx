import { ChangeEvent, FormEvent, useCallback, useState } from 'react';

export interface LoginViewProps {
  busy: boolean;
  error: string | null;
  onSubmit: (email: string, password: string) => Promise<void>;
  onClearError: () => void;
}

const LoginView = ({ busy, error, onSubmit, onClearError }: LoginViewProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!email.trim() || !password) return;
      await onSubmit(email.trim(), password);
    },
    [email, password, onSubmit]
  );
  const handleEmailChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setEmail(event.target.value);
      if (error) onClearError();
    },
    [error, onClearError]
  );
  const handlePasswordChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setPassword(event.target.value);
      if (error) onClearError();
    },
    [error, onClearError]
  );
  return (
    <div className="login-wrapper">
      <form className="login-form" onSubmit={handleSubmit}>
        <h1>OurGroceries Tool</h1>
        {error && <p className="login-error" role="alert">{error}</p>}
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={handleEmailChange}
          disabled={busy}
          required
        />
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={handlePasswordChange}
          disabled={busy}
          required
        />
        <button type="submit" disabled={busy}>
          {busy ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </div>
  );
};

export default LoginView;
