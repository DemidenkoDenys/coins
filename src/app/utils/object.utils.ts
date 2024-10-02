import { forEach, isFunction, toLower, values } from 'lodash-es';

export const isObject = (value: unknown): boolean => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

export const isObjectFilled = (object: Record<string, any>): boolean => {
  return values(object).some((value) => value);
};

export const filterObjectByValue = <T>(
  object: T,
  memberAccessor: (obj: T[keyof T]) => boolean
): Partial<T> => {
  const filteredObject: Partial<T> = {};

  if (!isObject(object)) {
    return filteredObject;
  }

  for (const key in object) {
    const value = object[key];
    if (memberAccessor(value)) {
      filteredObject[key] = value;
    }
  }

  return filteredObject;
};

export const keysBy = (
  object: any,
  options: {
    key?: string;
    keys?: Array<string>;
    lowerCase?: boolean;
    checkIncludes?: boolean;
  }
) => {
  const { key: optKey, keys, lowerCase, checkIncludes } = options ?? {};
  const returnObject = {} as any;

  if (!object || (!optKey && !keys?.length)) {
    return {};
  }

  forEach(object, (value, key) => {
    if (checkIncludes) {
      if (
        optKey
          ? lowerCase
            ? toLower(key).includes(toLower(optKey))
            : key.includes(optKey)
          : false
      ) {
        returnObject[key] = value;
      }

      if (
        keys?.length
          ? lowerCase
            ? keys.some((k) => toLower(key).includes(toLower(k)))
            : keys.some((k) => key.includes(k))
          : false
      ) {
        returnObject[key] = value;
      }
    } else {
      if (
        optKey
          ? lowerCase
            ? toLower(optKey) === toLower(key)
            : optKey === key
          : false
      ) {
        returnObject[key] = value;
      }

      if (
        keys?.length
          ? lowerCase
            ? keys.map(toLower).includes(toLower(key))
            : keys.includes(key)
          : false
      ) {
        returnObject[key] = value;
      }
    }
  });

  return returnObject;
};

export const someObjectValue = <T>(object: T, value: any) => {
  for (const property in object) {
    if (
      isFunction(value) ? value(object[property]) : object[property] === value
    ) {
      return true;
    }
  }
  return false;
};

export const someObjectKey = <T>(object: T, value: any) => {
  for (const property in object) {
    if (isFunction(value) ? value(property) : property === value) {
      return true;
    }
  }
  return false;
};
