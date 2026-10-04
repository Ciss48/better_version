import { createCn } from 'cn/config';

/**
 * `cn` taught about this project's token scales.
 *
 * Without this, tailwind-merge only knows Tailwind's built-in t-shirt sizes, so
 * it reads a token size class like `text-micro` or `rounded-panel` as a *colour*
 * and silently drops it when a real colour class (`text-ink`) follows in the
 * same call. See src/styles/tokens.css for the scales.
 */
export const cn = createCn({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'display-xl',
            'display-lg',
            'display-md',
            'display-sm',
            'display-xs',
            'num-xl',
            'num-lg',
            'num-md',
            'num-sm',
            'body-lg',
            'body',
            'body-sm',
            'caption',
            'label',
            'micro',
          ],
        },
      ],
      rounded: [{ rounded: ['row', 'item', 'tile', 'card', 'panel', 'pill'] }],
    },
  },
});
