import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'nin', standalone: true })
export class NinPipe implements PipeTransform {
  transform(value: string, obj: any): boolean {
    return !(obj && typeof obj === 'object' && value in obj);
  }
}
