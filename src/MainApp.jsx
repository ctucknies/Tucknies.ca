import React, { useState, useEffect, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import FallbackSpinner from './components/FallbackSpinner';
import NavBar from './components/NavBar';
import Home from './components/Home';
import LeagueManager from './components/LeagueManager';
import TradeCrafter from './components/TradeCrafter';
import endpoints from './constants/endpoints';

function PortfolioLayout({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <NavBar />
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}

function MainApp() {
  const { data, isLoading } = useQuery(
    ['routes'],
    async () => {
      const response = await fetch(endpoints.routes);
      if (!response.ok) throw new Error('Failed to fetch routes');
      return response.json();
    }
  );

  return (
    <Suspense fallback={<FallbackSpinner />}>
      <Routes>
        <Route path="/" element={<LeagueManager />} />
        <Route path="/trade-crafter" element={<TradeCrafter onBack={() => window.history.back()} />} />
        <Route path="/portfolio" element={<PortfolioLayout><Home /></PortfolioLayout>} />
        {!isLoading && data?.sections?.filter(route => route.component !== 'LeagueManager').map((route) => {
          const SectionComponent = React.lazy(() => import(`./components/${route.component}`));
          return (
            <Route
              key={route.headerTitle}
              path={`/portfolio${route.path}`}
              element={<PortfolioLayout><SectionComponent header={route.headerTitle} /></PortfolioLayout>}
            />
          );
        })}
      </Routes>
    </Suspense>
  );
}

export default MainApp;
