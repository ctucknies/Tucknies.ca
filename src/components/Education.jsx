import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import PropTypes from 'prop-types';
import { AcademicCapIcon } from '@heroicons/react/24/outline';
import Header from './Header';
import endpoints from '../constants/endpoints';
import FallbackSpinner from './FallbackSpinner';

function Education({ header }) {
  const { data, isLoading } = useQuery(
    ['education'],
    async () => {
      const response = await fetch(endpoints.education);
      if (!response.ok) throw new Error('Failed to fetch education data');
      return response.json();
    }
  );

  if (isLoading) return <FallbackSpinner />;

  return (
    <>
      <Header title={header} />
      <div className="pt-20 min-h-screen">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {data && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-primary-600"></div>
                
                {data.education?.map((edu, index) => (
                  <motion.div
                    key={edu.cardTitle}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.6 }}
                    className="relative flex items-start mb-8"
                  >
                    <div className="absolute left-0 w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center z-10">
                      <AcademicCapIcon className="w-4 h-4 text-white" />
                    </div>
                    
                    <div className="ml-12 card p-6 w-full">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xl font-bold">{edu.cardTitle}</h3>
                        <span className="text-sm text-primary-600 font-medium">{edu.title}</span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 mb-2">{edu.cardSubtitle}</p>
                      {edu.cardDetailedText && (
                        <p className="text-sm font-medium">{edu.cardDetailedText}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </>
  );
}

Education.propTypes = {
  header: PropTypes.string.isRequired,
};

export default Education;