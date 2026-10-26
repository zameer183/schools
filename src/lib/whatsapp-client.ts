export type WhatsAppClientType = 'regular' | 'business';

const STORAGE_KEY = 'manarah_wa_client_type';

/**
 * Retrieve saved WhatsApp app preference from localStorage ('regular' | 'business')
 */
export function getStoredWhatsAppClientType(): WhatsAppClientType {
  if (typeof window === 'undefined') return 'regular';
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    return val === 'business' ? 'business' : 'regular';
  } catch {
    return 'regular';
  }
}

/**
 * Persist WhatsApp app preference to localStorage
 */
export function setStoredWhatsAppClientType(type: WhatsAppClientType): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, type);
  } catch {
    // ignore
  }
}

/**
 * Returns the current application login URL.
 * Automatically resolves to the current origin (e.g. schools-two.vercel.app) in browser.
 */
export function getAppLoginUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/login`;
  }
  return `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://schools-two.vercel.app'}/login`;
}

/**
 * Standard formatted credentials WhatsApp message
 */
export function formatCredentialsWhatsAppMessage({
  email,
  password,
  appName = 'Manarah Institute',
}: {
  email: string;
  password: string;
  appName?: string;
}): string {
  const loginUrl = getAppLoginUrl();
  return (
    `Your online profile successfully generated on\n` +
    `${appName}\n\n` +
    `Here is your app link\n\n` +
    `ANDROID:\n${loginUrl}\n\n` +
    `Here is your Institute gmail\n\n` +
    `${email}\n\n` +
    `Here is your password\n\n` +
    `${password}`
  );
}

/**
 * Clean and normalize phone numbers for WhatsApp.
 * Handles Pakistan local 03xx, +92, 0092, and international numbers.
 */
export function cleanWhatsAppPhone(raw?: string | null): string {
  if (!raw) return '';
  let digits = String(raw).replace(/\D/g, '');
  while (digits.startsWith('00')) {
    digits = digits.slice(2);
  }
  if (digits.startsWith('03') && digits.length === 11) {
    digits = '92' + digits.slice(1);
  } else if (digits.length === 10 && digits.startsWith('3')) {
    digits = '92' + digits;
  }
  return digits;
}

/**
 * Build direct deep link URL for WhatsApp or WhatsApp Business.
 * On Android, uses explicit Android Intent with package name (com.whatsapp or com.whatsapp.w4b).
 * On iOS, uses whatsapp:// scheme.
 * On Desktop, uses https://wa.me fallback.
 */
export function buildWhatsAppDirectUrl({
  phone,
  message,
  clientType = 'regular',
}: {
  phone: string;
  message: string;
  clientType?: WhatsAppClientType;
}): string {
  const cleanPhone = cleanWhatsAppPhone(phone);
  const encodedMsg = encodeURIComponent(message);
  const webFallback = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;

  if (typeof navigator === 'undefined') {
    return webFallback;
  }

  const isAndroid = /android/i.test(navigator.userAgent);
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  if (isAndroid) {
    const pkg = clientType === 'business' ? 'com.whatsapp.w4b' : 'com.whatsapp';
    return `intent://send?phone=${cleanPhone}&text=${encodedMsg}#Intent;package=${pkg};scheme=whatsapp;S.browser_fallback_url=${encodeURIComponent(webFallback)};end;`;
  }

  if (isIOS) {
    return `whatsapp://send?phone=${cleanPhone}&text=${encodedMsg}`;
  }

  return webFallback;
}

/**
 * Trigger direct WhatsApp / WhatsApp Business opening on mobile and desktop.
 */
export function openWhatsAppDirect({
  phone,
  message,
  clientType = 'regular',
  popupWindow,
}: {
  phone: string;
  message: string;
  clientType?: WhatsAppClientType;
  popupWindow?: Window | null;
}): string {
  const cleanPhone = cleanWhatsAppPhone(phone);
  const encodedMsg = encodeURIComponent(message);
  const directUrl = buildWhatsAppDirectUrl({ phone: cleanPhone, message, clientType });
  const webUrl = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;

  const isMobile = typeof navigator !== 'undefined' && /android|iphone|ipad|ipod/i.test(navigator.userAgent);

  if (isMobile) {
    if (popupWindow && !popupWindow.closed) {
      try {
        popupWindow.close();
      } catch {
        // ignore
      }
    }
    // On mobile, navigate current window directly
    window.location.href = directUrl;
  } else {
    if (popupWindow && !popupWindow.closed) {
      popupWindow.location.href = webUrl;
      popupWindow.focus();
    } else {
      window.open(webUrl, '_blank', 'noopener,noreferrer');
    }
  }

  return directUrl;
}
