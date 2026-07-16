import {
  Node,
  TypeFormatFlags,
  type Project,
  type SourceFile,
  type Type,
  type TypeChecker,
} from 'ts-morph';
import type { PropField, PropKind, PropSchema } from './types.js';

const REACT_NODE_NAMES = new Set([
  'ReactNode',
  'ReactElement',
  'JSX.Element',
  'Element',
]);

const SAFE_INTRINSIC_PROPS = new Set([
  'children',
  'className',
  'style',
  'id',
  'title',
  'role',
  'tabIndex',
  'disabled',
  'type',
  'href',
  'src',
  'alt',
  'value',
  'defaultValue',
  'checked',
  'defaultChecked',
  'placeholder',
  'name',
  'required',
  'readOnly',
  'multiple',
  'min',
  'max',
  'step',
  'rows',
  'cols',
  'autoComplete',
  'onClick',
  'onChange',
  'onSubmit',
  'onBlur',
  'onFocus',
]);

const UNSAFE_INTRINSIC_PROPS = new Set([
  'dangerouslySetInnerHTML',
  'contentEditable',
  'suppressContentEditableWarning',
  'suppressHydrationWarning',
]);

export function extractPropSchema(
  sourceFile: SourceFile,
  exportName: string,
  isDefault: boolean,
  project: Project,
): PropSchema {
  const checker = project.getTypeChecker();
  const componentNode = findComponentDeclaration(sourceFile, exportName, isDefault);
  if (!componentNode) {
    return { fields: [] };
  }

  const propsType = resolvePropsType(componentNode, checker);
  if (!propsType) {
    return { fields: [] };
  }

  const typeName = propsType.getSymbol()?.getName();
  const fields = typeToFields(propsType, checker, new Set(), 0);
  return {
    fields,
    typeName: typeName && typeName !== '__type' ? typeName : undefined,
  };
}

function findComponentDeclaration(
  sourceFile: SourceFile,
  exportName: string,
  isDefault: boolean,
): Node | undefined {
  if (isDefault) {
    const def = sourceFile.getDefaultExportSymbol();
    const decls = def?.getDeclarations() ?? [];
    for (const d of decls) {
      if (Node.isFunctionDeclaration(d) || Node.isVariableDeclaration(d)) return d;
      if (Node.isExportAssignment(d)) {
        const expr = d.getExpression();
        if (Node.isIdentifier(expr)) {
          const sym = expr.getSymbol();
          return sym?.getDeclarations()?.[0];
        }
        return expr;
      }
    }
  }

  const fn = sourceFile.getFunction(exportName);
  if (fn) return fn;

  const v = sourceFile.getVariableDeclaration(exportName);
  if (v) return v;

  return undefined;
}

function resolvePropsType(node: Node, checker: TypeChecker): Type | undefined {
  if (Node.isFunctionDeclaration(node) || Node.isFunctionExpression(node) || Node.isArrowFunction(node)) {
    const params = node.getParameters();
    if (params.length === 0) return undefined;
    return params[0].getType();
  }

  if (Node.isVariableDeclaration(node)) {
    const init = node.getInitializer();
    if (!init) {
      // Try call signature on the variable type (FC, memo, forwardRef)
      return propsFromComponentType(node.getType(), checker);
    }

    if (Node.isArrowFunction(init) || Node.isFunctionExpression(init)) {
      const params = init.getParameters();
      if (params.length > 0) return params[0].getType();
    }

    if (Node.isCallExpression(init)) {
      const expr = init.getExpression();
      const name = Node.isIdentifier(expr)
        ? expr.getText()
        : Node.isPropertyAccessExpression(expr)
          ? expr.getName()
          : '';

      if (name === 'forwardRef') {
        const args = init.getArguments();
        const fnArg = args[0] ?? args[1];
        if (fnArg && (Node.isArrowFunction(fnArg) || Node.isFunctionExpression(fnArg))) {
          const params = fnArg.getParameters();
          // forwardRef((props, ref) => ...)
          if (params.length > 0) return params[0].getType();
        }
        // forwardRef<Ref, Props>(...)
        const typeArgs = init.getTypeArguments();
        if (typeArgs.length >= 2) return typeArgs[1].getType();
      }

      if (name === 'memo') {
        const args = init.getArguments();
        const inner = args[0];
        if (inner) return resolvePropsType(inner, checker);
      }

      return propsFromComponentType(node.getType(), checker);
    }
  }

  return propsFromComponentType(checker.getTypeAtLocation(node), checker);
}

