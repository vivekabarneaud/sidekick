import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { shortDate } from './dates';
import { c } from './theme';

type Props = {
  /** One value for each week. The current week is last. */
  values: number[];
  /** The Monday of each week. */
  starts: number[];
  format: (n: number) => string;
  /** Text for screen readers. */
  label: string;
};

const H = 150;
const TOP = 24; // space for the value label above a column
const BOTTOM = 22; // space for the dates
const GUTTER = 36; // space for the tick label at the left
const MAX_COL = 24;
const RADIUS = 4;

/** The current week. The other weeks use a lighter step of the same blue. */
const CURRENT = c.accent;
const PAST = '#6E8CE4';

/** 1, 2, or 5 × a power of 10, equal to or more than n. */
function niceCeil(n: number) {
  if (n <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(n));
  for (const m of [1, 2, 5, 10]) if (m * p >= n) return m * p;
  return 10 * p;
}

/** A column with a 4 px rounded top and a square base. */
function column(x: number, w: number, base: number, h: number) {
  const r = Math.min(RADIUS, h, w / 2);
  const top = base - h;
  return [
    `M${x},${base}`,
    `V${top + r}`,
    `Q${x},${top} ${x + r},${top}`,
    `H${x + w - r}`,
    `Q${x + w},${top} ${x + w},${top + r}`,
    `V${base}`,
    'Z',
  ].join(' ');
}

/**
 * Weekly totals as columns. Push a column to see its value. By default, the
 * chart shows the value of the current week.
 */
export function WeeklyColumns({ values, starts, format, label }: Props) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState(values.length - 1);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const max = niceCeil(Math.max(...values, 0));
  const plotW = Math.max(0, width - GUTTER);
  const band = plotW / values.length;
  const colW = Math.min(MAX_COL, band * 0.6);
  const base = H - BOTTOM;
  const plotH = base - TOP;
  const y = (v: number) => base - (v / max) * plotH;

  return (
    <View onLayout={onLayout} accessible accessibilityLabel={label}>
      {width > 0 ? (
        <Svg width={width} height={H}>
          {/* The baseline and one gridline at the top value. */}
          <Line x1={GUTTER} x2={width} y1={base} y2={base} stroke={c.hairline} strokeWidth={1} />
          <Line x1={GUTTER} x2={width} y1={TOP} y2={TOP} stroke={c.hairline} strokeWidth={1} />
          <SvgText x={GUTTER - 6} y={TOP + 4} fontSize={11} fill={c.muted} textAnchor="end">
            {format(max)}
          </SvgText>
          <SvgText x={GUTTER - 6} y={base + 4} fontSize={11} fill={c.muted} textAnchor="end">
            0
          </SvgText>

          {values.map((v, i) => {
            const cx = GUTTER + band * i + band / 2;
            const h = base - y(v);
            const last = i === values.length - 1;
            return (
              <Path
                key={`c${i}`}
                d={column(cx - colW / 2, colW, base, h)}
                fill={last ? CURRENT : PAST}
              />
            );
          })}

          {starts.map((s, i) => (
            <SvgText
              key={`d${i}`}
              x={GUTTER + band * i + band / 2}
              y={H - 6}
              fontSize={10}
              fill={i === selected ? c.ink : c.muted}
              fontWeight={i === selected ? '700' : '400'}
              textAnchor="middle"
            >
              {shortDate(s)}
            </SvgText>
          ))}

          {values[selected] !== undefined ? (
            <SvgText
              // At the right end, align the label to the right side of the
              // column, so the text stays inside the chart.
              x={
                selected === values.length - 1
                  ? GUTTER + band * selected + band / 2 + colW / 2
                  : GUTTER + band * selected + band / 2
              }
              y={Math.max(14, y(values[selected]) - 8)}
              fontSize={13}
              fontWeight="700"
              fill={c.ink}
              textAnchor={selected === values.length - 1 ? 'end' : 'middle'}
            >
              {format(values[selected])}
            </SvgText>
          ) : null}

          {/* The touch areas are the full height of each week. */}
          {values.map((_, i) => (
            <Rect
              key={`t${i}`}
              x={GUTTER + band * i}
              y={0}
              width={band}
              height={H}
              fill="transparent"
              onPress={() => setSelected(i)}
            />
          ))}
        </Svg>
      ) : (
        <View style={{ height: H }} />
      )}
    </View>
  );
}
