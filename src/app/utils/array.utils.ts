import { KeyValue } from '@angular/common';

export const sortByValue = (a: KeyValue<string, string>, b: KeyValue<string, string>): number => {
  return a.value.localeCompare(b.value);
};
