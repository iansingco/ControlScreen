import { ComponentType } from 'react';
import Clock from './Clock';
import SystemStats from './SystemStats';
import NowPlaying from './NowPlaying';

// Registry maps component name (from widgets.json) to the React component.
// Add new widgets here — no other file needs to change.
export const WIDGET_REGISTRY: Record<string, ComponentType> = {
  Clock,
  SystemStats,
  NowPlaying,
};
