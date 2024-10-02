import { forEach } from 'lodash-es';

export const isDefined = <T = any>(value: T): boolean => {
  return value !== null && value !== undefined;
};

export const stringsToMap = (array: Array<string>): Record<string, string> => {
  const result = {} as Record<string, string>;
  forEach(array, (item) => (result[item] = item));
  return result;
};
