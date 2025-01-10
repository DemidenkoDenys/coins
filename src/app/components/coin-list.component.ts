import { NgIf, NgForOf, AsyncPipe, KeyValue } from '@angular/common';
import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of, map, Observable, combineLatest, BehaviorSubject, fromEvent, throttleTime } from 'rxjs';
import { Store, StoreModule } from '@ngrx/store';
import { find, forEach, isEmpty, keys, toLower } from 'lodash-es';
import { TooltipDirective } from '@babybeet/angular-tooltip';

import { Tags } from '../models/tags.type';
import { Flag } from '../enums/flags.enum';
import { Country } from '../enums/country.enum';
import { TagKeys } from '../enums/tag-keys.enum';
import { MatchBy } from '../models/match-by.model';
import { AppState } from '../store/store.state';
import { ListItem } from '../models/list-item.model';
import { isDefined } from '../utils/value.utils';
import { countries } from '../static';
import { Checkboxes } from '../enums/checkbox.enum';
import { toTitleCase, wrapSubstring } from '../utils/string.utils';
import { TagsComponent } from './tags/tags.component';
import { ListSelectors } from '../store/list/list.store';
import { MetaSelectors } from '../store/meta/meta.store';
import { filterObjectByValue, keysBy } from '../utils/object.utils';
import { cloneImageAndExpand } from '../utils/html.utils';
import { LoadImageDirective } from '../directives/load-img.directive';

@Component({
  selector: 'coin-list',
  imports: [NgIf, NgForOf, AsyncPipe, FormsModule, TagsComponent, TooltipDirective, LoadImageDirective],
  providers: [StoreModule],
  standalone: true,
  templateUrl: 'coin-list.component.html',
})
export class CoinListComponent {
  public readonly Flag = Flag;
  public readonly wrap = wrapSubstring;
  public readonly Checkboxes = Checkboxes;
  public readonly toTitleCase = toTitleCase;
  public readonly formatCountry = (country: string) => countries[country] ?? country;
  public readonly placeholderImage = 'assets/placeholder.png';

  public search$ = new BehaviorSubject<string>('');
  public filtered$ = new BehaviorSubject<any>(null);
  public tagSelected$ = new BehaviorSubject<MatchBy>(new MatchBy());
  public coinsFiltered$: Observable<Array<ListItem>> = of([]);

