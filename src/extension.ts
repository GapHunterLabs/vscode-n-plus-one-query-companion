import * as vscode from 'vscode';
import { scan } from './nPlusOneScanner';
import { recordHit } from './reviewPrompt';

let diagnostics: vscode.DiagnosticCollection;

const APPLICABLE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

function isApplicable(document: vscode.TextDocument): boolean {
  return APPLICABLE_EXTENSIONS.some((ext) => document.uri.path.endsWith(ext)) && !document.uri.path.includes('/node_modules/');
}

function refresh(context: vscode.ExtensionContext, document: vscode.TextDocument): void {
  if (!isApplicable(document)) return;

  const hits = scan(document.getText());
  const result = hits.map((hit) => {
    const range = new vscode.Range(hit.line - 1, 0, hit.line - 1, Number.MAX_SAFE_INTEGER);
    const diagnostic = new vscode.Diagnostic(
      range,
      `"${hit.ormCall}(" runs inside a loop -- classic N+1 query pattern. Consider batching (a single find-many/IN query) or eager-loading relations instead.`,
      vscode.DiagnosticSeverity.Warning,
    );
    diagnostic.source = 'N+1 Query Companion';
    // A real finding actually flagged in the user's code -- dedup'd by
    // file URI + line so re-scanning on every keystroke doesn't inflate
    // the count towards the review prompt.
    recordHit(context, `${document.uri.toString()}:${hit.line - 1}`);
    return diagnostic;
  });
  diagnostics.set(document.uri, result);
}

export function activate(context: vscode.ExtensionContext): void {
  diagnostics = vscode.languages.createDiagnosticCollection('nPlusOneQueryCompanion');
  context.subscriptions.push(diagnostics);

  vscode.workspace.textDocuments.forEach((doc) => refresh(context, doc));

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((doc) => refresh(context, doc)),
    vscode.workspace.onDidChangeTextDocument((event) => refresh(context, event.document)),
    vscode.workspace.onDidCloseTextDocument((document) => diagnostics.delete(document.uri)),
  );
}

export function deactivate(): void {
  diagnostics?.dispose();
}
