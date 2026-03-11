<div align='center'>

![](https://github.com/transpective-dev/.marker/blob/main/readme/header.png)

</div>

This readme is made following this structure.

- "What is .Marker?"
- "Why we use .Marker?"
- "How to use .Marker?"

### What is .Marker?

Marker is a cross-language commenting and markup tool

to help you

- manage comments in one place
- distinguish comment types at a glance without reading through them
- use Markdown to customize your comments in any way you want
- comment on files that don't support comments (like JSON)

etc.

We highly recommend this to people who are

- Vibe coders
- Want to keep their project clean but still need comments
- Need customized comments for specific use cases

---

### Why we use .Marker?

Traditional comments are too limited.

They only support plain text, can't be toggled off visually, pollute your git diffs, and some file types don't support them at all.

.Marker solves this by storing all annotations in a separate `.marker-storage/` folder —
completely outside your source files. This means your code stays clean, your diffs stay readable, and your comments can be as rich as you want.

If you work with JSON, YAML, or any file that blocks native comments, .Marker covers you there too.

| Original Comments            | .Marker                 |
| :--------------------------- | :---------------------- |
| Quick to write               | Integrated VS Code menu |
| Pollutes git diffs           | Transparent storage     |
| Some languages lack support  | Universal support       |
| Always visible, visual noise | Toggleable visibility   |

---

### How to use .Marker?

**Keyboard Shortcuts**:

| Action               | Shortcut                                          |
| :------------------- | :------------------------------------------------ |
| **Open Options**     | `Ctrl + Alt + .` or Open from Right-click menu    |
| **Expand Range**     | `Ctrl + Alt + E`                                  |
| **Toggle Highlight** | Click the **Eye Icon** in the top-right of editor |

**Options Menu**

When you open the menu via shortcut or right-click, you'll see:

| Option      | What it does                                       |
| :---------- | :------------------------------------------------- |
| **Add**     | Add a new comment to the current line or selection |
| **Edit**    | Edit the content or color of an existing comment   |
| **Delete**  | Remove the comment at the current line             |
| **Refresh** | Manually flush and rewrite the storage file        |
| **Config**  | Open the config file directly to edit settings     |
| **Color**   | Add, edit, or remove colors from your palette      |

**Multi-line**

Select multiple lines before opening the menu. The comment will cover the entire selected range and highlight all of it.

**Expand Range**

If a marker already exists on your current line, pressing `Ctrl + Alt + E` will automatically detect the nearest enclosing block (`{}`, `[]`, `()`) and expand the range to cover it.

---

### In the last

## 🤝 Community

Feedback and bug reports are highly welcome! This project belongs to everyone who wants a cleaner coding experience.

**Made with ❤️ by the Marker Community and transpective dev team**


### Note

we will add webview panel soon.

through the webview, we could do more things!