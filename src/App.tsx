import { useState } from 'react';
import { LoginForm } from './components/LoginForm';
import { Dashboard } from './pages/Dashboard';

function App() {
  const [loggedIn, setLoggedIn] = useState(
    () => !!sessionStorage.getItem('rakushifu-cookies')
  );

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-gray-50">
        <LoginForm onLoginSuccess={() => setLoggedIn(true)} />
      </div>
    );
  }

  return <Dashboard />;
}

export default App;
