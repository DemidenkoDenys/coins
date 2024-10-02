import { on, createAction, createReducer, createFeatureSelector } from '@ngrx/store';

import { Coin } from '../../models/coin.model';
import { Tags } from '../../models/tags.type';
import { Sets } from '../../models/sets.type';
import { Grades } from '../../enums/grade.enum';
import { Country } from '../../enums/country.enum';

export const COIN = '[COIN]';

export class CoinState implements Coin {
  uid!: string;
  tags: Tags = {};
  sets: Sets = {};
  name!: string;
  year!: number;
  note!: string;
  grade = Grades.UNC;
  images: Array<string> = [];
  country!: Country;
  mintage!: number;
  denomination!: number;
}

export class CoinActions {
  static update = createAction(COIN + ' Update', (coin: Partial<Coin>) => ({ coin }));
  static reset = createAction(COIN + ' Reset');
}

export class CoinSelectors {
  static state = createFeatureSelector<CoinState>(COIN);
}

export const CoinReducer = createReducer(
  new CoinState(),
  on(CoinActions.update, (state, { coin }) => ({ ...state, ...coin })),
  on(CoinActions.reset, () => new CoinState())
);
