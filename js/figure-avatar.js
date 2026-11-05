/* 部件拼装式全身形象。种子是指纹码（如 B665-6G14-RPME）。
 * 去连字符后 12 个字符分段，互不混用：
 *   0-1 发型(12)  2-3 眼睛(10)  4-5 嘴(10)  6 衣服(8)
 *   7 四肢姿势(8)  8-9 主色(8)  10 强调色(8)  11 配件(8)
 * 同一种子永远同一形象。绘制过程没有随机数。
 * 图层固定：后发 → 身体 → 脖子 → 头（含耳）→ 前发刘海 → 五官。
 * 长发/披肩发的后发片在身体后面，两侧从肩后露出，不夹在头和衣领之间。
 * 画风对齐 B3 定稿：干净头型、耳鼻眉与腮红、衣服有领口/扣/袋/帽绳、鞋有鞋底、四肢是有体积的色块。
 * 绘制全部自绘（圆、椭圆、圆角矩形、折线），Chrome 61 / ES5。
 * 若已加载 js/fingerprint.js，会把 F.avatarSVG / F.drawAvatar 指到本引擎。
 */
(function () {
  'use strict';

  var VIEW = 320;
  var INK = '#000000';
  var WHITE = '#FFFFFF';
  var CX = 160;
  var ALPHA = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

  /* bangs 必须盖额；short 允许露额；crop 必须露额。表里没有的 id 视为未声明。 */
  var HAIR_TYPE = {
    bob: 'bangs',
    side: 'bangs',
    twin: 'bangs',
    long: 'bangs',
    pony: 'bangs',
    shoulder: 'bangs',
    swoop: 'bangs',
    bun: 'bangs',
    afro: 'short',
    spiky: 'short',
    short: 'crop',
    buzz: 'crop'
  };
  var HAIR = [
    { id: 'bob', name: '齐耳波波' },
    { id: 'short', name: '短发' },
    { id: 'side', name: '偏分' },
    { id: 'bun', name: '单丸子' },
    { id: 'twin', name: '双丸子' },
    { id: 'long', name: '长直发' },
    { id: 'pony', name: '侧马尾' },
    { id: 'afro', name: '蓬圆' },
    { id: 'shoulder', name: '齐肩' },
    { id: 'spiky', name: '尖刺' },
    { id: 'buzz', name: '板寸' },
    { id: 'swoop', name: '侧扫' }
  ];
  var hairTypeI;
  for (hairTypeI = 0; hairTypeI < HAIR.length; hairTypeI++) {
    HAIR[hairTypeI].type = HAIR_TYPE[HAIR[hairTypeI].id] || '';
  }
  var EYES = [
    { id: 'rect', name: '方框眼镜' },
    { id: 'round', name: '圆框眼镜' },
    { id: 'dot', name: '圆点眼' },
    { id: 'closed', name: '弯眼' },
    { id: 'wide', name: '圆睁' },
    { id: 'brow', name: '挑眉' },
    { id: 'sleepy', name: '困眼' },
    { id: 'square', name: '方块眼' },
    { id: 'sun', name: '墨镜' },
    { id: 'wink', name: '眨眼' }
  ];
  var MOUTH = [
    { id: 'line', name: '一字' },
    { id: 'smile', name: '微笑' },
    { id: 'open', name: '开口笑' },
    { id: 'o', name: '圆嘴' },
    { id: 'cat', name: '猫嘴' },
    { id: 'down', name: '下撇' },
    { id: 'smirk', name: '撇嘴' },
    { id: 'teeth', name: '齿笑' },
    { id: 'wave', name: '波浪' },
    { id: 'dot', name: '点嘴' }
  ];
  var BODY = [
    { id: 'tee', name: '圆领短袖' },
    { id: 'sweater', name: '套头衫' },
    { id: 'shirt', name: '衬衣' },
    { id: 'overalls', name: '背带' },
    { id: 'dress', name: '伞裙' },
    { id: 'hoodie', name: '连帽衫' },
    { id: 'vest', name: '背心' },
    { id: 'stripes', name: '条纹衫' }
  ];
  /* 四肢坐标：s 肩 / e 肘 / h 手 / hip 髋 / k 膝 / f 脚。ox 为上半身水平偏移。 */
  var POSE = [
    { id: 'stand', name: '自然站立', ox: 0,
      ls: [118, 184], le: [90, 220], lh: [76, 258],
      rs: [202, 184], re: [230, 220], rh: [244, 258],
      lhip: [144, 258], lk: [136, 282], lf: [128, 302],
      rhip: [176, 258], rk: [184, 282], rf: [192, 302] },
    { id: 'hip', name: '单手叉腰', ox: 0,
      ls: [118, 184], le: [68, 204], lh: [112, 232],
      rs: [202, 184], re: [232, 222], rh: [246, 260],
      lhip: [144, 258], lk: [136, 282], lf: [128, 302],
      rhip: [176, 258], rk: [184, 282], rf: [192, 302] },
    { id: 'cheer', name: '举手', ox: 0,
      ls: [118, 182], le: [94, 146], lh: [66, 104],
      rs: [202, 182], re: [226, 146], rh: [254, 104],
      lhip: [146, 258], lk: [138, 282], lf: [132, 302],
      rhip: [174, 258], rk: [182, 282], rf: [188, 302] },
    { id: 'wave', name: '挥手', ox: 0,
      ls: [118, 184], le: [88, 222], lh: [74, 260],
      rs: [202, 182], re: [234, 132], rh: [252, 78],
      lhip: [144, 258], lk: [136, 282], lf: [130, 302],
      rhip: [176, 258], rk: [184, 282], rf: [192, 302] },
    { id: 'akimbo', name: '双手叉腰', ox: 0,
      ls: [118, 184], le: [64, 202], lh: [112, 232],
      rs: [202, 184], re: [256, 202], rh: [208, 232],
      lhip: [142, 258], lk: [132, 282], lf: [124, 302],
      rhip: [178, 258], rk: [188, 282], rf: [196, 302] },
    { id: 'lean', name: '歪站', ox: 12,
      ls: [118, 184], le: [88, 218], lh: [72, 256],
      rs: [202, 184], re: [238, 206], rh: [250, 242],
      lhip: [140, 258], lk: [130, 282], lf: [122, 302],
      rhip: [178, 258], rk: [212, 272], rf: [190, 300] },
    { id: 'walk', name: '迈步', ox: 0,
      ls: [118, 182], le: [98, 150], lh: [74, 122],
      rs: [202, 188], re: [230, 228], rh: [248, 264],
      lhip: [150, 258], lk: [122, 278], lf: [104, 302],
      rhip: [172, 258], rk: [200, 276], rf: [216, 300] },
    { id: 'wide', name: '张开', ox: 0,
      ls: [118, 184], le: [60, 208], lh: [106, 236],
      rs: [202, 184], re: [260, 208], rh: [214, 236],
      lhip: [138, 258], lk: [116, 280], lf: [100, 302],
      rhip: [182, 258], rk: [204, 280], rf: [220, 302] }
  ];
  var MAIN = [
    { id: 'lime', name: '荧光黄绿', fill: '#C8F542', deep: '#97B51E' },
    { id: 'sand', name: '暖黄', fill: '#F0C93A', deep: '#C9A31A' },
    { id: 'ice', name: '冰蓝', fill: '#8EBCF5', deep: '#5C92D6' },
    { id: 'lilac', name: '淡紫', fill: '#C9B8FF', deep: '#917DE0' },
    { id: 'cream', name: '米白', fill: '#F7F4EC', deep: '#D5CFC2' },
    { id: 'slate', name: '石板', fill: '#6E8498', deep: '#4A5E70' },
    { id: 'sage', name: '灰绿', fill: '#B7D4C4', deep: '#7EAE96' },
    { id: 'mist', name: '雾紫', fill: '#DDD6F5', deep: '#B7ABDE' }
  ];
  var ACCENT = [
    { id: 'lime', name: '荧光黄绿', fill: '#C8F542' },
    { id: 'limeDeep', name: '深黄绿', fill: '#A6D10A' },
    { id: 'limeSoft', name: '浅黄绿', fill: '#E4FF7A' },
    { id: 'lemon', name: '柠檬', fill: '#FFE14A' },
    { id: 'lav', name: '淡紫', fill: '#C9B8FF' },
    { id: 'lavDeep', name: '深淡紫', fill: '#8B74F0' },
    { id: 'lavSoft', name: '浅雾紫', fill: '#E4DCFF' },
    { id: 'lavInk', name: '紫墨', fill: '#6E5BD0' }
  ];
  var ACCESSORY = [
    { id: 'none', name: '无' },
    { id: 'pin', name: '发夹' },
    { id: 'scarf', name: '围巾' },
    { id: 'bag', name: '小包' },
    { id: 'band', name: '发带' },
    { id: 'bow', name: '领结' },
    { id: 'cheek', name: '颊点' },
    { id: 'badge', name: '胸章' }
  ];
  var SKIN = ['#F6D2B6', '#F0C09A', '#E2A87C', '#D09060', '#C07C48', '#A56840', '#8D5A3A', '#F8E0CE'];
  var PANTS = '#242B38';
  var EARS = {
    bob: 1, short: 1, side: 1, bun: 1, twin: 1, long: 1, pony: 1,
    shoulder: 1, spiky: 1, buzz: 1, swoop: 1
  };

  function fnv(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  }
  function cval(ch) {
    var i = ALPHA.indexOf(ch);
    return i < 0 ? 0 : i;
  }
  function canon(fp) {
    var s = String(fp == null ? '' : fp).toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
    if (s.length > 12) s = s.slice(0, 12);
    if (s.length < 12) {
      var h = fnv('ykbd-figure:' + s);
      while (s.length < 12) {
        h = (Math.imul(h ^ (h >>> 16), 0x7feb352d) + 0x6D2B79F5) >>> 0;
        s += ALPHA.charAt(h & 31);
      }
    }
    return s;
  }
  function seg(s, start, n) {
    var v = 0;
    for (var k = 0; k < n; k++) v = v * 32 + cval(s.charAt(start + k));
    return v;
  }
  function group(raw) {
    return raw.slice(0, 4) + '-' + raw.slice(4, 8) + '-' + raw.slice(8, 12);
  }
  function pickDetail(mainFill, accentFill) {
    if (accentFill !== mainFill) return accentFill;
    if (mainFill === '#C9B8FF') return '#C8F542';
    return '#C9B8FF';
  }
  function pub(list) {
    var out = [];
    for (var i = 0; i < list.length; i++) out.push({ id: list[i].id, name: list[i].name });
    return out;
  }

  function figureModel(fp) {
    var raw = canon(fp);
    var hi = seg(raw, 0, 2) % HAIR.length;
    var ei = seg(raw, 2, 2) % EYES.length;
    var mi = seg(raw, 4, 2) % MOUTH.length;
    var bi = seg(raw, 6, 1) % BODY.length;
    var pi = seg(raw, 7, 1) % POSE.length;
    var ci = seg(raw, 8, 2) % MAIN.length;
    var ai = seg(raw, 10, 1) % ACCENT.length;
    var xi = seg(raw, 11, 1) % ACCESSORY.length;
    var main = MAIN[ci];
    var accent = ACCENT[ai];
    var skin = SKIN[ci];
    var detail = pickDetail(main.fill, accent.fill);
    var pants = PANTS;
    var sleeve = 'long';
    if (BODY[bi].id === 'dress') pants = skin;
    if (BODY[bi].id === 'overalls') pants = main.fill;
    if (BODY[bi].id === 'tee' || BODY[bi].id === 'overalls') sleeve = 'short';
    if (BODY[bi].id === 'dress' || BODY[bi].id === 'vest') sleeve = 'bare';
    return {
      fp: group(raw),
      raw: raw,
      indices: { hair: hi, eyes: ei, mouth: mi, body: bi, pose: pi, main: ci, accent: ai, accessory: xi },
      hair: HAIR[hi],
      eyes: EYES[ei],
      mouth: MOUTH[mi],
      body: BODY[bi],
      pose: POSE[pi],
      main: main,
      accent: accent,
      accessory: ACCESSORY[xi],
      colors: {
        ink: INK,
        white: WHITE,
        skin: skin,
        main: main.fill,
        deep: main.deep,
        accent: accent.fill,
        detail: detail,
        pants: pants,
        shoe: detail
      },
      sleeve: sleeve,
      cardLine: HAIR[hi].name + ' · ' + EYES[ei].name + ' · ' + BODY[bi].name + ' · ' + POSE[pi].name
    };
  }

  /* 用各维下标拼一枚预览种子（不保证校验位，只保证形象索引）。下标须小于该维选项数。 */
  function seedFor(idx) {
    function ch(n) { return ALPHA.charAt(n); }
    var s = ch(0) + ch(idx.hair) + ch(0) + ch(idx.eyes) + ch(0) + ch(idx.mouth);
    s += ch(idx.body) + ch(idx.pose) + ch(0) + ch(idx.main) + ch(idx.accent) + ch(idx.accessory);
    return group(s);
  }

  function arcPts(cx, cy, r, a0, a1, steps) {
    var pts = [];
    var i;
    for (i = 0; i <= steps; i++) {
      var t = a0 + (a1 - a0) * (i / steps);
      pts.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r]);
    }
    return pts;
  }
  function ellArc(cx, cy, rx, ry, a0, a1, steps) {
    var pts = [];
    var i;
    for (i = 0; i <= steps; i++) {
      var t = a0 + (a1 - a0) * (i / steps);
      pts.push([cx + Math.cos(t) * rx, cy + Math.sin(t) * ry]);
    }
    return pts;
  }
  function limbPoly(a, b, half) {
    var dx = b[0] - a[0];
    var dy = b[1] - a[1];
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.01) len = 0.01;
    var px = -dy / len * half;
    var py = dx / len * half;
    return [
      [a[0] + px, a[1] + py],
      [b[0] + px, b[1] + py],
      [b[0] - px, b[1] - py],
      [a[0] - px, a[1] - py]
    ];
  }
  function Crc(cx, cy, r, fill, stroke, sw, ox) {
    return { op: 'circle', cx: cx + (ox || 0), cy: cy, r: r, fill: fill || 'none', stroke: stroke || 'none', sw: sw || 0 };
  }
  function Ell(cx, cy, rx, ry, fill, stroke, sw, ox) {
    return { op: 'ellipse', cx: cx + (ox || 0), cy: cy, rx: rx, ry: ry, fill: fill || 'none', stroke: stroke || 'none', sw: sw || 0 };
  }
  function RR(x, y, w, h, rx, fill, stroke, sw, ox) {
    return { op: 'roundrect', x: x + (ox || 0), y: y, w: w, h: h, rx: rx, fill: fill || 'none', stroke: stroke || 'none', sw: sw || 0 };
  }
  function Py(pts, close, fill, stroke, sw, ox) {
    var o = ox || 0;
    var p = [];
    var i;
    for (i = 0; i < pts.length; i++) p.push([pts[i][0] + o, pts[i][1]]);
    return { op: 'poly', pts: p, close: close ? true : false, fill: fill || 'none', stroke: stroke || 'none', sw: sw || 0 };
  }
  function torso(topW, botW, y, h) {
    var r = 14;
    return [
      [CX - topW / 2 + r, y],
      [CX + topW / 2 - r, y],
      [CX + topW / 2, y + 10],
      [CX + botW / 2, y + h - r],
      [CX + botW / 2 - 8, y + h],
      [CX - botW / 2 + 8, y + h],
      [CX - botW / 2, y + h - r],
      [CX - topW / 2, y + 10]
    ];
  }
  function flare(topW, botW, y, h) {
    return [
      [CX - topW / 2 + 12, y],
      [CX + topW / 2 - 12, y],
      [CX + topW / 2, y + 12],
      [CX + botW / 2, y + h - 8],
      [CX + botW / 2 - 10, y + h],
      [CX - botW / 2 + 10, y + h],
      [CX - botW / 2, y + h - 8],
      [CX - topW / 2, y + 12]
    ];
  }

  function buildShapes(model) {
    var shapes = [];
    function put(part, sh) { sh.part = part; shapes.push(sh); return sh; }
    var C = model.colors;
    var ox = model.pose.ox || 0;
    var hair = model.hair.id;
    var body = model.body.id;
    var pose = model.pose;
    var eyeY = 110;
    var mouthY = 136;

    function putBack(sh) { return put('hairBack', sh); }
    function putFront(sh) { return put('hairFront', sh); }

    /* 1. 后发。长发片比身体宽，中间被下一步的衣服盖住，两侧从肩后露出。 */
    if (hair === 'afro') {
      var puffs = [[160, 50, 34], [116, 74, 26], [204, 74, 26], [122, 112, 22], [198, 112, 22], [160, 34, 18]];
      var pi;
      for (pi = 0; pi < puffs.length; pi++) putBack(Crc(puffs[pi][0], puffs[pi][1], puffs[pi][2], INK, INK, 4, ox));
    } else if (hair === 'buzz') {
      putBack(Ell(CX, 46, 38, 14, INK, INK, 4, ox));
    } else if (hair === 'short') {
      putBack(Ell(CX, 50, 46, 16, INK, INK, 4, ox));
    } else if (hair === 'spiky') {
      putBack(Ell(CX, 72, 46, 26, INK, INK, 4, ox));
      var spikes = [
        [160, 28, 144, 70, 176, 70],
        [124, 46, 108, 84, 142, 76],
        [196, 46, 178, 76, 214, 84],
        [108, 72, 96, 104, 130, 96],
        [212, 72, 190, 96, 226, 104]
      ];
      var si;
      for (si = 0; si < spikes.length; si++) {
        var sp = spikes[si];
        putBack(Py([[sp[0], sp[1]], [sp[2], sp[3]], [sp[4], sp[5]]], true, INK, INK, 4, ox));
      }
    } else {
      putBack(Ell(CX, 76, 56, 42, INK, INK, 4, ox));
    }
    if (hair === 'bob') {
      putBack(Ell(CX - 46, 126, 16, 28, INK, INK, 4, ox));
      putBack(Ell(CX + 46, 126, 16, 28, INK, INK, 4, ox));
    }
    if (hair === 'long' || hair === 'shoulder') {
      var sheetBot = hair === 'long' ? 300 : 232;
      function sideLock(sign) {
        return [
          [CX + sign * 64, 150],
          [CX + sign * 50, 158],
          [CX + sign * 46, 220],
          [CX + sign * 52, sheetBot],
          [CX + sign * 74, sheetBot - 4],
          [CX + sign * 80, 214],
          [CX + sign * 76, 154]
        ];
      }
      putBack(Py(sideLock(-1), true, INK, INK, 4, ox));
      putBack(Py(sideLock(1), true, INK, INK, 4, ox));
      put('hairBack', Py([[CX - 90, 188], [CX - 98, sheetBot - 36]], false, 'none', '#FFFFFF', 3, ox)).opac = 0.4;
      put('hairBack', Py([[CX + 90, 188], [CX + 98, sheetBot - 36]], false, 'none', '#FFFFFF', 3, ox)).opac = 0.4;
    }
    if (hair === 'pony') {
      putBack(Py([
        [206, 78],
        [232, 86],
        [252, 118],
        [246, 176],
        [228, 198],
        [214, 170],
        [220, 124],
        [198, 96]
      ], true, INK, INK, 4, ox));
    }

    if (body === 'hoodie' && hair !== 'afro') {
      put('hood', Py([
        [CX - 64, 156],
        [CX - 56, 72],
        [CX - 22, 40],
        [CX, 34],
        [CX + 22, 40],
        [CX + 56, 72],
        [CX + 64, 156],
        [CX + 36, 170],
        [CX - 36, 170]
      ], true, C.main, INK, 5, ox));
    }

    function drawShoe(foot) {
      var x = foot[0];
      var y = foot[1];
      put('shoe', RR(x - 15, y - 14, 30, 13, 5, C.shoe, INK, 3.5, 0));
      put('shoeStripe', RR(x - 8, y - 11, 16, 3, 1.5, C.accent, 'none', 0, 0));
      put('sole', RR(x - 17, y - 3, 34, 8, 3, WHITE, INK, 3, 0));
    }
    function over(a, b, extra) {
      var dx = b[0] - a[0];
      var dy = b[1] - a[1];
      var len = Math.sqrt(dx * dx + dy * dy);
      if (len < 0.01) len = 0.01;
      return [b[0] + dx / len * extra, b[1] + dy / len * extra];
    }
    function behind(a, b, extra) {
      var dx = b[0] - a[0];
      var dy = b[1] - a[1];
      var len = Math.sqrt(dx * dx + dy * dy);
      if (len < 0.01) len = 0.01;
      return [a[0] - dx / len * extra, a[1] - dy / len * extra];
    }
    function drawLeg(hip, knee, foot) {
      var hpt = [hip[0], body === 'dress' ? 220 : hip[1]];
      var root = behind(hpt, knee, 18);
      put('leg', Py(limbPoly(knee, foot, 9), true, C.pants, INK, 4, 0));
      put('leg', Py(limbPoly(root, over(hpt, knee, 8), 12), true, C.pants, INK, 4, 0));
      drawShoe(foot);
    }
    drawLeg(pose.lhip, pose.lk, pose.lf);
    drawLeg(pose.rhip, pose.rk, pose.rf);

    var shirt = C.main;
    if (body === 'overalls' || body === 'vest') shirt = C.detail;
    var cloth = body === 'dress' ? flare(104, 168, 178, 54) : torso(112, 136, 178, 78);
    put('body', Py(cloth, true, shirt, INK, 5, ox));

    function crew(y) {
      return [
        [CX - 22, y], [CX - 14, y + 8], [CX - 6, y + 12], [CX, y + 14],
        [CX + 6, y + 12], [CX + 14, y + 8], [CX + 22, y]
      ];
    }
    function buttons(x, ys) {
      var bi;
      for (bi = 0; bi < ys.length; bi++) put('button', Crc(x, ys[bi], 3.5, INK, 'none', 0, ox));
    }
    function pocketAt(x, y, w, h) {
      put('pocket', RR(x, y, w, h, 5, 'none', INK, 3, ox));
      put('pocket', Py([[x + 2, y + 6], [x + w - 2, y + 6]], false, 'none', INK, 2.5, ox));
    }

    if (body === 'stripes') {
      var bandY = [200, 218, 236];
      var byi;
      for (byi = 0; byi < bandY.length; byi++) {
        var y0 = bandY[byi];
        var t0 = (y0 - 178) / 78;
        var half = (112 + (136 - 112) * t0) / 2 - 14;
        put('stripe', Py([
          [CX - half, y0], [CX + half, y0], [CX + half, y0 + 9], [CX - half, y0 + 9]
        ], true, C.detail, 'none', 0, ox));
      }
      put('body', Py(cloth, true, 'none', INK, 5, ox));
      put('collar', Py(crew(182), false, 'none', INK, 4, ox));
    } else if (body === 'tee') {
      put('collar', Py(crew(182), false, 'none', INK, 4, ox));
      buttons(CX, [204, 220]);
      pocketAt(CX + 16, 208, 26, 20);
    } else if (body === 'sweater') {
      put('collar', Py(crew(180), false, 'none', INK, 5, ox));
      put('collar', Py(crew(188), false, 'none', C.deep, 3, ox));
      put('body', Py([[CX - 42, 242], [CX + 42, 242]], false, 'none', C.deep, 4, ox));
      put('body', Py([[CX - 44, 250], [CX + 44, 250]], false, 'none', C.deep, 4, ox));
    } else if (body === 'shirt') {
      put('collar', Py([[CX - 18, 180], [CX - 4, 180], [CX - 12, 202]], true, WHITE, INK, 3, ox));
      put('collar', Py([[CX + 18, 180], [CX + 4, 180], [CX + 12, 202]], true, WHITE, INK, 3, ox));
      put('body', Py([[CX, 198], [CX, 248]], false, 'none', INK, 3, ox));
      buttons(CX, [206, 222, 238]);
      pocketAt(CX + 16, 210, 24, 18);
    } else if (body === 'overalls') {
      put('body', RR(CX - 30, 198, 60, 52, 8, C.main, INK, 4, ox));
      put('body', Py([[CX - 26, 180], [CX - 16, 202]], false, 'none', INK, 8, ox));
      put('body', Py([[CX - 26, 180], [CX - 16, 202]], false, 'none', C.main, 4, ox));
      put('body', Py([[CX + 26, 180], [CX + 16, 202]], false, 'none', INK, 8, ox));
      put('body', Py([[CX + 26, 180], [CX + 16, 202]], false, 'none', C.main, 4, ox));
      buttons(CX - 16, [204]);
      buttons(CX + 16, [204]);
      pocketAt(CX - 12, 216, 24, 18);
    } else if (body === 'dress') {
      put('collar', Py(crew(184), false, 'none', INK, 4, ox));
      put('button', Crc(CX, 200, 3.6, C.accent, INK, 2, ox));
      put('body', Py([[CX - 62, 224], [CX + 62, 224]], false, 'none', INK, 4, ox));
    } else if (body === 'hoodie') {
      put('collar', Py(crew(184), false, 'none', INK, 4, ox));
      put('hood', Py([[CX - 10, 196], [CX - 14, 218]], false, 'none', INK, 3, ox));
      put('hood', Py([[CX + 10, 196], [CX + 14, 218]], false, 'none', INK, 3, ox));
      put('hood', Crc(CX - 14, 220, 4.5, C.accent, INK, 2.5, ox));
      put('hood', Crc(CX + 14, 220, 4.5, C.accent, INK, 2.5, ox));
      put('pocket', RR(CX - 30, 224, 60, 26, 8, C.deep, INK, 3.5, ox));
      put('pocket', Py([[CX - 22, 230], [CX + 22, 230]], false, 'none', INK, 3, ox));
    } else if (body === 'vest') {
      put('body', Py(torso(96, 118, 190, 64), true, C.main, INK, 4, ox));
      put('body', Py([[CX, 198], [CX, 246]], false, 'none', INK, 3, ox));
      buttons(CX - 8, [210, 228]);
      pocketAt(CX + 10, 214, 22, 16);
    }

    var upper = C.main;
    var lower = C.main;
    if (model.sleeve === 'bare') { upper = C.skin; lower = C.skin; }
    else if (model.sleeve === 'short') {
      upper = body === 'overalls' ? C.detail : C.main;
      lower = C.skin;
    }
    function drawArm(s, e, h) {
      put('arm', Py(limbPoly(e, h, 9), true, lower, INK, 4, ox));
      put('arm', Py(limbPoly(behind(s, e, 22), over(s, e, 7), 11), true, upper, INK, 4, ox));
      if (model.sleeve === 'long') {
        var t = 0.76;
        var px = e[0] + (h[0] - e[0]) * t;
        var py = e[1] + (h[1] - e[1]) * t;
        var dx = h[0] - e[0];
        var dy = h[1] - e[1];
        var len = Math.sqrt(dx * dx + dy * dy);
        if (len < 0.01) len = 0.01;
        var nx = -dy / len * 8;
        var ny = dx / len * 8;
        put('arm', Py([[px + nx, py + ny], [px - nx, py - ny]], false, 'none', INK, 3, ox));
      }
      put('hand', Crc(h[0], h[1], 9, C.skin, INK, 3.5, ox));
    }
    drawArm(pose.ls, pose.le, pose.lh);
    drawArm(pose.rs, pose.re, pose.rh);

    /* 3. 脖子画在衣服之后，采样点保持肤色。 */
    put('neck', RR(CX - 15, 154, 30, 28, 8, C.skin, INK, 4, ox));

    /* 4. 头。耳廓先画，头填色盖住内半，耳窝在头之后补上。 */
    if (EARS[hair]) {
      put('ear', Crc(110, 112, 12, C.skin, INK, 3.5, ox));
      put('ear', Crc(210, 112, 12, C.skin, INK, 3.5, ox));
    }
    put('head', Ell(CX, 102, 50, 54, C.skin, INK, 5, ox));
    if (EARS[hair]) {
      put('ear', Py([[100, 106], [105, 112], [100, 118]], false, 'none', INK, 2.4, ox));
      put('ear', Py([[220, 106], [215, 112], [220, 118]], false, 'none', INK, 2.4, ox));
    }

    /* 5. 前发。bangs 盖到眉上；short / crop 只占头顶，露出额头。 */
    if (model.hair.type === 'bangs') {
      putFront(Py([
        [106, 44], [214, 44], [218, 66], [206, 82], [184, 86],
        [160, 90], [136, 86], [114, 82], [102, 66]
      ], true, INK, INK, 4, ox));
      put('hairFront', Py([[134, 54], [156, 48], [174, 54]], false, 'none', '#FFFFFF', 3, ox)).opac = 0.55;
    }
    if (hair === 'side') {
      putFront(Py([[108, 70], [146, 58], [164, 76], [148, 90], [118, 94], [100, 78]], true, INK, INK, 4, ox));
    }
    if (hair === 'swoop') {
      putFront(Py([[156, 64], [196, 48], [224, 74], [208, 94], [176, 86], [158, 74]], true, INK, INK, 4, ox));
    }
    if (hair === 'bun') {
      putFront(Crc(CX, 36, 16, INK, INK, 4, ox));
      putFront(Py([[CX - 10, 36], [CX + 10, 36]], false, 'none', C.detail, 4, ox));
    }
    if (hair === 'twin') {
      putFront(Crc(114, 60, 14, INK, INK, 4, ox));
      putFront(Crc(206, 60, 14, INK, INK, 4, ox));
      putFront(Crc(114, 60, 5, C.detail, INK, 2, ox));
      putFront(Crc(206, 60, 5, C.detail, INK, 2, ox));
    }
    if (hair === 'pony') putFront(Crc(224, 96, 6, C.detail, INK, 2.5, ox));
    if (hair === 'buzz') {
      putFront(Ell(CX, 52, 42, 16, INK, INK, 4, ox));
      put('hairFront', Py([[146, 42], [160, 38], [172, 44]], false, 'none', '#FFFFFF', 2.5, ox)).opac = 0.5;
    }
    if (hair === 'short') {
      putFront(Ell(CX, 50, 46, 15, INK, INK, 4, ox));
      putFront(Crc(140, 36, 8, INK, INK, 3, ox));
      putFront(Crc(178, 34, 7, INK, INK, 3, ox));
      putFront(Py([[156, 40], [150, 56]], false, 'none', C.skin, 3, ox));
    }
    if (hair === 'spiky') putFront(Ell(CX, 54, 34, 12, INK, INK, 3, ox));

    if (model.eyes.id !== 'brow') {
      put('brow', Py([[126, 100], [138, 94], [150, 100]], false, 'none', INK, 3.2, ox));
      put('brow', Py([[170, 100], [182, 94], [194, 100]], false, 'none', INK, 3.2, ox));
    }
    drawEyes(model.eyes.id);
    put('nose', Py([[156, 122], [164, 122], [160, 132]], true, INK, 'none', 0, ox));
    drawMouth(model.mouth.id);
    put('blush', Ell(126, 126, 10, 6.5, '#C8F542', 'none', 0, ox));
    put('blush', Ell(194, 126, 10, 6.5, '#C8F542', 'none', 0, ox));
    drawAccessory(model.accessory.id);
    return shapes;

    function drawEyes(id) {
      var y = eyeY;
      var x1 = 138;
      var x2 = 182;
      function pupil(x) {
        put('eye', Crc(x + 1, y + 1, 5.6, INK, 'none', 0, ox));
        put('eye', Crc(x + 3, y - 1.5, 2, WHITE, 'none', 0, ox));
      }
      if (id === 'rect' || id === 'sun') {
        var lens = id === 'sun' ? '#1A1A1A' : WHITE;
        put('eye', RR(120, y - 14, 34, 28, 7, lens, INK, 4, ox));
        put('eye', RR(166, y - 14, 34, 28, 7, lens, INK, 4, ox));
        put('eye', Py([[154, y], [166, y]], false, 'none', INK, 4, ox));
        if (id === 'sun') {
          put('eye', RR(126, y - 8, 16, 5, 2, WHITE, 'none', 0, ox));
          put('eye', RR(172, y - 8, 16, 5, 2, WHITE, 'none', 0, ox));
        } else {
          pupil(x1);
          pupil(x2);
        }
        return;
      }
      if (id === 'round') {
        put('eye', Crc(x1, y, 14, WHITE, INK, 4, ox));
        put('eye', Crc(x2, y, 14, WHITE, INK, 4, ox));
        put('eye', Py([[152, y], [168, y]], false, 'none', INK, 4, ox));
        pupil(x1);
        pupil(x2);
        return;
      }
      if (id === 'dot' || id === 'brow') {
        put('eye', Crc(x1, y, 5.5, INK, 'none', 0, ox));
        put('eye', Crc(x2, y, 5.5, INK, 'none', 0, ox));
        put('eye', Crc(x1 + 1.6, y - 1.6, 1.6, WHITE, 'none', 0, ox));
        put('eye', Crc(x2 + 1.6, y - 1.6, 1.6, WHITE, 'none', 0, ox));
        if (id === 'brow') {
          put('brow', Py([[x1 - 16, y - 16], [x1 + 6, y - 24]], false, 'none', INK, 3.5, ox));
          put('brow', Py([[x2 - 8, y - 14], [x2 + 16, y - 14]], false, 'none', INK, 3.5, ox));
        }
        return;
      }
      if (id === 'closed') {
        put('eye', Py(arcPts(x1, y + 2, 12, 1.15 * Math.PI, 1.85 * Math.PI, 8), false, 'none', INK, 4, ox));
        put('eye', Py(arcPts(x2, y + 2, 12, 1.15 * Math.PI, 1.85 * Math.PI, 8), false, 'none', INK, 4, ox));
        return;
      }
      if (id === 'wide' || id === 'square' || id === 'wink') {
        if (id === 'square') {
          put('eye', RR(x1 - 14, y - 12, 28, 24, 6, WHITE, INK, 3.5, ox));
          put('eye', RR(x2 - 14, y - 12, 28, 24, 6, WHITE, INK, 3.5, ox));
        } else {
          put('eye', Ell(x1, y, 13, 12, WHITE, INK, 3.5, ox));
          if (id === 'wink') put('eye', Py(arcPts(x2, y + 1, 12, 1.2 * Math.PI, 1.85 * Math.PI, 8), false, 'none', INK, 4, ox));
          else put('eye', Ell(x2, y, 13, 12, WHITE, INK, 3.5, ox));
        }
        pupil(x1);
        if (id !== 'wink') pupil(x2);
        return;
      }
      put('eye', Py(arcPts(x1, y + 4, 12, 1.08 * Math.PI, 1.92 * Math.PI, 8), false, 'none', INK, 4, ox));
      put('eye', Py(arcPts(x2, y + 4, 12, 1.08 * Math.PI, 1.92 * Math.PI, 8), false, 'none', INK, 4, ox));
    }

    function drawMouth(id) {
      var y = mouthY;
      var x = CX;
      if (id === 'line') put('mouth', Py([[x - 12, y], [x + 12, y]], false, 'none', INK, 4, ox));
      else if (id === 'smile') put('mouth', Py(arcPts(x, y - 6, 14, 0.18 * Math.PI, 0.82 * Math.PI, 10), false, 'none', INK, 4, ox));
      else if (id === 'open') {
        put('mouth', Ell(x, y + 2, 12, 9, '#1A1A1A', INK, 3.5, ox));
        put('mouth', Ell(x, y + 4, 6, 3.5, C.accent, 'none', 0, ox));
      } else if (id === 'o') {
        put('mouth', Crc(x, y, 8, '#1A1A1A', INK, 3.5, ox));
        put('mouth', Crc(x, y + 2, 3.4, C.accent, 'none', 0, ox));
      } else if (id === 'cat') {
        put('mouth', Py([[x - 12, y - 2], [x - 4, y + 6], [x, y], [x + 4, y + 6], [x + 12, y - 2]], false, 'none', INK, 4, ox));
      } else if (id === 'down') {
        put('mouth', Py(arcPts(x, y + 8, 12, 1.2 * Math.PI, 1.8 * Math.PI, 10), false, 'none', INK, 4, ox));
      } else if (id === 'smirk') {
        put('mouth', Py([[x - 4, y + 2], [x + 14, y - 4]], false, 'none', INK, 4, ox));
      } else if (id === 'teeth') {
        put('mouth', Ell(x, y + 2, 14, 10, '#1A1A1A', INK, 3.5, ox));
        put('mouth', RR(x - 10, y - 6, 20, 8, 2, WHITE, 'none', 0, ox));
      } else if (id === 'wave') {
        put('mouth', Py([[x - 14, y], [x - 7, y + 5], [x, y], [x + 7, y + 5], [x + 14, y]], false, 'none', INK, 4, ox));
      } else put('mouth', Crc(x, y, 3.6, INK, 'none', 0, ox));
    }

    function drawAccessory(id) {
      var col = C;
      var o = ox;
      if (id === 'none') return;
      if (id === 'pin') {
        put('accessory', RR(196, 68, 20, 9, 3, col.detail, INK, 3, o));
        return;
      }
      if (id === 'scarf') {
        put('accessory', RR(122, 186, 76, 16, 8, col.detail, INK, 4, o));
        put('accessory', RR(168, 198, 16, 26, 6, col.detail, INK, 4, o));
        return;
      }
      if (id === 'bag') {
        put('accessory', Py([[196, 176], [236, 196]], false, 'none', INK, 4, o));
        put('accessory', RR(214, 190, 36, 32, 6, col.detail, INK, 4, o));
        put('accessory', RR(224, 198, 16, 8, 2, WHITE, INK, 3, o));
        return;
      }
      if (id === 'band') {
        put('accessory', Py([[118, 90], [202, 90]], false, 'none', INK, 10, o));
        put('accessory', Py([[118, 90], [202, 90]], false, 'none', col.detail, 5, o));
        return;
      }
      if (id === 'bow') {
        put('accessory', Crc(146, 204, 8, col.detail, INK, 3, o));
        put('accessory', Crc(174, 204, 8, col.detail, INK, 3, o));
        put('accessory', Crc(160, 204, 4, INK, 'none', 0, o));
        return;
      }
      if (id === 'cheek') {
        put('accessory', Crc(122, 128, 7, col.detail, INK, 2.5, o));
        put('accessory', Crc(198, 128, 7, col.detail, INK, 2.5, o));
        return;
      }
      put('accessory', Crc(186, 214, 11, col.detail, INK, 3, o));
      put('accessory', Crc(186, 214, 4, WHITE, 'none', 0, o));
    }
  }

  function num(v) {
    var n = Math.round(Number(v) * 10) / 10;
    if (n === 0) return '0';
    return String(n);
  }
  function ptsAttr(pts) {
    var a = [];
    var i;
    for (i = 0; i < pts.length; i++) a.push(num(pts[i][0]) + ',' + num(pts[i][1]));
    return a.join(' ');
  }
  function svgShape(sh) {
    var fill = sh.fill || 'none';
    var stroke = sh.stroke || 'none';
    var sw = sh.sw || 0;
    var common = ' fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + num(sw) + '"';
    if (sh.opac != null && sh.opac < 1) common += ' opacity="' + num(sh.opac) + '"';
    if (sh.op === 'circle') return '<circle cx="' + num(sh.cx) + '" cy="' + num(sh.cy) + '" r="' + num(sh.r) + '"' + common + '/>';
    if (sh.op === 'ellipse') return '<ellipse cx="' + num(sh.cx) + '" cy="' + num(sh.cy) + '" rx="' + num(sh.rx) + '" ry="' + num(sh.ry) + '"' + common + '/>';
    if (sh.op === 'roundrect') return '<rect x="' + num(sh.x) + '" y="' + num(sh.y) + '" width="' + num(sh.w) + '" height="' + num(sh.h) + '" rx="' + num(sh.rx) + '" ry="' + num(sh.rx) + '"' + common + '/>';
    if (sh.close) return '<polygon points="' + ptsAttr(sh.pts) + '"' + common + '/>';
    return '<polyline points="' + ptsAttr(sh.pts) + '"' + common + '/>';
  }

  function figureShapes(fp) {
    return buildShapes(figureModel(fp));
  }
  function figureSVG(fp, size) {
    var s = Number(size);
    if (!isFinite(s) || s <= 0) s = VIEW;
    var shapes = figureShapes(fp);
    var h = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + VIEW + ' ' + VIEW + '" width="' + num(s) + '" height="' + num(s) + '" role="img" aria-label="全身形象" stroke-linecap="round" stroke-linejoin="round">';
    h += '<title>全身形象</title>';
    var i;
    for (i = 0; i < shapes.length; i++) h += svgShape(shapes[i]);
    h += '</svg>';
    return h;
  }

  function trace(ctx, sh) {
    if (sh.op === 'circle') {
      ctx.beginPath();
      ctx.arc(sh.cx, sh.cy, Math.max(0, sh.r), 0, Math.PI * 2, false);
      return;
    }
    if (sh.op === 'ellipse') {
      ctx.beginPath();
      ctx.ellipse(sh.cx, sh.cy, Math.max(0, sh.rx), Math.max(0, sh.ry), 0, 0, Math.PI * 2, false);
      return;
    }
    if (sh.op === 'roundrect') {
      var x = sh.x, y = sh.y, w = sh.w, h = sh.h, r = sh.rx || 0;
      if (r < 0) r = 0;
      if (r > w / 2) r = w / 2;
      if (r > h / 2) r = h / 2;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
      return;
    }
    ctx.beginPath();
    ctx.moveTo(sh.pts[0][0], sh.pts[0][1]);
    var i;
    for (i = 1; i < sh.pts.length; i++) ctx.lineTo(sh.pts[i][0], sh.pts[i][1]);
    if (sh.close) ctx.closePath();
  }
  function drawFigure(ctx, fp, x, y, size) {
    if (!ctx || !ctx.save) return;
    var s = Number(size);
    if (!isFinite(s) || s <= 0) s = VIEW;
    var x0 = Number(x);
    var y0 = Number(y);
    if (!isFinite(x0)) x0 = 0;
    if (!isFinite(y0)) y0 = 0;
    var shapes = figureShapes(fp);
    var k = s / VIEW;
    ctx.save();
    ctx.translate(x0, y0);
    ctx.scale(k, k);
    var i;
    for (i = 0; i < shapes.length; i++) {
      var sh = shapes[i];
      trace(ctx, sh);
      ctx.globalAlpha = (sh.opac == null || sh.opac >= 1) ? 1 : sh.opac;
      if (sh.fill && sh.fill !== 'none') {
        ctx.fillStyle = sh.fill;
        ctx.fill();
      }
      if (sh.stroke && sh.stroke !== 'none' && sh.sw) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = sh.stroke;
        ctx.lineWidth = sh.sw;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function comboCount() {
    return HAIR.length * EYES.length * MOUTH.length * BODY.length * POSE.length * MAIN.length * ACCENT.length * ACCESSORY.length;
  }

  var api = {
    view: VIEW,
    figureModel: figureModel,
    figureSVG: figureSVG,
    drawFigure: drawFigure,
    figureShapes: figureShapes,
    seedFor: seedFor,
    combo: comboCount(),
    HAIR_TYPE: HAIR_TYPE,
    hairs: HAIR,
    /* 采样区仍是额头带 y=64–84、脖子 y=168。刘海下沿约落到 y=80–96，眼睛画在 y=110 附近。x 再加 pose.ox。 */
    zones: {
      neckY: 168,
      neckHalf: 6,
      browY0: 64,
      browY1: 84,
      browHalfX: 16,
      depthMin: 80,
      depthMax: 96,
      eyeY: 100,
      hair: INK,
      bangsCoverage: 0.70,
      cropCoverage: 0.45
    },
    dims: [
      { key: 'hair', label: '发型', chars: '0-1', options: pub(HAIR) },
      { key: 'eyes', label: '眼睛', chars: '2-3', options: pub(EYES) },
      { key: 'mouth', label: '嘴', chars: '4-5', options: pub(MOUTH) },
      { key: 'body', label: '身体/衣服', chars: '6', options: pub(BODY) },
      { key: 'pose', label: '四肢/姿势', chars: '7', options: pub(POSE) },
      { key: 'main', label: '主色', chars: '8-9', options: pub(MAIN) },
      { key: 'accent', label: '强调色', chars: '10', options: pub(ACCENT) },
      { key: 'accessory', label: '配件', chars: '11', options: pub(ACCESSORY) }
    ]
  };

  window.YKBD_FIGURE = api;
  window.figureModel = figureModel;
  window.figureSVG = figureSVG;
  window.drawFigure = drawFigure;

  if (window.YKBD_F) {
    window.YKBD_F.figureModel = figureModel;
    window.YKBD_F.figureSVG = figureSVG;
    window.YKBD_F.drawFigure = drawFigure;
    window.YKBD_F.avatarSVG = function (fp) { return figureSVG(fp); };
    window.YKBD_F.drawAvatar = function (ctx, fp, x, y, size) { drawFigure(ctx, fp, x, y, size); };
  }
})();
