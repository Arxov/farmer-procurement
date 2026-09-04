import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function Custom500() {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-4">
      <Head>
        <title>500 - Server Error | Kisan Procurement Portal</title>
      </Head>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-md w-full bg-white dark:bg-neutral-800 rounded-2xl p-8 shadow-sm border border-neutral-200 text-center"
      >
        <div className="w-16 h-16 bg-red-100 text-red-700 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-black">
          500
        </div>
        <h1 className="text-xl font-bold text-neutral-900 mb-2">Internal Server Error</h1>
        <p className="text-sm text-neutral-600 mb-6 leading-relaxed">
          Our procurement server encountered an unexpected error processing your request. Please retry in a few moments.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Refresh Page
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-sm font-medium rounded-xl transition-colors"
          >
            Return Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
