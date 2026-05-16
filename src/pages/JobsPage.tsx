/**
 * JobsPage — legacy route, now redirects to Board.
 *
 * Jobs live under Board → Jobs tab since Phase 4.
 * This file exists only so the /jobs route doesn't 404.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function JobsPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/board', { replace: true });
  }, [navigate]);

  return null;
}
