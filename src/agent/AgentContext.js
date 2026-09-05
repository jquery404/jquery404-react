import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLocation, useNavigate, useMatch } from 'react-router-dom';
import { getAgentClient, isAgentUiEnabled } from './agentClient';
import { executeAgentTool, hashRouteToPath, isRedundantNavigation } from './executeTool';
import { activityFromAgentEvent, MASCOT_ACTIVITY } from './mascotActivity';
import { STARTER_PROMPTS } from './starterPrompts';
import { isAgentDebug, logAgentDebug } from './agentDebug';
import { recruiterSafeError } from './recruiterSafeError';

const AgentContext = createContext(null);

function presentableLinksFromPack(pack) {
  const seen = new Set();
  const out = [];
  for (const e of pack?.evidence || []) {
    if (!['research', 'project', 'app'].includes(e.type)) continue;
    if (!e.route || !e.title) continue;
    const to = hashRouteToPath(e.route);
    if (!to || seen.has(e.id)) continue;
    seen.add(e.id);
    out.push({
      id: e.id,
      type: e.type,
      title: e.title,
      to,
      thumbnail: e.thumbnail || null,
      tags: e.tags || [],
      desc: e.desc || null,
    });
    if (out.length >= 3) break;
  }
  return out;
}


function newLocalSessionId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function buildUiContext(location, researchMatch, projectMatch, appMatch) {
  const pathname = location.pathname || '/';
  let viewType = 'page';
  let recordId = null;
  if (researchMatch) {
    viewType = 'research';
    recordId = researchMatch.params.id;
  } else if (projectMatch) {
    viewType = 'project';
    recordId = projectMatch.params.id;
  } else if (appMatch) {
    viewType = 'app';
    recordId = appMatch.params.id;
  } else if (pathname === '/contact') viewType = 'contact';
  else if (pathname === '/') viewType = 'home';
  else if (pathname === '/research') viewType = 'research_list';
  else if (pathname === '/project') viewType = 'project_list';

  return {
    pathname,
    hashRoute: `/#${pathname === '/' ? '/' : pathname}`,
    viewType,
    recordId,
  };
}