function propsFromComponentType(type: Type, checker: TypeChecker): Type | undefined {
  // React.FC<Props> / FunctionComponent<Props>
  const typeArgs = type.getTypeArguments();
  if (typeArgs.length > 0) {
    const symName = type.getSymbol()?.getName() ?? type.getAliasSymbol()?.getName() ?? '';
    if (
      /^(FC|FunctionComponent|ComponentType|ComponentClass|MemoExoticComponent|ForwardRefExoticComponent)$/.test(
        symName,
      )
    ) {
      return typeArgs[0];
    }
  }

  // Call signatures: (props: P) => ...
  for (const sig of type.getCallSignatures()) {
    const params = sig.getParameters();
    if (params.length === 0) continue;
    const paramDecl = params[0].getValueDeclaration();
    if (paramDecl) return checker.getTypeOfSymbolAtLocation(params[0], paramDecl);
    return checker.getTypeOfSymbolAtLocation(params[0], params[0].getDeclarations()?.[0] ?? (null as never));
  }

  // Construct signatures for class components
  for (const sig of type.getConstructSignatures()) {
    const instance = sig.getReturnType();
    const propsSym = instance.getProperty('props');
    if (propsSym) {
      const decl = propsSym.getValueDeclaration() ?? propsSym.getDeclarations()?.[0];
      if (decl) return checker.getTypeOfSymbolAtLocation(propsSym, decl);
    }
  }

  return undefined;
}

