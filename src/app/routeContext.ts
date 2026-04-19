import { createContext } from 'react';

export interface RouteState {
  path: string;
  params: Record<string, string>;
}

export const RouteContext = createContext<RouteState>({ path: '/', params: {} });
