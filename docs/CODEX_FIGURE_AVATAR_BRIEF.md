# Codex 任务：「你可能不知道」小工具 · 自研简笔小人指纹形象

## 复制给 Codex 的提示词

```
仓库：/workspace/xhs_ai/minitool/guess-en-name/（离线 H5 小工具「你可能不知道」）。
任务：把现有 5×5 几何 Identicon 指纹头像，升级为「部件拼装式简笔小人」：用本局指纹码（如 B665-6G14-RPME，由 js/fingerprint.js 的 F.encode 生成）作种子，确定性地生成独一无二的小人（发型/眼睛/嘴/身体衣服/四肢姿势/配色/可选配件；必须含可见手臂和腿，不是只有头像），作为成绩卡主角，并能单独导出形象到相册。
现状：js/fingerprint.js 有 F.avatarModel / F.avatarPaths / F.avatarSVG(fp) / F.drawAvatar(ctx, fp, x, y, size)（挂在 window.YKBD_F）；js/render.js 有 R.drawAvatarImage(fp)；js/app.js 的 saveImg('avatar', card) 已是单独存形象钩子。CSS/JS 正处于轻 Neo-Brutal 半迁移状态，别破坏。
硬约束：纯离线，不得有外链 JS/字体/fetch；兼容 Chrome 61（只用 ES5 + 已在用的写法，不要可选链、??、class 字段等需 Babel 的语法）；用本地 SVG 字符串或 canvas 绘制；不得引入或模仿 Multiavatar 的源码/图形（许可证限制）；所有文案禁用「冷知识」一词。
视觉：轻 Neo-Brutal——冷灰底、白卡、粗黑描边（约 3–4px@512）、硬投影（无模糊偏移阴影）；强调色只用荧光黄绿 #C8F542 类 + 淡紫；小人简笔、少细节、小尺寸可读；1080×1440 成绩卡中形象占高度 ≥50%。
种子：把指纹码去掉连字符后按字符/字节切段，分别决定发型、眼睛、嘴、身体/衣服、配色（主色+强调色）、配件（含"无"）；每维 ≥8 个选项；同一种子永远同一形象；不同维度用不同段，避免相关。在 README 里给出组合数下界的计算。
交付：
1) 新模块 js/figure-avatar.js（含 SVG 部件数据），暴露 figureModel(fp)、figureSVG(fp, size)、drawFigure(ctx, fp, x, y, size)；
2) 让 F.avatarSVG / F.drawAvatar（或 R.drawAvatarImage）改走新引擎，保持调用签名不变，旧 Identicon 保留为 fallback 并写清替换说明；在 index.html 以本地 <script> 引入（放在 fingerprint.js 之前或之后按依赖）；
3) 3–5 张不同种子样张 PNG（必须含 B665-6G14-RPME），放 card-trials-avatar-hero/figure-codex/（可用 tools/ 下现有方式或无头 Chrome 渲染）；
4) card-trials-avatar-hero/figure-codex/README.md：部件表、组合数、如何换种子预览（例如 preview.html?fp=XXXX-XXXX-XXXX）。
不要做：不改 redapp 配置、不重新打包 zip/dist、不登录小红书、不用「冷知识」文案、不抄 Multiavatar 具体图形。
完成后：列出改动文件、组合数、样张路径，并说明在 Chrome 61 下的兼容自检方式。
```

---

## 详细规格

### 1. 目标
- 指纹码 → 确定性简笔小人（头、发型、五官、身体/衣服、**可见四肢与姿势**、配色、配件）。不是圆形大头像；全身简笔站立小人。
- 作为成绩卡主角（替代现几何头像位置并放大）；`saveImg('avatar')` 导出单独形象 PNG（建议 1080×1080，冷灰底+白卡+硬投影）。

### 2. 仓库现状
| 位置 | 现状 | 处理 |
|---|---|---|
| `js/fingerprint.js` | `F.encode/decode` 指纹码；`fnv`/`rng`；`avatarModel/avatarPaths/avatarSVG/drawAvatar` 为 5×5 Identicon（色 `#2B44C9`/`#1E2A36`） | 头像函数转调新引擎；Identicon 留作 fallback |
| `js/render.js` | `R.drawAvatarImage(fp)` | 使用新引擎出图 |
| `js/app.js` | `saveImg(kind, card)`，`r-save-av`/`d-save-av` 按钮 | 保持钩子，只换内容 |
| `css/`、`card-trials-neobrutal/` | 轻 Neo-Brutal 半迁移 | 参考配色，勿大改 |
| `dist/` | 正式包产物 | 不要动 |

可复用 `fnv`/`rng`，但需要导出（或在新模块内复制一份）。

### 3. 硬约束
- 离线：无外链、无 fetch、无网络字体。
- Chrome 61：ES5 风格（`var`、`function`），避免 `?.`、`??`、展开对象、`Array.prototype.flat`、`Object.fromEntries` 等；`Path2D` 需判空（现代码已有先例）。canvas 绘 SVG 可走 `Image` + data URI，注意 onload 异步。
- 不引入 Multiavatar 代码/设计；部件全部自绘。
- 文案禁用「冷知识」。

### 4. 视觉
- 底：冷灰（如 `#E6E8EC`）；卡：白 + 黑粗描边 + 硬投影（偏移 8–12px，纯黑）。
- 强调色：`#C8F542` 系 + 淡紫（如 `#C9B8FF`）；主色板 8+ 个偏冷/中性色，确保与黑描边对比足。
- 小人：大头小身（约 1:1），统一描边粗细，圆端点；表情靠眼+嘴。
- 1080×1440 成绩卡：形象高度 ≥ 720px。

### 5. 种子映射（建议）
指纹码去 `-` 得 12 字符，按 base32/36 取值（或对全串 `fnv` 后用 `rng` 派生，但每维须基于不同段）：

| 维度 | 来源 | 选项数（≥） |
|---|---|---|
| 发型 | 字符 0–1 | 12 |
| 眼睛 | 字符 2–3 | 10 |
| 嘴 | 字符 4–5 | 10 |
| 身体/衣服 | 字符 6 | 8 |
| 四肢/姿势（站姿、侧身、举手等，须画出手臂和腿） | 字符 7 | 8 |
| 主色 | 字符 8–9 | 8 |
| 强调色/搭配 | 字符 10 | 4 |
| 配件（含无） | 字符 11 | 8 |

下界示例：12×10×10×8×8×8×4×8 = **约 1960 万** 种（含四肢姿势维）；若简化每维 8：仍远超百万。README 写实际数字。同一种子必须渲染完全一致（禁止 `Math.random`）。

### 6. 交付物
- `js/figure-avatar.js` + 部件数据（可同文件）。
- 现有 API 对齐：`F.avatarSVG(fp)` → 新 SVG；`F.drawAvatar(ctx, fp, x, y, size)` → 新绘制；写替换说明。
- 样张 3–5 张 PNG → `card-trials-avatar-hero/figure-codex/`（含 `B665-6G14-RPME`，最好含一张 1080×1440 成绩卡合成）。
- `card-trials-avatar-hero/figure-codex/README.md`：部件表、组合数、换种子预览方法。

### 7. 不要做
- 不改 redapp、不重新打包 zip、不碰 `dist/`。
- 不登录小红书、不发帖。
- 不用「冷知识」文案。
- 不抄 Multiavatar 图形。
