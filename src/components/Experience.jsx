import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import PropTypes from 'prop-types';
import ReactMarkdown from 'react-markdown';
import { BriefcaseIcon } from '@heroicons/react/24/outline';
import Header from './Header';
import endpoints from '../constants/endpoints';
import FallbackSpinner from './FallbackSpinner';

function Experience({ header }) {
  const { data, isLoading } = useQuery(
    ['experiences'],
    async () => {
      const response = await fetch(endpoints.experiences);
      if (!response.ok) throw new Error('Failed to fetch experience data');
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
                
                {data.experiences?.map((exp, index) => (
                  <motion.div
                    key={exp.title + exp.dateText}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.6 }}
                    className="relative flex items-start mb-8"
                  >
                    <div className="absolute left-0 w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center z-10">
                      <BriefcaseIcon className="w-4 h-4 text-white" />
                    </div>
                    
                    <div className="ml-12 card p-6 w-full">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-xl font-bold">{exp.title}</h3>
                          {exp.subtitle && (
                            <p className="text-gray-600 dark:text-gray-400">{exp.subtitle}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-sm text-primary-600 font-medium">{exp.dateText}</span>
                          {exp.workType && (
                            <p className="text-xs text-gray-500 mt-1 capitalize">{exp.workType}</p>
                          )}
                        </div>
                      </div>
                      
                      {exp.workDescription && (
                        <div className="prose prose-sm dark:prose-invert mt-4">
                          {exp.workDescription.map((desc, descIndex) => (
                            <ReactMarkdown key={descIndex}>{desc}</ReactMarkdown>
                          ))}
                        </div>
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

Experience.propTypes = {
  header: PropTypes.string.isRequired,
};

export default Experience;