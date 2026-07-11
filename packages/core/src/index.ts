export type {
  ComponentInfo,
  ComponentVariant,
  LabCatalog,
  ProgressCallback,
  ProjectConfig,
  ProjectType,
  PropField,
  PropKind,
  PropSchema,
  ScanOptions,
  ScanProgress,
} from './types.js';

export { discoverProject, listSourceFiles, IGNORE_DIRS, toViteAliases } from './discovery.js';
export { extractPropSchema } from './props.js';
export { generateFixtures, generateVariants } from './fixtures.js';
export { scanProject, getComponentById, searchComponents } from './scanner.js';
export { shouldSkipCatalogFile, discoverPreviewStyles } from './preview-assets.js';
