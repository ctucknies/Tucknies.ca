import React, { useState, useEffect, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import FallbackSpinner from './components/FallbackSpinner';
import NavBar from './components/NavBar';
import Home from './components/Home';
import endpoints from './constants/endpoints';

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <NavBar />
      <main className="container mx-auto px-4 py-8">
        <Suspense fallback={<FallbackSpinner />}>
          <Routes>
            <Route path="/" element={<Home />} />
            {!isLoading && data?.sections?.map((route) => {
              const SectionComponent = React.lazy(() => import(`./components/${route.component}`));
              return (
                <Route
                  key={route.headerTitle}
                  path={route.path}
                  element={<SectionComponent header={route.headerTitle} />}
                />
              );
            })}
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

export default MainApp;
