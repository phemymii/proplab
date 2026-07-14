import type { ComponentVariant, PropField, PropSchema } from './types.js';

const STRING_SAMPLES = [
  'Hello',
  'Sample text',
  'Label',
  'Click me',
  'Untitled',
];

export function generateFixtures(schema: PropSchema, componentName: string): Record<string, unknown> {
  const fixtures: Record<string, unknown> = {};
  for (const field of schema.fields) {
    if (isUnsafeGeneratedProp(field.name)) continue;
    if (field.kind === 'function') continue;
    if (!field.required && !shouldIncludeOptional(field, componentName)) continue;
    fixtures[field.name] = valueForField(field, componentName, 0);
  }
  return fixtures;
}

export function generateVariants(
  schema: PropSchema,
  baseFixtures: Record<string, unknown>,
): ComponentVariant[] {
  const variants: ComponentVariant[] = [
    {
      id: 'default',
      name: 'Default',
      description: 'Auto-generated default props',
      props: { ...baseFixtures },
    },
  ];

  for (const field of schema.fields) {
    if (field.kind === 'enum' && field.options && field.options.length > 1) {
      for (const option of field.options) {
        const id = `${field.name}-${String(option)}`;
        variants.push({
          id,
          name: `${field.name}: ${String(option)}`,
          props: {
            ...baseFixtures,
            [field.name]: option,
          },
        });
      }
    }

    if (field.kind === 'boolean') {
      variants.push({
        id: `${field.name}-true`,
        name: `${field.name}: true`,
        props: { ...baseFixtures, [field.name]: true },
      });
      variants.push({
        id: `${field.name}-false`,
        name: `${field.name}: false`,
        props: { ...baseFixtures, [field.name]: false },
      });
    }
  }

  // Cap variants to keep the UI usable
  return dedupeVariants(variants).slice(0, 24);
}

