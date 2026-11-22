// Lists the unused-code candidates that knip cannot see, using the project's TypeScript language
// service: knip counts test files as real code and never checks props.
// Run from the repo root: node .agents/skills/unused-code-audit/scripts/find-unused.ts
// Output is candidates only: every hit must be verified by hand (see SKILL.md).

import path from 'node:path';

import ts from 'typescript';

const ROOT = process.cwd();

// Route files and config-loaded files are consumed by the router or a config, not by an import.
const CONFIG_LOADED = [/^scripts\/oxlint-plugin\//];
// Props a caller supplies through JSX children, which findReferences does not see.
const IMPLICIT_PROPS = new Set(['children']);

type ReportSection =
  | 'files imported only by tests'
  | 'exports used only by tests'
  | 'props never passed by a caller'
  | 'props never read by the component';

const parsed = ts.parseJsonConfigFileContent(
  ts.readConfigFile(path.join(ROOT, 'tsconfig.json'), (f) => ts.sys.readFile(f)).config,
  ts.sys,
  ROOT,
);
const files = parsed.fileNames.filter(
  (f) => !/\/(node_modules|android|ios|dist|coverage)\//.test(f) && !f.endsWith('.d.ts'),
);
const service = ts.createLanguageService(
  {
    getScriptFileNames: () => files,
    getScriptVersion: () => '1',
    getScriptSnapshot: (f) => {
      const text = ts.sys.readFile(f);
      return text === undefined ? undefined : ts.ScriptSnapshot.fromString(text);
    },
    getCurrentDirectory: () => ROOT,
    getCompilationSettings: () => parsed.options,
    getDefaultLibFileName: (o) => ts.getDefaultLibFilePath(o),
    fileExists: (f) => ts.sys.fileExists(f),
    readFile: (f) => ts.sys.readFile(f),
    readDirectory: (...args) => ts.sys.readDirectory(...args),
    directoryExists: (d) => ts.sys.directoryExists(d),
    getDirectories: (d) => ts.sys.getDirectories(d),
  },
  ts.createDocumentRegistry(),
);
const program = service.getProgram();
if (!program) throw new Error('TypeScript could not build a program from tsconfig.json.');
const checker = program.getTypeChecker();

const rel = (f: string) => path.relative(ROOT, f);
const isTest = (f: string) => /\.test\.tsx?$|\/__tests__\/|\/__mocks__\/|^test\//.test(rel(f));
const isRoute = (f: string) => rel(f).startsWith('app/');
const isConfigLoaded = (f: string) => CONFIG_LOADED.some((re) => re.test(rel(f)));

function getSourceFile(fileName: string): ts.SourceFile {
  const sourceFile = program!.getSourceFile(fileName);
  if (!sourceFile) throw new Error(`TypeScript has no source file for ${rel(fileName)}.`);
  return sourceFile;
}

const report: Record<ReportSection, string[]> = {
  'files imported only by tests': [],
  'exports used only by tests': [],
  'props never passed by a caller': [],
  'props never read by the component': [],
};

function referencesAt(fileName: string, position: number): ts.ReferenceEntry[] {
  return (service.findReferences(fileName, position) ?? [])
    .flatMap((symbol) => symbol.references)
    .filter((ref) => !ref.isDefinition);
}

function nodeAt(sourceFile: ts.SourceFile, position: number): ts.Node | undefined {
  let found: ts.Node | undefined;
  (function walk(node: ts.Node) {
    if (position >= node.getStart(sourceFile) && position < node.getEnd()) {
      found = node;
      ts.forEachChild(node, walk);
    }
  })(sourceFile);
  return found;
}

function location(sourceFile: ts.SourceFile, position: number): string {
  return `${rel(sourceFile.fileName)}:${sourceFile.getLineAndCharacterOfPosition(position).line + 1}`;
}

// Exports that only tests reference. Ones also used in their own file are usually exported for
// tests on purpose, so they are skipped.
function auditTestOnlyExports(sourceFile: ts.SourceFile) {
  const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
  if (!moduleSymbol) return;
  for (const exported of checker.getExportsOfModule(moduleSymbol)) {
    const declaration = exported.declarations?.[0];
    if (!declaration || declaration.getSourceFile() !== sourceFile) continue; // re-export
    const nameNode = ts.getNameOfDeclaration(declaration) ?? declaration;
    const position = nameNode.getStart(sourceFile);
    const refs = referencesAt(sourceFile.fileName, position);
    const isOnlyUsedByTests = refs.length > 0 && refs.every((r) => isTest(r.fileName));
    if (isOnlyUsedByTests) {
      report['exports used only by tests'].push(
        `${location(sourceFile, position)} ${exported.getName()}`,
      );
    }
  }
}

function propsDeclaration(
  node: ts.Node,
): { name: string; members: ts.NodeArray<ts.TypeElement> } | null {
  const isPropsName = (id: ts.Identifier) => id.text.endsWith('Props');
  if (ts.isInterfaceDeclaration(node) && isPropsName(node.name)) {
    return { name: node.name.text, members: node.members };
  }
  if (
    ts.isTypeAliasDeclaration(node) &&
    isPropsName(node.name) &&
    ts.isTypeLiteralNode(node.type)
  ) {
    return { name: node.name.text, members: node.type.members };
  }
  return null;
}

function isPassingProp(ref: ts.ReferenceEntry): boolean {
  const parent = nodeAt(getSourceFile(ref.fileName), ref.textSpan.start)?.parent;
  return (
    parent !== undefined &&
    (ts.isJsxAttribute(parent) ||
      ts.isPropertyAssignment(parent) ||
      ts.isShorthandPropertyAssignment(parent))
  );
}

function auditProps(sourceFile: ts.SourceFile) {
  ts.forEachChild(sourceFile, function visit(node) {
    const props = propsDeclaration(node);
    for (const member of props?.members ?? []) {
      if (!ts.isPropertySignature(member)) continue;
      const propName = member.name.getText(sourceFile);
      if (IMPLICIT_PROPS.has(propName)) continue;
      const position = member.name.getStart(sourceFile);
      const refs = referencesAt(sourceFile.fileName, position).filter((r) => !isTest(r.fileName));
      const passedCount = refs.filter(isPassingProp).length;
      const entry = `${location(sourceFile, position)} ${props!.name}.${propName}`;
      if (passedCount === 0) report['props never passed by a caller'].push(entry);
      else if (passedCount === refs.length) report['props never read by the component'].push(entry);
    }
    ts.forEachChild(node, visit);
  });
}

function auditTestOnlyFiles(sourceFiles: string[]) {
  const importCounts = new Map(sourceFiles.map((f) => [f, { prod: 0, test: 0 }]));
  for (const f of sourceFiles) {
    const { importedFiles } = ts.preProcessFile(getSourceFile(f).text, true, true);
    for (const imported of importedFiles) {
      const resolved = ts.resolveModuleName(
        imported.fileName,
        f,
        parsed.options,
        ts.sys,
      ).resolvedModule;
      const counts = resolved && importCounts.get(resolved.resolvedFileName);
      if (counts) counts[isTest(f) ? 'test' : 'prod']++;
    }
  }
  for (const [f, counts] of importCounts) {
    const isOnlyImportedByTests = counts.prod === 0 && counts.test > 0;
    if (isOnlyImportedByTests && !isTest(f) && !isRoute(f) && !isConfigLoaded(f)) {
      report['files imported only by tests'].push(rel(f));
    }
  }
}

const sourceFiles = files.filter((f) => program.getSourceFile(f));
for (const f of sourceFiles) {
  if (isTest(f) || isConfigLoaded(f)) continue;
  const sourceFile = getSourceFile(f);
  if (!isRoute(f)) auditTestOnlyExports(sourceFile);
  auditProps(sourceFile);
}
auditTestOnlyFiles(sourceFiles);

for (const [section, entries] of Object.entries(report)) {
  console.log(`\n## ${section} (${entries.length})`);
  for (const entry of entries.sort((a, b) => a.localeCompare(b))) console.log(entry);
}
