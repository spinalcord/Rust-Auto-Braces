# Rust Auto Braces

This VS Code extension automatically inserts a pair of curly braces `{}` and positions the cursor appropriately when you press `Enter` at the end of lines that typically start a Rust code block (like `fn`, `struct`, `if`, `match`, etc.). It aims to speed up common Rust coding patterns.

## Features

* **Automatic Brace Insertion:** When you press `Enter` at the very end of a line containing a Rust construct that starts a block, the extension automatically adds the opening and closing curly braces.
* **Smart Cursor Placement:** The cursor is automatically placed inside the newly created block, indented correctly according to your editor settings.
* **Configurable Brace Style:** Choose between placing the opening brace on the next line (default) or on the same line as the statement.
* **Optional Empty Line:** Add an empty line before the closing brace if desired.
* **Robust Comment Handling:** Properly ignores keywords that appear in comments.
* **String Context Detection:** Accurately detects when you're inside a string to prevent false triggers.
* **Context-Aware:** Avoids adding braces if the line already ends with `{`, `;`, or `}`, or if the cursor isn't at the end of the relevant code on the line.
* **Supported Constructs:** Works with `fn`, `struct`, `enum`, `impl`, `trait`, `match`, `loop`, `if`, `while`, `for`, `else`, and `else if`.

**Example (`nextLine` style - default):**

```
fn main()█   <-- Press Enter here
```

becomes:

```rust
fn main()
{
    █       <-- Cursor is placed here, indented
}
```

**Example (`sameLine` style):**

```
if condition█   <-- Press Enter here (with setting changed)
```

becomes:

```rust
if condition {
    █       <-- Cursor is placed here, indented
}
```

**Example (with `addEmptyLine` enabled):**

```rust
fn main()
{
    █
    
}
```

## Requirements

* Visual Studio Code version 1.60.0 or higher.
* The extension activates automatically for files with the `rust` language identifier. No other dependencies are required to run the extension itself.

## Extension Settings

This extension contributes the following settings, which can be configured in your User or Workspace Settings (`Ctrl+,`):

* `rustAutoBraces.braceStyle`: Controls the placement of the opening curly brace.
  * `"nextLine"` (default): Places the opening brace on the line *after* the statement.
    ```rust
    fn example()
    {
        // Code block
    }
    ```
  * `"sameLine"`: Places the opening brace on the *same* line as the statement, preceded by a space.
    ```rust
    fn example() {
        // Code block
    }
    ```

* `rustAutoBraces.addEmptyLine`: Adds an empty line before the closing brace.
  * `false` (default): No extra empty line.
    ```rust
    fn example() {
        // Code
    }
    ```
  * `true`: Adds an empty line before the closing brace.
    ```rust
    fn example() {
        // Code
        
    }
    ```

* `rustAutoBraces.enabled`: Enable or disable the extension.
  * `true` (default): Extension is enabled.
  * `false`: Extension is disabled, restoring normal Enter key behavior.

## Known Issues

* **Multi-Cursor:** Does not fully support multi-cursor editing. The behavior will apply based on the primary cursor's position only.
* **Complex Macros:** While improved, very complex macros with unusual structures might still trigger the extension incorrectly in rare cases.
* **Suggest Widget Interference:** The `when` clause in `package.json` tries to prevent activation when suggestion/completion widgets are visible, but edge cases might exist.

Please report any unexpected behavior or bugs on the project's issue tracker.

## Release Notes

### 1.0.0

* Improved error handling with graceful fallback to normal Enter behavior
* Added robust comment handling to prevent false triggers
* Added proper string context detection
* Improved macro detection
* Added new configuration options:
  * `rustAutoBraces.addEmptyLine`: Add an empty line before the closing brace
  * `rustAutoBraces.enabled`: Enable or disable the extension
* Better handling of undo/redo behavior
* Performance improvements and code organization

### 0.1.0

* Initial release of `rust-auto-braces`.
* Features:
  * Automatic brace insertion on Enter for `fn`, `struct`, `enum`, `impl`, `trait`, `match`, `loop`, `if`, `while`, `for`, `else`, `else if`.
  * Automatic indentation and cursor placement.
  * Configurable `rustAutoBraces.braceStyle` setting (`nextLine`, `sameLine`).