import { FormGroup } from '@angular/forms';
import { Coin, CoinForm } from '../models/coin.model';
import { CoinState } from '../store/coin/coin.store';

export const mapToUpdate = (form: FormGroup<CoinForm>): Partial<Coin> => {
  const payload: Partial<Coin> = {};

  if (form.controls.name.dirty) {
    payload.name = form.controls.name.value;
  }

  if (form.controls.year.dirty) {
    payload.year = form.controls.year.value ?? (null as any);
  }

  if (form.controls.grade.dirty) {
    payload.grade = form.controls.grade.value ?? null ?? undefined;
  }

  if (form.controls.mintage.dirty) {
    payload.mintage = form.controls.mintage.value;
  }

  if (form.controls.note.dirty) {
    payload.note = form.controls.note.value;
  }

  if (form.controls.country.dirty) {
    payload.country = form.controls.country.value;
  }

  if (form.controls.denomination.dirty) {
    payload.denomination = form.controls.denomination.value;
  }

  if (form.controls.isWanted.dirty) {
    payload.isWanted = form.controls.isWanted.value;
  }

  if (form.controls.isReplace.dirty) {
    payload.isReplace = form.controls.isReplace.value;
  }

  if (form.controls.isWaiting.dirty) {
    payload.isWaiting = form.controls.isWaiting.value;
  }

  payload.tags = form.controls.tags.value;

  payload.sets = form.controls.sets.value;

  return payload;
};
