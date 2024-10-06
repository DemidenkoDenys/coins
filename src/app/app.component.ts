import firebase from 'firebase/compat/app';

import { Component } from '@angular/core';
import { Store } from '@ngrx/store';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Observable, forkJoin, of, tap } from 'rxjs';

import { AppState } from './store/store.state';
import { ListItem } from './models/list-item.model';
import { parseTags } from './utils/tags.utis';
import { UserActions } from './store/user/user.store';
import { MetaActions, MetaState } from './store/meta/meta.store';
import { ListActions } from './store/list/list.store';
import { DataService } from './services/data.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
})
export class AppComponent {
  user: firebase.User | null = null;
  backupData: any = {};

  constructor(
    public readonly auth: AngularFireAuth,
    private readonly data: DataService,
    private readonly store: Store<AppState>
  ) {
    this.auth.authState
      .pipe(
        tap((user) => {
          if (user) {
            this.data.coins$(user.uid).subscribe((collections: any) => {
              let meta!: MetaState;
              const coins: Record<string, ListItem> = {};
              const images$: Record<string, Observable<string>> = {};

              collections.forEach((collection: any) => {
                if (collection.id === 'metadata') {
                  meta = collection.data();
                  this.backupData.metadata = collection.data();
                }

                if (collection.id.length > 15) {
                  const coin = collection.data();
                  this.backupData[collection.id] = coin;
                  coins[collection.id] = {
                    ...coin,
                    tags: parseTags(coin.tags),
                    sets: parseTags(coin.sets),
                    matchedBy: {},
                  };
                  const image = coin.images && coin.images[0];

                  images$[collection.id] = image
                    ? this.data.getImageUrl(image)
                    : of('');
                }
              });

              if (!meta) {
                this.data.updateMetadata(user.uid, new MetaState());
              }

              forkJoin(images$).subscribe((images) => {
                this.store.dispatch(ListActions.setPrimaryImages(images));
              });

              if (meta) {
                this.store.dispatch(MetaActions.init(meta));
              }

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

  backup(): void {
    const jsonStr = JSON.stringify(this.backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.json';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  login() {
    this.auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
  }

  logout() {
    this.auth.signOut();
  }
}
