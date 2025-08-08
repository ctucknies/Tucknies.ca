import React, { useState, useEffect, createContext, useContext } from 'react';
import './App.css';
import { HashRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MainApp from './MainApp';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDark));
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeContext.Provider value={{ isDark, toggleTheme }}>
        <div className={`min-h-screen transition-colors duration-300 ${
          isDark ? 'dark bg-gray-900 text-white' : 'bg-white text-gray-900'
        }`}>
          <HashRouter>
            <MainApp />
          </HashRouter>
        </div>
      </ThemeContext.Provider>
    </QueryClientProvider>
  );
}

export default App;
