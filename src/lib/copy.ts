import copy from '@/content/copy.vi.json';

type Copy = typeof copy;

/**
 * Every dot-path in `T` whose value is a string. Arrays and objects are walked
 * but only string leaves produce a key, so `t()` can never return a non-string.
 */
type StringPaths<T> = T extends string
  ? ''
  : T extends readonly unknown[]
    ? never
    : {
        [K in keyof T & string]: StringPaths<T[K]> extends infer P extends string
          ? P extends ''
            ? K
            : `${K}.${P}`
          : never;
      }[keyof T & string];

/** Union of every dot-path in copy.vi.json whose value is a string. */
export type CopyKey = StringPaths<Copy>;

const isDev = process.env.NODE_ENV !== 'production';

function lookup(key: string): unknown {
  let node: unknown = copy;
  for (const segment of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[segment];
  }
  return node;
}

/**
 * Returns the string at `key`, replacing every `{placeholder}` with
 * `vars[placeholder]`. A placeholder with no matching var is left untouched
 * (and warned about in development).
 *
 * Unknown keys throw outside production; in production the key is returned so a
 * typo can never blank the screen.
 */
export function t(key: CopyKey, vars?: Record<string, string | number>): string {
  const value = lookup(key);

  if (typeof value !== 'string') {
    if (isDev) {
      throw new Error(`[copy] Missing or non-string copy key: "${key}"`);
    }
    return key;
  }

  if (!vars) return value;

  return value.replace(/\{(\w+)\}/g, (match, name: string) => {
    if (!(name in vars)) {
      if (isDev) {
        console.warn(`[copy] No value for placeholder "{${name}}" in key "${key}"`);
      }
      return match;
    }
    return String(vars[name]);
  });
}

/**
 * Returns the raw value at a dot-path — use it for arrays and objects such as
 * `date.weekdayShort` or `today.welcome.steps`.
 */
export function tRaw<T = unknown>(key: string): T {
  const value = lookup(key);

  if (value === undefined && isDev) {
    throw new Error(`[copy] Missing copy key: "${key}"`);
  }

  return value as T;
}
