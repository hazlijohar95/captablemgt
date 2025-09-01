import React from 'react';

export function DemoModeBanner() {
  const isDemoMode = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (!isDemoMode) return null;
  
  return (
    <div className="bg-yellow-500 text-black px-4 py-2 text-center text-sm font-medium">
      ⚠️ Demo Mode - Configure Supabase environment variables for full functionality
    </div>
  );
}