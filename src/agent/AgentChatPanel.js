import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAgent } from './AgentContext';
import InteractiveMascot from '../components/InteractiveMascot';
import { hashRouteToPath } from './executeTool';
import { isAgentDebug, setAgentDebug } from './agentDebug';

function evidenceLink(id) {
  const raw = String(id || '');
  const parts = raw.split(':');
  const type = parts.length > 1 ? parts[0] : null;
  let slug = parts.length > 1 ? parts.slice(1).join(':') : raw;
  if (type && slug.startsWith(`${type}:`)) slug = slug.slice(type.length + 1);
  if (type === 'research') return `/r/${slug}`;
  if (type === 'project') return `/p/${slug}`;
  if (type === 'app') return `/a/${slug}`;
  return null;
}

function panelSubtitle(uiContext) {
  if (!uiContext) return 'Ask about my work, projects, research, or how things connect.';
  if (uiContext.viewType === 'home') {
    return 'Ask about my work, projects, research, or how things connect.';
  }
  if (uiContext.viewType === 'page') {
    return 'Ask about my work, projects, research, or how things connect.';
  }
  const labels = {
    research: 'Research',
    project: 'Project',
    app: 'App',
    contact: 'Contact',
    research_list: 'Research',
    project_list: 'Projects',
  };
  const label = labels[uiContext.viewType] || String(uiContext.viewType || '').replace(/_/g, ' ');
  if (!label || label === 'page') {
    return 'Ask about my work, projects, research, or how things connect.';
  }
  if (uiContext.recordId) {
    return `Viewing ${uiContext.recordId} · ask a follow-up`;
  }
  return label;
}

