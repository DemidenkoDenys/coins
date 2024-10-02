import {
  on,
  createAction,
  createReducer,
  createSelector,
  createFeatureSelector,
} from '@ngrx/store';

import firebase from 'firebase/compat/app';

export const USER = '[USER]';

export class UserState {
  uid = '';
  name: string | null = '';
}

export class UserActions {
  static update = createAction(USER + ' Update', (user: firebase.User) => ({
    user,
  }));
  static reset = createAction(USER + ' Reset');
}

export class UserSelectors {
  static state = createFeatureSelector<UserState>(USER);
  static uid = createSelector(UserSelectors.state, (state) => state.uid);
}

export const UserReducer = createReducer(
  new UserState(),
  on(UserActions.update, (state, { user }) => ({
    ...state,
    name: user.displayName,
    uid: user.uid,
  }))
);