function dedupeVariants(variants: ComponentVariant[]): ComponentVariant[] {
  const seen = new Set<string>();
  const out: ComponentVariant[] = [];
  for (const v of variants) {
    const key = JSON.stringify(v.props);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

const OPTIONAL_VISUAL_PROPS = new Set([
  'label',
  'title',
  'description',
  'intro',
  'text',
  'placeholder',
  'variant',
  'size',
  'color',
  'tone',
  'orientation',
  'disabled',
  'loading',
  'checked',
  'open',
  'selected',
  'required',
  'readOnly',
  'multiple',
  'href',
  'src',
  'alt',
  'caption',
  'eyebrow',
  'bio',
  'location',
  'message',
  'currency',
  'cycle',
  'tier',
  'ctaLabel',
  'featured',
  'compact',
  'fullWidth',
  'outlined',
  'pill',
  'elevated',
  'showFollow',
  'following',
  'duration',
  'showProgress',
  'position',
]);

const VOID_COMPONENT_NAMES = new Set([
  'Input',
  'Image',
  'Img',
]);

function shouldIncludeOptional(field: PropField, componentName: string): boolean {
  if (field.kind === 'reactNode') {
    if (field.name === 'children' && VOID_COMPONENT_NAMES.has(componentName)) return false;
    return true;
  }
  if (field.name === 'children') {
    return !VOID_COMPONENT_NAMES.has(componentName);
  }
  return OPTIONAL_VISUAL_PROPS.has(field.name);
}

function isUnsafeGeneratedProp(name: string): boolean {
  return (
    name === 'dangerouslySetInnerHTML' ||
    name === 'style' ||
    name === 'className' ||
    name === 'contentEditable' ||
    name === 'suppressContentEditableWarning' ||
    name === 'suppressHydrationWarning'
  );
}

function valueForField(field: PropField, componentName: string, depth: number): unknown {
  if (field.defaultValue !== undefined) return field.defaultValue;

  switch (field.kind) {
    case 'string':
      return stringFor(field.name, componentName);
    case 'number':
      return numberFor(field.name);
    case 'boolean':
      return (
        field.name.startsWith('is') ||
        field.name.startsWith('has') ||
        field.name.startsWith('show') ||
        field.name === 'included' ||
        field.name === 'dismissible' ||
        field.name === 'striped' ||
        field.name === 'hoverable' ||
        field.name === 'open' ||
        field.name === 'showProgress'
      )
        ? true
        : false;
    case 'enum':
      return field.options?.[0] ?? 'default';
    case 'union':
      return field.options?.[0] ?? null;
    case 'reactNode':
      if (field.name === 'children') return `${componentName} content`;
      if (field.name === 'icon') return '★';
      if (field.name === 'footer') return 'Footer note';
      if (field.name === 'header') return 'Header';
      if (field.name === 'badge') return 'New';
      return `${field.name} content`;
    case 'array':
      if (field.item) {
        return [
          valueForField({ ...field.item, name: `${field.name}0` }, componentName, depth + 1),
          valueForField({ ...field.item, name: `${field.name}1` }, componentName, depth + 1),
        ];
      }
      return [];
    case 'object':
      if (depth > 2) return {};
      if (field.fields?.length) {
        const obj: Record<string, unknown> = {};
        for (const nested of field.fields) {
          if (nested.kind === 'function') continue;
          obj[nested.name] = valueForField(nested, componentName, depth + 1);
        }
        return obj;
      }
      return {};
    case 'function':
      return undefined;
    default:
      return null;
  }
}

function stringFor(name: string, componentName: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('email')) return 'user@example.com';
  if (lower.includes('url') || lower.includes('href') || lower === 'src' || lower.includes('avatar')) {
    return 'https://example.com';
  }
  if (lower.includes('color')) return '#3d4f5f';
  if (lower.includes('path') || lower.includes('to')) return '/example';
  if (lower === 'id' || lower.endsWith('id')) return 'example-id';
  if (lower.includes('placeholder')) return 'Enter text…';
  if (lower === 'handle') return 'ada.lovelace';
  if (lower.includes('location')) return 'London, UK';
  if (lower.includes('bio')) return 'Building thoughtful product interfaces.';
  if (lower.includes('message')) return 'Something needs your attention before you continue.';
  if (lower.includes('caption')) return 'Overview';
  if (lower.includes('currency')) return '$';
  if (lower.includes('field') || lower === 'key') return 'name';
  if (lower.includes('status')) return 'Active';
  if (lower.includes('ctalabel')) return 'Get started';
  if (lower.includes('label') && componentName === 'Toast') return 'Undo';
  if (lower.includes('title') && componentName === 'Toast') return 'Changes saved';
  if (lower.includes('description') && componentName === 'Toast') {
    return 'Your profile updates are now live for everyone on the team.';
  }
  if (lower.includes('description')) return `Short description for ${componentName}.`;
  if (lower.includes('label') || lower.includes('title') || lower === 'name' || lower === 'text') {
    if (componentName === 'DataTable' && lower === 'label') return 'Name';
    if (lower === 'name' && componentName === 'ProfileCard') return 'Ada Lovelace';
    if (lower === 'name' && componentName === 'PricingCard') return 'Pro';
    if (lower.includes('label') && componentName === 'PricingCard') return 'Unlimited projects';
    if (lower.includes('label') && componentName === 'AlertBanner') return 'Review';
    if (lower.includes('label') && componentName === 'Button') return 'Continue';
    if (lower.includes('label') && componentName === 'ProfileCard') return 'Projects';
    if (lower.includes('title')) return componentName.replace(/([a-z])([A-Z])/g, '$1 $2');
    return componentName;
  }
  if (lower === 'children') return `${componentName} content`;
  if (lower === 'classname') return '';
  return STRING_SAMPLES[Math.abs(hash(name)) % STRING_SAMPLES.length];
}

function numberFor(name: string): number {
  const lower = name.toLowerCase();
  if (lower.includes('duration') || lower.includes('timeout') || lower.includes('delay')) return 4000;
  if (lower.includes('price') || lower.includes('amount')) return 29;
  if (lower.includes('width') || lower.includes('height') || lower.includes('size')) return 48;
  if (lower.includes('count') || lower.includes('length')) return 3;
  if (lower.includes('index') || lower.includes('step')) return 0;
  if (lower.includes('opacity')) return 1;
  if (lower.includes('max')) return 100;
  if (lower.includes('min')) return 0;
  return 1;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}
