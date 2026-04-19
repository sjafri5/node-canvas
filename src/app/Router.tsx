import { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { RouteContext } from './routeContext';
import type { RouteState } from './routeContext';

function parsePath(pathname: string): RouteState {
  const charMatch = pathname.match(/^\/templates\/character-lock\/(.+)$/);
  if (charMatch) {
    return { path: '/templates/character-lock/:characterId', params: { characterId: charMatch[1]! } };
  }

  if (pathname === '/templates/character-lock') {
    return { path: '/templates/character-lock', params: {} };
  }

  const dramaMatch = pathname.match(/^\/templates\/mini-drama\/(.+)$/);
  if (dramaMatch) {
    return { path: '/templates/mini-drama/:dramaId', params: { dramaId: dramaMatch[1]! } };
  }

  if (pathname === '/templates/mini-drama') {
    return { path: '/templates/mini-drama', params: {} };
  }

  return { path: '/', params: {} };
}

interface RouterProps {
  children: (route: RouteState) => ReactNode;
}

export function Router({ children }: RouterProps) {
  const [route, setRoute] = useState(() => parsePath(window.location.pathname));

  const handlePopState = useCallback(() => {
    setRoute(parsePath(window.location.pathname));
  }, []);

  useEffect(() => {
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [handlePopState]);

  return (
    <RouteContext.Provider value={route}>
      {children(route)}
    </RouteContext.Provider>
  );
}
