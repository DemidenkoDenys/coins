import {
  on,
  createAction,
  createReducer,
  createSelector,
  createFeatureSelector,
} from '@ngrx/store';

import { Coin } from '../../models/coin.model';
import { mapValues } from 'lodash';
import { ListItem } from '../../models/list-item.model';

export const LIST = '[LIST]';

export class ListState {
  coins: Record<string, ListItem> = {};
  total: number | null = null;
}

export class ListActions {
  static init = createAction(
    LIST + ' Init',
    (coins: Record<string, ListItem>) => ({
      coins,
    })
  );
  static setPrimaryImages = createAction(
    LIST + ' Set PrimaryImages',
    (images: Record<string, string>) => ({ images })
  );
  static reset = createAction(LIST + ' Reset');
}

export class ListSelectors {
  static state = createFeatureSelector<ListState>(LIST);
  static coins = createSelector(
    ListSelectors.state,
    (state): Record<string, ListItem> => state.coins
  );
}

export const ListReducer = createReducer(
  new ListState(),
  on(ListActions.init, (state, { coins }) => ({
    ...state,
    coins,
    total: Object.keys(coins).length,
  })),
  on(ListActions.setPrimaryImages, (state, { images }) => ({
    ...state,
    coins: mapValues(state.coins, (coin, id) => ({
      ...coin,
      primaryImage: images[id],
    })),
  })),
  on(ListActions.reset, () => new ListState())
);
