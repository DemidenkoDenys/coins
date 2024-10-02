import { NgIf, NgForOf, JsonPipe, AsyncPipe, KeyValuePipe, KeyValue } from '@angular/common';
import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of, map, Observable, combineLatest, BehaviorSubject } from 'rxjs';
import { Store, StoreModule } from '@ngrx/store';
import { forEach, isEmpty, toLower } from 'lodash-es';

import { Tags } from '../models/tags.type';
import { TagKeys } from '../enums/tag-keys.enum';
import { InPipe } from '../pipe/in.pipe';
import { MatchBy } from '../models/match-by.model';
import { AppState } from '../store/store.state';
import { ListItem } from '../models/list-item.model';
import { isDefined } from '../utils/value.utils';
import { countries } from '../static';
import { toTitleCase, wrapSubstring } from '../utils/string.utils';
import { TagsComponent } from './tags/tags.component';
import { ListSelectors } from '../store/list/list.store';
import { MetaSelectors } from '../store/meta/meta.store';
import { filterObjectByValue, keysBy } from '../utils/object.utils';

@Component({
  selector: 'coin-list',
  imports: [NgIf, InPipe, NgForOf, JsonPipe, AsyncPipe, FormsModule, KeyValuePipe, TagsComponent],
  providers: [StoreModule],
  standalone: true,
  templateUrl: 'coin-list.component.html',
})
export class CoinListComponent {
  public readonly wrap = wrapSubstring;
  public readonly toTitleCase = toTitleCase;
  public readonly formatCountry = (country: string) => countries[country] ?? country;
  public readonly placeholderImage = 'assets/placeholder.png';

  public search$ = new BehaviorSubject<string>('');
  public filtered$ = new BehaviorSubject<any>(null);
  public tagSelected$ = new BehaviorSubject<MatchBy>(new MatchBy());
  public coinsFiltered$: Observable<Record<string, ListItem>> = of({});

  public sets: Tags = {};
  public tags: Tags = {};
  public amount: number = 0;
  public countries: Tags = {};

  @ViewChild('imagesContainer', { static: true }) imagesContainer!: ElementRef<HTMLDivElement>;

  constructor(private readonly store: Store<AppState>, private readonly router: Router) {
    this.store.select(MetaSelectors.state).subscribe((meta) => {
      this.sets = filterObjectByValue(meta.sets, isDefined) as Tags;
      this.tags = filterObjectByValue(meta.tags, isDefined) as Tags;
    });

    this.coinsFiltered$ = combineLatest([this.store.select(ListSelectors.coins), this.search$, this.filtered$]).pipe(
      map(([coins, search]) => {
        let coinsFiltered = {} as Record<string, ListItem>;

        const tag = localStorage.getItem(TagKeys.tag);
        const set = localStorage.getItem(TagKeys.set);
        const country = localStorage.getItem(TagKeys.country);

        if (tag || set || country) {
          forEach(coins, (coin: ListItem, uid: string) => {
            this.updateTagsFilters(coin);

            if (tag && isDefined(coin.tags?.[tag])) {
              coinsFiltered[uid] = coin;
              coinsFiltered[uid].matchedBy.sets = {};
              coinsFiltered[uid].matchedBy.tags = { [tag]: '' };
              coinsFiltered[uid].matchedBy.country = {};
            }

            if (set && isDefined(coin.sets?.[set])) {
              coinsFiltered[uid] = coin;
              coinsFiltered[uid].matchedBy.tags = {};
              coinsFiltered[uid].matchedBy.sets = { [set]: '' };
              coinsFiltered[uid].matchedBy.country = {};
            }

            if (country && coin.country === country) {
              coinsFiltered[uid] = coin;
              coinsFiltered[uid].matchedBy.tags = {};
              coinsFiltered[uid].matchedBy.sets = {};
              coinsFiltered[uid].matchedBy.country = { [country]: '' };
            }
          });
        } else {
          coinsFiltered = { ...coins };

          forEach(coins, (coin: ListItem) => this.updateTagsFilters(coin));
        }

        coinsFiltered = filterObjectByValue<any>(coinsFiltered, (coin) => {
          return (this.isWanted ? true : !coin.isWanted) && (this.isDeleted ? true : !coin.isDeleted);
        });

        forEach(coinsFiltered, (coin: ListItem, uid: string) => {
          const text = toLower(search);

          const options = { key: search, lowerCase: true, checkIncludes: true };
          const matchedName = toLower(coin.name)?.includes(text);
          const matchedTags = keysBy(coin.tags, options);
          const matchedSets = keysBy(coin.sets, options);

          if (matchedName || !isEmpty(matchedSets) || !isEmpty(matchedTags)) {
            coinsFiltered[uid] = { ...coin, matchedBy: {} };
          } else if (matchedName) {
            coinsFiltered[uid].matchedBy.name = search;
          } else if (!isEmpty(matchedTags)) {
            coinsFiltered[uid].matchedBy.tags = matchedTags;
          } else if (!isEmpty(matchedSets)) {
            coinsFiltered[uid].matchedBy.sets = matchedSets;
          } else {
            delete coinsFiltered[uid];
          }
        });

        this.amount = Object.keys(coinsFiltered).length;
        return coinsFiltered;
      })
    );

    this.tagSelected$.next(new MatchBy());
  }

