import React from 'react';

function SimpleTest() {
  return (
    <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif' }}>
      <h1>✅ Cap Table Platform - Test Page</h1>
      <p>If you can see this, React is working!</p>
      
      <div style={{ marginTop: '20px', padding: '20px', background: '#f0f0f0', borderRadius: '8px' }}>
        <h2>Status Check:</h2>
        <ul>
          <li>✅ Vite Dev Server: Running</li>
          <li>✅ React: Working</li>
          <li>✅ Page: Loading</li>
        </ul>
      </div>
      
      <div style={{ marginTop: '20px', padding: '20px', background: '#e8f4fd', borderRadius: '8px' }}>
        <h3>Environment Variables:</h3>
        <pre style={{ background: 'white', padding: '10px', overflow: 'auto' }}>
          {JSON.stringify({
            MODE: import.meta.env.MODE,
            DEV: import.meta.env.DEV,
            PROD: import.meta.env.PROD,
            BASE_URL: import.meta.env.BASE_URL,
            SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL ? 'Configured ✅' : 'Not configured ❌',
            SUPABASE_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Configured ✅' : 'Not configured ❌'
          }, null, 2)}
        </pre>
      </div>
      
      <div style={{ marginTop: '20px', padding: '20px', background: '#fff3cd', borderRadius: '8px' }}>
        <h3>Next Steps:</h3>
        <ol>
          <li>Check browser console (F12) for any errors</li>
          <li>Set up Supabase credentials if needed</li>
          <li>Restore the main App.tsx when ready</li>
        </ol>
      </div>
    </div>
  );
}

export default SimpleTest;