function MessageBubble({ msg, debug }) {
  const isUser = msg.role === 'user';
  const time = msg.at
    ? new Date(msg.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;
  return (
    <div className={`agent-msg-row ${isUser ? 'is-user' : 'is-assistant'}`}>
      <span className='agent-msg-avatar' aria-hidden='true'>
        {isUser ? <i className='fas fa-user' /> : <img src='/assets/imgs/logo-mark.png' alt='' />}
      </span>
      <div className='agent-msg-col'>
        <div className={`agent-msg ${isUser ? 'is-user' : 'is-assistant'}`}>
          <p className='agent-msg-text'>{msg.content}</p>
          {!isUser && msg.answerability === 'unsupported' ? (
            <p className='agent-msg-meta'>Not supported by portfolio evidence</p>
          ) : null}
          {!isUser && msg.presentableLinks?.length ? (
            <div className='agent-msg-links' aria-label='Related work'>
              {msg.presentableLinks.map((link) =>
                link.thumbnail ? (
                  <Link key={link.id || link.to} to={link.to} className='agent-project-card'>
                    <span className='agent-project-card-media'>
                      <img src={link.thumbnail} alt='' />
                    </span>
                    {link.tags?.length ? (
                      <span className='agent-project-card-tags'>{link.tags.slice(0, 3).join(' · ')}</span>
                    ) : null}
                    <span className='agent-project-card-title'>{link.title}</span>
                    {link.desc ? <span className='agent-project-card-desc'>{link.desc}</span> : null}
                    <span className='agent-project-card-cta'>
                      View project <i className='fas fa-arrow-right' aria-hidden='true' />
                    </span>
                  </Link>
                ) : (
                  <Link key={link.id || link.to} to={link.to} className='agent-link-card'>
                    <span className='agent-link-card-kind'>{link.type}</span>
                    <span className='agent-link-card-title'>{link.title}</span>
                  </Link>
                )
              )}
            </div>
          ) : null}
          {debug && !isUser && msg.evidenceIds?.length ? (
            <div className='agent-msg-evidence' aria-label='Debug evidence ids'>
              {msg.evidenceIds.slice(0, 6).map((id) => {
                const to = evidenceLink(id);
                return to ? (
                  <Link key={id} to={to} className='agent-chip'>
                    {id}
                  </Link>
                ) : (
                  <span key={id} className='agent-chip is-static'>
                    {id}
                  </span>
                );
              })}
            </div>
          ) : null}
        </div>
        {time ? <span className='agent-msg-time'>{time}</span> : null}
      </div>
    </div>
  );
}

export function AgentChatPanel() {
  const {
    enabled,
    available,
    messages,
    busy,
    activity,
    error,
    panelOpen,
    setPanelOpen,
    evidenceHints,
    suggestedViews,
    statusNote,
    starterPrompts,
    sendMessage,
    clearConversation,
    retryHealth,
    uiContext,
    kbReady,
    retrievalPreparing,
  } = useAgent();

  const location = useLocation();
  const isHome = location.pathname === '/' || location.pathname === '';
  const [draft, setDraft] = useState('');
  const [homeScrolled, setHomeScrolled] = useState(false);
  const [debug, setDebug] = useState(() => isAgentDebug());
  const listRef = useRef(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const isDev = process.env.NODE_ENV === 'development';

  useEffect(() => {
    if (!isHome) {
      setHomeScrolled(false);
      return undefined;
    }
    const onScroll = () => setHomeScrolled(window.scrollY > window.innerHeight * 0.55);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isHome]);

  useEffect(() => {
    if (!panelOpen) return;
    const el = bottomRef.current;
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'end', behavior: 'auto' });
    } else if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, busy, panelOpen, debug, retrievalPreparing]);

  useEffect(() => {
    if (panelOpen && inputRef.current && !busy) {
      inputRef.current.focus();
    }
  }, [panelOpen, busy]);

  if (!enabled) return null;

  const onSubmit = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setDraft('');
    sendMessage(text);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') setPanelOpen(false);
  };

  const toggleDebug = () => {
    const next = !debug;
    setAgentDebug(next);
    setDebug(next);
  };

  const statusLabel = retrievalPreparing
    ? 'Warming up search…'
    : activity === 'thinking'
      ? 'Thinking…'
      : activity === 'responding'
        ? 'Responding…'
        : activity === 'presenting'
          ? 'Opening…'
          : busy
            ? 'Working…'
            : available === false
              ? 'Assistant offline'
              : kbReady === false
                ? 'Ask me anything'
                : 'Ask jQuery404';

  const showStarters = messages.length === 0 && !busy && !retrievalPreparing;
  const homeHero = isHome && !homeScrolled && !panelOpen;
  const showDevChrome = isDev || debug;

  return (
    <div
      className={[
        'agent-companion',
        panelOpen ? 'is-open' : 'is-collapsed',
        homeHero ? 'is-home' : 'is-docked',
        activity !== 'idle' ? `is-${activity}` : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onKeyDown={onKeyDown}
    >
      <div className='agent-companion-mascot-wrap'>
        <button
          type='button'
          className='agent-companion-mascot-hit'
          aria-expanded={panelOpen}
          aria-label={panelOpen ? 'Close portfolio chat' : 'Open portfolio chat'}
          onClick={() => setPanelOpen(!panelOpen)}
        >
          <InteractiveMascot className='agent-companion-mascot' activity={activity} />
        </button>
        {!panelOpen ? (
          <button
            type='button'
            className='agent-companion-pill'
            onClick={() => setPanelOpen(true)}
          >
            {statusLabel}
          </button>
        ) : null}
      </div>

      {panelOpen ? (
        <section className='agent-panel' aria-label='Portfolio assistant'>
          <header className='agent-panel-head'>
            <div className='agent-panel-actions'>
              {showDevChrome ? (
                <button
                  type='button'
                  className='agent-text-btn'
                  onClick={toggleDebug}
                  title='Toggle evidence / KB id inspect'
                >
                  {debug ? 'Debug on' : 'Debug'}
                </button>
              ) : null}
              <button type='button' className='agent-text-btn' onClick={clearConversation}>
                New
              </button>
              <button type='button' className='agent-text-btn' onClick={() => setPanelOpen(false)}>
                Close
              </button>
            </div>
            <h2 className='agent-panel-title'>Chat with jQuery404</h2>
            <p className='agent-panel-sub'>{panelSubtitle(uiContext)}</p>
          </header>

          {available === false ? (
            <div className='agent-banner is-warn'>
              <p>
                Assistant offline — the portfolio still works. Browse research, projects, and contact as
                usual.
              </p>
              {isDev ? (
                <p className='agent-banner-dev'>
                  Local AI: <code>npm run start:ai</code>
                </p>
              ) : null}
              <button type='button' className='agent-banner-action' onClick={retryHealth}>
                Retry
              </button>
            </div>
          ) : null}

          {error && available !== false ? (
            <div className='agent-banner is-warn' role='alert'>
              {error.message}
            </div>
          ) : null}

          {statusNote ? <div className='agent-banner is-note'>{statusNote}</div> : null}

          {retrievalPreparing ? (
            <div className='agent-banner is-note is-loading' aria-live='polite'>
              Preparing portfolio search — first answer may take a moment. You can keep browsing.
            </div>
          ) : null}

          {showStarters ? (
            <div className='agent-starters' aria-label='Starter questions'>
              {starterPrompts.map((p) => (
                <button
                  key={p.id}
                  type='button'
                  className='agent-starter'
                  disabled={busy || available === false}
                  onClick={() => sendMessage(p.label)}
                >
                  <i className='fas fa-magic' aria-hidden='true' />
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          ) : null}

          <div className='agent-messages' ref={listRef}>
            {messages.length === 0 && !showStarters ? (
              <p className='agent-empty'>Ask about my work, projects, research, or how things connect.</p>
            ) : null}
            {messages.map((m) => (
              <MessageBubble key={m.id} msg={m} debug={debug} />
            ))}
            {busy ? (
              <div className='agent-msg is-assistant is-pending' aria-live='polite'>
                <p className='agent-msg-text'>
                  <span className='agent-typing' aria-hidden='true'>
                    <span />
                    <span />
                    <span />
                  </span>
                  {statusLabel}
                </p>
              </div>
            ) : null}
            <div ref={bottomRef} className='agent-messages-end' aria-hidden='true' />
          </div>

          {debug && evidenceHints.length ? (
            <div className='agent-evidence' aria-label='Evidence'>
              <span className='agent-evidence-label'>Evidence</span>
              <ul>
                {evidenceHints.slice(0, 6).map((id) => {
                  const to = evidenceLink(id);
                  return (
                    <li key={id}>{to ? <Link to={to}>{id}</Link> : <span>{id}</span>}</li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {debug && suggestedViews?.length ? (
            <div className='agent-hints' aria-label='Optional views'>
              <span className='agent-evidence-label'>Also related</span>
              <ul>
                {suggestedViews.slice(0, 3).map((v, i) => {
                  const route = typeof v === 'string' ? v : v.route || v.path;
                  const path = route ? hashRouteToPath(route) : null;
                  const label =
                    typeof v === 'string'
                      ? v
                      : v.title || v.recordId || v.id || v.recordKey || route;
                  return (
                    <li key={v.recordKey || v.recordId || i}>
                      {path ? <Link to={path}>{label}</Link> : <span>{label}</span>}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          <form className='agent-composer' onSubmit={onSubmit}>
            <label className='visually-hidden' htmlFor='agent-input'>
              Message
            </label>
            <div className='agent-composer-input-wrap'>
              <i className='fas fa-magic agent-composer-icon' aria-hidden='true' />
              <input
                id='agent-input'
                ref={inputRef}
                type='text'
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={
                  available === false
                    ? 'Assistant offline…'
                    : retrievalPreparing
                      ? 'Search warming up — you can still type…'
                      : 'Ask a follow-up…'
                }
                disabled={busy || available === false}
                autoComplete='off'
                enterKeyHint='send'
              />
            </div>
            <button
              type='submit'
              className='agent-composer-send'
              disabled={busy || available === false || !draft.trim()}
              aria-label='Send'
            >
              <i className='fas fa-arrow-up' aria-hidden='true' />
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}

export default AgentChatPanel;
