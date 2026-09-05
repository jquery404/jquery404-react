import React, { useEffect, useMemo, useRef, useState } from 'react';

const SHEETS = {
  front: { src: '/assets/imgs/f-monster.png', columns: 6, rows: 3 },
  left: { src: '/assets/imgs/l-monster.png', columns: 6, rows: 2 },
  right: { src: '/assets/imgs/r-monster.png', columns: 6, rows: 2 },
};

function buildFrameMatrix() {
  const matrix = [];
  const ranges = {};

  Object.entries(SHEETS).forEach(([key, { src, columns, rows }]) => {
    const start = matrix.length;

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < columns; col += 1) {
        const x = columns === 1 ? 0 : (col / (columns - 1)) * 100;
        const y = rows === 1 ? 0 : (row / (rows - 1)) * 100;
        matrix.push({
          src,
          backgroundSize: `${columns * 100}% ${rows * 100}%`,
          backgroundPosition: `${x}% ${y}%`,
        });
      }
    }

    ranges[key] = { start, columns, rows };
  });

  return { matrix, ranges };
}

const { matrix: FRAME_MATRIX, ranges: FRAME_RANGES } = buildFrameMatrix();

function frameAt(rangeKey, col, row = 0) {
  const range = FRAME_RANGES[rangeKey];
  return range.start + row * range.columns + col;
}

const toFrontFrame = (localIndex) => frameAt('front', localIndex % 6, Math.floor(localIndex / 6));
const IDLE_FRAMES = [0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 16].map(toFrontFrame);
const BLINK_ONCE_FRAMES = [0, 7, 0].map(toFrontFrame);
const BLINK_TWICE_FRAMES = [0, 15, 16, 17, 0].map(toFrontFrame);
const NEUTRAL_FRAME = frameAt('front', 0, 0);
const DOUBLE_BLINK_CHANCE = 0.3;

const TURN_HYSTERESIS = 0.06;

// Each side's 12 frames (image row0 cols 0-5, then row1 cols 0-5) are a single
// continuous sweep of clock-face gaze positions, not an independent row/col grid.
// l-monster sweeps 6 -> 9 -> 12 (the left half of the clock); r-monster is the
// mirror image, sweeping 6 -> 3 -> 12 (the right half), frame-for-frame.
const GAZE_HOURS = {
  left: [6, 7, 8, 8.5, 9, 10, 10.5, 10.75, 11, 11.5, 11.75, 12],
  right: [6, 5, 4, 3.5, 3, 2, 1.5, 1.25, 1, 0.5, 0.25, 0],
};

const GAZE_LAST_STEP = GAZE_HOURS.left.length - 1;

function hourToAngle(hour) {
  const clockAngle = (hour % 12) * 30;
  let angle = clockAngle - 90;
  if (angle > 180) angle -= 360;
  return angle;
}

const GAZE_STEP_ANGLES = Object.fromEntries(
  Object.entries(GAZE_HOURS).map(([side, hours]) => [side, hours.map(hourToAngle)])
);

function circularDistance(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

function computeTargetGaze(angleDeg, previousSide) {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);

  let side;
  if (previousSide === 'right' && cos < -TURN_HYSTERESIS) {
    side = 'left';
  } else if (previousSide === 'left' && cos > TURN_HYSTERESIS) {
    side = 'right';
  } else if (previousSide === 'left' || previousSide === 'right') {
    side = previousSide;
  } else {
    side = cos >= 0 ? 'right' : 'left';
  }

  const angles = GAZE_STEP_ANGLES[side];
  let step = 0;
  let bestDistance = Infinity;
  angles.forEach((angle, index) => {
    const distance = circularDistance(angleDeg, angle);
    if (distance < bestDistance) {
      bestDistance = distance;
      step = index;
    }
  });

  return { side, step };
}

const MASCOT_TIMING = {
  reactionDelayMs: 130,
  idleTimeoutMs: 5000,
  holdLastLookMs: 5000,
  gazeStepMs: 55,
  breathingFrameMs: 420,
  blinkMinMs: 3500,
  blinkMaxMs: 7000,
  trackingEase: 0.18,
  reducedMotionTrackingEase: 0.34,
  movementThresholdPx: 3,
};