  private updateTagsFilters(coin: ListItem): void {
    if (!isEmpty(coin.tags)) {
      forEach(coin.tags, (_, tag) => (this.tags[tag] ? null : (this.tags[tag] = '')));
    }

    if (!isEmpty(coin.sets)) {
      forEach(coin.sets, (_, set) => (this.sets[set] ? null : (this.sets[set] = '')));
    }

    if (coin.country) {
      this.countries[coin.country] = '';
    }
  }

  public sortCoinsList = (a: KeyValue<string, ListItem>, b: KeyValue<string, ListItem>): number => {
    return a.value.denomination !== b.value.denomination
      ? a.value.denomination - b.value.denomination
      : a.value.name.localeCompare(b.value.name);
  };

  public toggleTag(property: keyof typeof TagKeys, value: string): void {
    const storageValue = localStorage.getItem(property);
    this.setFilterTag(property, storageValue === value ? '' : value);
    this.filtered$.next(true);
  }

  private setFilterTag(type: keyof typeof TagKeys, filter: string): void {
    localStorage.setItem(TagKeys.tag, '');
    localStorage.setItem(TagKeys.set, '');
    localStorage.setItem(TagKeys.country, '');
    localStorage.setItem(type, filter);
  }

  public openCoin(coinUID: string): void {
    this.router.navigate([coinUID]);
  }

  public onSearchChanged(event: any): void {
    this.search$.next(event.target.value);
  }

  public openNewCoin(): void {
    this.router.navigate(['new']);
  }

  imageExpanded!: HTMLImageElement;
  imageExpandTimeout!: ReturnType<typeof setTimeout>;

  onImageMousedown(index: number): void {
    this.imageExpandTimeout = setTimeout(() => {
      const image = this.imagesContainer.nativeElement.children[index].querySelector('figure') as HTMLImageElement;
      const rect = image.getBoundingClientRect();

      this.imageExpanded = image.cloneNode(true) as HTMLImageElement;
      this.imageExpanded.classList.add('clone');
      this.imageExpanded.style.top = `${rect.top}px`;
      this.imageExpanded.style.left = `${rect.left}px`;

      document.body.appendChild(this.imageExpanded);

      setTimeout(() => this.imageExpanded.classList.add('expand'), 100);
    }, 1000);
  }

  // @HostListener('document:touchend')
  @HostListener('document:mouseup')
  onMouseUp() {
    clearTimeout(this.imageExpandTimeout);
    if (this.imageExpanded) {
      this.imageExpanded.remove();
    }
  }

  @HostListener('touchend')
  onTouchEnd() {
    clearTimeout(this.imageExpandTimeout);
    if (this.imageExpanded) {
      this.imageExpanded.remove();
    }
  }

  public get selectedTag(): Tags {
    const tag = localStorage.getItem(TagKeys.tag);
    const set = localStorage.getItem(TagKeys.set);
    const country = localStorage.getItem(TagKeys.country);

    return tag ? { [tag]: '' } : set ? { [set]: '' } : country ? { [country]: '' } : {};
  }

  public set isWanted(event: any) {
    const isChecked = event.target.checked;
    localStorage.setItem('isWanted', isChecked ? 'true' : '');
    this.filtered$.next(true);
  }

  public get isWanted(): boolean {
    return localStorage.getItem('isWanted') === 'true';
  }

  public set isWaiting(event: any) {
    const isChecked = event.target.checked;
    localStorage.setItem('isWaiting', isChecked ? 'true' : '');
    this.filtered$.next(true);
  }

  public get isWaiting(): boolean {
    return localStorage.getItem('isWaiting') === 'true';
  }

  public set isReplace(event: any) {
    const isChecked = event.target.checked;
    localStorage.setItem('isReplace', isChecked ? 'true' : '');
    this.filtered$.next(true);
  }

  public get isReplace(): boolean {
    return localStorage.getItem('isReplace') === 'true';
  }

  public set isDeleted(event: any) {
    const isChecked = event.target.checked;
    localStorage.setItem('isDeleted', isChecked ? 'true' : '');
    this.filtered$.next(true);
  }

  public get isDeleted(): boolean {
    return localStorage.getItem('isDeleted') === 'true';
  }
}
