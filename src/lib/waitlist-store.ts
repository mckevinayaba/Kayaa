/**
 * Lightweight pub/sub for opening the waitlist modal from anywhere on the
 * landing page without threading props through every component.
 */

type Listener = () => void;
const listeners: Listener[] = [];

export function openWaitlist(_step?: number) {
  listeners.forEach((l) => l());
}

export function onWaitlistOpen(cb: Listener): () => void {
  listeners.push(cb);
  return () => {
    const i = listeners.indexOf(cb);
    if (i > -1) listeners.splice(i, 1);
  };
}