const STATES = {
  IDLE: 'IDLE',
  REACTION_DELAY: 'REACTION_DELAY',
  TRACKING: 'TRACKING',
  SETTLING_TO_IDLE: 'SETTLING_TO_IDLE',
};

const NEUTRAL_ANGLE_DEG = -90;

function randomBlinkDelay() {
  const { blinkMinMs, blinkMaxMs } = MASCOT_TIMING;
  return blinkMinMs + Math.random() * (blinkMaxMs - blinkMinMs);
}

function shortestAngleDelta(fromDeg, toDeg) {
  return ((toDeg - fromDeg + 540) % 360) - 180;
}

function pickBlinkSequence() {
  return Math.random() < DOUBLE_BLINK_CHANCE ? BLINK_TWICE_FRAMES : BLINK_ONCE_FRAMES;
}

function MonsterSprite({ frame }) {
  const entry = FRAME_MATRIX[frame];

  return (
    <span
      className='monster-sprite'
      aria-hidden='true'
      style={{
        backgroundImage: `url(${entry.src})`,
        backgroundSize: entry.backgroundSize,
        backgroundPosition: entry.backgroundPosition,
      }}
    />
  );
}

function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);

    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return reducedMotion;
}

function useMascotAnimation(rootRef, reducedMotion) {
  const [frame, setFrame] = useState(NEUTRAL_FRAME);
  const [machineState, setMachineState] = useState(STATES.IDLE);
  const [pose, setPose] = useState({ lean: 0, lift: 0, squash: 1 });

  const visibleFrameRef = useRef(frame);
  const visibleStateRef = useRef(machineState);
  const visiblePoseRef = useRef(pose);
  const rafRef = useRef(null);
  const lastTickRef = useRef(0);
  const mouseRef = useRef({ x: 0, y: 0, hasPointer: false });
  const lastPointerRef = useRef({ x: null, y: null });
  const targetAngleRef = useRef(NEUTRAL_ANGLE_DEG);
  const gazeAngleRef = useRef(NEUTRAL_ANGLE_DEG);
  const lastMoveAtRef = useRef(0);
  const stateRef = useRef(STATES.IDLE);
  const reactionUntilRef = useRef(0);
  const blinkAtRef = useRef(0);
  const blinkStartedAtRef = useRef(null);
  const blinkSequenceRef = useRef(BLINK_ONCE_FRAMES);
  const dispSideRef = useRef(null);
  const dispStepRef = useRef(0);
  const lastGazeStepAtRef = useRef(0);
  const imagesReadyRef = useRef(false);

  const advanceGaze = (now, target, reduced) => {
    if (reduced || dispSideRef.current === null) {
      dispSideRef.current = target.side;
      dispStepRef.current = reduced ? target.step : 0;
      lastGazeStepAtRef.current = now;
      return FRAME_RANGES[dispSideRef.current].start + dispStepRef.current;
    }

    if (now - lastGazeStepAtRef.current >= MASCOT_TIMING.gazeStepMs) {
      if (dispSideRef.current !== target.side) {
        // Both sides share the same frame at step 0 (6 o'clock) and step
        // GAZE_LAST_STEP (12 o'clock) - cross over at whichever is nearer
        // instead of always walking back down to 0.
        const crossoverStep = dispStepRef.current <= GAZE_LAST_STEP / 2 ? 0 : GAZE_LAST_STEP;
        if (dispStepRef.current !== crossoverStep) {
          dispStepRef.current += dispStepRef.current < crossoverStep ? 1 : -1;
        } else {
          dispSideRef.current = target.side;
        }
        lastGazeStepAtRef.current = now;
      } else if (dispStepRef.current !== target.step) {
        dispStepRef.current += dispStepRef.current < target.step ? 1 : -1;
        lastGazeStepAtRef.current = now;
      }
    }

    return FRAME_RANGES[dispSideRef.current].start + dispStepRef.current;
  };

  const commitFrame = (nextFrame) => {
    if (visibleFrameRef.current !== nextFrame) {
      visibleFrameRef.current = nextFrame;
      setFrame(nextFrame);
    }
  };

  const commitState = (nextState) => {
    if (visibleStateRef.current !== nextState) {
      visibleStateRef.current = nextState;
      setMachineState(nextState);
    }
    stateRef.current = nextState;
  };

  const commitPose = (nextPose) => {
    const previous = visiblePoseRef.current;
    const changed =
      Math.abs(previous.lean - nextPose.lean) > 0.05 ||
      Math.abs(previous.lift - nextPose.lift) > 0.1 ||
      Math.abs(previous.squash - nextPose.squash) > 0.002;

    if (changed) {
      visiblePoseRef.current = nextPose;
      setPose(nextPose);
    }
  };

  useEffect(() => {
    const sources = Object.values(SHEETS).map(({ src }) => src);
    let loaded = 0;

    sources.forEach((src) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        loaded += 1;
        if (loaded === sources.length) imagesReadyRef.current = true;
      };
    });
  }, []);

  useEffect(() => {
    blinkAtRef.current = performance.now() + randomBlinkDelay();

    const registerActivity = (angleDeg) => {
      lastMoveAtRef.current = performance.now();
      if (Number.isFinite(angleDeg)) targetAngleRef.current = angleDeg;

      if (stateRef.current === STATES.IDLE || stateRef.current === STATES.SETTLING_TO_IDLE) {
        reactionUntilRef.current = performance.now() + MASCOT_TIMING.reactionDelayMs;
        commitState(STATES.REACTION_DELAY);
      }
    };

    const angleToPoint = (x, y) => {
      const bounds = rootRef.current?.getBoundingClientRect();
      if (!bounds) return null;
      const centerX = bounds.left + bounds.width / 2;
      const centerY = bounds.top + bounds.height / 2;
      return (Math.atan2(y - centerY, x - centerX) * 180) / Math.PI;
    };

    const handlePointerMove = (event) => {
      const last = lastPointerRef.current;
      const dx = last.x === null ? Infinity : event.clientX - last.x;
      const dy = last.y === null ? Infinity : event.clientY - last.y;
      const distance = Math.hypot(dx, dy);

      mouseRef.current = { x: event.clientX, y: event.clientY, hasPointer: true };

      if (distance < MASCOT_TIMING.movementThresholdPx) return;

      lastPointerRef.current = { x: event.clientX, y: event.clientY };
      registerActivity(angleToPoint(event.clientX, event.clientY));
    };

    const handlePointerLeave = () => {
      mouseRef.current.hasPointer = false;
      lastMoveAtRef.current = performance.now() - MASCOT_TIMING.holdLastLookMs;
    };

    const handleWindowPointerOut = (event) => {
      if (!event.relatedTarget) handlePointerLeave();
    };

    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      const y = window.scrollY;
      const dy = y - lastScrollY;
      lastScrollY = y;
      if (Math.abs(dy) < 2) return;
      registerActivity(dy > 0 ? 90 : NEUTRAL_ANGLE_DEG);
    };

    const isTextEntryElement = (el) =>
      !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);

    const handleTypingActivity = (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = document.activeElement;
      if (!isTextEntryElement(target)) return;
      const rect = target.getBoundingClientRect();
      registerActivity(angleToPoint(rect.left + rect.width / 2, rect.top + rect.height / 2));
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerout', handleWindowPointerOut);
    window.addEventListener('blur', handlePointerLeave);
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('keydown', handleTypingActivity, { passive: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerout', handleWindowPointerOut);
      window.removeEventListener('blur', handlePointerLeave);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('keydown', handleTypingActivity);
    };
  }, [rootRef]);

  useEffect(() => {
    const tick = (now) => {
      const previousTick = lastTickRef.current || now;
      const dt = Math.min(now - previousTick, 64);
      lastTickRef.current = now;

      if (!imagesReadyRef.current) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const currentState = stateRef.current;
      const idleLongEnough = now - lastMoveAtRef.current > MASCOT_TIMING.idleTimeoutMs;
      const holdingDone = now - lastMoveAtRef.current > MASCOT_TIMING.holdLastLookMs;

      if (currentState === STATES.REACTION_DELAY && now >= reactionUntilRef.current) {
        commitState(STATES.TRACKING);
      }

      if (stateRef.current === STATES.TRACKING && holdingDone) {
        commitState(STATES.SETTLING_TO_IDLE);
      }

      if (stateRef.current === STATES.REACTION_DELAY && idleLongEnough && !mouseRef.current.hasPointer) {
        commitState(STATES.SETTLING_TO_IDLE);
      }

      if (stateRef.current === STATES.IDLE) {
        const frames = reducedMotion ? [NEUTRAL_FRAME] : IDLE_FRAMES;
        let idleFrame = frames[Math.floor(now / MASCOT_TIMING.breathingFrameMs) % frames.length];

        if (!reducedMotion && now >= blinkAtRef.current && blinkStartedAtRef.current === null) {
          blinkStartedAtRef.current = now;
          blinkSequenceRef.current = pickBlinkSequence();
        }

        if (blinkStartedAtRef.current !== null) {
          const blinkIndex = Math.floor((now - blinkStartedAtRef.current) / 90);
          if (blinkIndex < blinkSequenceRef.current.length) {
            idleFrame = blinkSequenceRef.current[blinkIndex];
          } else {
            blinkStartedAtRef.current = null;
            blinkAtRef.current = now + randomBlinkDelay();
          }
        }

        commitFrame(idleFrame);
        commitPose({ lean: 0, lift: 0, squash: 1 });
      }

      if (
        stateRef.current === STATES.TRACKING ||
        stateRef.current === STATES.REACTION_DELAY ||
        stateRef.current === STATES.SETTLING_TO_IDLE
      ) {
        const settling = stateRef.current === STATES.SETTLING_TO_IDLE;
        const effectiveTargetAngle = settling ? NEUTRAL_ANGLE_DEG : targetAngleRef.current;
        const ease = reducedMotion ? MASCOT_TIMING.reducedMotionTrackingEase : MASCOT_TIMING.trackingEase;
        const delta = shortestAngleDelta(gazeAngleRef.current, effectiveTargetAngle);
        gazeAngleRef.current += delta * Math.min(1, ease * (dt / 16.67));

        const target = computeTargetGaze(gazeAngleRef.current, dispSideRef.current);
        commitFrame(advanceGaze(now, target, reducedMotion));

        const reachedTarget = dispSideRef.current === target.side && dispStepRef.current === target.step;

        if (reducedMotion) {
          commitPose({ lean: 0, lift: 0, squash: 1 });
        } else if (settling) {
          commitPose({ lean: Math.max(-3, Math.min(3, shortestAngleDelta(0, gazeAngleRef.current) / 60)), lift: -1, squash: 1 });
        } else {
          const speed = Math.min(1, Math.abs(delta) / 120);
          commitPose({
            lean: Math.max(-3, Math.min(3, shortestAngleDelta(0, gazeAngleRef.current) / 60)),
            lift: -Math.min(4, speed * 4),
            squash: 1 + speed * 0.018,
          });
        }

        if (settling && reachedTarget) {
          gazeAngleRef.current = NEUTRAL_ANGLE_DEG;
          targetAngleRef.current = NEUTRAL_ANGLE_DEG;
          blinkAtRef.current = now + randomBlinkDelay();
          commitState(STATES.IDLE);
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [reducedMotion]);

  return { frame, machineState, pose };
}

function InteractiveMascot({ className = '', activity = 'idle' }) {
  const rootRef = useRef(null);
  const reducedMotion = useReducedMotion();
  const { frame, machineState, pose } = useMascotAnimation(rootRef, reducedMotion);

  const agentBusy = activity === 'thinking' || activity === 'responding' || activity === 'presenting';
  const label = useMemo(() => {
    const gaze = machineState;
    return `jQuery404 mascot · gaze ${gaze} · activity ${activity}`;
  }, [machineState, activity]);

  let agentPose = pose;
  if (!reducedMotion && agentBusy) {
    if (activity === 'thinking') {
      agentPose = { lean: pose.lean * 0.4, lift: -2, squash: 1.03 };
    } else if (activity === 'responding') {
      agentPose = { lean: pose.lean, lift: -3, squash: 1.015 };
    } else if (activity === 'presenting') {
      agentPose = { lean: 0, lift: -5, squash: 1.04 };
    }
  }

  return (
    <aside
      ref={rootRef}
      className={`interactive-mascot ${className} activity-${activity}`.trim()}
      data-activity={activity}
      data-gaze={machineState}
      aria-label={label}
      style={{
        '--mascot-lean': `${agentPose.lean}deg`,
        '--mascot-lift': `${agentPose.lift}px`,
        '--mascot-squash': agentPose.squash,
      }}
    >
      <MonsterSprite frame={frame} />
    </aside>
  );
}

export { MASCOT_TIMING, MonsterSprite, useMascotAnimation };
export default InteractiveMascot;
