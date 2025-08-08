import React from 'react';
import { motion } from 'framer-motion';
import PropTypes from 'prop-types';
import ReactMarkdown from 'react-markdown';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

function ProjectCard({ project }) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="card h-full overflow-hidden group"
    >
      {project.image && (
        <div className="relative overflow-hidden">
          <img
            src={project.image}
            alt={project.title}
            className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      )}
      
      <div className="p-6 flex-1 flex flex-col">
        <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
          {project.title}
        </h3>
        
        <div className="prose prose-sm dark:prose-invert flex-1 mb-4">
          <ReactMarkdown>{project.bodyText}</ReactMarkdown>
        </div>
        
        {project.links && project.links.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {project.links.map((link) => (
              <motion.a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors duration-200"
              >
                {link.text}
                <ArrowTopRightOnSquareIcon className="w-3 h-3" />
              </motion.a>
            ))}
          </div>
        )}
        
        {project.tags && project.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            {project.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

ProjectCard.propTypes = {
  project: PropTypes.shape({
    title: PropTypes.string.isRequired,
    bodyText: PropTypes.string.isRequired,
    image: PropTypes.string,
    links: PropTypes.arrayOf(PropTypes.shape({
      text: PropTypes.string.isRequired,
      href: PropTypes.string.isRequired,
    })),
    tags: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
};

export default ProjectCard;
