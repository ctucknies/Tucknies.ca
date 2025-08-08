import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import PropTypes from 'prop-types';
import Header from './Header';
import endpoints from '../constants/endpoints';
import ProjectCard from './projects/ProjectCard';
import FallbackSpinner from './FallbackSpinner';

function Projects({ header }) {
  const [showMore, setShowMore] = useState(false);
  
  const { data, isLoading } = useQuery(
    ['projects'],
    async () => {
      const response = await fetch(endpoints.projects);
      if (!response.ok) throw new Error('Failed to fetch projects data');
      return response.json();
    }
  );

  if (isLoading) return <FallbackSpinner />;

  const numberOfItems = showMore && data ? data.projects.length : 6;

  return (
    <>
      <Header title={header} />
      <div className="pt-20 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {data && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                {data.projects?.slice(0, numberOfItems).map((project, index) => (
                  <motion.div
                    key={project.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.6 }}
                  >
                    <ProjectCard project={project} />
                  </motion.div>
                ))}
              </div>

              {!showMore && data.projects && data.projects.length > 6 && (
                <div className="text-center">
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    onClick={() => setShowMore(true)}
                    className="btn-primary px-8 py-3"
                  >
                    Show More Projects
                  </motion.button>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </>
  );
}

Projects.propTypes = {
  header: PropTypes.string.isRequired,
};

export default Projects;
