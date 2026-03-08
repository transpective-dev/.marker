# 👋 Welcome to .Marker！

> 📌 **Marker** - A Sticky note for Programmers!

---

1. [Why it is worth to use?]()
2. [How to use?]()
3. [supports and notes]()

---

## Why it is worth to use ?

### core values

- **group by color** - could differentiate comment type by highlights directly
  - 🔴 red = denger or there's a bugs
  - 🟡 yellow = need to fix
  - 🟢 green = good code. dont touch
  - ...etc

- 📄 **cross-language support** - It makes you able to write comment at everywhere. even the json! (with same format!)

- 🔍 **Lens comment** - allows you to read comment by hover over on code or highlight mode without clutter project ! 

### Why Marker？

| original comment | Marker |
| :--- | :--- |
| ✅ quick check and edit | ✅ bit of complex but still fine! |
| ❌ pollute project | ✅ check comment with pollution! |
| ❌ not all language support comment | ✅ but we can! |
| ❌ inconsistent format | ✅ one format, use in everywhere! |
| ❌ disparated comments | ✅ manage them in one place! |

---

## how to use ?

### function list 

| function | explain | show condition |
| :--- | :--- | :--- |
| **Add** | add new comment | if line hasnt comment |
| **Edit** | edit comment | if line has comment |
| **Delete** | delete | if line has comment  |
| **Refresh** | refresh changes | always |

> ⚠️ **Add** and **Edit** are never shows at same time.

---

### open menu

| howto | shortcut/method |
| :--- | :--- |
| **open input box by shortcut** | `Ctrl + Alt + .` |
| **open box from rightclick menu** | rightclick at line where you want to add/edit |

---

### highlight

![](https://github.com/transpective-dev/.marker/blob/main/readme/image.png)

> a **Eye Icon** will be shown after download extension like pic on above

#### click eye to 

1. ✅ **Toggle Highlight On/Off** - toggle of/off highlight mode
2. 🎨 **comment visualization** - check comments withoud hover over the lines!
3. 🌈 **markup lines with matched color** - markup lines with color you selected!

---

### support and notes

| env and features | requires |
| :--- | :--- |
| **VS Code** | `1.100.0+` |
| **can use md format for comment?** | `yes!` |

---

### about bugs and things you should know

#### about Refresh

> you must have to refresh with your own hand.
> we'd considered to use onDidSaveTextDocument for the refresh,
> but, that'll be too denger if user using auto-save.
> so, we decided to use manual refresh for write changedList to .marker.jsonl!

the refresh will be call by

'onDidCloseTextDocument': when you close your file that has been changed.
'deactivate': when extension turns off.
'manual refresh': refresh from function bar

also, write change into file takes time.
please refresh manually if there is too many comment in file.

---

#### how many .marker.jsonl?

current version only support one file as you can see from the code.

but we are planning to increase detectable file count at somewhere version.

---

#### about changing lines

> ⚠️ ** we only able to track the line changes by the ways in below**

- ✅ change from last of previous line
- ✅ use `Ctrl + Shift + Enter`

> ❌ **we currently cannot tracking the line changing by changing line from codehead **

---

### 🐛 about bugs

> feedback about bugs and improvements are very welcome！
> tell me anytime!

---

## 🤝 in the end

thanks for reading this far！❤️

and those are full introduction about '.marker'。

###  concept

>  **comment, is most closely thing to the every programmers.**
> 
> i hope everyone can use good thing from bottom of my heart as a member of the programmer community 
> 
> so, i really hope you guys feel free to send me feedback for our project, and everyones coding life.
> 
> this project is not just belongs to me, but belongs to everyone who wants to use a good stuff.
>
> thanks for reading again
---

<div align="center">

**Made with ❤️ by the Marker Community and transpective dev team**

</div>