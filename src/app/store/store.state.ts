import { COIN, CoinState } from './coin/coin.store';
import { LIST, ListState } from './list/list.store';
import { META, MetaState } from './meta/meta.store';
import { USER, UserState } from './user/user.store';

export interface AppState {
  [COIN]: CoinState;
  [LIST]: ListState;
  [META]: MetaState;
  [USER]: UserState;
}
