import type { Frame } from './stage';

/** A DOM/Canvas2D chapter controller. `update` runs only while its chapter is in view. */
export interface Section {
  chapter: string;
  init(): void | Promise<void>;
  update(f: Frame): void;
}
