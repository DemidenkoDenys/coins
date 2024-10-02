import { KeyValue, KeyValuePipe, NgForOf, NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { toSnakeCase, toTitleCase } from '../../utils/string.utils';
import { isEmpty } from 'lodash-es';
import { InPipe } from '../../pipe/in.pipe';

@Component({
  selector: 'tags',
  imports: [NgIf, InPipe, NgForOf, KeyValuePipe],
  standalone: true,
  templateUrl: 'tags.component.html',
})
export class TagsComponent {
  public readonly isEmpty = isEmpty;
  public readonly toTitleCase = toTitleCase;

  @Input({ required: true }) type?: string;
  @Input({ required: true }) items?: Record<string, string | null>;

  @Input() title?: string;
  @Input() additable = false;
  @Input() togglable = false;
  @Input() selectedItems?: Record<string, string | null>;

  @Input() formatter: (item: string) => string = (item: string) => item;
  @Input() shouldJoin: (item?: string) => boolean = () => false;
  @Input() shouldDetach: (item?: string) => boolean = () => false;

  @Output() joined = new EventEmitter<string>();
  @Output() entered = new EventEmitter<string>();
  @Output() toggled = new EventEmitter<string>();
  @Output() detached = new EventEmitter<string>();

  public onJoined(item: string): void {
    this.joined.emit(item);
  }

  public onDetached(item: string): void {
    this.detached.emit(item);
  }

  public onToggled(item: string): void {
    this.toggled.emit(item);
  }

  public onEntered(event: Event): void {
    const element = (event as any).target;
    const text = toSnakeCase(element.textContent);
    this.entered.emit(text);
    element.textContent = '';
  }

  public sortByKey = (
    a: KeyValue<string, string | null>,
    b: KeyValue<string, string | null>
  ): number => {
    return a.key?.localeCompare(b.key ?? '') ?? -1;
  };

  public sortByKeyFormatted = (
    a: KeyValue<string, string | null>,
    b: KeyValue<string, string | null>
  ): number => {
    return this.formatter(a.key ?? '').localeCompare(
      this.formatter(b.key ?? '')
    );
  };
}
