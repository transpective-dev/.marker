<div align='center'>

![](https://github.com/transpective-dev/.marker/blob/main/readme/header.png)

</div>

Welcome to **.Marker** — a powerful, non-intrusive, cross-language commenting and markup tool for VS Code.

---

### 🌟 What is .Marker?

Traditional comments are limited to plain text, pollute your git diffs, and aren't supported by all file types (like JSON).

**.Marker solves this** by storing all annotations in a separate `.marker-storage/` folder, completely outside your source files!
Your code stays clean, your diffs stay readable, and your comments become a rich, interactive experience.

- **Manage all comments in one place**
- **Distinguish comment types at a glance** with custom colors and layers
- **Use rich text (Markdown/HTML)** for your hover comments
- **Universal support:** Comment on _any_ file type (JSON, YAML, etc.)

We highly recommend this if you are a **Vibe coder**, someone who wants to keep their project pristine but still needs extensive documentation, or if you need customized comments for specific use cases.

![](https://github.com/transpective-dev/.marker/blob/main/readme/preview.png)

---

### 🚀 Core Features & Capabilities

- **Multi-line Highlighting & Inline CodeLens:** Adds non-intrusive hover tooltips and inline headers directly above your code without modifying the file.
- **Hierarchy & Overlap Mechanism:**
  - Stack multiple markers on the same line.
  - Narrower/more specific ranges win priority.
  - CodeLens intelligently displays `[+N]` when multiple markers overlap.
- **Add & Edit Coexistence:** When your cursor is inside a wide marker, you can choose to seamlessly `Add` a precise sub-marker or `Edit` the existing outer layer.
- **Smart Range-Aware Deletion:** Deletes only the specific marker layer your cursor targets, without wiping out overlapping structures.
- **Custom Color Palette:** Dynamically add, edit, or remove highlighting colors. Complete with 3D properties (Label, Description, Hex Code) and auto-generated SVG icons in the menu.
- **Global Jump & Search:** Instantly list, search, and jump to any marker across your entire workspace.
- **Dynamic Line Tracking:** Modifying your code (inserting/deleting lines) will automatically shift your marker ranges to stay perfectly anchored to the original code block.
- **Smart Block Expansion:** Press the expand shortcut to automatically detect and wrap nearest `{ }`, `[ ]`, or `( )` blocks.

| Traditional Comments         | .Marker Features                    |
| :--------------------------- | :---------------------------------- |
| Hand-typed syntax            | Integrated VS Code interactive menu |
| Pollutes Git diffs           | Transparent external storage        |
| Language-dependent support   | **100% Universal support**          |
| Always visible, visual noise | **Toggleable visibility**           |

---

### 🛠️ How to Use .Marker

**Keyboard Shortcuts**:

| Action               | Shortcut                                                                                                                |
| :------------------- | :---------------------------------------------------------------------------------------------------------------------- |
| **Open Options**     | `Ctrl + Alt + .` (or Right-click context menu)                                                                          |
| **Expand Range**     | `Ctrl + Alt + E`                                                                                                        |
| **Toggle Highlight** | ![](https://github.com/transpective-dev/.marker/blob/main/readme/eyes.png) Click the **Eye Icon** (top-right of editor) |

![](https://github.com/transpective-dev/.marker/blob/main/readme/image.png)

**Options Menu (`Ctrl + Alt + .`)**

| Option      | Description                                                            |
| :---------- | :--------------------------------------------------------------------- |
| **Add**     | Add a new comment to the current line or multi-line selection          |
| **Edit**    | Edit the rich content or color of an existing marker (Hierarchy-aware) |
| **Delete**  | Remove the most precise comment at the current cursor range            |
| **Jump**    | Search and navigate to any marker globally                             |
| **Color**   | Manage your custom design system and highlight colors                  |
| **Refresh** | Manually flush and rewrite the UI                                      |
| **Config**  | Open the config file directly to edit raw settings                     |

**Multi-line & Expand Range**
Select multiple lines before opening the menu to highlight entire blocks. Alternatively, place your cursor on a line with an existing marker and press `Ctrl + Alt + E` to magically wrap the nearest code block!

---

## In the last

### 🤝 Community

Feedback and bug reports are highly welcome! This project belongs to everyone who wants a cleaner coding experience.

**Made with ❤️ by the Marker Community and transpective dev team**

### Note

#### Known Issues:

- **Comment Cluttering:** Comments may become cluttered when moving lines from outside into the annotated range.
- **Range Shrinking:** The comment range may shrink when moving lines upward and could disappear if the start line is completely covered.

We are aware of these limitations and are currently investigating solutions. If you have any insights or fixes, please feel free to contribute.

_thank you for your help._
