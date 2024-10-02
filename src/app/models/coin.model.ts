import { FormControl } from '@angular/forms';
import { Country } from '../enums/country.enum';
import { Grades } from '../enums/grade.enum';
import { Tags } from './tags.type';
import { Sets } from './sets.type';

export interface Coin {
  uid: string;
  tags: Tags;
  sets: Sets;
  name: string;
  year: number;
  note: string;
  grade: Grades;
  images: Array<string>;
  country: Country;
  mintage: number;
  isWanted?: boolean;
  isReplace?: boolean;
  isDeleted?: boolean;
  isWaiting?: boolean;
  denomination: number;
}

export interface CoinForm {
  sets: FormControl<Sets>;
  tags: FormControl<Tags>;
  name: FormControl<string>;
  year: FormControl<number | null>;
  note: FormControl<string>;
  grade: FormControl<Grades | null>;
  image: FormControl<string>;
  country: FormControl<Country>;
  mintage: FormControl<number>;
  isWanted: FormControl<boolean>;
  isReplace: FormControl<boolean>;
  isWaiting: FormControl<boolean>;
  denomination: FormControl<number>;
}
