import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { deleteObject, getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { Coin } from '../models/coin.model';

@Injectable()
export class DataService {
  constructor(private readonly firestore: AngularFirestore) {}

  public coins$(userUID: string) {
    return this.firestore.collection(userUID).get();
  }

  public updateCoin$(userUID: string, coinUID: string, payload: Partial<Coin>): Observable<void> {
    return from(this.firestore.collection(userUID).doc(coinUID).update(payload));
  }

  public updateMetadata(userUID: string, metadata: any): void {
    this.firestore
      .collection(userUID)
      .doc('metadata')
      .set({ ...metadata });
  }

  public getImageUrl(name: string): Observable<string> {
    return from(getDownloadURL(ref(ref(getStorage(), 'coins'), name)));
  }

  public uploadImage$(blob: Blob, name: string): Observable<any> {
    return from(uploadBytes(ref(getStorage(), 'coins/' + name), blob));
  }

  public deleteImage$(name: string): Observable<any> {
    return from(deleteObject(ref(getStorage(), 'coins/' + name)));
  }
}
