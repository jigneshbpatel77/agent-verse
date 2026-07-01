'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

type ParsedMetricValue = {
  numeric: number;
  decimals: number;
  unit: string;
  unitFromSuffix: boolean;
  animatable: true;
} | {
  text: string;
  animatable: false;
};

type AnimatedMetricValueProps = {
  value: string;
  suffix?: string;
  suffixClassName?: string;
};

const metricNumberPattern = /^([+-]?(?:\d[\d,]*|\d)(?:\.\d+)?)(?:\s*([a-zA-Z/%][a-zA-Z0-9/% ]*))?$/;
const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

export function AnimatedMetricValue({ value, suffix, suffixClassName }: AnimatedMetricValueProps) {
  const parsed = useMemo(() => parseMetricValue(value, suffix), [value, suffix]);

  if (!parsed.animatable) {
    return <>{parsed.text}</>;
  }

  const formattedValue = formatMetricNumber(parsed.numeric, parsed.decimals);
  const isPercent = parsed.unit === '%';

  return (
    <span
      className="inline-flex items-baseline whitespace-nowrap tabular-nums"
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      <span className="inline-flex items-baseline whitespace-nowrap leading-none">
        {Array.from(formattedValue).map((character, index) => (
          isDigit(character) ? (
            <OdometerDigit key={`metric-digit-${index}`} value={Number(character)} />
          ) : (
            <span
              key={`metric-static-${index}`}
              className="inline-block leading-none"
              style={{ lineHeight: 1, verticalAlign: 'baseline' }}
            >
              {character}
            </span>
          )
        ))}
        {isPercent ? (
          <span
            className="inline-block leading-none"
            style={{ lineHeight: 1, verticalAlign: 'baseline' }}
          >
            %
          </span>
        ) : null}
      </span>
      {parsed.unit && !isPercent ? (
        <span
          className={`inline-block self-baseline leading-none ${suffixClassName ?? 'ml-1'}`}
          style={{ lineHeight: 1, verticalAlign: 'baseline' }}
        >
          {parsed.unitFromSuffix ? parsed.unit : ` ${parsed.unit}`}
        </span>
      ) : null}
    </span>
  );
}

function OdometerDigit({ value }: { value: number }) {
  const baselineRef = useRef<HTMLSpanElement | null>(null);
  const mountedRef = useRef(false);
  const reduceMotion = usePrefersReducedMotion();
  const [digitHeight, setDigitHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    const element = baselineRef.current;
    if (!element) {
      return;
    }

    const measure = () => {
      const nextHeight = element.getBoundingClientRect().height;
      if (nextHeight > 0) {
        setDigitHeight(nextHeight);
      }
    };

    measure();

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(element);

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    mountedRef.current = true;
  }, []);

  const canAnimate = mountedRef.current && !reduceMotion && digitHeight !== null;
  const translateY = digitHeight === null ? 0 : -value * digitHeight;

  return (
    <span
      className="relative inline-block w-[1ch] shrink-0 text-center leading-none"
      style={{
        lineHeight: 1,
        verticalAlign: 'baseline',
        visibility: digitHeight === null ? 'hidden' : 'visible',
      }}
    >
      <span
        ref={baselineRef}
        aria-hidden="true"
        className="invisible inline-block leading-none"
        style={{ lineHeight: 1, verticalAlign: 'baseline' }}
      >
        0
      </span>
      <span
        className="absolute left-0 top-0 block w-[1ch] overflow-hidden"
        style={{
          height: digitHeight === null ? '1em' : `${digitHeight}px`,
          lineHeight: 1,
          contain: 'layout paint',
        }}
      >
        <span
          className="block w-[1ch]"
          style={{
            transform: `translate3d(0, ${translateY}px, 0)`,
            transition: canAnimate ? 'transform 700ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
            willChange: canAnimate ? 'transform' : undefined,
          }}
        >
          {digits.map((digit) => (
            <span
              key={digit}
              className="block w-[1ch] text-center leading-none"
              style={{
                height: digitHeight === null ? '1em' : `${digitHeight}px`,
                lineHeight: digitHeight === null ? 1 : `${digitHeight}px`,
              }}
            >
              {digit}
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}

function parseMetricValue(value: string, suffix?: string): ParsedMetricValue {
  const normalized = value.trim();
  const match = normalized.match(metricNumberPattern);

  if (!match) {
    return { text: suffix ? `${value} ${suffix}` : value, animatable: false };
  }

  const numeric = Number(match[1].replace(/,/g, ''));
  if (!Number.isFinite(numeric)) {
    return { text: suffix ? `${value} ${suffix}` : value, animatable: false };
  }

  return {
    numeric,
    decimals: match[1].includes('.') ? match[1].split('.')[1]?.length ?? 0 : 0,
    unit: suffix ? ` ${suffix}` : (match[2]?.trim() ?? ''),
    unitFromSuffix: Boolean(suffix),
    animatable: true,
  };
}

function formatMetricNumber(value: number, decimals: number) {
  return new Intl.NumberFormat('en', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function usePrefersReducedMotion() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduceMotion(mediaQuery.matches);

    update();
    mediaQuery.addEventListener('change', update);

    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  return reduceMotion;
}

function isDigit(value: string) {
  return value >= '0' && value <= '9';
}
