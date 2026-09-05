/**
 * Map normalized agent events → mascot activity labels.
 * Existing IDLE/TRACKING/SETTLING pointer behaviour stays separate.
 */
export const MASCOT_ACTIVITY = Object.freeze({
  IDLE: 'idle',
  TRACKING: 'tracking',
  THINKING: 'thinking',
  RESPONDING: 'responding',
  PRESENTING: 'presenting',
  SETTLING: 'settling',
});

export function activityFromAgentEvent(type, previous = MASCOT_ACTIVITY.IDLE) {
  switch (type) {
    case 'session.started':
    case 'retrieval.started':
      return MASCOT_ACTIVITY.THINKING;
    case 'retrieval.completed':
      return MASCOT_ACTIVITY.THINKING;
    case 'answer.delta':
      return MASCOT_ACTIVITY.RESPONDING;
    case 'tool.requested':
      return MASCOT_ACTIVITY.PRESENTING;
    case 'answer.completed':
      return MASCOT_ACTIVITY.SETTLING;
    case 'error':
      return MASCOT_ACTIVITY.IDLE;
    default:
      return previous;
  }
}

export default activityFromAgentEvent;
