import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { AsyncPipe, KeyValuePipe, NgForOf, NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { FormGroup, FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { forEach, isNil, last, max, omit } from 'lodash-es';
import { Store, StoreModule } from '@ngrx/store';
import { Observable, first, forkJoin, from, of, switchMap, tap } from 'rxjs';
import { AngularFirestore, DocumentReference, AngularFirestoreCollection } from '@angular/fire/compat/firestore';
import { ImageTransform, ImageCroppedEvent, ImageCropperComponent } from 'ngx-image-cropper';

import { AppState } from '../store/store.state';
import { isDefined } from '../utils/value.utils';
import { UserSelectors } from '../store/user/user.store';
import { TagsComponent } from './tags/tags.component';
import { MetaActions, MetaSelectors } from '../store/meta/meta.store';
import { CoinState, CoinActions, CoinSelectors } from '../store/coin/coin.store';
import { Coin, CoinForm } from '../models/coin.model';
import { countries, grades } from '../static';
import { toTitleCase } from '../utils/string.utils';
import { Sets } from '../models/sets.type';
import { Tags } from '../models/tags.type';
import { InPipe } from '../pipe/in.pipe';
import { NinPipe } from '../pipe/not-in.pipe';
import { Image } from '../models/image.model';
import { filterObjectByValue } from '../utils/object.utils';
import { DataService } from '../services/data.service';
import { sortByValue } from '../utils/array.utils';
import { mapToUpdate } from '../mappers/coin-update.mapper';

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
  public readonly sortByValue = sortByValue;
  public readonly MetaSelectors = MetaSelectors;

  coinUID!: string;
  userUID!: string;

  globalSets: Sets = {};
  globalTags: Tags = {};

  image: Image | null = null;
  images: Array<Image> = [];
  imageCurrentIndex: number | null = null;
  imagePrimaryIndex: number | null = null;
  imageSecondaryIndex: number | null = null;
  transform: ImageTransform = {};
  collection$!: AngularFirestoreCollection;
  imageChangedEvent!: Event | null;
  shouldJoinSet = (set?: string): boolean => (set ? !(set in this.globalSets) : false);
  shouldJoinTag = (tag?: string): boolean => (tag ? !(tag in this.globalTags) : false);

  form = new FormGroup<CoinForm>({
    sets: new FormControl(),
    tags: new FormControl(),
    name: new FormControl(),
    year: new FormControl(),
    note: new FormControl(),
    grade: new FormControl(),
    image: new FormControl(),
    images: new FormControl(),
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
    private readonly data: DataService,
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
      this.updateCoinState(formValue);
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

  ngOnInit() {
    this.form.valueChanges.subscribe(console.log);

    this.store
      .select(CoinSelectors.state)
      .pipe(first())
      .subscribe((coin) => {
        if (coin.uid) {
          this.coinUID = coin.uid;
          this.images = coin.images.map(() => ({ url: 'assets/placeholder.png' }));
          this.form.patchValue(coin);

          if (coin.images.length === 1) {
            this.imagePrimaryIndex = 0;
          }

          coin.images.forEach((image, index) => this.data.getImageUrl(image).subscribe((url) => (this.images[index] = { url })));
        }
      });
  }

  updateCoinState(coin: Partial<Coin>) {
    this.store.dispatch(CoinActions.update(coin));
  }

  createCoin(): void {
    if (!this.isFilled) {
      return;
    }

    this.addCoin()
      .pipe(
        tap((snapshot) => (this.coinUID = last(snapshot.path.split('/')) as string)),
        switchMap(() => this.updateFirebaseImages())
      )
      .subscribe(() => window.location.reload());
  }

  addCoin(): Observable<DocumentReference> {
    const { tags, sets, name, year, note, grade, country, mintage, isWanted, isReplace, isWaiting, denomination } = this.form.getRawValue();

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

  editCoin(): void {
    this.store
      .select(CoinSelectors.state)
      .pipe(
        first(),
        switchMap((coin: CoinState) => {
          const payload = mapToUpdate(this.form);
          return this.data.updateCoin$(this.userUID, coin.uid, payload);
        }),
        switchMap(() => this.updateFirebaseImages())
      )
      .subscribe();
  }

  deleteCoin(): void {
    from(this.collection$.doc(this.coinUID).update({ isDeleted: true }))
      .pipe(switchMap(() => this.deleteFirebaseImages()))
      .subscribe(() => this.router.navigate(['list']));
  }

  openFileDialog() {
    this.imageCurrentIndex = null;
    this.file.nativeElement.click();
  }

  onImageCropped(event: ImageCroppedEvent) {
    if (event) {
      this.image = {
        blob: event.blob as Blob,
        url: event.objectUrl as string,
      };
    }
  }

  onImageChange(event: Event): void {
    this.imageChangedEvent = event;
  }

  onImageClick(imageIndex: number): void {
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

  onImageDblClick(index: number): void {
    this.openFileDialog();
    this.imageCurrentIndex = index;
  }

  onDeleteImageClick(index: number): void {
    this.images[index] = { url: '' };
    if (this.imagePrimaryIndex === index) this.imagePrimaryIndex = null;
    if (this.imageSecondaryIndex === index) this.imageSecondaryIndex = null;
    this.form.controls.image.markAsDirty();
  }

  updateFirebaseImages(): Observable<any> {
    const images$: Array<Observable<any>> = [];
    const images = this.form.value.images ?? [];

    let maxIndex = max(images.map((name) => +name.split('-')[1].replace('.png', ''))) ?? 0;

    forEach(this.images, (image, index) => {
      if (image.blob) {
        const name = this.coinUID + '-' + ++maxIndex + '.png';
        images$.push(this.data.uploadImage$(image.blob, name));
      } else if (images[index]) {
        images$.push(image.url ? of({ metadata: { name: images[index] } }) : this.data.deleteImage$(images[index]));
      }
    });

    return forkJoin(images$).pipe(
      switchMap((snapshots) => {
        const images: Array<string> = [];
        forEach(snapshots, (s, index) => (s ? images.push(s.metadata.name) : this.images.splice(index, 1)));
        this.form.controls.images.setValue(images);
        return this.collection$.doc(this.coinUID).update({ images });
      })
    );
  }

  deleteFirebaseImages(): Observable<any> {
    this.images = this.images.map(() => ({ url: '' }));
    return this.updateFirebaseImages();
  }

  backToList(): void {
    this.router.navigate(['list']);
  }

  addTag(tag: string) {
    const control = this.form.controls.tags;
    control.setValue({ ...control.value, [tag]: '' });
  }

  addSet(set: string) {
    const control = this.form.controls.sets;
    control.setValue({ ...control.value, [set]: '' });
  }

  toggleSet(set: string) {
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

  toggleTag(tag: string) {
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

  toggleGlobalTag(tag: string): void {
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

  toggleGlobalSet(set: string): void {
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

  get sets(): Sets {
    return this.form.controls.sets.value ?? {};
  }

  get allSets(): Sets {
    return { ...this.globalSets, ...this.sets };
  }

  get tags(): Tags {
    return this.form.controls.tags.value ?? {};
  }

  get allTags(): Tags {
    return { ...this.globalTags, ...this.tags };
  }

  get isFilled(): boolean {
    return this.form.controls.name && !!this.form.controls.year;
  }

  @HostListener('wheel', ['$event'])
  onWheel(event: WheelEvent): void {
    if (event.ctrlKey) {
      event.preventDefault();
      const scale = (this.transform.scale ?? 0) + (event.deltaY > 0 ? 0.1 : -0.1);
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
      const rotate = (this.transform.rotate ?? 0) + (event.movementY > 0 ? 1 : -1);
      this.transform = { ...this.transform, rotate };
    }
  }

  @HostListener('document:keydown.enter', ['$event'])
  onEnter(event: KeyboardEvent): void {
    if (this.image) {
      event.preventDefault();

      const index = this.imageCurrentIndex ?? this.images.length;
      this.images[index] = this.image;
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
