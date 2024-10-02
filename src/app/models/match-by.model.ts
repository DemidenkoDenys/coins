export class MatchBy {
  tag: string = '';
  set: string = '';
  country: string = '';

  constructor(values?: Partial<MatchBy>) {
    Object.assign(this, values ?? {});
  }
}
