import React from 'react';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import Link from 'next/link';
import { GetStaticProps } from 'next';
import { getApiDocs } from '../lib/swagger';
import 'swagger-ui-react/swagger-ui.css';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function ApiDocs({ spec }: { spec: any }) {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-800">
      <Head>
        <title>API Documentation - Kisan Procurement Portal</title>
      </Head>
      <header className="bg-green-800 text-white py-3.5 px-4 sm:px-6 shadow-md flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden="true">📖</span>
          <div>
            <h1 className="text-base sm:text-lg font-bold leading-tight">Kisan Portal API Specification</h1>
            <p className="text-[11px] text-green-200">OpenAPI 3.0 Interactive Explorer</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/api/health"
            target="_blank"
            className="text-xs bg-green-700/80 hover:bg-green-700 px-3 py-1.5 rounded-lg text-white font-medium border border-green-600 hidden sm:inline-block"
          >
            🏥 Health Status
          </Link>
          <Link
            href="/"
            className="text-xs bg-white dark:bg-neutral-800 text-green-800 hover:bg-green-50 px-3 py-1.5 rounded-lg font-semibold shadow-xs"
          >
            &larr; Back to App
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto py-6 px-4">
        <SwaggerUI spec={spec} />
      </main>
    </div>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const spec = getApiDocs();
  return {
    props: {
      spec,
    },
  };
};
