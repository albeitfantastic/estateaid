import { catalogPartA } from './part-a';
import { catalogPartB } from './part-b';

/** Full English `translation` namespace for i18next. */
export const enCatalog: Record<string, unknown> = {
  ...catalogPartA,
  ...catalogPartB,
};