function typeToFields(
  type: Type,
  checker: TypeChecker,
  seen: Set<string>,
  depth: number,
): PropField[] {
  if (depth > 6) return [];

  // Unwrap nullish unions + Promise / Readonly lightly so PageObject | null expands
  const apparent = unwrapNullish(type.getApparentType());
  const target = apparent.isUnion() ? preferConstructiveUnionMember(apparent) : apparent;

  if (target.isIntersection()) {
    const fields: PropField[] = [];
    const names = new Set<string>();
    for (const part of target.getIntersectionTypes()) {
      for (const field of typeToFields(part, checker, seen, depth)) {
        if (names.has(field.name)) continue;
        names.add(field.name);
        fields.push(field);
      }
    }
    return fields;
  }

  const props = target.getProperties();
  const fields: PropField[] = [];

  for (const prop of props) {
    const name = prop.getName();
    if (name.startsWith('__@') || name === 'key' || name === 'ref') continue;

    const decls = prop.getDeclarations();
    const decl = decls[0];
    if (!decl) continue;

    if (UNSAFE_INTRINSIC_PROPS.has(name)) continue;

    const declarationPath = decl.getSourceFile().getFilePath().replace(/\\/g, '/');
    const isInheritedReactDomProp =
      declarationPath.includes('/node_modules/@types/react/') ||
      declarationPath.includes('/node_modules/react/index.d.ts');
    if (isInheritedReactDomProp && !SAFE_INTRINSIC_PROPS.has(name)) continue;

    // Skip HTML intrinsic dumps that explode schema size
    if (isDomIntrinsicDump(target, name)) continue;

    const propType = checker.getTypeOfSymbolAtLocation(prop, decl);
    const typeText = propType.getText(
      undefined,
      TypeFormatFlags.UseAliasDefinedOutsideCurrentScope,
    );

    const key = `${name}:${typeText}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const required = !(
      (typeof prop.isOptional === 'function' && prop.isOptional()) ||
      (Node.isPropertySignature(decl) && decl.hasQuestionToken()) ||
      typeText.includes('| undefined')
    );

    const field = describeType(name, propType, checker, required, typeText, seen, depth);
    fields.push(field);
  }

  return fields;
}

function isDomIntrinsicDump(type: Type, propName: string): boolean {
  const text = type.getText();
  // Avoid expanding full HTML attribute bags
  if (
    /HTMLAttributes|DOMAttributes|AriaAttributes|SVGAttributes|ClassAttributes/.test(text) &&
    ![
      'className',
      'style',
      'children',
      'id',
      'title',
      'role',
      'tabIndex',
      'onClick',
      'onChange',
      'onSubmit',
      'disabled',
      'type',
      'href',
      'src',
      'alt',
      'value',
      'placeholder',
      'name',
    ].includes(propName)
  ) {
    return true;
  }
  return false;
}

function describeType(
  name: string,
  type: Type,
  checker: TypeChecker,
  required: boolean,
  typeText: string,
  seen: Set<string>,
  depth: number,
): PropField {
  const unwrapped = unwrapNullish(type);
  const unwrappedText = unwrapped.getText(
    undefined,
    TypeFormatFlags.UseAliasDefinedOutsideCurrentScope,
  );
  let kind = classifyType(unwrapped, unwrappedText);

  // RN StyleProp<ViewStyle> etc. often resolve as opaque unions → "unknown";
  // never treat those as free-form strings (crashes react-native-web).
  if (isRnStyleTypeText(typeText) || isRnStyleTypeText(unwrappedText)) {
    kind = 'object';
  } else if (isReactNodeTypeText(typeText) || isReactNodeTypeText(unwrappedText)) {
    kind = 'reactNode';
  } else if ((kind === 'unknown' || kind === 'union') && /Style$/.test(name)) {
    kind = 'object';
  } else if (
    (kind === 'unknown' || kind === 'union') &&
    /^(children|icon|footer|header|badge|prefix|suffix|extra|action|leading|trailing|startContent|endContent|titleAccessory)$/.test(
      name,
    )
  ) {
    kind = 'reactNode';
  }

  // Imported aliases (PathObjectType) that failed to classify — try expanding properties
  if (kind === 'unknown' || kind === 'union') {
    const nested = typeToFields(unwrapped, checker, seen, depth + 1);
    if (nested.length > 0) {
      kind = 'object';
    } else if (looksLikeTypeAliasName(unwrappedText) || looksLikeTypeAliasName(typeText)) {
      kind = 'object';
    }
  }

  const display = formatTypeText(type, unwrapped, typeText);
  const field: PropField = {
    name,
    kind,
    required,
    typeText: kind === 'boolean' ? 'boolean' : display,
  };

  if (kind === 'enum' || kind === 'union') {
    const options = extractLiteralOptions(type);
    if (options.length > 0) {
      if (options.every((o) => typeof o === 'boolean') && options.includes(true) && options.includes(false)) {
        field.kind = 'boolean';
        field.typeText = 'boolean';
      } else {
        field.options = options;
        field.kind = 'enum';
        field.typeText = simplifyTypeText(options.map((o) => JSON.stringify(o)).join(' | '));
      }
    }
  }

  if (field.kind === 'object') {
    // Don't expand RN style bags (ViewStyle has 100+ keys) — JSON editor is enough
    if (!isRnStyleTypeText(typeText) && !isRnStyleTypeText(unwrappedText)) {
      field.fields = typeToFields(unwrapped, checker, seen, depth + 1);
    }
  }

  if (field.kind === 'array') {
    const args = unwrapped.getTypeArguments();
    const element = unwrapped.getArrayElementType?.() ?? args[0];
    if (element) {
      const elText = element.getText(
        undefined,
        TypeFormatFlags.UseAliasDefinedOutsideCurrentScope,
      );
      field.item = describeType(
        'item',
        element,
        checker,
        true,
        elText,
        seen,
        depth + 1,
      );
      if (field.item.fields?.length) {
        const shape = `{ ${field.item.fields.map((f) => `${f.name}: ${f.typeText}`).join('; ')} }`;
        field.item.typeText = shape;
        field.typeText = `${shape}[]`;
      } else if (field.item.typeText) {
        field.typeText = `${field.item.typeText}[]`;
      }
    }
  }

  return field;
}

/** React Native style bags — objects/arrays, never CSS strings. */
function isRnStyleTypeText(typeText: string): boolean {
  const text = typeText.replace(/\s+/g, ' ');
  return (
    /\bStyleProp\b/.test(text) ||
    /\b(?:View|Text|Image)Style\b/.test(text) ||
    /\bRegisteredStyle\b/.test(text)
  );
}

/** React children / slot types — editable as text fixtures in the lab. */
function isReactNodeTypeText(typeText: string): boolean {
  const text = typeText.replace(/\s+/g, ' ');
  if (REACT_NODE_NAMES.has(text)) return true;
  if (/React\.(ReactNode|ReactElement)/.test(text)) return true;
  if (/\bReactNode\b|\bReactElement\b/.test(text)) return true;
  if (text === 'JSX.Element' || /\bJSX\.Element\b/.test(text)) return true;
  return false;
}

function classifyType(type: Type, typeText: string): PropKind {
  const text = typeText.replace(/\s+/g, ' ');
  const unwrapped = unwrapNullish(type);
  const unwrappedText = unwrapped.getText(
    undefined,
    TypeFormatFlags.UseAliasDefinedOutsideCurrentScope,
  ).replace(/\s+/g, ' ');

  if (isRnStyleTypeText(text) || isRnStyleTypeText(unwrappedText)) return 'object';
  if (isReactNodeTypeText(text) || isReactNodeTypeText(unwrappedText)) return 'reactNode';

  if (unwrapped.isString() || unwrappedText === 'string' || text === 'string') return 'string';
  if (unwrapped.isNumber() || unwrappedText === 'number' || text === 'number') return 'number';
  if (unwrapped.isBoolean() || unwrappedText === 'boolean' || text === 'boolean') return 'boolean';
  if (
    unwrapped.isStringLiteral() ||
    unwrapped.isNumberLiteral() ||
    unwrapped.isBooleanLiteral()
  ) {
    return 'enum';
  }

  if (
    unwrapped.getCallSignatures().length > 0 ||
    /\([^)]*\)\s*=>/.test(unwrappedText) ||
    unwrappedText.startsWith('Function')
  ) {
    return 'function';
  }

  if (
    unwrapped.isArray() ||
    unwrappedText.endsWith('[]') ||
    /^Array</.test(unwrappedText) ||
    /^ReadonlyArray</.test(unwrappedText)
  ) {
    return 'array';
  }

  if (unwrapped.isUnion()) {
    const options = extractLiteralOptions(unwrapped);
    const nonNullish = unwrapped.getUnionTypes().filter((t) => !t.isNull() && !t.isUndefined());
    if (options.length > 0 && options.length === nonNullish.length) {
      // true | false → boolean control, not an enum dropdown
      if (options.every((o) => typeof o === 'boolean') && options.includes(true) && options.includes(false)) {
        return 'boolean';
      }
      return 'enum';
    }
    const constructive = preferConstructiveUnionMember(unwrapped);
    if (constructive !== unwrapped) {
      return classifyType(
        constructive,
        constructive.getText(undefined, TypeFormatFlags.UseAliasDefinedOutsideCurrentScope),
      );
    }
    return 'union';
  }

  // Type aliases / interfaces / anonymous objects
  const alias = unwrapped.getAliasSymbol()?.getName();
  if (alias && alias !== '__type') {
    if (unwrapped.isArray() || unwrappedText.endsWith('[]')) return 'array';
    return 'object';
  }

  if (
    unwrapped.isObject() ||
    unwrapped.isInterface() ||
    unwrapped.isClass() ||
    unwrappedText.startsWith('{') ||
    looksLikeTypeAliasName(unwrappedText)
  ) {
    return 'object';
  }

  if (unwrapped.isLiteral()) return 'enum';

  return 'unknown';
}

function extractLiteralOptions(type: Type): Array<string | number | boolean> {
  const options: Array<string | number | boolean> = [];

  const visit = (t: Type) => {
    if (t.isStringLiteral()) {
      options.push(t.getLiteralValue() as string);
      return;
    }
    if (t.isNumberLiteral()) {
      options.push(t.getLiteralValue() as number);
      return;
    }
    if (t.isBooleanLiteral()) {
      options.push(t.getText() === 'true');
      return;
    }
    if (t.isUnion()) {
      for (const part of t.getUnionTypes()) {
        if (part.isUndefined() || part.isNull()) continue;
        visit(part);
      }
    }
  };

  visit(type);
  return options;
}

/** Strip null | undefined so PathObjectType | null → PathObjectType. */
function unwrapNullish(type: Type): Type {
  if (!type.isUnion()) return type;
  const parts = type.getUnionTypes().filter((t) => !t.isUndefined() && !t.isNull());
  if (parts.length === 0) return type;
  if (parts.length === 1) return parts[0];
  // Keep pure literal unions ("PLP" | "PDP") intact for enum controls
  if (parts.every((t) => t.isStringLiteral() || t.isNumberLiteral() || t.isBooleanLiteral())) {
    return type;
  }
  return preferConstructiveUnionMember(type);
}

/**
 * When a union has several members, prefer object / array / interface over
 * primitives so fixtures stay structured (and the component stays visible).
 */
function preferConstructiveUnionMember(type: Type): Type {
  if (!type.isUnion()) return type;
  const parts = type.getUnionTypes().filter((t) => !t.isUndefined() && !t.isNull());
  if (parts.length === 0) return type;
  if (parts.length === 1) return parts[0];
  if (parts.every((t) => t.isStringLiteral() || t.isNumberLiteral() || t.isBooleanLiteral())) {
    return type;
  }

  const score = (t: Type): number => {
    if (t.isArray() || t.getArrayElementType()) return 5;
    if (t.isInterface() || t.isClass()) return 4;
    const alias = t.getAliasSymbol()?.getName();
    if (alias && alias !== '__type') return 4;
    if (t.isObject() && t.getProperties().length > 0) return 3;
    if (t.isString() || t.isNumber() || t.isBoolean()) return 1;
    return 2;
  };

  let best = parts[0];
  let bestScore = score(best);
  for (let i = 1; i < parts.length; i++) {
    const s = score(parts[i]);
    if (s > bestScore) {
      best = parts[i];
      bestScore = s;
    }
  }
  return best;
}

function looksLikeTypeAliasName(text: string): boolean {
  const cleaned = simplifyTypeText(text).split('|')[0]?.trim() ?? '';
  return /^[A-Z][A-Za-z0-9_]+$/.test(cleaned);
}

function formatTypeText(original: Type, unwrapped: Type, rawText: string): string {
  const literalOpts = extractLiteralOptions(unwrapNullish(original));
  if (
    literalOpts.length > 0 &&
    !(literalOpts.every((o) => typeof o === 'boolean') && literalOpts.includes(true) && literalOpts.includes(false))
  ) {
    return simplifyTypeText(literalOpts.map((o) => JSON.stringify(o)).join(' | '));
  }

  const base = resolveTypeDisplayName(unwrapped, rawText);

  const hadNullish =
    original.isUnion() &&
    original.getUnionTypes().some((t) => t.isNull() || t.isUndefined());
  if (hadNullish) {
    const nullish = original.getUnionTypes().some((t) => t.isNull()) ? 'null' : 'undefined';
    return simplifyTypeText(`${base} | ${nullish}`);
  }
  return simplifyTypeText(base);
}

function resolveTypeDisplayName(type: Type, rawText: string): string {
  const alias = type.getAliasSymbol()?.getName();
  if (alias && alias !== '__type' && alias !== 'default' && !alias.startsWith('__')) {
    return alias;
  }

  const sym = type.getSymbol();
  const symName = sym?.getName();
  if (symName && symName !== '__type' && symName !== 'default' && !symName.startsWith('__')) {
    return symName;
  }

  // default-exported interface → name from declaration, else filename
  for (const decl of sym?.getDeclarations() ?? []) {
    if (Node.isInterfaceDeclaration(decl) || Node.isTypeAliasDeclaration(decl)) {
      const n = decl.getName();
      if (n && n !== 'default') return n;
      const file = decl.getSourceFile().getBaseName().replace(/\.(tsx?|jsx?|d\.ts)$/, '');
      if (file && /^[A-Z]/.test(file)) return file;
    }
  }

  return simplifyTypeText(
    type.getText(undefined, TypeFormatFlags.UseAliasDefinedOutsideCurrentScope) || rawText,
  );
}

function simplifyTypeText(text: string): string {
  return text
    .replace(/import\(".*?"\)\./g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}
