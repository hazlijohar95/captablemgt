import React from 'react';

function TestApp() {
  const [status, setStatus] = React.useState('Loading...');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        setError('Missing Supabase environment variables');
        setStatus('Error');
        return;
      }

      setStatus(`Connected to: ${supabaseUrl.substring(0, 30)}...`);
      
      // Test basic connectivity
      fetch(`${supabaseUrl}/rest/v1/`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      })
      .then(res => {
        if (res.ok || res.status === 404 || res.status === 401) {
          setStatus('✅ Supabase connection successful!');
        } else {
          setError(`Connection failed with status: ${res.status}`);
        }
      })
      .catch(err => {
        setError(`Connection error: ${err.message}`);
      });
    } catch (err: any) {
      setError(`Setup error: ${err.message}`);
    }
  }, []);

  return (
    <div style={{ 
      padding: '40px', 
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <h1 style={{ color: '#1a1a1a', marginBottom: '20px' }}>
        🏢 Cap Table Management Platform
      </h1>
      
      <div style={{ 
        background: '#f5f5f5', 
        padding: '20px', 
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h2 style={{ color: '#333', fontSize: '18px', marginBottom: '10px' }}>
          Connection Status
        </h2>
        <p style={{ color: error ? '#d00' : '#080' }}>
          {status}
        </p>
        {error && (
          <p style={{ color: '#d00', marginTop: '10px' }}>
            Error: {error}
          </p>
        )}
      </div>

      <div style={{ 
        background: '#fff', 
        padding: '20px', 
        borderRadius: '8px',
        border: '1px solid #ddd'
      }}>
        <h2 style={{ color: '#333', fontSize: '18px', marginBottom: '15px' }}>
          Quick Start Guide
        </h2>
        <ol style={{ lineHeight: '1.8' }}>
          <li>✅ Development server is running</li>
          <li>✅ React application is loading</li>
          <li>⚠️ Authentication is bypassed for testing</li>
          <li>📝 Check the console for any errors</li>
        </ol>
        
        <div style={{ marginTop: '20px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>Environment Info:</h3>
          <code style={{ 
            background: '#f0f0f0', 
            padding: '10px', 
            display: 'block',
            borderRadius: '4px',
            fontSize: '12px'
          }}>
            Mode: {import.meta.env.MODE}<br/>
            Base URL: {import.meta.env.BASE_URL}<br/>
            Dev: {import.meta.env.DEV ? 'true' : 'false'}<br/>
            Prod: {import.meta.env.PROD ? 'true' : 'false'}
          </code>
        </div>
      </div>

      <div style={{ 
        marginTop: '20px',
        padding: '15px',
        background: '#e8f4f8',
        borderRadius: '8px',
        border: '1px solid #b3d9e6'
      }}>
        <p style={{ margin: 0, fontSize: '14px' }}>
          💡 <strong>Tip:</strong> If you're seeing a blank page, check the browser console (F12) for errors.
          The application requires Supabase to be properly configured.
        </p>
      </div>
    </div>
  );
}

export default TestApp;