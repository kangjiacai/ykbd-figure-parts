/* 部件拼装式全身形象。种子是指纹码（如 B665-6G14-RPME）。
 * 去连字符后 12 个字符分段，互不混用：
 *   0-1 发型(12)  2-3 眼睛(10)  4-5 嘴(10)  6 衣服(8)
 *   7 四肢姿势(8)  8-9 主色(8)  10 强调色(8)  11 配件(8)
 * 同一种子永远同一形象。绘制过程没有随机数。
 * 图层固定：后发 → 身体 → 脖子 → 头（含耳）→ 前发刘海 → 五官。
 * 长发/披肩发的后发片在身体后面，两侧从肩后露出，不夹在头和衣领之间。
 * 画风对齐 B3 定稿：圆润体积的四肢、连指套式椭圆掌、衣服有领口/扣/袋/帽绳、鞋有分层鞋底。
 * 手臂沿肩—肘—手平滑弯曲，肘是圆弧，不画尖角折线。头到鞋留在画布内，贴纸再留一圈空白。
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
  /* 四肢坐标：s 肩 / e 肘（曲线必经点）/ h 手 / hip 髋 / k 膝 / f 脚。ox 为水平偏移。
   * 肘在肩与手之间外扩，弯角大约一百多度，避免又尖又长的折线。 */
  var POSE = [
    { id: 'stand', name: '自然站立', ox: 0,
      ls: [116, 198], le: [100, 228], lh: [94, 258],
      rs: [204, 198], re: [220, 228], rh: [226, 258],
      lhip: [146, 246], lk: [140, 276], lf: [134, 304],
      rhip: [174, 246], rk: [180, 276], rf: [186, 304] },
    { id: 'hip', name: '单手叉腰', ox: 0,
      ls: [118, 196], le: [74, 218], lh: [92, 246],
      rs: [204, 198], re: [222, 228], rh: [230, 258],
      lhip: [146, 246], lk: [138, 276], lf: [130, 304],
      rhip: [174, 246], rk: [184, 276], rf: [190, 304] },
    { id: 'cheer', name: '举手', ox: 0,
      ls: [118, 190], le: [98, 154], lh: [78, 122],
      rs: [202, 190], re: [222, 154], rh: [242, 122],
      lhip: [148, 246], lk: [142, 276], lf: [136, 304],
      rhip: [172, 246], rk: [178, 276], rf: [184, 304] },
    { id: 'wave', name: '挥手', ox: 0,
      ls: [116, 198], le: [102, 230], lh: [96, 260],
      rs: [204, 188], re: [228, 150], rh: [246, 114],
      lhip: [146, 246], lk: [138, 276], lf: [132, 304],
      rhip: [174, 246], rk: [182, 276], rf: [188, 304] },
    { id: 'akimbo', name: '双手叉腰', ox: 0,
      ls: [118, 196], le: [72, 220], lh: [90, 248],
      rs: [202, 196], re: [248, 220], rh: [230, 248],
      lhip: [144, 248], lk: [132, 276], lf: [124, 304],
      rhip: [176, 248], rk: [188, 276], rf: [196, 304] },
    { id: 'lean', name: '歪站', ox: 8,
      ls: [116, 198], le: [100, 226], lh: [92, 256],
      rs: [204, 192], re: [228, 216], rh: [240, 248],
      lhip: [146, 246], lk: [134, 276], lf: [124, 304],
      rhip: [174, 246], rk: [196, 268], rf: [186, 302] },
    { id: 'walk', name: '迈步', ox: 0,
      ls: [116, 190], le: [98, 158], lh: [80, 132],
      rs: [204, 198], re: [224, 228], rh: [236, 258],
      lhip: [150, 246], lk: [128, 274], lf: [112, 304],
      rhip: [170, 246], rk: [196, 272], rf: [212, 302] },
    { id: 'wide', name: '张开', ox: 0,
      ls: [116, 194], le: [84, 208], lh: [68, 238],
      rs: [204, 194], re: [236, 208], rh: [252, 238],
      lhip: [142, 246], lk: [122, 276], lf: [108, 304],
      rhip: [178, 246], rk: [198, 276], rf: [212, 304] }
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
  /* 四字合成名：前词 + 后词，只由规范化后的 12 位码决定。 */
  var NAME_L = [
    '盐巴', '雾窗', '纸鹤', '月光', '晴天', '晚风', '海盐', '青苔',
    '薄荷', '电台', '松果', '信笺', '麦芽', '果酱', '码头', '蝉鸣',
    '暖桌', '纸船', '柠檬', '夜航', '糖纸', '雨巷', '青柠', '候鸟',
    '潮汐', '绒线', '晨雾', '桃核', '风铃', '银杏', '云朵', '星子'
  ];
  var NAME_R = [
    '气球', '火柴', '汽水', '拉面', '板栗', '灯塔', '柚子', '邮戳',
    '饼干', '墨水', '柳絮', '炉火', '雪松', '琴键', '藤蔓', '贝壳',
    '麦浪', '灯芯', '霜糖', '茶渍', '枫糖', '橘瓣', '苇岸', '瓷杯',
    '线团', '露台', '热汤', '铁盒', '蜡笔', '毛线', '船票', '布丁'
  ];
  function figureName(raw) {
    var h = fnv('ykbd-cn-name:' + raw);
    var left = NAME_L[h % NAME_L.length];
    h = Math.imul(h ^ (h >>> 16), 0x7feb352d) >>> 0;
    return left + NAME_R[h % NAME_R.length];
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
      displayName: figureName(raw),
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
  function quadAt(a, c, b, t) {
    var u = 1 - t;
    return [
      u * u * a[0] + 2 * u * t * c[0] + t * t * b[0],
      u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]
    ];
  }
  function ctrlThrough(a, mid, b) {
    return [
      2 * mid[0] - 0.5 * a[0] - 0.5 * b[0],
      2 * mid[1] - 0.5 * a[1] - 0.5 * b[1]
    ];
  }
  function approach(a, b, dist) {
    var dx = b[0] - a[0];
    var dy = b[1] - a[1];
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.01) len = 0.01;
    if (dist > len * 0.42) dist = len * 0.42;
    return [b[0] - dx / len * dist, b[1] - dy / len * dist];
  }
  function splitQuad(a, c, b, t) {
    var acx = a[0] + (c[0] - a[0]) * t;
    var acy = a[1] + (c[1] - a[1]) * t;
    var cbx = c[0] + (b[0] - c[0]) * t;
    var cby = c[1] + (b[1] - c[1]) * t;
    var mx = acx + (cbx - acx) * t;
    var my = acy + (cby - acy) * t;
    return { left: [a, [acx, acy], [mx, my]], right: [[mx, my], [cbx, cby], b] };
  }
  function subQuad(a, c, b, t0, t1) {
    var right = splitQuad(a, c, b, t0).right;
    var u = (t1 - t0) / (1 - t0);
    return splitQuad(right[0], right[1], right[2], u).left;
  }
  /* 两端圆头的粗曲线。w 是半径。肘在中段略加粗，没有尖角。 */
  function tube(a, c, b, w0, w1, steps) {
    var cens = [];
    var tang = [];
    var left = [];
    var right = [];
    var i;
    var t;
    var pPrev;
    var pNext;
    var dx;
    var dy;
    var len;
    var w;
    var n = steps;
    for (i = 0; i <= n; i++) cens.push(quadAt(a, c, b, i / n));
    for (i = 0; i <= n; i++) {
      pPrev = cens[i === 0 ? 0 : i - 1];
      pNext = cens[i === n ? n : i + 1];
      dx = pNext[0] - pPrev[0];
      dy = pNext[1] - pPrev[1];
      len = Math.sqrt(dx * dx + dy * dy);
      if (len < 0.01) len = 0.01;
      tang.push([dx / len, dy / len]);
      t = i / n;
      w = w0 + (w1 - w0) * t + Math.sin(Math.PI * t) * 1.3;
      left.push([cens[i][0] + (-dy / len) * w, cens[i][1] + (dx / len) * w]);
      right.push([cens[i][0] - (-dy / len) * w, cens[i][1] - (dx / len) * w]);
    }
    function cap(cx, cy, tx, ty, radius, backward) {
      var ta = Math.atan2(ty, tx);
      var start = backward ? (ta - Math.PI / 2) : (ta + Math.PI / 2);
      var sweep = -Math.PI;
      var pts = [];
      var k;
      var ang;
      for (k = 0; k <= 6; k++) {
        ang = start + sweep * (k / 6);
        pts.push([cx + Math.cos(ang) * radius, cy + Math.sin(ang) * radius]);
      }
      return pts;
    }
    function radAt(i0) {
      var ddx = left[i0][0] - cens[i0][0];
      var ddy = left[i0][1] - cens[i0][1];
      return Math.sqrt(ddx * ddx + ddy * ddy);
    }
    var back = cap(cens[0][0], cens[0][1], tang[0][0], tang[0][1], radAt(0), true);
    var fwd = cap(cens[n][0], cens[n][1], tang[n][0], tang[n][1], radAt(n), false);
    var poly = [];
    for (i = 0; i < back.length; i++) poly.push(back[i]);
    for (i = 1; i <= n; i++) poly.push(left[i]);
    for (i = 0; i < fwd.length; i++) poly.push(fwd[i]);
    for (i = n - 1; i >= 0; i--) poly.push(right[i]);
    return poly;
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
    var gi;

    function putBack(sh) { return put('hairBack', sh); }
    function putFront(sh) { return put('hairFront', sh); }

    /* 1. 后发。长发在身体后面，两侧从肩后垂下。 */
    if (hair === 'afro') {
      var puffs = [[160, 48, 28], [118, 76, 24], [202, 76, 24], [124, 110, 20], [196, 110, 20], [160, 34, 14]];
      var pi;
      for (pi = 0; pi < puffs.length; pi++) putBack(Crc(puffs[pi][0], puffs[pi][1], puffs[pi][2], INK, INK, 4, ox));
    } else if (hair === 'buzz') {
      putBack(Ell(CX, 48, 40, 14, INK, INK, 4, ox));
    } else if (hair === 'short') {
      putBack(Ell(CX, 50, 46, 16, INK, INK, 4, ox));
    } else if (hair === 'spiky') {
      putBack(Ell(CX, 74, 46, 24, INK, INK, 4, ox));
      var spikes = [
        [160, 32, 146, 72, 174, 72],
        [126, 48, 110, 84, 142, 76],
        [194, 48, 178, 76, 210, 84],
        [110, 74, 98, 102, 130, 94],
        [210, 74, 190, 94, 222, 102]
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
      putBack(Ell(CX - 46, 128, 16, 30, INK, INK, 4, ox));
      putBack(Ell(CX + 46, 128, 16, 30, INK, INK, 4, ox));
    }
    if (hair === 'long' || hair === 'shoulder') {
      var sheetBot = hair === 'long' ? 286 : 224;
      function sideLock(sign) {
        var s = sign;
        return [
          [CX + s * 44, 118],
          [CX + s * 58, 136],
          [CX + s * 74, 170],
          [CX + s * 80, 214],
          [CX + s * 74, sheetBot - 18],
          [CX + s * 60, sheetBot],
          [CX + s * 46, sheetBot - 8],
          [CX + s * 48, 210],
          [CX + s * 42, 164],
          [CX + s * 38, 134]
        ];
      }
      putBack(Py(sideLock(-1), true, INK, INK, 4, ox));
      putBack(Py(sideLock(1), true, INK, INK, 4, ox));
      put('hairBack', Py([[CX - 66, 176], [CX - 62, sheetBot - 30]], false, 'none', '#FFFFFF', 3, ox)).opac = 0.45;
      put('hairBack', Py([[CX + 66, 176], [CX + 62, sheetBot - 30]], false, 'none', '#FFFFFF', 3, ox)).opac = 0.45;
    }
    if (hair === 'pony') {
      putBack(Py([
        [206, 78],
        [232, 86],
        [248, 118],
        [242, 172],
        [226, 194],
        [214, 168],
        [218, 124],
        [198, 96]
      ], true, INK, INK, 4, ox));
    }

    /* 连帽衫的帽沿只围在颈肩，不罩住整张脸。 */
    if (body === 'hoodie') {
      put('hood', Py([
        [CX - 68, 162],
        [CX - 60, 128],
        [CX - 34, 116],
        [CX + 34, 116],
        [CX + 60, 128],
        [CX + 68, 162],
        [CX + 50, 198],
        [CX - 50, 198]
      ], true, C.main, INK, 5, ox));
    }

    function drawShoe(foot) {
      var x = foot[0];
      var y = foot[1];
      put('sole', RR(x - 20, y - 1, 42, 9, 3.5, WHITE, INK, 3.2, ox));
      put('shoe', RR(x - 17, y - 15, 36, 16, 6, C.shoe, INK, 3.4, ox));
      put('shoeStripe', RR(x - 11, y - 11, 22, 4, 2, C.accent, 'none', 0, ox));
    }
    function drawLeg(hip, knee, foot) {
      var start = [hip[0], hip[1] - 10];
      var end = approach(knee, foot, 3);
      var c = ctrlThrough(start, knee, end);
      put('leg', Py(tube(start, c, end, 12, 9, 10), true, C.pants, INK, 4, ox));
      drawShoe(foot);
    }
    drawLeg(pose.lhip, pose.lk, pose.lf);
    drawLeg(pose.rhip, pose.rk, pose.rf);

    /* 衣服先描粗边，手臂叠在描边上，填色再盖住肩根和边的内半，袖身就不会被横线切断。 */
    var clothes = [];
    function addBox(x, y, w, h, rx, fill) {
      clothes.push({ kind: 'rr', x: x, y: y, w: w, h: h, rx: rx, fill: fill });
    }
    function addPoly(pts, fill) {
      clothes.push({ kind: 'poly', pts: pts, fill: fill });
    }
    function skirtPoly(y, h, topW, botW) {
      var pts = [];
      var arc;
      var ai;
      pts.push([CX - topW / 2 + 2, y]);
      pts.push([CX + topW / 2 - 2, y]);
      pts.push([CX + topW / 2 + 6, y + 16]);
      arc = ellArc(CX, y + h - 12, botW / 2, 16, 0.06 * Math.PI, 0.94 * Math.PI, 9);
      for (ai = 0; ai < arc.length; ai++) pts.push(arc[ai]);
      pts.push([CX - topW / 2 - 6, y + 16]);
      return pts;
    }

    var shirt = C.main;
    if (body === 'overalls' || body === 'vest') shirt = C.detail;
    if (body === 'tee') addBox(CX - 52, 178, 104, 60, 16, shirt);
    else if (body === 'sweater') addBox(CX - 52, 178, 104, 70, 16, shirt);
    else if (body === 'shirt') addBox(CX - 52, 178, 104, 74, 12, shirt);
    else if (body === 'hoodie') addBox(CX - 56, 176, 112, 82, 20, shirt);
    else if (body === 'overalls') {
      addBox(CX - 54, 174, 108, 58, 16, shirt);
      addBox(CX - 32, 200, 64, 52, 10, C.main);
    } else if (body === 'dress') {
      addBox(CX - 40, 174, 80, 42, 16, shirt);
      addPoly(skirtPoly(198, 64, 72, 124), shirt);
    } else if (body === 'vest') {
      addBox(CX - 54, 174, 108, 72, 16, shirt);
      addBox(CX - 50, 188, 46, 54, 10, C.main);
      addBox(CX + 4, 188, 46, 54, 10, C.main);
    } else {
      addBox(CX - 56, 174, 112, 78, 20, shirt);
    }

    if (clothes.length) {
      var shadow = clothes[0];
      if (shadow.kind === 'rr') {
        put('shadow', RR(shadow.x + 6, shadow.y + 7, shadow.w, shadow.h, shadow.rx, INK, 'none', 0, ox));
      }
    }
    for (gi = 0; gi < clothes.length; gi++) {
      if (clothes[gi].kind === 'rr') {
        put('body', RR(clothes[gi].x, clothes[gi].y, clothes[gi].w, clothes[gi].h, clothes[gi].rx, clothes[gi].fill, INK, 4.5, ox));
      } else {
        put('body', Py(clothes[gi].pts, true, clothes[gi].fill, INK, 4.5, ox));
      }
    }

    function drawArm(s, e, h) {
      var end = approach(e, h, 6);
      var c = ctrlThrough(s, e, end);
      var upper = C.main;
      var lower = C.main;
      if (model.sleeve === 'bare') {
        upper = C.skin;
        lower = C.skin;
      } else if (model.sleeve === 'short') {
        upper = body === 'overalls' ? C.detail : C.main;
        lower = C.skin;
      }
      if (upper !== lower) {
        put('arm', Py(tube(s, c, end, 10.6, 8.2, 11), true, lower, INK, 4, ox));
        var sub = subQuad(s, c, end, 0, 0.52);
        put('arm', Py(tube(sub[0], sub[1], sub[2], 11.2, 9.6, 8), true, upper, INK, 4, ox));
      } else {
        put('arm', Py(tube(s, c, end, 11, 8.4, 11), true, upper, INK, 4, ox));
      }
    }
    drawArm(pose.ls, pose.le, pose.lh);
    drawArm(pose.rs, pose.re, pose.rh);

    function crew(y) {
      return ellArc(CX, y - 2, 18, 11, 0.18 * Math.PI, 0.82 * Math.PI, 8);
    }
    function buttons(x, ys) {
      var bi;
      for (bi = 0; bi < ys.length; bi++) put('button', Crc(x, ys[bi], 3.3, INK, 'none', 0, ox));
    }
    function pocketAt(x, y, w, h) {
      put('pocket', RR(x, y, w, h, 5, 'none', INK, 3, ox));
      put('pocket', Py([[x + 3, y + 5], [x + w - 3, y + 5]], false, 'none', INK, 2.4, ox));
    }

    if (body === 'stripes') {
      var bandY = [198, 216, 234];
      var byi;
      for (byi = 0; byi < bandY.length; byi++) {
        put('stripe', RR(CX - 40, bandY[byi], 80, 9, 3, C.detail, 'none', 0, ox));
      }
      put('collar', Py(crew(184), false, 'none', INK, 4, ox));
    } else if (body === 'tee') {
      put('collar', Py(crew(184), false, 'none', INK, 4, ox));
      buttons(CX, [200, 216]);
      pocketAt(CX + 14, 204, 26, 18);
    } else if (body === 'sweater') {
      put('collar', Py(crew(182), false, 'none', INK, 4.5, ox));
      put('collar', Py(crew(190), false, 'none', C.deep, 3, ox));
      put('body', Py([[CX - 38, 236], [CX + 38, 236]], false, 'none', C.deep, 3.5, ox));
      put('body', Py([[CX - 40, 246], [CX + 40, 246]], false, 'none', INK, 3, ox));
    } else if (body === 'shirt') {
      put('collar', Py([[CX - 16, 176], [CX - 2, 176], [CX - 11, 198]], true, WHITE, INK, 3, ox));
      put('collar', Py([[CX + 16, 176], [CX + 2, 176], [CX + 11, 198]], true, WHITE, INK, 3, ox));
      put('body', Py([[CX, 196], [CX, 244]], false, 'none', INK, 3, ox));
      buttons(CX, [206, 222, 238]);
      pocketAt(CX + 14, 208, 24, 18);
    } else if (body === 'overalls') {
      put('body', RR(CX - 26, 170, 14, 36, 5, C.main, INK, 3.6, ox));
      put('body', RR(CX + 12, 170, 14, 36, 5, C.main, INK, 3.6, ox));
      buttons(CX - 19, [178]);
      buttons(CX + 19, [178]);
      pocketAt(CX - 12, 214, 24, 18);
    } else if (body === 'dress') {
      put('collar', Py(crew(184), false, 'none', INK, 4, ox));
      put('button', Crc(CX, 198, 3.6, C.accent, INK, 2, ox));
      put('body', Py([[CX - 36, 214], [CX + 36, 214]], false, 'none', INK, 3.5, ox));
    } else if (body === 'hoodie') {
      put('hood', Py([[CX - 8, 190], [CX - 12, 212]], false, 'none', INK, 3, ox));
      put('hood', Py([[CX + 8, 190], [CX + 12, 212]], false, 'none', INK, 3, ox));
      put('hood', Crc(CX - 12, 214, 4.2, C.accent, INK, 2.4, ox));
      put('hood', Crc(CX + 12, 214, 4.2, C.accent, INK, 2.4, ox));
      put('pocket', RR(CX - 30, 216, 60, 30, 10, C.deep, INK, 3.4, ox));
      put('pocket', Py(ellArc(CX, 220, 16, 7, 0.16 * Math.PI, 0.84 * Math.PI, 6), false, 'none', INK, 3, ox));
    } else if (body === 'vest') {
      put('body', Py([[CX, 196], [CX, 236]], false, 'none', INK, 3, ox));
      buttons(CX - 10, [206, 222]);
      pocketAt(CX + 12, 208, 22, 16);
    }

    function drawHand(from, h) {
      var dx = h[0] - from[0];
      var dy = h[1] - from[1];
      var adx = dx < 0 ? -dx : dx;
      var ady = dy < 0 ? -dy : dy;
      var rx = 15;
      var ry = 13;
      if (ady > adx * 1.15) {
        rx = 12.5;
        ry = 16;
      } else if (adx > ady * 1.15) {
        rx = 17.5;
        ry = 13;
      }
      put('hand', Ell(h[0], h[1], rx, ry, C.skin, INK, 3.6, ox));
    }
    drawHand(pose.le, pose.lh);
    drawHand(pose.re, pose.rh);

    /* 脖子盖在衣领上，采样点保持肤色。头的阴影先落在脖子后面。 */
    put('shadow', Ell(CX + 6, 110, 46, 50, INK, 'none', 0, ox));
    put('neck', RR(CX - 13, 150, 26, 36, 10, C.skin, INK, 4, ox));

    if (EARS[hair]) {
      put('ear', Crc(108, 114, 12, C.skin, INK, 3.5, ox));
      put('ear', Crc(212, 114, 12, C.skin, INK, 3.5, ox));
    }
    put('head', Ell(CX, 102, 50, 54, C.skin, INK, 5, ox));
    if (EARS[hair]) {
      put('ear', Py([[98, 108], [104, 114], [98, 120]], false, 'none', INK, 2.2, ox));
      put('ear', Py([[222, 108], [216, 114], [222, 120]], false, 'none', INK, 2.2, ox));
    }

    /* 前发。bangs 盖到眉上；short / crop 只占头顶，露出额头。 */
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
      putFront(Crc(CX, 38, 16, INK, INK, 4, ox));
      putFront(Py([[CX - 10, 38], [CX + 10, 38]], false, 'none', C.detail, 4, ox));
    }
    if (hair === 'twin') {
      putFront(Crc(114, 62, 14, INK, INK, 4, ox));
      putFront(Crc(206, 62, 14, INK, INK, 4, ox));
      putFront(Crc(114, 62, 5, C.detail, INK, 2, ox));
      putFront(Crc(206, 62, 5, C.detail, INK, 2, ox));
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
    put('blush', Ell(126, 128, 11, 7, '#C8F542', 'none', 0, ox));
    put('blush', Ell(194, 128, 11, 7, '#C8F542', 'none', 0, ox));
    drawAccessory(model.accessory.id);
    return shapes;

    function drawEyes(id) {
      var y = eyeY;
      var x1 = 138;
      var x2 = 182;
      function pupil(x) {
        put('eye', Crc(x + 1, y + 1, 6.4, INK, 'none', 0, ox));
        put('eye', Crc(x + 3.4, y - 2, 2.3, WHITE, 'none', 0, ox));
      }
      if (id === 'rect' || id === 'sun') {
        var lens = id === 'sun' ? '#1A1A1A' : WHITE;
        put('eye', RR(120, y - 14, 34, 28, 8, lens, INK, 4, ox));
        put('eye', RR(166, y - 14, 34, 28, 8, lens, INK, 4, ox));
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
        put('eye', Crc(x1, y, 6, INK, 'none', 0, ox));
        put('eye', Crc(x2, y, 6, INK, 'none', 0, ox));
        put('eye', Crc(x1 + 1.8, y - 1.8, 1.8, WHITE, 'none', 0, ox));
        put('eye', Crc(x2 + 1.8, y - 1.8, 1.8, WHITE, 'none', 0, ox));
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
          put('eye', RR(x1 - 13, y - 12, 27, 24, 8, WHITE, INK, 3.6, ox));
          put('eye', RR(x2 - 13, y - 12, 27, 24, 8, WHITE, INK, 3.6, ox));
        } else {
          put('eye', Ell(x1, y, 13, 12.5, WHITE, INK, 3.6, ox));
          if (id === 'wink') put('eye', Py(arcPts(x2, y + 1, 12, 1.2 * Math.PI, 1.85 * Math.PI, 8), false, 'none', INK, 4, ox));
          else put('eye', Ell(x2, y, 13, 12.5, WHITE, INK, 3.6, ox));
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
        put('accessory', Py([[196, 176], [232, 196]], false, 'none', INK, 4, o));
        put('accessory', RR(210, 190, 34, 30, 6, col.detail, INK, 4, o));
        put('accessory', RR(218, 198, 16, 8, 2, WHITE, INK, 3, o));
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
    /* 视图比 320 画布略收左右、上下留白，贴纸里头和鞋不会贴边。 */
    var vb = '32 0 256 328';
    var h = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '" width="' + num(s) + '" height="' + num(s) + '" role="img" aria-label="全身形象" stroke-linecap="round" stroke-linejoin="round">';
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
