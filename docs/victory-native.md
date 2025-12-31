# Victory Native Charts

> Quick reference for using Victory Native in UltimateStats

## Installation

```bash
npm install victory-native @shopify/react-native-skia
```

## Key Resources

- **Docs**: https://nearform.com/open-source/victory-native/
- **Examples**: https://github.com/FormidableLabs/victory-native-xl/tree/main/example

## Common Issues

### Chart Not Rendering

**Problem**: PolarChart renders blank/nothing visible.

**Solution**: Parent container MUST have explicit `height` and `width`:

```tsx
// ❌ Won't work - flex doesn't give PolarChart dimensions
<View style={{ flex: 1 }}>
  <PolarChart ... />
</View>

// ✅ Works - explicit dimensions
<View style={{ height: 100, width: 100 }}>
  <PolarChart ... />
</View>
```

### Pie Chart Children Pattern

Use `Pie.Slice` inside `Pie.Chart` children function:

```tsx
<Pie.Chart innerRadius="70%">{() => <Pie.Slice />}</Pie.Chart>
```

## Pie/Donut Chart Example

```tsx
import { Pie, PolarChart } from 'victory-native';

const data = [
  { value: 75, color: '#3B82F6', label: 'filled' },
  { value: 25, color: 'rgba(255,255,255,0.15)', label: 'empty' },
];

<View style={{ height: 90, width: 90 }}>
  <PolarChart data={data} labelKey="label" valueKey="value" colorKey="color">
    <Pie.Chart
      innerRadius="70%" // Makes it a donut
      startAngle={-90} // Start from top (12 o'clock)
    >
      {() => <Pie.Slice />}
    </Pie.Chart>
  </PolarChart>
</View>;
```

## Props Reference

### Pie.Chart

| Prop                 | Type               | Description                          |
| -------------------- | ------------------ | ------------------------------------ |
| `innerRadius`        | `string \| number` | Inner radius for donut (`"70%"`)     |
| `startAngle`         | `number`           | Start angle in degrees (`-90` = top) |
| `circleSweepDegrees` | `number`           | Arc sweep (`180` = semicircle)       |

### PolarChart

| Prop       | Type                                          | Required |
| ---------- | --------------------------------------------- | -------- |
| `data`     | `Array<{[labelKey], [valueKey], [colorKey]}>` | ✓        |
| `labelKey` | `string`                                      | ✓        |
| `valueKey` | `string`                                      | ✓        |
| `colorKey` | `string`                                      | ✓        |

## Current Usage

- `components/view-stats/StatRing.tsx` - Donut gauge for team stats percentages
