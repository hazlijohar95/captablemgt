import React, { createContext, useContext } from 'react';

// Simplified theme provider - light mode only
interface IThemeProviderProps {
  children: React.ReactNode;
}

interface IThemeProviderState {
  theme: 'light';
  resolvedTheme: 'light';
}

const initialState: IThemeProviderState = {
  theme: 'light',
  resolvedTheme: 'light',
};

const ThemeProviderContext = createContext<IThemeProviderState>(initialState);

export function ThemeProvider({ children }: IThemeProviderProps) {
  const value = {
    theme: 'light' as const,
    resolvedTheme: 'light' as const,
  };

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider');

  return context;
};