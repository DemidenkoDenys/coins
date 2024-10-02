import firebase from 'firebase/compat/app';

import { Component } from '@angular/core';
import { Store } from '@ngrx/store';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, forkJoin, from, of, tap } from 'rxjs';

import { AppState } from './store/store.state';
import { ListItem } from './models/list-item.model';
import { parseTags } from './utils/tags.utis';
import { UserActions } from './store/user/user.store';
import { MetaActions, MetaState } from './store/meta/meta.store';
import { ListActions } from './store/list/list.store';
import { getDownloadURL, getStorage, ref } from 'firebase/storage';
import { isDefined } from './utils/value.utils';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
})
export class AppComponent {
  user: firebase.User | null = null;

  constructor(
    public readonly auth: AngularFireAuth,
    private readonly store: Store<AppState>,
    private readonly firestore: AngularFirestore
  ) {
    this.auth.authState
      .pipe(
        tap((user) => {
          if (user) {
            this.firestore
              .collection(user.uid)
              .get()
              .subscribe((collections: any) => {
                let meta: MetaState | null = null;
                const coins: Record<string, ListItem> = {};
                const images$: Record<string, Observable<string>> = {};

                collections.forEach((collection: any) => {
                  if (collection.id === 'metadata') {
                    meta = collection.data();
                  }

                  if (collection.id.length > 15) {
                    const coin = collection.data();
                    coins[collection.id] = {
                      ...coin,
                      tags: parseTags(coin.tags),
                      sets: parseTags(coin.sets),
                      matchedBy: {},
                    };
                    const image = coin.images && coin.images[0];

                    images$[collection.id] = image
                      ? this.getImageUrl(image)
                      : of('');
                  }
                });

                if (!meta) {
                  meta = new MetaState();
                  this.firestore
                    .collection(user.uid)
                    .doc('metadata')
                    .set({ ...meta });
                }

                forkJoin(images$).subscribe((images) => {
                  this.store.dispatch(ListActions.setPrimaryImages(images));
                });

                this.store.dispatch(MetaActions.init(meta));
                this.store.dispatch(ListActions.init(coins));
              });
          } else {
            this.store.dispatch(MetaActions.reset());
          }
        })
      )
      .subscribe((user) =>
        user
          ? this.store.dispatch(UserActions.update(user))
          : this.store.dispatch(UserActions.reset())
      );
  }

  private getImageUrl(name: string): Observable<string> {
    return from(getDownloadURL(ref(ref(getStorage(), 'coins'), name)));
  }

  login() {
    this.auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
  }

  logout() {
    this.auth.signOut();
  }
}
