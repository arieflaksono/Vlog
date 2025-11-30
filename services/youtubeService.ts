import { VideoValidationResult } from '../types';

/**
 * Extracts the video ID from various YouTube URL formats.
 */
export const extractVideoId = (url: string): string | null => {
  if (!url) return null;
  const cleanUrl = url.trim();
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = cleanUrl.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

/**
 * Gets video details without using YouTube Data API Key.
 * Tries to fetch title via noembed (public). If fails (e.g. private video), returns default title.
 * Always returns isValid: true.
 */
export const getVideoDetails = async (videoId: string): Promise<VideoValidationResult> => {
  try {
    // Attempt to get title using noembed (does not require API Key)
    // Added AbortController for 5-second timeout to prevent stuck loading
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data.title) {
        return {
          isValid: true,
          videoId,
          title: data.title,
          privacyStatus: 'public'
        };
      }
    }
  } catch (error) {
    console.warn("Could not fetch video title via noembed, using fallback.", error);
  }

  // Fallback: Accept video even if we can't get details (e.g. it's private or noembed failed)
  return {
    isValid: true,
    videoId,
    title: 'Video YouTube',
    privacyStatus: 'unknown'
  };
};