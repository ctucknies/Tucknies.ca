import React from 'react';
import { motion } from 'framer-motion';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const LeagueSearch = ({ formData, setFormData, onSubmit, isLoading }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="card p-6 mb-8"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium mb-2">
              Sleeper Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="input-field"
              placeholder="Enter your username"
              required
            />
          </div>
          <div>
            <label htmlFor="year" className="block text-sm font-medium mb-2">
              Season Year
            </label>
            <select
              id="year"
              name="year"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: e.target.value })}
              className="input-field"
              required
            >
              <option value="all">All Years</option>
              {Array.from({ length: new Date().getFullYear() - 2019 }, (_, i) => {
                const year = new Date().getFullYear() - i;
                return <option key={year} value={year.toString()}>{year}</option>;
              })}
            </select>
          </div>
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <MagnifyingGlassIcon className="w-5 h-5" />
          )}
          {isLoading ? 'Loading...' : 'Search Leagues'}
        </button>
      </form>
    </motion.div>
  );
};

export default LeagueSearch;