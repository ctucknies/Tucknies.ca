import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { motion } from 'framer-motion'

function UserProfile({ onClose }) {
  const { user, signOut } = useAuth()
  const [profile, setProfile] = useState({
    sleeper_username: '',
    favorite_year: new Date().getFullYear().toString()
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (user) {
      loadProfile()
    }
  }, [user])

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        setProfile(data)
      }
    } catch (error) {
      console.log('No profile found, will create on save')
    }
  }

  const saveProfile = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          sleeper_username: profile.sleeper_username,
          favorite_year: profile.favorite_year,
          updated_at: new Date().toISOString()
        })

      if (error) throw error
      setMessage('Profile saved successfully!')
    } catch (error) {
      setMessage('Error saving profile: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">My Profile</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Email:</strong> {user?.email}
          </p>
        </div>

        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Sleeper Username
            </label>
            <input
              type="text"
              value={profile.sleeper_username}
              onChange={(e) => setProfile({ ...profile, sleeper_username: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Your Sleeper username"
            />
            <p className="text-xs text-gray-500 mt-1">
              Save your username to auto-fill the League Manager
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Favorite Year
            </label>
            <select
              value={profile.favorite_year}
              onChange={(e) => setProfile({ ...profile, favorite_year: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {Array.from({ length: new Date().getFullYear() - 2019 }, (_, i) => {
                const year = new Date().getFullYear() - i
                return <option key={year} value={year.toString()}>{year}</option>
              })}
            </select>
          </div>

          {message && (
            <div className={`p-3 rounded-lg text-sm ${
              message.includes('Error')
                ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
            }`}>
              {message}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              {loading ? 'Saving...' : 'Save Profile'}
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="px-4 py-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium"
            >
              Sign Out
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

export default UserProfile