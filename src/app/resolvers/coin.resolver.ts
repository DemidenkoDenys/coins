import { inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { filter, map, of, switchMap } from 'rxjs';
import { CoinActions } from '../store/coin/coin.store';
import { parseTags } from '../utils/tags.utis';
import { Coin } from '../models/coin.model';

export const CoinResolver = (route: ActivatedRouteSnapshot) => {
  const auth: AngularFireAuth = inject(AngularFireAuth);
  const store = inject(Store);
  const router = inject(Router);
  const coinUid = (route.params as any).uid;
  const firestore = inject(AngularFirestore);

  store.dispatch(CoinActions.reset());

  if (!coinUid || coinUid === 'new') {
    return of(true);
  }

  return auth.user.pipe(
    filter((user) => !!user),
    switchMap((user) => {
      if (!user?.uid) {
        return of(false);
      }

      return firestore
        .collection(user.uid)
        .doc(coinUid)
        .valueChanges()
        .pipe(
          map((response) => {
            const coin = response as Coin;

            if (coin) {
              store.dispatch(
                CoinActions.update({
                  ...coin,
                  uid: coinUid,
                  tags: parseTags(coin.tags),
                  sets: parseTags(coin.sets),
                })
              );
            } else {
              router.navigate(['new']);
            }
            return !!coin;
          })
        );
    })
  );
};
