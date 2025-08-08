import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import PropTypes from 'prop-types';
import Header from './Header';
import endpoints from '../constants/endpoints';
import FallbackSpinner from './FallbackSpinner';

function About({ header }) {
  const { data, isLoading } = useQuery(
    ['about'],
    async () => {
      const response = await fetch(endpoints.about);
      if (!response.ok) throw new Error('Failed to fetch about data');
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
              className="grid md:grid-cols-2 gap-12 items-center"
            >
              <div className="space-y-6">
                <div className="prose prose-lg dark:prose-invert max-w-none">
                  <ReactMarkdown>{data.about}</ReactMarkdown>
                </div>
              </div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="flex justify-center"
              >
                <img
                  src={data.imageSource}
                  alt="Profile"
                  className="rounded-2xl shadow-2xl max-w-md w-full h-auto object-cover"
                />
              </motion.div>
            </motion.div>
          )}
        </div>
      </div>
    </>
  );
}

About.propTypes = {
  header: PropTypes.string.isRequired,
};

export default About;
