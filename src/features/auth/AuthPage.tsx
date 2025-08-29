import { useState } from 'react';
import { LoginForm } from './LoginForm';

export function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);

  return (
    <LoginForm
      isSignUp={isSignUp}
      onToggleMode={() => setIsSignUp(!isSignUp)}
    />
  );
}