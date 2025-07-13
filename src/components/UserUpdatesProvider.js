'use client';

import { useUserUpdates } from '../hooks/useUserUpdates';

export default function UserUpdatesProvider({ children }) {
  useUserUpdates();
  return children;
}
