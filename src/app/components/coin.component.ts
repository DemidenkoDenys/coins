import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import {
  AsyncPipe,
  KeyValue,
  KeyValuePipe,
  NgForOf,
  NgIf,
} from '@angular/common';
import { SafeUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';
import {
  FormGroup,
  FormControl,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';

import { isNil, last, omit } from 'lodash-es';
import { Store, StoreModule } from '@ngrx/store';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { Observable, first, forkJoin, from, of, switchMap } from 'rxjs';

import {
  AngularFirestore,
  DocumentReference,
  AngularFirestoreCollection,
} from '@angular/fire/compat/firestore';

import {
  ImageTransform,
  ImageCroppedEvent,
  ImageCropperComponent,
} from 'ngx-image-cropper';

import {
  CoinState,
  CoinActions,
  CoinSelectors,
} from '../store/coin/coin.store';

import { Grades } from '../enums/grade.enum';
import { AppState } from '../store/store.state';
import { isDefined } from '../utils/value.utils';
import { UserSelectors } from '../store/user/user.store';
import { TagsComponent } from './tags/tags.component';
import { MetaActions, MetaSelectors } from '../store/meta/meta.store';
import { Coin, CoinForm } from '../models/coin.model';
import { countries, grades } from '../static';
import { toTitleCase } from '../utils/string.utils';
import { Sets } from '../models/sets.type';
import { Tags } from '../models/tags.type';
import { InPipe } from '../pipe/in.pipe';
import { NinPipe } from '../pipe/not-in.pipe';
import { filterObjectByValue } from '../utils/object.utils';

@Component({
  selector: 'coin',
  imports: [
    NgIf,
    InPipe,
    NinPipe,
    NgForOf,
    AsyncPipe,
    FormsModule,
    KeyValuePipe,
    TagsComponent,
    ReactiveFormsModule,
    ImageCropperComponent,
  ],
  providers: [StoreModule],
  standalone: true,
  templateUrl: 'coin.component.html',
})
export class CoinComponent {
  public readonly isNil = isNil;
  public readonly grades = grades;
  public readonly countries = countries;
  public readonly toTitleCase = toTitleCase;
  public readonly MetaSelectors = MetaSelectors;

  coinUID!: string;
  userUID!: string;

  globalSets: Sets = {};
  globalTags: Tags = {};

  image: { blob: Blob; url: SafeUrl } | null = null;
  images: Array<{ blob: Blob; url: SafeUrl }> = [];
  imageUrls: Array<string> = [];
  imagePrimaryIndex: number | null = null;
  imageSecondaryIndex: number | null = null;
  transform: ImageTransform = {};
  collection$!: AngularFirestoreCollection;
  imageChangedEvent!: Event | null;
  shouldJoinSet = (set?: string): boolean =>
    set ? !(set in this.globalSets) : false;
  shouldJoinTag = (tag?: string): boolean =>
    tag ? !(tag in this.globalTags) : false;

  form = new FormGroup<CoinForm>({
    sets: new FormControl(),
    tags: new FormControl(),
    name: new FormControl(),
    year: new FormControl(2024),
    note: new FormControl(),
    grade: new FormControl(Grades.UNC),
    image: new FormControl(),
    country: new FormControl(),
    mintage: new FormControl(),
    isWanted: new FormControl(),
    isReplace: new FormControl(),
    isWaiting: new FormControl(),
    denomination: new FormControl(),
  });

  @ViewChild('file') file!: ElementRef;
  @ViewChild('imageCropper') cropper!: ImageCropperComponent;

  constructor(
    private readonly store: Store<AppState>,
    private readonly router: Router,
    private readonly firestore: AngularFirestore
  ) {
    this.store.select(UserSelectors.uid).subscribe((uid) => {
      if (uid) {
        this.userUID = uid;
        this.collection$ = this.firestore.collection(uid);
      }
    });

    this.store.select(MetaSelectors.state).subscribe((meta) => {
      this.globalSets = filterObjectByValue(meta.sets, isDefined) as Sets;
      this.globalTags = filterObjectByValue(meta.tags, isDefined) as Tags;
    });

    this.form.valueChanges.subscribe((formValue) => {
      this.store.dispatch(
        CoinActions.update({
          sets: formValue.sets,
          tags: formValue.tags,
          name: formValue.name,
          year: formValue.year ?? null ?? undefined,
          note: formValue.note,
          grade: formValue.grade ?? null ?? undefined,
          images: this.imageUrls,
          country: formValue.country,
          mintage: formValue.mintage,
          isWanted: formValue.isWanted,
          isReplace: formValue.isReplace,
          isWaiting: formValue.isWaiting,
          denomination: formValue.denomination,
        })
      );
    });

    this.form.controls.image.valueChanges.subscribe((image) => {
      if (!image) {
        this.imageChangedEvent = null;
      }
    });

    this.form.controls.isWanted.valueChanges.subscribe((isWanted) => {
      if (isWanted) {
        this.form.controls.isReplace.reset();
        this.form.controls.isReplace.disable();
        this.form.controls.isWaiting.reset();
        this.form.controls.isWaiting.disable();
      } else {
        this.form.controls.isReplace.enable();
        this.form.controls.isWaiting.enable();
      }
    });
  }

  public ngOnInit() {
    const storage = getStorage();

    this.store
      .select(CoinSelectors.state)
      .pipe(first())
      .subscribe((coin) => {
        if (coin.uid) {
          this.coinUID = coin.uid;
          this.form.patchValue(coin);

          if (coin.images.length === 1) {
            this.imagePrimaryIndex = 0;
          }

          forkJoin(
            coin.images.map((image) =>
              getDownloadURL(ref(storage, 'coins/' + image)).then((url) =>
                this.imageUrls.push(url)
              )
            )
          ).subscribe();
        }
      });
  }

  public imageCropped(event: ImageCroppedEvent) {
    if (event) {
      this.image = {
        blob: event.blob as Blob,
        url: event.objectUrl as SafeUrl,
      };
    }
  }

  public onImageChange(event: Event): void {
    this.imageChangedEvent = event;
  }

  public createCoin(): void {
    if (!this.isFilled) {
      return;
    }

    this.addCoin()
      .pipe(
        switchMap((snapshot) => {
          if (snapshot) {
            const coinUID = last(snapshot.path.split('/')) as string;
            this.coinUID = coinUID;

            return forkJoin(
              this.images.map((image, index) =>
                this.loadImage(image, snapshot.id + '-' + index + '.png')
              )
            ).pipe(
              switchMap((snapshots) => {
                const images = snapshots.map((s) => s.metadata.name);
                return this.collection$.doc(coinUID).update({ images });
              })
            );
          }
          return of([]);
        })
      )
      .subscribe(() => {
        this.transform = {};
        window.location.reload();
      });
  }

  public saveCoin(): void {
    this.store
      .select(CoinSelectors.state)
      .pipe(
        first(),
        switchMap((coin: CoinState) => {
          const payload: Partial<Coin> = {};

          if (this.form.controls.name.dirty) {
            payload.name = this.form.controls.name.value;
          }

          if (this.form.controls.year.dirty) {
            payload.year = this.form.controls.year.value ?? null as any;
          }

          if (this.form.controls.grade.dirty) {
            payload.grade = this.form.controls.grade.value ?? null ?? undefined;
          }

          if (this.form.controls.mintage.dirty) {
            payload.mintage = this.form.controls.mintage.value;
          }

          if (this.form.controls.note.dirty) {
            payload.note = this.form.controls.note.value;
          }

          if (this.form.controls.country.dirty) {
            payload.country = this.form.controls.country.value;
          }

          if (this.form.controls.denomination.dirty) {
            payload.denomination = this.form.controls.denomination.value;
          }

          if (this.form.controls.isWanted.dirty) {
            payload.isWanted = this.form.controls.isWanted.value;
          }

          if (this.form.controls.isReplace.dirty) {
            payload.isReplace = this.form.controls.isReplace.value;
          }

          if (this.form.controls.isWaiting.dirty) {
            payload.isWaiting = this.form.controls.isWaiting.value;
          }

          payload.tags = this.form.controls.tags.value;

          payload.sets = this.form.controls.sets.value;

          return from(
            this.firestore
              .collection(this.userUID)
              .doc(coin.uid)
              .update(payload)
          );
        }),
        switchMap(() => {
          return this.form.controls.image.dirty
            ? forkJoin(
                this.images.map((image, index) =>
                  this.loadImage(image, this.coinUID + '-' + index + '.png')
                )
              ).pipe(
                switchMap((snapshots) => {
                  const images = snapshots.map((s) => s.metadata.name);
                  return this.collection$.doc(this.coinUID).update({ images });
                })
              )
            : of(null);
        })
      )
      .subscribe();
  }

  public openFileDialog() {
    this.file.nativeElement.click();
  }

  public onImageClick(imageIndex: number): void {
    const isPrimary = isDefined(this.imagePrimaryIndex);
    const isSecondary = isDefined(this.imageSecondaryIndex);

    if (!isPrimary && !isSecondary) {
      this.imagePrimaryIndex = imageIndex;
      return;
    }
    if (this.imagePrimaryIndex === imageIndex) {
      this.imagePrimaryIndex = null;
      return;
    }
    if (this.imageSecondaryIndex === imageIndex) {
      this.imageSecondaryIndex = null;
      return;
    }
    if (isPrimary && isSecondary) {
      return;
    }
    if (isDefined(this.imagePrimaryIndex)) {
      this.imageSecondaryIndex = imageIndex;
    } else {
      this.imagePrimaryIndex = imageIndex;
    }
  }

  private addCoin(): Observable<DocumentReference> {
    const {
      tags,
      sets,
      name,
      year,
      note,
      grade,
      country,
      mintage,
      isWanted,
      isReplace,
      isWaiting,
      denomination,
    } = this.form.getRawValue();

    return from(
      this.collection$.add({
        tags,
        sets,
        name,
        year,
        note,
        grade,
        country,
        mintage,
        isWanted,
        isReplace,
        isWaiting,
        denomination,
      })
    );
  }

  public deleteCoin(): void {
    this.collection$
      .doc(this.coinUID)
      .update({ isDeleted: true })
      .then(() => {
        this.router.navigate(['list']);
      });
  }

  private loadImage(
    image: { blob: Blob; url: SafeUrl },
    name: string
  ): Observable<any> {
    return image.blob
      ? from(uploadBytes(ref(getStorage(), 'coins/' + name), image.blob))
      : of(null);
  }

  public sortByCountryName = (
    a: KeyValue<string, string>,
    b: KeyValue<string, string>
  ): number => {
    return a.value.localeCompare(b.value);
  };

  public backToList(): void {
    this.router.navigate(['list']);
  }

  public addTag(tag: string) {
    const control = this.form.controls.tags;
    control.setValue({ ...control.value, [tag]: '' });
  }

  public addSet(set: string) {
    const control = this.form.controls.sets;
    control.setValue({ ...control.value, [set]: '' });
  }

  public toggleSet(set: string) {
    const control = this.form.controls.sets;
    control.markAsDirty();

    if (control.value) {
      if (isNil(control.value[set])) {
        control.setValue({ ...control.value, [set]: '' });
      } else {
        control.setValue(omit(control.value, set));
      }
    } else {
      control.setValue({ [set]: '' });
    }
  }

  public toggleTag(tag: string) {
    const control = this.form.controls.tags;
    control.markAsDirty();

    if (control.value) {
      if (isNil(control.value[tag])) {
        control.setValue({ ...control.value, [tag]: '' });
      } else {
        control.setValue(omit(control.value, tag));
      }
    } else {
      control.setValue({ [tag]: '' });
    }
  }

  public toggleGlobalTag(tag: string): void {
    const isGlobal = !isNil(this.globalTags[tag]);

    if (isGlobal) {
      this.store.dispatch(MetaActions.deleteTag(tag));
    } else {
      this.store.dispatch(MetaActions.addTag(tag));
    }

    this.firestore
      .collection(this.userUID)
      .doc('metadata')
      .set({ tags: { [tag]: isGlobal ? null : '' } }, { merge: true });
  }

  public toggleGlobalSet(set: string): void {
    const isGlobal = !isNil(this.globalSets[set]);

    if (isGlobal) {
      this.store.dispatch(MetaActions.deleteSet(set));
    } else {
      this.store.dispatch(MetaActions.addSet(set));
    }

    this.firestore
      .collection(this.userUID)
      .doc('metadata')
      .set({ sets: { [set]: isGlobal ? null : '' } }, { merge: true });
  }

  public get sets(): Sets {
    return this.form.controls.sets.value ?? {};
  }

  public get allSets(): Sets {
    return { ...this.globalSets, ...this.sets };
  }

  public get tags(): Tags {
    return this.form.controls.tags.value ?? {};
  }

  public get allTags(): Tags {
    return { ...this.globalTags, ...this.tags };
  }

  private get isFilled(): boolean {
    return this.form.controls.name && !!this.form.controls.year;
  }

  @HostListener('wheel', ['$event'])
  onWheel(event: WheelEvent): void {
    if (event.ctrlKey) {
      event.preventDefault();
      const scale =
        (this.transform.scale ?? 0) + (event.deltaY > 0 ? 0.1 : -0.1);
      this.transform = { ...this.transform, scale };
    }

    if (event.shiftKey) {
      event.preventDefault();
      const rotate = (this.transform.rotate ?? 0) + (event.deltaY > 0 ? 1 : -1);
      this.transform = { ...this.transform, rotate };
    }
  }

  @HostListener('document:mousemove', ['$event'])
  onDrag(event: DragEvent): void {
    event.preventDefault();
    if (event.buttons === 1 && event.ctrlKey) {
      const rotate =
        (this.transform.rotate ?? 0) + (event.movementY > 0 ? 1 : -1);
      this.transform = { ...this.transform, rotate };
    }
  }

  @HostListener('document:keydown.enter', ['$event'])
  onEnter(event: KeyboardEvent): void {
    if (this.image) {
      event.preventDefault();

      this.images.push(this.image);
      this.imageUrls.push(this.image.url as string);
      this.form.controls.image.reset();
      this.form.controls.image.markAsDirty();
      this.image = null;
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscape(event: KeyboardEvent): void {
    event.preventDefault();

    if (this.image) {
      this.form.controls.image.reset();
    }
  }
}
