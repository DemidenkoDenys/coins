import {
  on,
  createAction,
  createReducer,
  createFeatureSelector,
} from '@ngrx/store';

import { Sets } from '../../models/sets.type';
import { Tags } from '../../models/tags.type';
import { omit } from 'lodash';

export const META = '[META]';

export class MetaState {
  sets: Sets = {};
  tags: Tags = {};
}

export class MetaActions {
  static init = createAction(
    META + ' Init',
    (data: { sets?: Sets; tags?: Tags }) => ({
      sets: data.sets ?? {},
      tags: data.tags ?? {},
    })
  );
  static addTag = createAction(META + ' Add Tag', (tag: string) => ({ tag }));
  static addSet = createAction(META + ' Add Set', (set: string) => ({ set }));
  static deleteTag = createAction(META + ' Delete Tag', (tag: string) => ({ tag }));
  static deleteSet = createAction(META + ' Delete Set', (set: string) => ({ set }));
  static reset = createAction(META + ' Reset');
}

export class MetaSelectors {
  static state = createFeatureSelector<MetaState>(META);
}

export const MetaReducer = createReducer(
  new MetaState(),
  on(MetaActions.init, (state, { sets, tags }) => ({ ...state, sets, tags })),
  on(MetaActions.addTag, (state, { tag }) => ({
    ...state,
    tags: { ...state.tags, [tag]: '' },
  })),
  on(MetaActions.deleteTag, (state, { tag }) => ({
    ...state,
    tags: omit(state.tags, tag),
  })),
  on(MetaActions.addSet, (state, { set }) => ({
    ...state,
    sets: { ...state.sets, [set]: '' },
  })),
  on(MetaActions.deleteSet, (state, { set }) => ({
    ...state,
    sets: omit(state.sets, set),
  })),
  on(MetaActions.reset, () => new MetaState())
);
