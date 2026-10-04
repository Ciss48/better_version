// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS, settingsForHabit } from '@/domain';
import { PlanWindowTimeline } from '../PlanWindowTimeline';

/** The track runs 12:00 D-1 → 12:00 D, so 18:00 D-1 = 25% and 10:00 D = 91.67%. */
function segment(container: HTMLElement) {
  const element = container.querySelector('[data-slot="window"]') as HTMLElement;
  return {
    left: Number.parseFloat(element.style.left),
    width: Number.parseFloat(element.style.width),
  };
}

describe('PlanWindowTimeline', () => {
  it('places the evening default from 18:00 D-1 to 10:00 D', () => {
    const { container } = render(<PlanWindowTimeline settings={DEFAULT_SETTINGS} />);
    const { left, width } = segment(container);
    expect(left).toBeCloseTo(25, 1);
    expect(left + width).toBeCloseTo(91.67, 1);
  });

  it('keeps a morning window inside the track', () => {
    const { container } = render(
      <PlanWindowTimeline settings={settingsForHabit(DEFAULT_SETTINGS, 'morning')} />,
    );
    const { left, width } = segment(container);
    expect(left).toBeCloseTo(75, 1);
    expect(left + width).toBeCloseTo(91.67, 1);
  });

  it('puts the day-end marker at the chosen hour', () => {
    const { container } = render(
      <PlanWindowTimeline settings={{ ...DEFAULT_SETTINGS, dayEnd: '03:00' }} />,
    );
    const marker = container.querySelector('[data-slot="day-end"]') as HTMLElement;
    expect(Number.parseFloat(marker.style.left)).toBeCloseTo(62.5, 1);
  });
});
