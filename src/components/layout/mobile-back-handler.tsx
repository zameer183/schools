'use client';

import { useEffect, useRef } from 'react';
import { App } from '@capacitor/app';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { usePathname, useRouter } from 'next/navigation';

type BackButtonEvent = { canGoBack?: boolean };

function getRootPath(pathname: string) {
  if (pathname.startsWith('/admin')) return '/admin';
  if (pathname.startsWith('/teacher')) return '/teacher';
  if (pathname.startsWith('/student')) return '/student';
  if (pathname.startsWith('/parent')) return '/parent';
  return '/';
}

export default function MobileBackHandler() {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const routeStackRef = useRef<string[]>([]);

  useEffect(() => {
    const stack = routeStackRef.current;
    if (stack[stack.length - 1] !== pathname) stack.push(pathname);
    if (stack.length > 100) stack.shift();
  }, [pathname]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const navigateBack = (canGoBack = false) => {
      const stack = routeStackRef.current;
      const hasStackBack = stack.length > 1;
      const hasBrowserBack = typeof window !== 'undefined' && window.history.length > 1;

      if (canGoBack || hasStackBack || hasBrowserBack) {
        if (hasStackBack) stack.pop();
        router.back();
        return;
      }

      const fallback = getRootPath(pathname);
      if (pathname !== fallback) {
        routeStackRef.current = [fallback];
        router.push(fallback);
      }
    };

    const onHardwareBack = (event?: BackButtonEvent) => {
      navigateBack(Boolean(event?.canGoBack));
    };

    // Fallback for some Android builds where plugin callback can be flaky.
    const onDocumentBackButton = (event: Event) => {
      event.preventDefault();
      onHardwareBack();
    };

    let pluginHandle: PluginListenerHandle | null = null;
    let active = true;

    App.addListener('backButton', onHardwareBack)
      .then((handle) => {
        if (!active) {
          handle.remove();
          return;
        }
        pluginHandle = handle;
      })
      .catch(() => {
        // Keep document fallback active.
      });

    document.addEventListener('backbutton', onDocumentBackButton, false);

    return () => {
      active = false;
      document.removeEventListener('backbutton', onDocumentBackButton, false);
      pluginHandle?.remove();
    };
  }, [pathname, router]);

  return null;
}
