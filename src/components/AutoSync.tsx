import React, { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../lib/store';

export function AutoSync() {
  const { db } = useAppStore();
  const lastSyncTimeRef = useRef(Date.now()); // initialize to now so we don't sync immediately on load unless modified
  const timerRef = useRef<any>(null);
  const pendingSyncRef = useRef(false);

  // Keep a ref of the LATEST db so performSync always sees the newest data
  // We can do this or just depend on `db` in the hook.
  const dbRef = useRef(db);
  useEffect(() => {
    dbRef.current = db;
  }, [db]);

  const performSync = useCallback(async () => {
    const autoSyncStr = localStorage.getItem('syncAuto');
    if (autoSyncStr !== 'true') return;

    const webdavUrl = localStorage.getItem('syncWebdavUrl');
    const username = localStorage.getItem('syncUser');
    const password = localStorage.getItem('syncPassword');

    if (!webdavUrl || !username || !password) return;

    try {
      const payload = {
        webdavUrl,
        username,
        password,
        data: dbRef.current,
        force: true
      };

      const res = await fetch('/api/sync/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
         console.warn('Auto-sync failed with status:', res.status);
      } else {
         console.log('Auto-sync completed at', new Date().toLocaleString());
      }
    } catch (e) {
      console.error('Auto-sync failed', e);
    }
  }, []);

  useEffect(() => {
    const autoSyncStr = localStorage.getItem('syncAuto');
    if (autoSyncStr !== 'true') return;

    pendingSyncRef.current = true;
    
    if (timerRef.current) clearTimeout(timerRef.current);
    
    const now = Date.now();
    const timeSinceLastSync = now - lastSyncTimeRef.current;
    
    if (timeSinceLastSync >= 10000) {
      // It's been >= 10s, schedule it slightly next tick to allow batching if multiple synchronous changes
      timerRef.current = setTimeout(() => {
         lastSyncTimeRef.current = Date.now();
         pendingSyncRef.current = false;
         performSync();
      }, 500);
    } else {
      // Wait for the remainder of the 10s window
      timerRef.current = setTimeout(() => {
        if (pendingSyncRef.current) {
           lastSyncTimeRef.current = Date.now();
           pendingSyncRef.current = false;
           performSync();
        }
      }, 10000 - timeSinceLastSync);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [db, performSync]); // depends on db so it triggers when db changes

  return null;
}
