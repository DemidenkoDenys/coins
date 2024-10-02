import { isObject, zipObject } from 'lodash-es';
import { Tags } from '../models/tags.type';

export const parseTags = (tags: Array<string> | Tags): Tags => {
  return tags
    ? Array.isArray(tags)
      ? zipObject(tags, Array(tags.length).fill(''))
      : isObject(tags)
      ? tags
      : {}
    : {};
};
