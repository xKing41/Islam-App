import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

/**
 * Kompassrose. `heading` = Blickrichtung des Handys (Grad von Nord),
 * `qibla` = Richtung zur Kaaba (Grad von Nord). Die Rose dreht sich, die Markierung oben ist fest.
 */
export function Compass({ size, heading, qibla, aligned, labels }: { size: number; heading: number; qibla: number; aligned: boolean; labels: [string, string, string, string] }) {
  const theme = useTheme();
  const c = size / 2;
  const r = c - 18;
  const ticks = Array.from({ length: 72 }, (_, i) => i * 5);
  const rad = (d: number) => (d * Math.PI) / 180;
  const kx = c + (r - 26) * Math.sin(rad(qibla));
  const ky = c - (r - 26) * Math.cos(rad(qibla));

  return (
    <Svg width={size} height={size}>
      {/* feste Markierung oben (Blickrichtung) */}
      <Path d={`M ${c - 10} 4 L ${c + 10} 4 L ${c} 20 Z`} fill={aligned ? theme.success : theme.accent} />
      <G rotation={-heading} origin={`${c}, ${c}`}>
        <Circle cx={c} cy={c} r={r} fill={theme.card} stroke={theme.border} strokeWidth={2} />
        <Circle cx={c} cy={c} r={r - 44} fill="none" stroke={theme.border} strokeWidth={1} />
        {ticks.map((d) => {
          const long = d % 30 === 0;
          const x1 = c + r * Math.sin(rad(d));
          const y1 = c - r * Math.cos(rad(d));
          const x2 = c + (r - (long ? 14 : 7)) * Math.sin(rad(d));
          const y2 = c - (r - (long ? 14 : 7)) * Math.cos(rad(d));
          return <Line key={d} x1={x1} y1={y1} x2={x2} y2={y2} stroke={long ? theme.textSecondary : theme.border} strokeWidth={long ? 2 : 1} />;
        })}
        {labels.map((label, i) => {
          const d = i * 90;
          const x = c + (r - 30) * Math.sin(rad(d));
          const y = c - (r - 30) * Math.cos(rad(d)) + 6;
          return (
            <SvgText key={label} x={x} y={y} fontSize={18} fontWeight="700" fill={i === 0 ? theme.danger : theme.textSecondary} textAnchor="middle">
              {label}
            </SvgText>
          );
        })}
        {/* Linie zur Qibla */}
        <Line x1={c} y1={c} x2={kx} y2={ky} stroke={theme.primary} strokeWidth={4} strokeLinecap="round" />
        <Circle cx={c} cy={c} r={7} fill={theme.primary} />
        {/* Kaaba-Symbol */}
        <G rotation={qibla} origin={`${kx}, ${ky}`}>
          <Rect x={kx - 13} y={ky - 13} width={26} height={26} rx={3} fill="#111" />
          <Rect x={kx - 13} y={ky - 6} width={26} height={4} fill="#C9A227" />
        </G>
      </G>
    </Svg>
  );
}
