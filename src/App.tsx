import { useState, useCallback } from 'react';
import { LoginForm } from './components/LoginForm';
import { MainTabs } from './pages/MainTabs';

function App() {
  const [loggedIn, setLoggedIn] = useState(
    () => !!sessionStorage.getItem('rakushifu-cookies')
  );

  const handleLogout = useCallback(() => setLoggedIn(false), []);

  if (!loggedIn) {
    return (
      <div className="bg-background min-h-screen">
        <LoginForm onLoginSuccess={() => setLoggedIn(true)} />
      </div>
    );
  }

  return <MainTabs onSessionExpired={handleLogout} />;
}

export default App;
