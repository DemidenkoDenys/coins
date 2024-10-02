import { Coin } from './coin.model';
import { Tags } from './tags.type';

export interface ListItem extends Coin {
  primaryImage?: string;
  matchedBy: {
    tags?: Tags;
    sets?: Tags;
    name?: string;
    country?: Tags;
  };
}
