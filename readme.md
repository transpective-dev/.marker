# 👋 Welcome to .Marker！

> 📌 **Marker** - A sticky note system for programmers. Write comments anywhere without cluttering your code!

![](https://github.com/transpective-dev/.marker/blob/main/readme/preview.png)

---

## 🚀 Why Use .Marker?

### 🧩 Core Values

- **🌈 Group by Color** - Differentiate comment types by high-contrast highlights.
- **📄 Cross-Language Support** - Persistent comments for any language, even JSON or plain text.
- **🔍 Lens Mode** - Read comments via Hover or CodeLens without leaving the codebase.
- **⚡ Zero Pollution** - Comments are stored in a separate `.marker-storage/` folder, keeping your git diffs clean.

### 🆚 Contrast

| Original Comments              | .Marker                    |
| :----------------------------- | :------------------------- |
| ✅ Quick edit                  | ✅ Integrated VS Code menu |
| ❌ Pollute project diffs       | ✅ Transparent storage     |
| ❌ Some languages lack support | ✅ Universal support       |
| ❌ Visual noise                | ✅ Toggleable visibility   |

---

## 🛠️ How to Use

### Function List

- **Add/Edit**: Right-click or use `Ctrl + Alt + .` to add/edit a comment.
- **Delete**: Remove markers via the QuickPick menu.
- **Refresh**: Manually sync changes to disk if needed (though we handle most cases automatically).
- **Expand**: Use `Ctrl + Alt + E` to automatically expand a marker to the nearest `{}`, `[]`, or `()` block.

### ⌨️ Shortcuts

| Action               | Shortcut                             |
| :------------------- | :----------------------------------- |
| **Add/Edit Comment** | `Ctrl + Alt + .`                     |
| **Expand Range**     | `Ctrl + Alt + E`                     |
| **Toggle Highlight** | Click the **Eye Icon** in status bar |

---

## 🧬 Intelligent Line Tracking (Phase 3.5 Engine)

We use a high-precision boundary tracking engine (Commit `cf4eb2` Logic) to ensure your markers follow your code:

- ✅ **Automatic Drift**: Markers move down when you insert lines above them.
- ✅ **Dynamic Expansion**: Pressing `Enter` inside a highlighted block expands the range automatically.
- ✅ **Head/Tail Protection**: Intelligent detection of line-start insertions prevents marker "usurpation."

---

## 🤝 Community

Feedback and bug reports are highly welcome! This project belongs to everyone who wants a cleaner coding experience.

**Made with ❤️ by the Marker Community and transpective dev team**
