import * as vscode from 'vscode';

// --- Activation function ---
export function activate(context: vscode.ExtensionContext) {
    console.log('Extension "rust-auto-braces" is now active!');

    // Register the command that is triggered by the key binding
    let disposable = vscode.commands.registerTextEditorCommand('rustAutoBraces.onEnter', (textEditor, edit) => {
        handleEnterKey(textEditor).catch(err => {
            console.error('Error in rustAutoBraces.onEnter:', err);
            vscode.window.showErrorMessage('Error in Rust Auto Braces extension: ' + err.message);
        });
    });

    context.subscriptions.push(disposable);
}

// --- Deactivation function ---
export function deactivate() {
    console.log('Extension "rust-auto-braces" is now deactivated.');
}

// --- Core logic for Enter key ---
async function handleEnterKey(editor: vscode.TextEditor): Promise<void> {
    try {
        // Only run in Rust files
        if (editor.document.languageId !== 'rust') {
            await vscode.commands.executeCommand('default:type', { text: '\n' });
            return;
        }

        const document = editor.document;
        const selections = editor.selections;

        // Focus on the first (or only) selection for simplicity
        // Multi-cursor is not fully supported here, but serves as a base
        const primaryCursorPos = selections[0].active;
        const currentLineNumber = primaryCursorPos.line;
        const currentLine = document.lineAt(currentLineNumber);
        const lineText = currentLine.text;
        const trimmedLine = lineText.trimEnd(); // Remove trailing whitespace

        // 1. Condition: Is the cursor *exactly* at the end of the line (after trimming)?
        if (primaryCursorPos.character !== trimmedLine.length) {
            // If not at the end, normal Enter behavior
            await vscode.commands.executeCommand('default:type', { text: '\n' });
            return;
        }

        // Ignore lines that end with '{', ';', or '}'
        if (trimmedLine.endsWith('{') || trimmedLine.endsWith(';') || trimmedLine.endsWith('}')) {
            await vscode.commands.executeCommand('default:type', { text: '\n' });
            return;
        }

        // Strip comments from the line before analysis
        const lineWithoutComments = removeComments(trimmedLine);
        if (lineWithoutComments.trim() === '') {
            await vscode.commands.executeCommand('default:type', { text: '\n' });
            return;
        }

        // Check if we're in a string context
        if (isInsideString(lineWithoutComments)) {
            await vscode.commands.executeCommand('default:type', { text: '\n' });
            return;
        }

        // 3. Condition: Is this a line that requires braces?
        // More comprehensive regex that should cover most cases.
        // Allows modifiers like pub, async, unsafe at the beginning.
        // Looks for keywords followed by something (but not { or ; at the end).
        const braceTriggerRegex = /^\s*(pub(\s*\([^)]+\))?\s*)?(async\s+)?(unsafe\s+)?(fn|struct|enum|impl|trait|match|loop|if|while|for|mod)\b(?!.*[{;]$).*$/;

        // Special case: 'else' or 'else if'
        const elseTriggerRegex = /^\s*\}?\s*else(\s+if\b.*)?\s*$/;

        let needsBraces = braceTriggerRegex.test(lineWithoutComments) || elseTriggerRegex.test(lineWithoutComments);

        // Refinement: Exclude cases where e.g. 'if' is part of a macro or occurs in a string (rudimentary)
        // This is not perfect, but prevents some false alarms.
        if (needsBraces && isMacroInvocation(lineWithoutComments)) {
            needsBraces = false;
        }

        if (needsBraces) {
            // Braces needed!
            const config = vscode.workspace.getConfiguration('rustAutoBraces');
            const braceStyle = config.get<'nextLine' | 'sameLine'>('braceStyle', 'nextLine');
            const addEmptyLine = config.get<boolean>('addEmptyLine', false);

            const indentChar = editor.options.insertSpaces ? ' '.repeat(editor.options.tabSize as number) : '\t';
            const currentIndent = getIndentation(lineText);
            const nextLineIndent = currentIndent + indentChar;

            let textToInsert: string;
            let cursorPosAfterInsert: vscode.Position;

            if (braceStyle === 'sameLine') {
                // Style: fn main() {
                //          ^Cursor
                //      }
                textToInsert = addEmptyLine 
                    ? ` {\n${nextLineIndent}\n${currentIndent}}`
                    : ` {\n${nextLineIndent}\n${currentIndent}}`;
                
                // Position cursor after indentation in the new line
                cursorPosAfterInsert = new vscode.Position(currentLineNumber + 1, nextLineIndent.length);
            } else { // nextLine (default)
                // Style: fn main()
                //      {
                //          ^Cursor
                //      }
                textToInsert = addEmptyLine 
                    ? `\n${currentIndent}{\n${nextLineIndent}\n\n${currentIndent}}`
                    : `\n${currentIndent}{\n${nextLineIndent}\n${currentIndent}}`;
                
                // Position cursor after indentation in the *second* new line
                cursorPosAfterInsert = new vscode.Position(currentLineNumber + 2, nextLineIndent.length);
            }

            // Perform the edit
            await editor.edit(editBuilder => {
                editBuilder.insert(primaryCursorPos, textToInsert);
            }, { undoStopBefore: true, undoStopAfter: true });

            // Set the cursor position
            editor.selection = new vscode.Selection(cursorPosAfterInsert, cursorPosAfterInsert);

        } else {
            // No special braces needed, normal Enter
            await vscode.commands.executeCommand('default:type', { text: '\n' });
        }
    } catch (err) {
        console.error('Error in handleEnterKey:', err);
        // Fall back to default behavior if there's an error
        await vscode.commands.executeCommand('default:type', { text: '\n' });
    }
}

// Helper function: Determines the indentation of a line
function getIndentation(line: string): string {
    const match = line.match(/^\s*/);
    return match ? match[0] : '';
}

// Helper function: Removes comments from a line
function removeComments(line: string): string {
    let result = '';
    let insideString = false;
    let escapeNext = false;
    let i = 0;

    while (i < line.length) {
        const char = line[i];
        const nextChar = i + 1 < line.length ? line[i + 1] : '';

        // Handle string context
        if (char === '"' && !escapeNext) {
            insideString = !insideString;
            result += char;
        } 
        // Handle comments
        else if (char === '/' && nextChar === '/' && !insideString) {
            // Found a line comment, return what we have so far
            return result;
        } 
        // Handle escape sequences in strings
        else if (char === '\\' && insideString && !escapeNext) {
            escapeNext = true;
            result += char;
        } else {
            escapeNext = false;
            result += char;
        }
        i++;
    }

    return result;
}

// Helper function: Checks if we're inside a string (more robust)
function isInsideString(line: string): boolean {
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"' && !escapeNext) {
            inString = !inString;
        } else if (char === '\\' && inString) {
            escapeNext = !escapeNext;
        } else {
            escapeNext = false;
        }
    }

    return inString;
}

// Helper function: Checks if the line invokes a macro
function isMacroInvocation(line: string): boolean {
    // Match common macro patterns while excluding impl
    const macroPattern = /\b(?!impl\b)[a-zA-Z_][a-zA-Z0-9_]*!/;
    return macroPattern.test(line);
}