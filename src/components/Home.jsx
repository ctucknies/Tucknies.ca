import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Typewriter from 'typewriter-effect';
import endpoints from '../constants/endpoints';
import Social from './Social';
import FallbackSpinner from './FallbackSpinner';

function Home() {
  const { data, isLoading, error } = useQuery(
    ['home'],
    async () => {
      const response = await fetch(endpoints.home);
      if (!response.ok) throw new Error('Failed to fetch home data');
      return response.json();
    }
  );

  if (isLoading) return <FallbackSpinner />;
  if (error) return <div className="text-center text-red-500">Error loading home data</div>;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="min-h-screen flex flex-col justify-center items-center text-center px-4"
    >
      <motion.h1
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.8 }}
        className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent mb-6"
      >
        {data?.name}
      </motion.h1>
      
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.8 }}
        className="flex items-center text-2xl md:text-3xl text-gray-700 dark:text-gray-300 mb-8"
      >
        <span className="mr-2">I'm</span>
        <Typewriter
          options={{
            loop: true,
            autoStart: true,
            strings: data?.roles || ['a Developer'],
            wrapperClassName: 'text-primary-600 font-semibold',
          }}
        />
      </motion.div>
      
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.8 }}
      >
        <Social />
      </motion.div>
    </motion.div>
  );
}

export default Home;
