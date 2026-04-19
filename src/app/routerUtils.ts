import { useContext } from 'react';
import { RouteContext } from './routeContext';
import type { RouteState } from './routeContext';

export type { RouteState };

export function navigate(to: string): void {
  window.history.pushState(null, '', to);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function useRoute(): RouteState {
  return useContext(RouteContext);
}
