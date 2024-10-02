import { forEach } from 'lodash-es';

export const toTitleCase = (string: string): string => {
  return string
    .replace(/_/g, ' ')
    .split(' ')
    .map((key) => key.charAt(0).toUpperCase() + key.slice(1))
    .join(' ');
};

export const toSnakeCase = (string: string): string => {
  return string
    .replace(/ /g, '_')
    .split('_')
    .map((string) => string.toLowerCase())
    .join('_');
};

export const keysToTitleCase = <T = any>(object: Record<string, T>) => {
  const result: Record<string, T> = {};
  forEach(object, (value, key) => (result[toTitleCase(key)] = value));
  return result;
};

export const keysToSnakeCase = <T = any>(object: Record<string, T>) => {
  const result: Record<string, T> = {};
  forEach(object, (value, key) => (result[toSnakeCase(key)] = value));
  return result;
};

export const wrapSubstring = (
  string: string,
  substring: string,
  classes = 'highlight'
): string => {
  return substring
    ? string?.replace(
        new RegExp(`(${substring})`, 'gi'),
        `<span class='${classes}'>$1</span>`
      ) || ''
    : string;
};
