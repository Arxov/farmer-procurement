import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function MandiFeedback({ bookingId, centreName = 'Mandi Centre', existingRating = null }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(Boolean(existingRating));
  const [error, setError] = useState(null);

  const tags = [
    '⚖️ Transparent Weighing',
    '💸 Fast Payment / DBT',
    '🕵️ Fair Quality Inspection',
    '👮 Courteous Officers',
    '🛣️ Smooth Gate Entry',
  ];

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/bookings/' + bookingId + '/rate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + (session?.access_token || ''),
        },
        body: JSON.stringify({ rating, tags: selectedTags }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit rating');
      }

      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-xs flex items-center justify-between">
        <div>
          <p className="font-bold text-emerald-900 dark:text-emerald-100 flex items-center gap-1">
            <span>⭐ Rated {existingRating || rating}/5 Stars</span>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">✔️ Feedback Recorded</span>
          </p>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
            Thank you for rating {centreName}. Your input helps monitor APMC service standards.
          </p>
        </div>
        <span className="text-xl">🙏</span>
      </div>
    );
  }

  return (
    <div className="mt-3 p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl">
      <div className="flex justify-between items-center mb-1.5">
        <p className="text-xs font-bold text-gray-800 dark:text-neutral-200">⭐ Rate Your Mandi Experience</p>
        <span className="text-[10px] text-gray-500 dark:text-neutral-400">Citizen Transparency Loop</span>
      </div>
      <p className="text-[11px] text-gray-600 dark:text-neutral-400 mb-2">
        How transparent was the weighing & inspection process at <strong>{centreName}</strong>?
      </p>

      {/* 5-Star Rating Buttons */}
      <div className="flex items-center gap-1 mb-2.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => setRating(star)}
            className="text-xl transition transform hover:scale-125 focus:outline-none cursor-pointer"
          >
            {(hoverRating || rating) >= star ? '⭐' : '☆'}
          </button>
        ))}
        <span className="text-xs font-semibold text-amber-900 dark:text-amber-300 ml-2">
          {rating === 5 ? 'Excellent' : rating === 4 ? 'Very Good' : rating === 3 ? 'Satisfactory' : rating > 0 ? 'Needs Improvement' : 'Tap to rate'}
        </span>
      </div>

      {/* Experience Tags */}
      {rating > 0 && (
        <div className="space-y-2 animate-fadeIn">
          <p className="text-[10px] font-semibold text-gray-600 dark:text-neutral-400 uppercase tracking-wider">What went well?</p>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={
                    'text-[10px] px-2 py-1 rounded-lg border transition cursor-pointer ' +
                    (isSelected
                      ? 'bg-amber-600 text-white border-amber-600 font-semibold'
                      : 'bg-white dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-900')
                  }
                >
                  {tag}
                </button>
              );
            })}
          </div>

          {error && <p className="text-red-500 text-xs font-medium">{error}</p>}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="mt-2 text-xs bg-green-700 hover:bg-green-800 text-white font-semibold px-3 py-1.5 rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback →'}
          </button>
        </div>
      )}
    </div>
  );
}
