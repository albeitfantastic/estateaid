import { catalogPartA } from './part-a';
import { catalogPartB } from './part-b';
import { catalogPartC } from './part-c';

/** Full English `translation` namespace for i18next. */
export const enCatalog: Record<string, unknown> = {
  ...catalogPartA,
  ...catalogPartB,
  ...catalogPartC,
};
