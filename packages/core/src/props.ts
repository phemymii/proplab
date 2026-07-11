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
  if (depth > 4) return [];

  // Unwrap Promise / Readonly etc lightly
  const apparent = type.getApparentType();
  const target = apparent.isUnion() ? flattenUnion(apparent) : apparent;

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
  const kind = classifyType(type, typeText);
  const field: PropField = {
    name,
    kind,
    required,
    typeText: simplifyTypeText(typeText),
  };

  if (kind === 'enum' || kind === 'union') {
    const options = extractLiteralOptions(type);
    if (options.length > 0) {
      field.options = options;
      field.kind = 'enum';
    }
  }

  if (kind === 'object') {
    field.fields = typeToFields(type, checker, seen, depth + 1);
  }

  if (kind === 'array') {
    const args = type.getTypeArguments();
    const element = type.getArrayElementType?.() ?? args[0];
    if (element) {
      const elText = element.getText();
      field.item = describeType(
        'item',
        element,
        checker,
        true,
        elText,
        seen,
        depth + 1,
      );
    }
  }

  return field;
}

function classifyType(type: Type, typeText: string): PropKind {
  const text = typeText.replace(/\s+/g, ' ');

  if (type.isString() || text === 'string') return 'string';
  if (type.isNumber() || text === 'number') return 'number';
  if (type.isBoolean() || text === 'boolean') return 'boolean';
  if (type.isStringLiteral() || type.isNumberLiteral() || type.isBooleanLiteral()) return 'enum';

  if (REACT_NODE_NAMES.has(text) || /React\.(ReactNode|ReactElement)/.test(text) || text === 'JSX.Element') {
    return 'reactNode';
  }

  if (type.getCallSignatures().length > 0 || /\([^)]*\)\s*=>/.test(text) || text.startsWith('Function')) {
    return 'function';
  }

  if (type.isArray() || text.endsWith('[]') || /^Array</.test(text) || /^ReadonlyArray</.test(text)) {
    return 'array';
  }

  if (type.isUnion()) {
    const options = extractLiteralOptions(type);
    if (options.length > 0) return 'enum';
    // string | undefined etc.
    const nonNull = type.getUnionTypes().filter((t) => !t.isUndefined() && !t.isNull());
    if (nonNull.length === 1) return classifyType(nonNull[0], nonNull[0].getText());
    return 'union';
  }

  if (type.isObject() || type.isInterface() || type.isClass() || text.startsWith('{')) {
    return 'object';
  }

  if (type.isLiteral()) return 'enum';

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

function flattenUnion(type: Type): Type {
  // Prefer non-undefined branch for property walking when it's T | undefined
  const parts = type.getUnionTypes().filter((t) => !t.isUndefined() && !t.isNull());
  if (parts.length === 1) return parts[0];
  return type;
}

function simplifyTypeText(text: string): string {
  return text
    .replace(/import\(".*?\"\)\./g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}