export function AgentProvider({ children }) {
  const enabled = isAgentUiEnabled();
  const navigate = useNavigate();
  const location = useLocation();
  const researchMatch = useMatch('/r/:id');
  const projectMatch = useMatch('/p/:id');
  const appMatch = useMatch('/a/:id');

  const [available, setAvailable] = useState(null); // null=checking, true/false
  const [sessionId, setSessionId] = useState(() => newLocalSessionId());
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [activity, setActivity] = useState(MASCOT_ACTIVITY.IDLE);
  const [error, setError] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [evidenceHints, setEvidenceHints] = useState([]);
  const [suggestedViews, setSuggestedViews] = useState([]);
  const [statusNote, setStatusNote] = useState(null);
  const [retrievalPreparing, setRetrievalPreparing] = useState(false);
  const [kbReady, setKbReady] = useState(null);
  const settleTimerRef = useRef(null);
  const clientRef = useRef(enabled ? getAgentClient() : null);

  const uiContext = useMemo(
    () => buildUiContext(location, researchMatch, projectMatch, appMatch),
    [location, researchMatch, projectMatch, appMatch]
  );

  useEffect(() => {
    if (!enabled || !clientRef.current) {
      setAvailable(false);
      return undefined;
    }
    let cancelled = false;
    clientRef.current.health().then((h) => {
      if (!cancelled) setAvailable(!!h.ok);
    });
    // Opportunistic MiniLM warm — does not block health/navigation
    const cancelWarm =
      typeof clientRef.current.scheduleWarm === 'function'
        ? clientRef.current.scheduleWarm(4000)
        : () => {};
    return () => {
      cancelled = true;
      cancelWarm();
    };
  }, [enabled]);

  useEffect(() => {
    return () => {
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    };
  }, []);

  const applyActivity = useCallback((next) => {
    if (settleTimerRef.current) {
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
    setActivity(next);
    if (next === MASCOT_ACTIVITY.SETTLING) {
      settleTimerRef.current = setTimeout(() => {
        setActivity(MASCOT_ACTIVITY.IDLE);
      }, 700);
    }
  }, []);

  const runTool = useCallback(
    (toolCall) => {
      if (!toolCall) return;
      executeAgentTool(toolCall, {
        navigate: (path) => navigate(path),
        goBack: () => {
          if (window.history.length > 1) navigate(-1);
          else navigate('/');
        },
        onEvidence: (ids) => setEvidenceHints(ids),
        onNote: (note) => setStatusNote(note),
      });
    },
    [navigate]
  );

  const sendMessage = useCallback(
    async (rawMessage) => {
      const message = String(rawMessage || '').trim();
      if (!message || busy) return null;

      if (!enabled || !clientRef.current) {
        setError({ message: 'AI prototype is disabled in this build.', code: 'disabled' });
        return null;
      }

      if (available === false) {
        setError({
          message:
            'The assistant is offline right now. You can still browse research, projects, and contact as usual.',
          code: 'bridge_unavailable',
        });
        setPanelOpen(true);
        return null;
      }

      setPanelOpen(true);
      setError(null);
      setBusy(true);
      setStatusNote(null);
      setRetrievalPreparing(true);
      applyActivity(MASCOT_ACTIVITY.THINKING);

      const userMsg = {
        id: `u_${Date.now()}`,
        role: 'user',
        content: message,
        at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);

      try {
        const result = await clientRef.current.sendMessage({
          sessionId,
          message,
          uiContext,
          onEvent: (ev) => {
            if (ev.type === 'retrieval.started' && ev.initializing) {
              setRetrievalPreparing(true);
            }
            if (ev.type === 'retrieval.completed') {
              setRetrievalPreparing(false);
              setKbReady(true);
            }
            applyActivity(activityFromAgentEvent(ev.type, MASCOT_ACTIVITY.THINKING));
            if (ev.type === 'error' && ev.error) {
              setError(ev.error);
            }
          },
        });

        if (result.sessionId && result.sessionId !== sessionId) {
          setSessionId(result.sessionId);
        }

        const presentableLinks = presentableLinksFromPack(result.evidencePack);
        const assistantMsg = {
          id: `a_${Date.now()}`,
          role: 'assistant',
          content: result.answer || '',
          answerability: result.answerability,
          evidenceIds: result.evidenceIds || [],
          presentableLinks,
          toolCall: result.toolCall || null,
          toolRejected: result.toolRejected || null,
          inferenceUsed: result.inferenceUsed,
          at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);

        setSuggestedViews(result.evidencePack?.suggestedViews || []);
        if (result.evidenceIds?.length) {
          setEvidenceHints(result.evidenceIds);
        }
        logAgentDebug('turn', {
          evidenceIds: result.evidenceIds,
          suggestedViews: result.evidencePack?.suggestedViews,
          confidence: result.evidencePack?.confidence,
          toolCall: result.toolCall,
          answerability: result.answerability,
        });
        if (isAgentDebug() && result.evidencePack) {
          logAgentDebug('evidencePack', result.evidencePack);
        }

        if (result.toolRejected && isAgentDebug()) {
          setStatusNote(`Tool skipped: ${result.toolRejected.reason}`);
        }

        if (result.toolCall && !isRedundantNavigation(result.toolCall, uiContext)) {
          applyActivity(MASCOT_ACTIVITY.PRESENTING);
          runTool(result.toolCall);
        }

        applyActivity(MASCOT_ACTIVITY.SETTLING);
        setAvailable(true);
        setRetrievalPreparing(false);
        return result;
      } catch (err) {
        const safe = recruiterSafeError(err);
        setError(safe);
        if (safe.code === 'bridge_unavailable' || safe.code === 'split_unavailable') setAvailable(false);
        setRetrievalPreparing(false);
        logAgentDebug('error', { raw: err?.message, code: err?.code, safe });
        setMessages((prev) => [
          ...prev,
          {
            id: `e_${Date.now()}`,
            role: 'assistant',
            content: safe.message,
            answerability: 'error',
            at: new Date().toISOString(),
          },
        ]);
        applyActivity(MASCOT_ACTIVITY.IDLE);
        return null;
      } finally {
        setBusy(false);
        setRetrievalPreparing(false);
      }
    },
    [available, applyActivity, busy, enabled, runTool, sessionId, uiContext]
  );

  const clearConversation = useCallback(() => {
    setSessionId(newLocalSessionId());
    setMessages([]);
    setEvidenceHints([]);
    setSuggestedViews([]);
    setError(null);
    setStatusNote(null);
    applyActivity(MASCOT_ACTIVITY.IDLE);
  }, [applyActivity]);

  const value = useMemo(
    () => ({
      enabled,
      available,
      sessionId,
      messages,
      busy,
      activity,
      error,
      panelOpen,
      setPanelOpen,
      evidenceHints,
      suggestedViews,
      statusNote,
      uiContext,
      starterPrompts: STARTER_PROMPTS,
      sendMessage,
      clearConversation,
      retrievalPreparing,
      kbReady,
      retryHealth: async () => {
        if (!clientRef.current) return false;
        const h = await clientRef.current.health();
        setAvailable(!!h.ok);
        return !!h.ok;
      },
    }),
    [
      activity,
      available,
      busy,
      clearConversation,
      enabled,
      error,
      evidenceHints,
      kbReady,
      messages,
      panelOpen,
      retrievalPreparing,
      sendMessage,
      sessionId,
      statusNote,
      suggestedViews,
      uiContext,
    ]
  );

  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>;
}

export function useAgent() {
  const ctx = useContext(AgentContext);
  if (!ctx) {
    throw new Error('useAgent must be used within AgentProvider');
  }
  return ctx;
}

export function useAgentOptional() {
  return useContext(AgentContext);
}

export default AgentProvider;
