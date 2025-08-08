import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Bars3Icon, XMarkIcon, SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../App';
import endpoints from '../constants/endpoints';

function NavBar() {
  const [isOpen, setIsOpen] = useState(false);
  const { isDark, toggleTheme } = useTheme();

  const { data } = useQuery(
    ['navbar'],
    async () => {
      const response = await fetch(endpoints.navbar);
      if (!response.ok) throw new Error('Failed to fetch navbar data');
      return response.json();
    }
  );

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 z-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <NavLink to="/" className="flex items-center space-x-2">
            {data?.logo && (
              <img
                src={data.logo.source}
                alt="Logo"
                className="h-8 w-auto"
                style={{
                  height: data.logo.height || 32,
                  width: data.logo.width || 'auto',
                }}
              />
            )}
          </NavLink>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {data?.sections?.map((section) => (
              section.type === 'link' ? (
                <a
                  key={section.title}
                  href={section.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200"
                >
                  {section.title}
                </a>
              ) : (
                <NavLink
                  key={section.title}
                  to={section.href}
                  className={({ isActive }) =>
                    `transition-colors duration-200 ${
                      isActive
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400'
                    }`
                  }
                >
                  {section.title}
                </NavLink>
              )
            ))}
            
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
              aria-label="Toggle theme"
            >
              {isDark ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              aria-label="Toggle theme"
            >
              {isDark ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              aria-label="Toggle menu"
            >
              {isOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden py-4 border-t border-gray-200 dark:border-gray-700"
          >
            <div className="flex flex-col space-y-4">
              {data?.sections?.map((section) => (
                section.type === 'link' ? (
                  <a
                    key={section.title}
                    href={section.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsOpen(false)}
                    className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200"
                  >
                    {section.title}
                  </a>
                ) : (
                  <NavLink
                    key={section.title}
                    to={section.href}
                    onClick={() => setIsOpen(false)}
                    className={({ isActive }) =>
                      `transition-colors duration-200 ${
                        isActive
                          ? 'text-primary-600 dark:text-primary-400'
                          : 'text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400'
                      }`
                    }
                  >
                    {section.title}
                  </NavLink>
                )
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </motion.nav>
  );
}

export default NavBar;
