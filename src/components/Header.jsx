import React from 'react';
import { motion } from 'framer-motion';
import PropTypes from 'prop-types';

function Header({ title }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="fixed top-16 left-0 right-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700"
    >
      <div className="max-w-7xl mx-auto px-4 py-4">
        <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
          {title}
        </h1>
      </div>
    </motion.div>
  );
}

Header.propTypes = {
  title: PropTypes.string.isRequired,
};

export default Header;
