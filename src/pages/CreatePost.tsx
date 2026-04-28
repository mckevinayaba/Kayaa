/**
 * CreatePost — thin redirect layer.
 *
 * Accepts an optional ?type= query param and maps it to the matching
 * board category before forwarding to BoardNewPage (/board/new?cat=X).
 *
 * Supported ?type= values:
 *   post | announce  → announcements
 *   sell             → for_sale
 *   help | service   → services
 *   skill            → services  (goes straight to skill form)
 *   job              → jobs
 *   free             → free
 *   lost             → lost_found
 *   event            → events
 *   ask | (default)  → ask
 *
 * BoardNewPage already has a complete 3-step flow (category picker →
 * details form with photo upload → preview) so we delegate to it
 * instead of duplicating the form logic here.
 */
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const TYPE_TO_CAT: Record<string, string> = {
  post:     'announcements',
  announce: 'announcements',
  sell:     'for_sale',
  help:     'services',
  service:  'services',
  skill:    'services',
  job:      'jobs',
  free:     'free',
  lost:     'lost_found',
  event:    'events',
  safety:   'safety',
  ask:      'ask',
};

export default function CreatePost() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const type = searchParams.get('type') ?? '';
    const cat  = TYPE_TO_CAT[type.toLowerCase()] ?? 'ask';

    // Pre-select the category by passing it as ?cat= to BoardNewPage
    navigate(`/board/new?cat=${cat}`, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Render nothing — redirect is instant
  return null;
}
