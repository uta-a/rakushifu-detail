import { useState, useCallback } from 'react';
import { LoginForm } from './components/LoginForm';
import { Dashboard } from './pages/Dashboard';

function App() {
  const [loggedIn, setLoggedIn] = useState(
    () => !!sessionStorage.getItem('rakushifu-cookies')
  );

  const handleLogout = useCallback(() => setLoggedIn(false), []);

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-gray-50">
        <LoginForm onLoginSuccess={() => setLoggedIn(true)} />
      </div>
    );
  }

  return <Dashboard onSessionExpired={handleLogout} />;
}

export default App;