  public sets: Tags = {};
  public tags: Tags = {};
  public amount: number = 0;
  public countries: Tags = {};
  public windowInnerHeight!: number;

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
              coinsFiltered[uid].matchedBy.sets = { [set]: set };
              coinsFiltered[uid].matchedBy.country = {};
            }

            if (country && coin.country === country) {
              coinsFiltered[uid] = coin;
              coinsFiltered[uid].matchedBy.tags = {};
              coinsFiltered[uid].matchedBy.sets = {};
              coinsFiltered[uid].matchedBy.country = { [country]: country };
            }
          });
        } else {
          coinsFiltered = { ...coins };
        }

        forEach(coins, (coin: ListItem, uid: string) => {
          this.updateTagsFilters(coin);
          const coinFiltered = coinsFiltered[uid];

          if (this.isFlag(Flag.isEuroSetNeed)) {
            if (coinFiltered) {
              const coinSets = keys(coinFiltered.sets).join('_');
              const isEuroSetCoin = coinSets.includes('euro') && coinSets.includes('_cs');

              if (!(isEuroSetCoin && coin.isWanted)) {
                delete coinsFiltered[uid];
              }
            }
          } else if (this.isFlag(Flag.isEuroCCNeed)) {
            if (coinFiltered) {
              const coinSets = keys(coinFiltered.sets).join('_');
              const isEuroCommemorativeCoin = coinSets.includes('euro') && !coinSets.includes('_cs');

              if (
                !(isEuroCommemorativeCoin && coin.isWanted) ||
                coinFiltered.country === Country.AND ||
                coinFiltered.country === Country.MCO ||
                coinFiltered.country === Country.SMR ||
                coinFiltered.country === Country.VAT // temp
              ) {
                delete coinsFiltered[uid];
              }
            }
          } else {
            if (
              (this.onlyMarker === Checkboxes.wanted && coinFiltered && !coinFiltered.isWanted) ||
              (this.onlyMarker === Checkboxes.replace && coinFiltered && !coinFiltered.isReplace) ||
              (this.onlyMarker === Checkboxes.deleted && coinFiltered && !coinFiltered.isDeleted) ||
              (this.onlyMarker === Checkboxes.delivery && coinFiltered && !coinFiltered.isWaiting)
            ) {
              delete coinsFiltered[uid];
            }
          }
        });

        coinsFiltered = filterObjectByValue<any>(coinsFiltered, (coin) => {
          return this.isFlag(Flag.isEuroSetNeed) || this.isFlag(Flag.isEuroCCNeed)
            ? !coin.isDeleted
            : (this.isWanted ? true : !coin.isWanted) && (this.isDeleted ? true : !coin.isDeleted);
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

        forEach(coinsFiltered, (coin: ListItem, uid: string) => {
          const missingData = [];

          if (!coin.year && !coin.isWanted) {
            missingData.push('No year');
          }
          if (!coin.country) {
            missingData.push('No country');
          }
          if (missingData.length) {
            coinsFiltered[uid] = { ...coin, missingData: missingData.join('\n') };
          }
        });

        this.amount = Object.keys(coinsFiltered).length;

        const sortedItems = Object.values(coinsFiltered).sort((a, b): number => {
          const aSet = find(keys(a.sets), (st) => st.includes('cs')) ?? '';
          const bSet = find(keys(b.sets), (st) => st.includes('cs')) ?? '';

          return aSet && bSet
            ? aSet !== bSet
              ? aSet.localeCompare(bSet)
              : a.denomination !== b.denomination
              ? a.denomination - b.denomination
              : a.name.localeCompare(b.name)
            : aSet && !bSet
            ? -1
            : !aSet && !bSet && a.year && b.year
            ? a.year - b.year
            : 1;
        });

        setTimeout(() => (this.windowInnerHeight = Math.random()), 500);

        return sortedItems.map((item, index) => {
          const set = Object.keys(item.sets).find((set) => set.includes('_cs'));
          const nextSets = sortedItems[index + 1]?.sets;
          const isNextSameSet = set && index && nextSets && !(set in nextSets);
          return isNextSameSet ? { ...item, wrap: true } : item;
        });
      })
    );

    this.tagSelected$.next(new MatchBy());
  }

  ngOnInit() {
    fromEvent(window, 'scroll')
      .pipe(throttleTime(500))
      .subscribe((event) => (this.windowInnerHeight = event.timeStamp));
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

  // public sortCoinsList = (a: KeyValue<string, ListItem>, b: KeyValue<string, ListItem>): number => {
  //   const aSet = find(keys(a.value.sets), (st) => st.includes('cs')) ?? '';
  //   const bSet = find(keys(b.value.sets), (st) => st.includes('cs')) ?? '';

  //   return aSet && bSet
  //     ? aSet !== bSet
  //       ? aSet.localeCompare(bSet)
  //       : a.value.denomination !== b.value.denomination
  //       ? a.value.denomination - b.value.denomination
  //       : a.value.name.localeCompare(b.value.name)
  //     : aSet && !bSet
  //     ? -1
  //     : !aSet && !bSet && a.value.year && b.value.year
  //     ? a.value.year - b.value.year
  //     : 1;
  // };

  public toggleTag(property: keyof typeof TagKeys, value: string): void {
    const storageValue = localStorage.getItem(property);
    this.setFilterTag(property, storageValue === value ? '' : value);
    this.filtered$.next(true);
  }

  private setFilterTag(type: keyof typeof TagKeys, filter: string): void {
    this.resetFilters();
    localStorage.setItem(type, filter);
  }

  private resetFilters(): void {
    localStorage.setItem(TagKeys.tag, '');
    localStorage.setItem(TagKeys.set, '');
    localStorage.setItem(TagKeys.country, '');
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

  imageExpanded!: HTMLImageElement | null;
  imageExpandTimeout!: ReturnType<typeof setTimeout> | null;

  onImageMousedown(event: any, index: number): void {
    this.imageExpandTimeout = setTimeout(() => {
      event.preventDefault();
      const image = this.imagesContainer.nativeElement.children[index].querySelector('figure') as HTMLImageElement;
      this.imageExpanded = cloneImageAndExpand(image);
      document.body.appendChild(this.imageExpanded);
    }, 1000);
  }

  @HostListener('document:touchend', ['$event'])
  @HostListener('document:mouseup', ['$event'])
  onMouseUp(event: any) {
    if (this.imageExpandTimeout) {
      event.preventDefault();
      clearTimeout(this.imageExpandTimeout);
      this.imageExpandTimeout = null;
    }
    if (this.imageExpanded) {
      event.preventDefault();
      this.imageExpanded.remove();
      this.imageExpanded = null;
    }
  }

  @HostListener('document:contextmenu', ['$event'])
  onContextMenu(event: any) {
    event.preventDefault();
  }

  public selectOnly(marker: Checkboxes): void {
    if (this.isFlag(Flag.isEuroSetNeed)) return;

    const value = localStorage.getItem('selectOnly') === marker ? '' : marker;
    localStorage.setItem('selectOnly', value);
    this.filtered$.next(true);
  }

  public trackByKey(index: number, item: { key: string; value: any }): string {
    return item.key;
  }

  public get onlyMarker(): string | null {
    return localStorage.getItem('selectOnly');
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
    isChecked ? null : localStorage.setItem('selectOnly', '');
    this.filtered$.next(true);
  }

  public get isWanted(): boolean {
    return localStorage.getItem('isWanted') === 'true';
  }

  public set isWaiting(event: any) {
    const isChecked = event.target.checked;
    localStorage.setItem('isWaiting', isChecked ? 'true' : '');
    isChecked ? null : localStorage.setItem('selectOnly', '');
    this.filtered$.next(true);
  }

  public get isWaiting(): boolean {
    return localStorage.getItem('isWaiting') === 'true';
  }

  public set isReplace(event: any) {
    const isChecked = event.target.checked;
    localStorage.setItem('isReplace', isChecked ? 'true' : '');
    isChecked ? null : localStorage.setItem('selectOnly', '');
    this.filtered$.next(true);
  }

  public get isReplace(): boolean {
    return localStorage.getItem('isReplace') === 'true';
  }

  public set isDeleted(event: any) {
    const isChecked = event.target.checked;
    localStorage.setItem('isDeleted', isChecked ? 'true' : '');
    isChecked ? null : localStorage.setItem('selectOnly', '');
    this.filtered$.next(true);
  }

  public get isDeleted(): boolean {
    return localStorage.getItem('isDeleted') === 'true';
  }

  public set isTags(event: any) {
    const isChecked = event.target.checked;
    localStorage.setItem('isTags', isChecked ? 'true' : '');
    isChecked ? null : localStorage.setItem('selectOnly', '');
    this.filtered$.next(true);
  }

  public get isTags(): boolean {
    return localStorage.getItem('isTags') === 'true';
  }

  public get isFilteredByCountry(): boolean {
    return !!localStorage.getItem(TagKeys.country);
  }

  public setFlag(flag: Flag, checked: boolean) {
    localStorage.setItem(flag, checked ? 'true' : '');
    checked ? null : localStorage.setItem('selectOnly', '');

    if (checked && (flag === Flag.isEuroSetNeed || flag === Flag.isEuroCCNeed)) {
      this.resetFilters();
    }

    this.filtered$.next(true);
  }

  public isFlag(flag: Flag): boolean {
    return localStorage.getItem(flag) === 'true';
  }
}
