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

export { discoverProject, listSourceFiles, IGNORE_DIRS, PREFERRED_SCAN_ROOTS, toViteAliases } from './discovery.js';
export { findPropLabConfig, PROPLAB_CONFIG_NAMES } from './config.js';
export type { PropLabConfigFile } from './config.js';
export { extractPropSchema } from './props.js';
export { generateFixtures, generateVariants } from './fixtures.js';
export { scanProject, getComponentById, normalizeComponentId, searchComponents, mightContainComponents } from './scanner.js';
export { shouldSkipCatalogFile, discoverPreviewStyles } from './preview-assets.js';
