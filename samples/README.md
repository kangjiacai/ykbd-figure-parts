# samples

这里只留用户审过的五张定稿成绩卡，都在 `approved/`。2026-11-06 用户勾选五张都留。卡面是圆头顶、短脖、身首拆分，并覆盖一整套发型。

| 文件 | 看什么 |
| --- | --- |
| `approved/B3.png` | 定稿卡面。种子 `B665-6G14-RPME`，名「盐巴气球」 |
| `approved/B3b.png` | 短发。种子 `Q7RF-3M2K-ZP8D`，名「雾窗火柴」 |
| `approved/B3c.png` | 盖额发。种子 `D9LA-4F7Q-NU3H`，名「纸鹤汽水」 |
| `approved/B3d-short.png` | 露额短发（`short`）。种子 `K2TS-8H5W-CROP`，名「晴天板栗」 |
| `approved/B3e-bangs.png` | 长发刘海（`bangs`），后发在身体后方。种子 `LONG-7B4N-GS9E`，名「月光拉面」 |

仓库里的样张图片只有这五张。`samples/` 根目录不再放 png。

旧目录 `reference-b3/` 已整目录删除（原先的 `B3.png`、`B3b.png`、`B3c.png` 和该目录说明）。那三张旧参考不再使用。早先被否决的引擎渲图也不要放回来，包括根目录下的 `B665-6G14-RPME.png`、`0000-0000-0000.png`、`0708-0253-0243.png`、`0509-0736-0305.png`、`0401-0174-0474.png`。用户否决了那些图的裁切、衔接和叉腰。

`preview.html` 可以在本地看当前引擎，那不是定稿。`tools/render-samples.sh` 默认拒绝运行，而且不会把临时截图写进 `samples/`。
