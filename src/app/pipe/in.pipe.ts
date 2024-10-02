import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'in', standalone: true })
export class InPipe implements PipeTransform {
  transform(value: string, obj: any): boolean {
    return obj && typeof obj === 'object' && value in obj;
  }
}
