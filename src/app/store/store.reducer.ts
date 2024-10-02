import { ActionReducerMap } from '@ngrx/store';

import { AppState } from './store.state';
import { COIN, CoinReducer } from './coin/coin.store';
import { LIST, ListReducer } from './list/list.store';
import { META, MetaReducer } from './meta/meta.store';
import { USER, UserReducer } from './user/user.store';

export const StoreReducer: ActionReducerMap<AppState> = {
  [COIN]: CoinReducer,
  [LIST]: ListReducer,
  [META]: MetaReducer,
  [USER]: UserReducer,
};
