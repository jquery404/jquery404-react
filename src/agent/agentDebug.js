export function isAgentDebug() {
  if (typeof process !== 'undefined' && process.env?.REACT_APP_AGENT_DEBUG === 'true') {
    return true;
  }
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem('agentDebug') === '1';
  } catch {
    return false;
  }
}

export function setAgentDebug(on) {
  if (typeof window === 'undefined') return;
  try {
    if (on) window.localStorage.setItem('agentDebug', '1');
    else window.localStorage.removeItem('agentDebug');
  } catch {
    /* ignore */
  }
}

export function logAgentDebug(label, payload) {
  if (!isAgentDebug()) return;
  // eslint-disable-next-line no-console
  console.debug(`[agent debug] ${label}`, payload);
}
