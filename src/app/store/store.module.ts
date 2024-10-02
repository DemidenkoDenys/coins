import { NgModule } from '@angular/core';
import { StoreModule } from '@ngrx/store';
import { StoreReducer } from './store.reducer';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { storeDevToolsConfig, storeConfig } from './store.config';
import { StoreAsyncPipe } from './store.pipe';

@NgModule({
  imports: [
    StoreModule.forRoot(StoreReducer, storeConfig),
    StoreDevtoolsModule.instrument(storeDevToolsConfig),
  ],
  exports: [StoreModule, StoreDevtoolsModule, StoreAsyncPipe],
  declarations: [StoreAsyncPipe],
})
export class AppStoreModule {}
