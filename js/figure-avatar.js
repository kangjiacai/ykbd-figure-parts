/* 部件拼装式全身简笔小人。种子是指纹码（如 B665-6G14-RPME）。
 * 去连字符后 12 个字符分段，互不混用：
 *   0-1 发型(12)  2-3 眼睛(10)  4-5 嘴(10)  6 衣服(8)
 *   7 四肢姿势(8)  8-9 主色(8)  10 强调色(8)  11 配件(8)
 * 同一种子永远同一形象。绘制过程没有随机数。
 * 绘制全部自绘（圆、圆角矩形、折线），Chrome 61 / ES5。
 * 若已加载 js/fingerprint.js，会把 F.avatarSVG / F.drawAvatar 指到本引擎。
 */
(function () {
  'use strict';

  var VIEW = 320;
  var INK = '#000000';
  var WHITE = '#FFFFFF';
  var CX = 160;
  var ALPHA = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

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
  var EARS = { short: 1, side: 1, bun: 1, twin: 1, pony: 1, spiky: 1, buzz: 1, swoop: 1 };

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
  function trap(top, bot, y, h, ox) {
    return [
      [CX - top / 2 + (ox || 0), y],
      [CX + top / 2 + (ox || 0), y],
      [CX + bot / 2 + (ox || 0), y + h],
      [CX - bot / 2 + (ox || 0), y + h]
    ];
  }
  function band(top, bot, y, h, y0, y1, ox) {
    var t0 = (y0 - y) / h;
    var t1 = (y1 - y) / h;
    var w0 = top + (bot - top) * t0;
    var w1 = top + (bot - top) * t1;
    var o = ox || 0;
    return [
      [CX - w0 / 2 + o, y0],
      [CX + w0 / 2 + o, y0],
      [CX + w1 / 2 + o, y1],
      [CX - w1 / 2 + o, y1]
    ];
  }

  function buildShapes(model) {
    var shapes = [];
    function put(part, sh) { sh.part = part; shapes.push(sh); }
    var C = model.colors;
    var ox = model.pose.ox || 0;
    var hair = model.hair.id;
    var body = model.body.id;
    var pose = model.pose;

    function hairCap(r, cy) {
      put('hair', Crc(CX, cy, r, INK, INK, 5, ox));
    }
    function bangs(y, h) {
      put('hair', RR(CX - 46, y, 92, h, 12, INK, INK, 5, ox));
    }

    /* 连帽画在头发后面。蓬圆自己已经占满头部，不再叠一圈帽檐。 */
    if (body === 'hoodie' && hair !== 'afro') {
      put('hood', Py(arcPts(CX, 108, 66, Math.PI * 1.08, Math.PI * 1.92, 16), false, 'none', INK, 22, ox));
      put('hood', Py(arcPts(CX, 108, 66, Math.PI * 1.08, Math.PI * 1.92, 16), false, 'none', C.main, 12, ox));
    }

    /* —— 后发 —— */
    if (hair === 'bob') {
      hairCap(62, 100);
      put('hair', RR(106, 118, 108, 52, 22, INK, INK, 5, ox));
    } else if (hair === 'short' || hair === 'side' || hair === 'bun' || hair === 'twin' || hair === 'pony' || hair === 'spiky') {
      hairCap(hair === 'spiky' ? 56 : 50, hair === 'short' ? 78 : 86);
    } else if (hair === 'long' || hair === 'shoulder') {
      hairCap(60, 96);
      var lockH = hair === 'long' ? 148 : 64;
      put('hair', RR(88, 104, 26, lockH, 12, INK, INK, 5, ox));
      put('hair', RR(206, 104, 26, lockH, 12, INK, INK, 5, ox));
    } else if (hair === 'afro') {
      put('hair', Ell(CX, 100, 86, 64, INK, INK, 5, ox));
    }
    if (hair === 'pony') {
      put('hair', Py([[208, 68], [254, 104], [244, 172]], false, 'none', INK, 16, ox));
    }
    if (hair === 'spiky') {
      var spikes = [
        [160, 26, 146, 68, 174, 68],
        [122, 44, 108, 84, 140, 76],
        [198, 44, 180, 76, 214, 84],
        [104, 70, 94, 102, 126, 96],
        [216, 70, 194, 96, 228, 102]
      ];
      var si;
      for (si = 0; si < spikes.length; si++) {
        var s = spikes[si];
        put('hair', Py([[s[0], s[1]], [s[2], s[3]], [s[4], s[5]]], true, INK, INK, 4, ox));
      }
    }

    /* —— 腿 —— */
    function drawLeg(hip, knee, foot) {
      var startY = hip[1];
      if (body === 'dress') startY = 234;
      put('leg', Py([[hip[0], startY], knee, [foot[0], foot[1] - 2]], false, 'none', INK, 22, 0));
      put('legFill', Py([[hip[0], startY], knee, [foot[0], foot[1] - 2]], false, 'none', C.pants, 14, 0));
      put('shoe', RR(foot[0] - 15, foot[1] - 4, 30, 15, 6, C.shoe, INK, 4, 0));
    }
    drawLeg(pose.lhip, pose.lk, pose.lf);
    drawLeg(pose.rhip, pose.rk, pose.rf);

    /* —— 躯干 —— */
    var topW = 104, botW = 136, ty = 170, th = 92;
    if (body === 'dress') { topW = 108; botW = 176; th = 66; }
    var shirtFill = C.main;
    if (body === 'overalls') shirtFill = C.detail;
    if (body === 'vest') shirtFill = C.detail;
    put('body', Py(trap(topW, botW, ty, th, ox), true, shirtFill, INK, 5, 0));
    if (body === 'stripes') {
      put('stripe', Py(band(topW, botW, ty, th, 192, 206, ox), true, C.detail, 'none', 0, 0));
      put('stripe', Py(band(topW, botW, ty, th, 214, 228, ox), true, C.detail, 'none', 0, 0));
      put('stripe', Py(band(topW, botW, ty, th, 236, 250, ox), true, C.detail, 'none', 0, 0));
      put('body', Py(trap(topW, botW, ty, th, ox), true, 'none', INK, 5, 0));
    }
    if (body === 'vest') {
      put('body', Py(trap(topW - 8, botW - 16, ty + 8, th - 10, ox), true, C.main, INK, 5, 0));
      put('body', Py([[CX - 18, ty + 6], [CX + 18, ty + 6], [CX, ty + 58]], true, C.detail, INK, 4, ox));
    }
    if (body === 'overalls') {
      put('body', RR(134, 206, 52, 48, 8, C.main, INK, 5, ox));
      put('body', Crc(CX, 222, 3.2, INK, 'none', 0, ox));
      put('body', Crc(CX, 236, 3.2, INK, 'none', 0, ox));
    }
    if (body === 'sweater') {
      var ribY = [232, 246];
      var ri;
      for (ri = 0; ri < ribY.length; ri++) {
        var ln = band(topW, botW, ty, th, ribY[ri], ribY[ri], ox);
        put('body', Py([[ln[0][0] + 10, ribY[ri]], [ln[1][0] - 10, ribY[ri]]], false, 'none', C.deep, 4, 0));
      }
    }
    if (body === 'hoodie') {
      put('body', RR(136, 210, 48, 28, 8, C.detail, INK, 4, ox));
    }

    put('neck', RR(142, 146, 36, 34, 10, C.skin, INK, 5, ox));

    if (body === 'overalls') {
      put('body', Py([[128, 162], [150, 210]], false, 'none', INK, 10, ox));
      put('body', Py([[128, 162], [150, 210]], false, 'none', C.main, 5, ox));
      put('body', Py([[192, 162], [170, 210]], false, 'none', INK, 10, ox));
      put('body', Py([[192, 162], [170, 210]], false, 'none', C.main, 5, ox));
    }

    if (body === 'sweater' || body === 'hoodie') {
      put('collar', RR(136, 152, 48, 22, 10, C.main, INK, 4, ox));
    }
    if (body === 'shirt') {
      put('collar', Py([[146, 168], [164, 168], [154, 194]], true, WHITE, INK, 4, ox));
      put('collar', Py([[174, 168], [156, 168], [166, 194]], true, WHITE, INK, 4, ox));
      put('body', Crc(CX, 198, 3.4, INK, 'none', 0, ox));
      put('body', Crc(CX, 214, 3.4, INK, 'none', 0, ox));
      put('body', Crc(CX, 230, 3.4, INK, 'none', 0, ox));
    }
    if (body === 'hoodie') {
      put('hood', Py([[150, 166], [142, 196]], false, 'none', INK, 3, ox));
      put('hood', Py([[170, 166], [178, 196]], false, 'none', INK, 3, ox));
      put('hood', Crc(142, 196, 3.5, C.detail, INK, 2, ox));
      put('hood', Crc(178, 196, 3.5, C.detail, INK, 2, ox));
    }

    /* —— 手臂（画在衣服之后，避免被躯干挡住） —— */
    function armColors() {
      if (model.sleeve === 'bare') return { upper: C.skin, lower: C.skin };
      if (model.sleeve === 'short') return { upper: body === 'overalls' ? C.detail : C.main, lower: C.skin };
      return { upper: C.main, lower: C.main };
    }
    var ac = armColors();
    function drawArm(s, e, h) {
      put('arm', Py([s, e, h], false, 'none', INK, 20, ox));
      put('armFill', Py([s, e, h], false, 'none', ac.lower, 12, ox));
      if (ac.upper !== ac.lower) {
        var mid = [e[0] + (h[0] - e[0]) * 0.2, e[1] + (h[1] - e[1]) * 0.2];
        put('arm', Py([s, e, mid], false, 'none', INK, 20, ox));
        put('armFill', Py([s, e, mid], false, 'none', ac.upper, 12, ox));
      }
      put('hand', Crc(h[0], h[1], 8, C.skin, INK, 4, ox));
    }
    drawArm(pose.ls, pose.le, pose.lh);
    drawArm(pose.rs, pose.re, pose.rh);

    if (EARS[hair]) {
      put('ear', Crc(106, 112, 10, C.skin, INK, 4, ox));
      put('ear', Crc(214, 112, 10, C.skin, INK, 4, ox));
    }
    put('head', Crc(CX, 102, 54, C.skin, 'none', 0, ox));
    if (hair === 'buzz') {
      put('head', Crc(CX, 102, 54, 'none', INK, 5, ox));
    } else {
      /* 只描下巴和脸颊，避免发顶被整圈脸的描边切一刀 */
      put('head', Py(arcPts(CX, 102, 54, 0.05 * Math.PI, 0.95 * Math.PI, 18), false, 'none', INK, 5, ox));
    }

    /* —— 前发 —— */
    if (hair === 'bob' || hair === 'twin' || hair === 'long' || hair === 'shoulder') bangs(60, 30);
    if (hair === 'short') bangs(70, 18);
    if (hair === 'bun') {
      put('hair', Crc(CX, 40, 18, INK, INK, 5, ox));
      bangs(68, 20);
    }
    if (hair === 'twin') {
      put('hair', Crc(112, 58, 16, INK, INK, 5, ox));
      put('hair', Crc(208, 58, 16, INK, INK, 5, ox));
    }
    if (hair === 'pony') {
      put('hair', Crc(236, 96, 7, C.detail, INK, 3, ox));
      bangs(66, 22);
    }
    if (hair === 'side') {
      put('hair', Py([[196, 96], [176, 58], [118, 46], [100, 88], [124, 108], [168, 96]], true, INK, INK, 5, ox));
    }
    if (hair === 'swoop') {
      put('hair', Py([[118, 100], [132, 58], [176, 40], [220, 72], [206, 112], [150, 98]], true, INK, INK, 5, ox));
    }
    if (hair === 'buzz') {
      var ticks = [[146, 58, 146, 76], [160, 52, 160, 74], [174, 58, 174, 76], [134, 66, 132, 82], [186, 66, 188, 82]];
      var ti;
      for (ti = 0; ti < ticks.length; ti++) {
        var tk = ticks[ti];
        put('hair', Py([[tk[0], tk[1]], [tk[2], tk[3]]], false, 'none', INK, 4, ox));
      }
    }

    drawEyes(model.eyes.id, ox);
    drawMouth(model.mouth.id, ox, C);
    drawAccessory(model.accessory.id, ox, C);
    return shapes;

    function drawEyes(id, o) {
      var y = 100;
      var x1 = 138;
      var x2 = 182;
      function lens(x, w, h, fill) {
        put('eye', RR(x, y - 12, w, h, 4, fill, INK, 4, o));
      }
      function pupil(x) { put('eye', Crc(x, y + 1, 3.6, INK, 'none', 0, o)); }
      if (id === 'rect' || id === 'sun') {
        var fill = id === 'sun' ? '#1A1A1A' : WHITE;
        lens(122, 32, 24, fill);
        lens(166, 32, 24, fill);
        put('eye', Py([[154, y], [166, y]], false, 'none', INK, 4, o));
        if (id === 'sun') {
          put('eye', RR(126, y - 8, 12, 4, 2, WHITE, 'none', 0, o));
          put('eye', RR(170, y - 8, 12, 4, 2, WHITE, 'none', 0, o));
        } else {
          pupil(x1);
          pupil(x2);
        }
        return;
      }
      if (id === 'round') {
        put('eye', Crc(x1, y, 13, WHITE, INK, 4, o));
        put('eye', Crc(x2, y, 13, WHITE, INK, 4, o));
        put('eye', Py([[151, y], [169, y]], false, 'none', INK, 4, o));
        pupil(x1);
        pupil(x2);
        return;
      }
      if (id === 'dot' || id === 'brow') {
        put('eye', Crc(x1, y, 5, INK, 'none', 0, o));
        put('eye', Crc(x2, y, 5, INK, 'none', 0, o));
        if (id === 'brow') {
          put('brow', Py([[x1 - 14, y - 18], [x1 + 10, y - 12]], false, 'none', INK, 4, o));
          put('brow', Py([[x2 - 10, y - 16], [x2 + 14, y - 16]], false, 'none', INK, 4, o));
        }
        return;
      }
      if (id === 'closed') {
        put('eye', Py(arcPts(x1, y - 2, 10, 0.2 * Math.PI, 0.8 * Math.PI, 8), false, 'none', INK, 4, o));
        put('eye', Py(arcPts(x2, y - 2, 10, 0.2 * Math.PI, 0.8 * Math.PI, 8), false, 'none', INK, 4, o));
        return;
      }
      if (id === 'wide' || id === 'square' || id === 'wink') {
        if (id === 'square') {
          put('eye', RR(x1 - 11, y - 11, 22, 22, 4, WHITE, INK, 4, o));
          put('eye', RR(x2 - 11, y - 11, 22, 22, 4, WHITE, INK, 4, o));
        } else {
          put('eye', Ell(x1, y, 12, 14, WHITE, INK, 4, o));
          if (id === 'wink') {
            put('eye', Py([[x2 - 12, y], [x2 + 12, y + 2]], false, 'none', INK, 4, o));
          } else {
            put('eye', Ell(x2, y, 12, 14, WHITE, INK, 4, o));
          }
        }
        pupil(x1);
        if (id !== 'wink') pupil(x2);
        return;
      }
      /* sleepy */
      put('eye', Py([[x1 - 13, y], [x1 + 13, y + 2]], false, 'none', INK, 5, o));
      put('eye', Py([[x2 - 13, y + 2], [x2 + 13, y]], false, 'none', INK, 5, o));
    }

    function drawMouth(id, o, col) {
      var y = 130;
      var x = CX;
      if (id === 'line') {
        put('mouth', Py([[x - 12, y], [x + 12, y]], false, 'none', INK, 4, o));
      } else if (id === 'smile') {
        put('mouth', Py(arcPts(x, y - 6, 14, 0.18 * Math.PI, 0.82 * Math.PI, 10), false, 'none', INK, 4, o));
      } else if (id === 'open') {
        put('mouth', Ell(x, y + 2, 12, 9, '#1A1A1A', INK, 4, o));
      } else if (id === 'o') {
        put('mouth', Crc(x, y, 7, '#1A1A1A', INK, 4, o));
      } else if (id === 'cat') {
        put('mouth', Py([[x - 12, y - 2], [x - 4, y + 6], [x, y], [x + 4, y + 6], [x + 12, y - 2]], false, 'none', INK, 4, o));
      } else if (id === 'down') {
        put('mouth', Py(arcPts(x, y + 8, 12, 1.2 * Math.PI, 1.8 * Math.PI, 10), false, 'none', INK, 4, o));
      } else if (id === 'smirk') {
        put('mouth', Py([[x - 4, y + 2], [x + 14, y - 4]], false, 'none', INK, 4, o));
      } else if (id === 'teeth') {
        put('mouth', Ell(x, y + 2, 14, 10, '#1A1A1A', INK, 4, o));
        put('mouth', RR(x - 10, y - 6, 20, 8, 2, WHITE, 'none', 0, o));
      } else if (id === 'wave') {
        put('mouth', Py([[x - 14, y], [x - 7, y + 5], [x, y], [x + 7, y + 5], [x + 14, y]], false, 'none', INK, 4, o));
      } else {
        put('mouth', Crc(x, y, 3.6, INK, 'none', 0, o));
      }
    }

    function drawAccessory(id, o, col) {
      if (id === 'none') return;
      if (id === 'pin') {
        put('accessory', RR(196, 68, 20, 9, 3, col.detail, INK, 3, o));
        return;
      }
      if (id === 'scarf') {
        put('accessory', RR(122, 156, 76, 18, 8, col.detail, INK, 4, o));
        put('accessory', RR(168, 170, 16, 28, 6, col.detail, INK, 4, o));
        return;
      }
      if (id === 'bag') {
        put('accessory', Py([[196, 176], [236, 196]], false, 'none', INK, 4, o));
        put('accessory', RR(214, 190, 36, 32, 6, col.detail, INK, 4, o));
        put('accessory', RR(224, 198, 16, 8, 2, WHITE, INK, 3, o));
        return;
      }
      if (id === 'band') {
        put('accessory', Py([[118, 86], [202, 80]], false, 'none', INK, 12, o));
        put('accessory', Py([[118, 86], [202, 80]], false, 'none', col.detail, 6, o));
        return;
      }
      if (id === 'bow') {
        put('accessory', Crc(146, 176, 8, col.detail, INK, 3, o));
        put('accessory', Crc(174, 176, 8, col.detail, INK, 3, o));
        put('accessory', Crc(160, 176, 4, INK, 'none', 0, o));
        return;
      }
      if (id === 'cheek') {
        put('accessory', Crc(128, 122, 6, col.detail, 'none', 0, o));
        put('accessory', Crc(192, 122, 6, col.detail, 'none', 0, o));
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
    var h = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + VIEW + ' ' + VIEW + '" width="' + num(s) + '" height="' + num(s) + '" role="img" aria-label="指纹简笔小人" stroke-linecap="round" stroke-linejoin="round">';
    h += '<title>指纹简笔小人</title>';
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
