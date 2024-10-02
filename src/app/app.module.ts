import { Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AngularFireModule } from '@angular/fire/compat';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';

import { environment } from '../environments/environment.dev';
import { DataService } from './services/data.service';
import { AppComponent } from './app.component';
import { RouterModule } from '@angular/router';
import { CoinResolver } from './resolvers/coin.resolver';
import { AppStoreModule } from './store/store.module';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'list' },
  {
    path: 'list',
    pathMatch: 'full',
    loadComponent: () =>
      import('./components/coin-list.component').then(
        (m) => m.CoinListComponent
      ),
  },
  {
    path: ':uid',
    resolve: { resolve: CoinResolver },
    pathMatch: 'full',
    loadComponent: () =>
      import('./components/coin.component').then((m) => m.CoinComponent),
  },
];

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    AppStoreModule,
    RouterModule.forRoot(routes, { onSameUrlNavigation: 'reload' }),
    AngularFireModule.initializeApp(environment.firebase),
    AngularFireAuthModule,
    AngularFirestoreModule,
    BrowserAnimationsModule,
  ],
  providers: [DataService],
  bootstrap: [AppComponent],
})
export class AppModule {}
