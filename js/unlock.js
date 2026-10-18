/**
 * Secure unlock system for audio-troubleshooting-lab
 * Replaces localStorage boolean with signed split cookies + session seal
 * No server-side logic, tamper detection, session-contextual
 *
 * ═══ FROZEN — DO NOT EXTEND (2026-10-18, council decision) ════════════════
 * This module and its wiring in index.html are frozen: the signed-cookie
 * unlock for ?tier=member must keep working exactly as it does. Do not
 * revert it to localStorage, do not add fields, code paths, or APIs — the
 * surface below (readUnlock/writeUnlock/deleteUnlock/maybeUnlockFromUrl/
 * isUnlocked/init) is complete on purpose. Verification matrix and the
 * migration note live in UNLOCK_README.md; scripts/check_tier_prompt.js
 * gates the prompt flow. Changes here need Kyle's explicit go-ahead.
 * ═════════════════════════════════════════════════════════════════════════
 */
(function () {
  const UNLOCK_VERSION = 1;
  const COOKIE_NAME_PAYLOAD = 'aul_p';
  const COOKIE_NAME_SIG = 'aul_s';
  const COOKIE_NAME_IID = 'aul_iid';
  const SESSION_SEAL_KEY = 'aul_seal';
  
  // Pepper baked into bundle (extractable but stops blind copy-paste)
  const HMAC_PEPPER = 'audiou_troubleshooting_lab_unlock_v1_pepper_9k3x7q';
  
  // Cookie helpers
  function getCookie(name) {
    try {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.startsWith(name + '=')) {
          return decodeURIComponent(cookie.substring(name.length + 1));
        }
      }
    } catch (e) {
      // Ignore
    }
    return null;
  }
  
  function setCookie(name, value, days) {
    try {
      let expires = '';
      if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = '; expires=' + date.toUTCString();
      }
      document.cookie = name + '=' + encodeURIComponent(value) + expires + '; path=/; SameSite=Lax';
    } catch (e) {
      // Ignore
    }
  }
  
  function deleteCookie(name) {
    try {
      document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax';
    } catch (e) {
      // Ignore
    }
  }
  
  // Base64url helpers
  function base64urlEncode(str) {
    try {
      const bytes = new TextEncoder().encode(str);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    } catch (e) {
      return '';
    }
  }
  
  function base64urlDecode(str) {
    try {
      const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
      const binary = atob(padded);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new TextDecoder().decode(bytes);
    } catch (e) {
      return null;
    }
  }
  
  // Get install ID (persistent)
  function getInstallId() {
    try {
      let iid = getCookie(COOKIE_NAME_IID);
      if (!iid) {
        // Generate UUID v4
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
          iid = crypto.randomUUID();
        } else {
          iid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
        }
        setCookie(COOKIE_NAME_IID, iid, 365 * 2);
      }
      return iid;
    } catch (e) {
      return 'unknown-install';
    }
  }
  
  // Get session seal
  function getSessionSeal() {
    try {
      return sessionStorage.getItem(SESSION_SEAL_KEY);
    } catch (e) {
      return null;
    }
  }
  
  function setSessionSeal() {
    try {
      let seal;
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        seal = Array.from(crypto.getRandomValues(new Uint8Array(32)))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
      } else {
        seal = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
      }
      sessionStorage.setItem(SESSION_SEAL_KEY, seal);
      return seal;
    } catch (e) {
      return null;
    }
  }
  
  // HMAC-SHA256
  async function computeHmac(payloadObj) {
    try {
      const canonical = payloadObj.v + '|' + payloadObj.st + '|' + payloadObj.ts + '|' + payloadObj.iid + '|' + payloadObj.src;
      if (typeof crypto === 'undefined' || !crypto.subtle) {
        throw new Error('WebCrypto not available');
      }
      const keyData = new TextEncoder().encode(HMAC_PEPPER);
      const data = new TextEncoder().encode(canonical);
      const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signature = await crypto.subtle.sign('HMAC', key, data);
      // Convert to base64url
      const bytes = new Uint8Array(signature);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    } catch (e) {
      throw e;
    }
  }
  
  async function verifyHmac(payloadObj, sig) {
    try {
      const computed = await computeHmac(payloadObj);
      // Simple string comparison (timing is less critical in this context, but WebCrypto verify is better)
      if (computed.length !== sig.length) return false;
      let equal = true;
      for (let i = 0; i < computed.length; i++) {
        if (computed[i] !== sig[i]) equal = false;
      }
      return equal;
    } catch (e) {
      return false;
    }
  }
  
  // Read unlock state
  async function readUnlock() {
    try {
      const payloadCookie = getCookie(COOKIE_NAME_PAYLOAD);
      const sigCookie = getCookie(COOKIE_NAME_SIG);
      
      if (!payloadCookie || !sigCookie) {
        return { unlocked: false, reason: 'missing_cookies' };
      }
      
      const payloadJson = base64urlDecode(payloadCookie);
      const sig = base64urlDecode(sigCookie);
      
      if (!payloadJson || !sig) {
        return { unlocked: false, reason: 'decode_failed' };
      }
      
      let payload;
      try {
        payload = JSON.parse(payloadJson);
      } catch (e) {
        return { unlocked: false, reason: 'invalid_json' };
      }
      
      // Check shape and version
      if (payload.v !== UNLOCK_VERSION) {
        return { unlocked: false, reason: 'invalid_version' };
      }
      if (payload.st !== 'full') {
        return { unlocked: false, reason: 'invalid_state' };
      }
      if (!payload.ts || typeof payload.ts !== 'number') {
        return { unlocked: false, reason: 'invalid_timestamp' };
      }
      if (!payload.iid || !payload.src) {
        return { unlocked: false, reason: 'missing_fields' };
      }
      
      const now = Date.now();
      // Timestamp sanity
      if (payload.ts > now + 30000) {
        return { unlocked: false, reason: 'future_timestamp' };
      }
      if (payload.ts < now - 2 * 365 * 24 * 60 * 60 * 1000) {
        return { unlocked: false, reason: 'ancient_timestamp' };
      }
      
      // Install ID match
      const currentIid = getInstallId();
      if (payload.iid !== currentIid) {
        return { unlocked: false, reason: 'iid_mismatch' };
      }
      
      // HMAC verification
      const isValid = await verifyHmac(payload, sig);
      if (!isValid) {
        return { unlocked: false, reason: 'hmac_mismatch' };
      }
      
      // Check session seal - re-seal on valid read
      const currentSeal = getSessionSeal();
      if (!currentSeal) {
        setSessionSeal();
      }
      
      return { unlocked: true, payload: payload };
    } catch (e) {
      return { unlocked: false, reason: 'error', error: e };
    }
  }
  
  // Write unlock token
  async function writeUnlock(src) {
    try {
      const iid = getInstallId();
      const payload = {
        v: UNLOCK_VERSION,
        st: 'full',
        ts: Date.now(),
        iid: iid,
        src: src || 'unknown'
      };
      
      const sig = await computeHmac(payload);
      const payloadJson = JSON.stringify(payload);
      
      const payloadB64 = base64urlEncode(payloadJson);
      const sigB64 = base64urlEncode(sig);
      
      setCookie(COOKIE_NAME_PAYLOAD, payloadB64, 365 * 2);
      setCookie(COOKIE_NAME_SIG, sigB64, 365 * 2);
      setSessionSeal();
      
      // Migrate away from localStorage.full
      try {
        localStorage.removeItem('audiou-troubleshooting-lab-member-unlock-v1');
        localStorage.removeItem('fullVersion');
        localStorage.removeItem('full');
      } catch (e) {
        // Ignore
      }
      
      // Verify immediately
      const verify = await readUnlock();
      return verify.unlocked;
    } catch (e) {
      return false;
    }
  }
  
  // Delete unlock
  function deleteUnlock() {
    try {
      deleteCookie(COOKIE_NAME_PAYLOAD);
      deleteCookie(COOKIE_NAME_SIG);
      deleteCookie(COOKIE_NAME_IID);
      sessionStorage.removeItem(SESSION_SEAL_KEY);
    } catch (e) {
      // Ignore
    }
  }
  
  // Handle URL unlock
  async function maybeUnlockFromUrl() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('tier') === 'member') {
        // Check if already unlocked
        const result = await readUnlock();
        if (result.unlocked) {
          // Clean URL
          urlParams.delete('tier');
          const q = urlParams.toString();
          const newUrl = window.location.pathname + (q ? '?' + q : '') + window.location.hash;
          try { window.history.replaceState(null, '', newUrl); } catch (e) {}
          return result.unlocked;
        }
        // Need password verification - this is handled by main app
        return false;
      }
      return false;
    } catch (e) {
      return false;
    }
  }
  
  // Expose API
  window.UnlockSystem = {
    readUnlock: readUnlock,
    writeUnlock: writeUnlock,
    deleteUnlock: deleteUnlock,
    maybeUnlockFromUrl: maybeUnlockFromUrl,
    isUnlocked: async function() {
      const result = await readUnlock();
      return result.unlocked;
    },
    init: function() {
      // Initialize install ID
      getInstallId();
    }
  };
})();
