import { Directive, ElementRef, Input, Renderer2 } from '@angular/core';
import { DataService } from '../services/data.service';

@Directive({ selector: '[loadImage]', standalone: true })
export class LoadImageDirective {
  @Input('height') windowInnerHeight = window.innerHeight;
  @Input('loadImage') imgName!: string;

  private inLoaded = false;
  private inViewPort = false;

  constructor(private el: ElementRef, private renderer: Renderer2, private readonly data: DataService) {}

  ngOnChanges(changes: any) {
    this.checkViewport();

    if (changes.windowInnerHeight) {
      this.checkViewport();
    }
  }

  checkViewport() {
    if (this.inLoaded) return;

    if (this.el.nativeElement && !this.inViewPort) {
      const rect = this.el.nativeElement.getBoundingClientRect();

      if (rect.top >= 0 && rect.top <= window.innerHeight) {
        this.inViewPort = true;

        this.data.getImageUrl(this.imgName).subscribe((url) => {
          console.log(url);
          this.inLoaded = true;
          this.renderer.setAttribute(this.el.nativeElement, 'src', url);
        });
      }
    }
  }
}
