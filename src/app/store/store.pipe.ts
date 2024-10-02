import { OnDestroy, Pipe, PipeTransform } from '@angular/core';
import { MemoizedSelector, MemoizedSelectorWithProps, Store } from '@ngrx/store';
import { Observable, of, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { AppState } from './store.state';

/**
 * @usage
 *   with props    -> [value]="inventoryId | store$: getterInventoryNameById | async"
 *   without props -> [value]="getterInventoryOptions | store$ | async"
 **/

@Pipe({ name: 'store$' })
export class StoreAsyncPipe implements PipeTransform, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  constructor(private readonly store: Store<AppState>) {}

  public transform<V, R>(
    valueOrSelector: V | MemoizedSelector<AppState, R>,
    selector?: MemoizedSelectorWithProps<AppState, V, R>
  ): Observable<R> {
    const isWithoutProps = typeof valueOrSelector === 'function';

    if (isWithoutProps) {
      return this.store.select(valueOrSelector as MemoizedSelector<AppState, R>);
    }

    if (!selector) {
      return of(valueOrSelector as any);
    }

    return this.store.select(selector, valueOrSelector as V).pipe(map((result) => (result ?? valueOrSelector) as R));
  }

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
