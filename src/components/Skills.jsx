import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import PropTypes from 'prop-types';
import Header from './Header';
import endpoints from '../constants/endpoints';
import FallbackSpinner from './FallbackSpinner';

function Skills({ header }) {
  const { data, isLoading } = useQuery(
    ['skills'],
    async () => {
      const response = await fetch(endpoints.skills);
      if (!response.ok) throw new Error('Failed to fetch skills data');
      return response.json();
    }
  );

  if (isLoading) return <FallbackSpinner />;

  return (
    <>
      <Header title={header} />
      <div className="pt-20 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {data && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-12"
            >
              <div className="text-center mb-12">
                <div className="prose prose-lg dark:prose-invert mx-auto">
                  <ReactMarkdown>{data.intro}</ReactMarkdown>
                </div>
              </div>

              {data.skills?.map((category, categoryIndex) => (
                <motion.div
                  key={category.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: categoryIndex * 0.1, duration: 0.6 }}
                  className="space-y-6"
                >
                  <h3 className="text-2xl font-bold text-center mb-8">{category.title}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
                    {category.items.map((item, itemIndex) => (
                      <motion.div
                        key={item.title}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: (categoryIndex * 0.1) + (itemIndex * 0.05), duration: 0.4 }}
                        whileHover={{ scale: 1.05 }}
                        className="flex flex-col items-center p-4 rounded-lg bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        <img
                          src={item.icon}
                          alt={item.title}
                          className="w-16 h-16 mb-3 object-contain"
                        />
                        <p className="text-sm font-medium text-center">{item.title}</p>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </>
  );
}

Skills.propTypes = {
  header: PropTypes.string.isRequired,
};

export default Skills;
