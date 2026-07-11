export type ProjectType =
  | 'react'
  | 'nextjs'
  | 'vite-react'
  | 'expo'
  | 'expo-router'
  | 'react-native-cli'
  | 'unknown';

export type PropKind =
  | 'string'
  | 'number'
  | 'boolean'
  | 'enum'
  | 'union'
  | 'array'
  | 'object'
  | 'function'
  | 'reactNode'
  | 'unknown';

export interface PropField {
  name: string;
  kind: PropKind;
  required: boolean;
  description?: string;
  /** Literal / enum options when kind is enum or union of literals */
  options?: Array<string | number | boolean>;
  /** Nested fields when kind is object */
  fields?: PropField[];
  /** Element schema when kind is array */
  item?: PropField;
  /** Raw TypeScript type text for display */
  typeText: string;
  defaultValue?: unknown;
}

export interface PropSchema {
  fields: PropField[];
  /** Fully resolved props type name if known */
  typeName?: string;
}

export interface ComponentInfo {
  id: string;
  name: string;
  exportName: string;
  /** Absolute file path */
  filePath: string;
  /** Path relative to project root */
  relativePath: string;
  isDefaultExport: boolean;
  displayName?: string;
  props: PropSchema;
  /** Auto-generated default fixtures */
  fixtures: Record<string, unknown>;
  /** Named variants derived from enum/union props */
  variants: ComponentVariant[];
  line: number;
}

export interface ComponentVariant {
  id: string;
  name: string;
  description?: string;
  props: Record<string, unknown>;
}

export interface ProjectConfig {
  root: string;
  name: string;
  type: ProjectType;
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'unknown';
  aliases: Record<string, string>;
  hasReact: boolean;
  hasReactNative: boolean;
}

export interface LabCatalog {
  config: ProjectConfig;
  components: ComponentInfo[];
  stats: {
    totalFiles: number;
    totalComponents: number;
    withProps: number;
    scanDurationMs: number;
  };
  scannedAt: string;
}

export interface ScanOptions {
  root: string;
  include?: string[];
  exclude?: string[];
}

export interface ScanProgress {
  phase: 'discover' | 'parse' | 'props' | 'fixtures' | 'done';
  message: string;
  current?: number;
  total?: number;
}

export type ProgressCallback = (progress: ScanProgress) => void;
