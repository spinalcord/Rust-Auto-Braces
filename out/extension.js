"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
// --- Aktivierungsfunktion ---
function activate(context) {
    console.log('Extension "rust-auto-braces" is now active!');
    // Registriere den Befehl, der durch die Tastenkombination ausgelöst wird
    let disposable = vscode.commands.registerTextEditorCommand('rustAutoBraces.onEnter', (textEditor, edit) => {
        handleEnterKey(textEditor);
    });
    context.subscriptions.push(disposable);
}
// --- Deaktivierungsfunktion ---
function deactivate() {
    console.log('Extension "rust-auto-braces" is now deactivated.');
}
// --- Kernlogik für die Enter-Taste ---
async function handleEnterKey(editor) {
    const document = editor.document;
    const selections = editor.selections;
    // Fokussiere auf die erste (oder einzige) Auswahl für Einfachheit
    // Multi-Cursor wird hier nicht vollständig unterstützt, aber als Basis
    const primaryCursorPos = selections[0].active;
    const currentLineNumber = primaryCursorPos.line;
    const currentLine = document.lineAt(currentLineNumber);
    const lineText = currentLine.text;
    const trimmedLine = lineText.trimEnd(); // Entferne Leerzeichen am Ende
    // 1. Bedingung: Ist der Cursor *genau* am Ende der Zeile (nach dem Trimmen)?
    if (primaryCursorPos.character !== trimmedLine.length) {
        // Wenn nicht am Ende, normales Enter-Verhalten
        await vscode.commands.executeCommand('default:type', { text: '\n' });
        return;
    }
    // 2. Bedingung: Endet die Zeile bereits mit '{' oder ';'?
    if (trimmedLine.endsWith('{') || trimmedLine.endsWith(';')) {
        await vscode.commands.executeCommand('default:type', { text: '\n' });
        return;
    }
    // 3. Bedingung: Handelt es sich um eine Zeile, die Klammern erfordert?
    // Einfache Regex, die die meisten Fälle abdecken sollte.
    // Erlaubt Modifikatoren wie pub, async, unsafe am Anfang.
    // Sucht nach Keywords gefolgt von etwas (aber nicht { oder ; am Ende).
    // Berücksichtigt Kommentare am Ende NICHT explizit, aber das Trimmen hilft.
    const braceTriggerRegex = /^\s*(pub(\([^)]+\))?\s*)?(async\s+)?(unsafe\s+)?(fn|struct|enum|impl|trait|match|loop|if|while|for)\b.*$/;
    // Sonderfall: 'else' oder 'else if'
    const elseTriggerRegex = /^\s*\}?\s*else(\s+if\b.*)?\s*$/;
    let needsBraces = braceTriggerRegex.test(trimmedLine) || elseTriggerRegex.test(trimmedLine);
    // Verfeinerung: Schließe Fälle aus, in denen z.B. 'if' Teil eines Makros ist oder in einem String vorkommt (rudimentär)
    // Dies ist nicht perfekt, aber verhindert einige Fehlalarme.
    if (trimmedLine.includes('!') && !trimmedLine.startsWith('impl!')) { // Einfache Makro-Prüfung
        needsBraces = false;
    }
    if (countQuotes(trimmedLine) % 2 !== 0) { // Ungerade Anzahl Anführungszeichen? Wahrscheinlich in einem String.
        needsBraces = false;
    }
    if (needsBraces) {
        // Klammern benötigt!
        const config = vscode.workspace.getConfiguration('rustAutoBraces');
        const braceStyle = config.get('braceStyle');
        const indentChar = editor.options.insertSpaces ? ' '.repeat(editor.options.tabSize) : '\t';
        const currentIndent = getIndentation(lineText);
        const nextLineIndent = currentIndent + indentChar;
        let textToInsert;
        let cursorPosAfterInsert;
        if (braceStyle === 'sameLine') {
            // Stil: fn main() {
            //          ^Cursor
            //      }
            textToInsert = ` {\n${nextLineIndent}\n${currentIndent}}`;
            // Positioniere Cursor nach der Einrückung in der neuen Zeile
            cursorPosAfterInsert = new vscode.Position(currentLineNumber + 1, nextLineIndent.length);
        }
        else { // nextLine (default)
            // Stil: fn main()
            //      {
            //          ^Cursor
            //      }
            textToInsert = `\n${currentIndent}{\n${nextLineIndent}\n${currentIndent}}`;
            // Positioniere Cursor nach der Einrückung in der *zweiten* neuen Zeile
            cursorPosAfterInsert = new vscode.Position(currentLineNumber + 2, nextLineIndent.length);
        }
        // Führe die Bearbeitung durch
        await editor.edit(editBuilder => {
            editBuilder.insert(primaryCursorPos, textToInsert);
        });
        // Setze die Cursorposition
        editor.selection = new vscode.Selection(cursorPosAfterInsert, cursorPosAfterInsert);
    }
    else {
        // Keine speziellen Klammern benötigt, normales Enter
        await vscode.commands.executeCommand('default:type', { text: '\n' });
    }
}
// Hilfsfunktion: Ermittelt die Einrückung einer Zeile
function getIndentation(line) {
    const match = line.match(/^\s*/);
    return match ? match[0] : '';
}
// Hilfsfunktion: Zählt nicht-escaped Anführungszeichen (sehr einfach)
function countQuotes(line) {
    let count = 0;
    let escaped = false;
    for (const char of line) {
        if (char === '"' && !escaped) {
            count++;
        }
        escaped = char === '\\' && !escaped;
    }
    return count;
}
//# sourceMappingURL=extension.js.map