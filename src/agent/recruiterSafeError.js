export function recruiterSafeError(err) {
  const code = err?.code || err?.error?.code || 'agent_error';
  const raw = String(err?.message || err?.error?.message || '');

  const byCode = {
    bridge_unavailable:
      'The assistant is offline right now. You can still browse research, projects, and contact as usual.',
    split_unavailable:
      'The assistant is offline right now. You can still browse research, projects, and contact as usual.',
    timeout: 'That took too long. Try a shorter question, or keep browsing the portfolio.',
    gateway_error: 'The assistant could not finish that answer. Please try again in a moment.',
    bad_request: 'Please enter a short question about this portfolio.',
    disabled: 'The assistant is not enabled in this build. The portfolio itself still works.',
    kb_error:
      'Portfolio search is still warming up. Browse the site as usual, or try the chat again shortly.',
  };

  if (byCode[code]) {
    return { code, message: byCode[code] };
  }

  if (/HTML instead of JSON|Invalid generate JSON|Unexpected token|<!DOCTYPE/i.test(raw)) {
    return {
      code: 'gateway_error',
      message: 'The assistant could not finish that answer. Please try again in a moment.',
    };
  }
  if (/abort|timed out|timeout/i.test(raw)) {
    return { code: 'timeout', message: byCode.timeout };
  }
  if (/Failed to fetch|NetworkError|ECONNREFUSED|offline/i.test(raw)) {
    return { code: 'bridge_unavailable', message: byCode.bridge_unavailable };
  }

  return {
    code: code || 'agent_error',
    message: 'Something went wrong with the assistant. The portfolio is still fully usable.',
  };
}

export default recruiterSafeError;
