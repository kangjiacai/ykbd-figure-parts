/* 部件拼装式全身形象。种子是指纹码（如 B665-6G14-RPME）。
 * 去连字符后 12 个字符分段，互不混用：
 *   0-1 发型(12)  2-3 眼睛(10)  4-5 嘴(10)  6 衣服(8)
 *   7 四肢姿势(8)  8-9 主色(8)  10 强调色(8)  11 配件(8)
 * 同一种子永远同一形象。绘制过程没有随机数。
 * 图层固定：后发 → 身体 → 脖子 → 头（含耳）→ 前发刘海 → 五官。
 * 长发/披肩发的后发片在身体后面，两侧从肩后露出，不夹在头和衣领之间。
 * 头只含头和脖子皮肤。衣服自带同色领口，脖子底端伸进领口。可见脖子约 8px（允许 6–12）。
 * 连帽衫没有升到脖子后方的衣色帽拱。耳是豆形加一道浅弧。头顶是圆的。
 * 刘海类的头顶和发际线是同一块前发；后发只做披在身后的那一片。
 * 锚点固定：肩、腰、领口、脖子。换姿势只改肘膝手足。
 * 画风对齐 B3 定稿：圆端点、有体积的四肢、鞋有鞋底、衣服有领口/扣/袋/帽绳。
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

  /* 头是正圆。领口在头底下方 10px，描边吃掉之后可见肤色大约 8px。 */
  var HEAD_CY = 98;
  var HEAD_R = 50;
  var COLLAR_Y = 160;
  var SH_L = [116, 188];
  var SH_R = [204, 188];
  var HIP_L = [146, 240];
  var HIP_R = [174, 240];

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
  /* 肩和腰是固定锚点。姿势只改肘、手、膝、脚。ox 把上身连同腿一起平移。 */
  var POSE = [
    { id: 'stand', name: '自然站立', ox: 0,
      ls: [116, 188], le: [98, 214], lh: [86, 250],
      rs: [204, 188], re: [222, 214], rh: [234, 250],
      lhip: [146, 240], lk: [140, 266], lf: [132, 290],
      rhip: [174, 240], rk: [180, 266], rf: [188, 290] },
    { id: 'hip', name: '单手叉腰', ox: 0,
      ls: [116, 188], le: [66, 204], lh: [124, 224],
      rs: [204, 188], re: [226, 214], rh: [238, 252],
      lhip: [146, 240], lk: [140, 266], lf: [132, 290],
      rhip: [174, 240], rk: [180, 266], rf: [188, 290] },
    { id: 'cheer', name: '举手', ox: 0,
      ls: [116, 188], le: [96, 150], lh: [72, 116],
      rs: [204, 188], re: [224, 150], rh: [248, 116],
      lhip: [146, 240], lk: [142, 266], lf: [138, 290],
      rhip: [174, 240], rk: [178, 266], rf: [182, 290] },
    { id: 'wave', name: '挥手', ox: 0,
      ls: [116, 188], le: [100, 216], lh: [88, 252],
      rs: [204, 188], re: [226, 142], rh: [246, 102],
      lhip: [146, 240], lk: [140, 266], lf: [132, 290],
      rhip: [174, 240], rk: [180, 266], rf: [188, 290] },
    { id: 'akimbo', name: '双手叉腰', ox: 0,
      ls: [116, 188], le: [64, 204], lh: [124, 224],
      rs: [204, 188], re: [256, 204], rh: [196, 224],
      lhip: [146, 240], lk: [134, 266], lf: [124, 290],
      rhip: [174, 240], rk: [186, 266], rf: [196, 290] },
    { id: 'lean', name: '歪站', ox: 12,
      ls: [116, 188], le: [94, 208], lh: [80, 246],
      rs: [204, 188], re: [230, 196], rh: [244, 228],
      lhip: [146, 240], lk: [136, 268], lf: [126, 290],
      rhip: [174, 240], rk: [198, 256], rf: [186, 288] },
    { id: 'walk', name: '迈步', ox: 0,
      ls: [116, 188], le: [104, 164], lh: [84, 138],
      rs: [204, 188], re: [224, 220], rh: [240, 256],
      lhip: [146, 240], lk: [126, 268], lf: [110, 290],
      rhip: [174, 240], rk: [196, 266], rf: [214, 288] },
    { id: 'wide', name: '张开', ox: 0,
      ls: [116, 188], le: [74, 206], lh: [68, 240],
      rs: [204, 188], re: [246, 206], rh: [252, 240],
      lhip: [146, 240], lk: [120, 268], lf: [104, 290],
      rhip: [174, 240], rk: [200, 268], rf: [216, 290] }
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
  function approach(a, b, dist) {
    var dx = b[0] - a[0];
    var dy = b[1] - a[1];
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.01) len = 0.01;
    if (dist > len * 0.42) dist = len * 0.42;
    return [b[0] - dx / len * dist, b[1] - dy / len * dist];
  }
  /* 两端圆头的粗曲线。w 是半径。直段用来接肘和膝，避免折返时扭成蝴蝶结。 */
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
      w = w0 + (w1 - w0) * t + Math.sin(Math.PI * t) * 1.4;
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

  /* 每件衣服共用这一条领口：左右领唇 + 伸进胸口的 U。领口和衣身同色。 */
  function shell(lower) {
    var pts = [
      [140, COLLAR_Y],
      [124, COLLAR_Y + 14],
      [108, COLLAR_Y + 36]
    ];
    var i;
    for (i = 0; i < lower.length; i++) pts.push(lower[i]);
    pts.push([212, COLLAR_Y + 36]);
    pts.push([196, COLLAR_Y + 14]);
    pts.push([180, COLLAR_Y]);
    pts.push([172, COLLAR_Y + 10]);
    pts.push([160, COLLAR_Y + 20]);
    pts.push([148, COLLAR_Y + 10]);
    return pts;
  }

  function buildShapes(model) {
    var shapes = [];
    function put(part, sh) { sh.part = part; shapes.push(sh); return sh; }
    var C = model.colors;
    var ox = model.pose.ox || 0;
    var hair = model.hair.id;
    var body = model.body.id;
    var pose = model.pose;
    var eyeY = 112;
    var mouthY = 132;

    function putBack(sh) { return put('hairBack', sh); }
    function putFront(sh) { return put('hairFront', sh); }

    function crownArc() {
      return ellArc(CX, 94, 66, 54, 1.16 * Math.PI, 1.84 * Math.PI, 10);
    }
    /* 头顶弧和发际线收成同一块，避免刘海像另戴的一片。 */
    function capWithBangs(bangs) {
      var arc = crownArc();
      var pts = [];
      var i;
      for (i = 0; i < arc.length; i++) pts.push(arc[i]);
      for (i = 0; i < bangs.length; i++) pts.push(bangs[i]);
      return pts;
    }
    function sideLock(sign, topY, botY, outer) {
      var s = sign;
      var midY = (topY + botY) * 0.5;
      return [
        [CX + s * 46, topY],
        [CX + s * (outer - 6), topY + 16],
        [CX + s * outer, midY],
        [CX + s * (outer - 2), botY - 18],
        [CX + s * (outer - 16), botY],
        [CX + s * (outer - 30), botY - 8],
        [CX + s * 36, midY + 8]
      ];
    }
    function sideburn(sign) {
      var s = sign;
      return [
        [CX + s * 48, 78],
        [CX + s * 58, 96],
        [CX + s * 54, 128],
        [CX + s * 42, 132],
        [CX + s * 40, 100]
      ];
    }

    /* 1. 后发。只放会从身体后面露出来的部分，不在额头再铺一层帽子。 */
    if (hair === 'afro') {
      var puffs = [[160, 46, 22], [118, 78, 24], [202, 78, 24], [108, 112, 18], [212, 112, 18], [132, 48, 16], [188, 48, 16]];
      var pi;
      for (pi = 0; pi < puffs.length; pi++) putBack(Crc(puffs[pi][0], puffs[pi][1], puffs[pi][2], INK, INK, 4, ox));
    } else if (hair === 'long') {
      putBack(Py(sideLock(-1, 72, 276, 92), true, INK, INK, 4, ox));
      putBack(Py(sideLock(1, 72, 276, 92), true, INK, INK, 4, ox));
      put('hairBack', Py([[CX - 78, 150], [CX - 86, 250]], false, 'none', '#FFFFFF', 3, ox)).opac = 0.4;
      put('hairBack', Py([[CX + 78, 150], [CX + 86, 250]], false, 'none', '#FFFFFF', 3, ox)).opac = 0.4;
    } else if (hair === 'shoulder') {
      putBack(Py(sideLock(-1, 74, 212, 82), true, INK, INK, 4, ox));
      putBack(Py(sideLock(1, 74, 212, 82), true, INK, INK, 4, ox));
      put('hairBack', Py([[CX - 70, 140], [CX - 76, 200]], false, 'none', '#FFFFFF', 3, ox)).opac = 0.4;
      put('hairBack', Py([[CX + 70, 140], [CX + 76, 200]], false, 'none', '#FFFFFF', 3, ox)).opac = 0.4;
    } else if (hair === 'pony') {
      putBack(Py([
        [196, 74], [220, 66], [242, 96], [246, 156], [228, 198],
        [210, 184], [214, 130], [198, 96]
      ], true, INK, INK, 4, ox));
      putBack(Py(sideLock(-1, 84, 148, 58), true, INK, INK, 4, ox));
    } else if (hair === 'bob') {
      putBack(Py(sideLock(-1, 80, 146, 60), true, INK, INK, 4, ox));
      putBack(Py(sideLock(1, 80, 146, 60), true, INK, INK, 4, ox));
    } else if (hair === 'side') {
      putBack(Py(sideLock(-1, 82, 174, 66), true, INK, INK, 4, ox));
      putBack(Py(sideLock(1, 86, 128, 52), true, INK, INK, 4, ox));
    } else if (hair === 'swoop') {
      putBack(Py(sideLock(1, 82, 176, 68), true, INK, INK, 4, ox));
      putBack(Py(sideLock(-1, 86, 128, 52), true, INK, INK, 4, ox));
    } else if (hair === 'bun' || hair === 'twin') {
      putBack(Py(sideLock(-1, 84, 138, 56), true, INK, INK, 4, ox));
      putBack(Py(sideLock(1, 84, 138, 56), true, INK, INK, 4, ox));
    } else {
      putBack(Py(sideburn(-1), true, INK, INK, 3.5, ox));
      putBack(Py(sideburn(1), true, INK, INK, 3.5, ox));
    }

    function drawShoe(foot) {
      var x = foot[0];
      var y = foot[1];
      put('shoe', RR(x - 16, y - 14, 34, 14, 6, C.shoe, INK, 3.4, ox));
      put('shoeStripe', RR(x - 10, y - 10, 20, 3.5, 1.5, C.accent, 'none', 0, ox));
      put('sole', RR(x - 19, y - 2, 40, 8, 3, WHITE, INK, 3, ox));
    }
    function segTube(a, b, w0, w1) {
      var mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      return tube(a, mid, b, w0, w1, 8);
    }
    function drawLeg(hip, knee, foot) {
      var ankle = approach(knee, foot, 10);
      put('leg', Py(segTube(knee, ankle, 11.2, 10), true, C.pants, INK, 4, ox));
      put('leg', Py(segTube(hip, knee, 13.6, 12), true, C.pants, INK, 4, ox));
      put('leg', Crc(knee[0], knee[1], 12, C.pants, INK, 3.6, ox));
      drawShoe(foot);
    }
    drawLeg(pose.lhip, pose.lk, pose.lf);
    drawLeg(pose.rhip, pose.rk, pose.rf);

    var shirt = C.main;
    if (body === 'overalls' || body === 'vest') shirt = C.detail;
    var lower = [116, 248, 204, 248];
    if (body === 'dress') lower = [102, 214, 88, 256, 232, 256, 218, 214];
    else if (body === 'overalls') lower = [114, 212, 206, 212];
    else if (body === 'hoodie') lower = [112, 252, 208, 252];
    var lowerPts = [];
    var li;
    for (li = 0; li < lower.length; li += 2) lowerPts.push([lower[li], lower[li + 1]]);
    var cloth = shell(lowerPts);
    put('body', Py(cloth, true, shirt, INK, 4.5, ox));

    function collarRib() {
      put('collar', Py([
        [146, COLLAR_Y + 2],
        [152, COLLAR_Y + 12],
        [160, COLLAR_Y + 16],
        [168, COLLAR_Y + 12],
        [174, COLLAR_Y + 2]
      ], false, 'none', C.deep, 3.5, ox));
    }
    function buttons(x, ys) {
      var bi;
      for (bi = 0; bi < ys.length; bi++) put('button', Crc(x, ys[bi], 3.4, INK, 'none', 0, ox));
    }
    function pocketAt(x, y, w, h) {
      put('pocket', RR(x, y, w, h, 5, 'none', INK, 3, ox));
      put('pocket', Py([[x + 3, y + 6], [x + w - 3, y + 6]], false, 'none', INK, 2.4, ox));
    }

    if (body === 'stripes') {
      var bandY = [198, 216, 234];
      var byi;
      for (byi = 0; byi < bandY.length; byi++) {
        var y0 = bandY[byi];
        put('stripe', Py([
          [128, y0], [192, y0], [192, y0 + 9], [128, y0 + 9]
        ], true, C.detail, 'none', 0, ox));
      }
      put('body', Py(cloth, true, 'none', INK, 4.5, ox));
      collarRib();
    } else if (body === 'tee') {
      collarRib();
      buttons(CX, [204, 222]);
      pocketAt(CX + 16, 206, 26, 20);
    } else if (body === 'sweater') {
      collarRib();
      put('collar', Py([
        [142, COLLAR_Y + 6],
        [150, COLLAR_Y + 16],
        [160, COLLAR_Y + 20],
        [170, COLLAR_Y + 16],
        [178, COLLAR_Y + 6]
      ], false, 'none', C.deep, 5, ox));
      put('body', Py([[CX - 40, 232], [CX + 40, 232]], false, 'none', C.deep, 4, ox));
      put('body', Py([[CX - 42, 242], [CX + 42, 242]], false, 'none', C.deep, 4, ox));
    } else if (body === 'shirt') {
      put('collar', Py([[126, COLLAR_Y + 2], [150, COLLAR_Y - 2], [138, COLLAR_Y + 34]], true, C.main, INK, 3.2, ox));
      put('collar', Py([[194, COLLAR_Y + 2], [170, COLLAR_Y - 2], [182, COLLAR_Y + 34]], true, C.main, INK, 3.2, ox));
      put('body', Py([[CX, 196], [CX, 242]], false, 'none', INK, 3, ox));
      buttons(CX, [204, 220, 236]);
      pocketAt(CX + 16, 208, 24, 18);
    } else if (body === 'overalls') {
      collarRib();
      put('body', RR(CX - 34, 196, 68, 56, 8, C.main, INK, 4, ox));
      put('body', Py([[128, COLLAR_Y + 4], [140, 204]], false, 'none', INK, 8, ox));
      put('body', Py([[128, COLLAR_Y + 4], [140, 204]], false, 'none', C.main, 4.2, ox));
      put('body', Py([[192, COLLAR_Y + 4], [180, 204]], false, 'none', INK, 8, ox));
      put('body', Py([[192, COLLAR_Y + 4], [180, 204]], false, 'none', C.main, 4.2, ox));
      buttons(CX - 16, [206]);
      buttons(CX + 16, [206]);
      pocketAt(CX - 12, 216, 24, 18);
    } else if (body === 'dress') {
      collarRib();
      put('button', Crc(CX, 198, 3.6, C.accent, INK, 2, ox));
      put('body', Py([[CX - 36, 214], [CX + 36, 214]], false, 'none', INK, 3.5, ox));
    } else if (body === 'hoodie') {
      collarRib();
      /* 帽片只贴在肩线两侧，不升到脖子后面。 */
      put('hood', Py([[108, 176], [96, 164], [114, 156], [128, 174]], true, C.main, INK, 4, ox));
      put('hood', Py([[212, 176], [224, 164], [206, 156], [192, 174]], true, C.main, INK, 4, ox));
      put('hood', Py([[CX - 8, 198], [CX - 14, 214]], false, 'none', INK, 3, ox));
      put('hood', Py([[CX + 8, 198], [CX + 14, 214]], false, 'none', INK, 3, ox));
      put('hood', Crc(CX - 14, 216, 4.4, C.accent, INK, 2.4, ox));
      put('hood', Crc(CX + 14, 216, 4.4, C.accent, INK, 2.4, ox));
      put('pocket', RR(CX - 32, 222, 64, 26, 8, C.deep, INK, 3.4, ox));
      put('pocket', Py([[CX - 20, 230], [CX + 20, 230]], false, 'none', INK, 3, ox));
    } else if (body === 'vest') {
      collarRib();
      put('body', Py([[112, 190], [118, 246], [154, 246], [148, 198]], true, C.main, INK, 4, ox));
      put('body', Py([[208, 190], [202, 246], [166, 246], [172, 198]], true, C.main, INK, 4, ox));
      buttons(CX - 8, [208, 226]);
      pocketAt(CX + 8, 214, 22, 16);
    }

    var upper = C.main;
    var lowerCol = C.main;
    if (model.sleeve === 'bare') { upper = C.skin; lowerCol = C.skin; }
    else if (model.sleeve === 'short') {
      upper = (body === 'overalls') ? C.detail : C.main;
      lowerCol = C.skin;
    }
    function handRadii(from, h) {
      var dx = h[0] - from[0];
      var dy = h[1] - from[1];
      var adx = dx < 0 ? -dx : dx;
      var ady = dy < 0 ? -dy : dy;
      if (ady > adx * 1.15) return [11.5, 14.5];
      if (adx > ady * 1.15) return [15.5, 12];
      return [13.5, 12.5];
    }
    function drawArm(s, e, h) {
      var wrist = approach(e, h, 11);
      put('arm', Py(segTube(e, wrist, 10.6, 9.2), true, lowerCol, INK, 4, ox));
      put('arm', Py(segTube(s, e, 12.6, 11.2), true, upper, INK, 4, ox));
      put('arm', Crc(e[0], e[1], 11.4, upper, INK, 3.6, ox));
      var rad = handRadii(e, h);
      put('hand', Ell(h[0], h[1], rad[0], rad[1], C.skin, INK, 3.5, ox));
    }
    drawArm(SH_L, pose.le, pose.lh);
    drawArm(SH_R, pose.re, pose.rh);

    /* 3. 脖子：窄柱露出约一指，下端扩进同色领口，没有封底的横线。 */
    put('neck', Py([
      [150, 142],
      [170, 142],
      [182, COLLAR_Y],
      [174, COLLAR_Y + 12],
      [160, COLLAR_Y + 24],
      [146, COLLAR_Y + 12],
      [138, COLLAR_Y],
      [150, 152]
    ], true, C.skin, 'none', 0, ox));

    /* 4. 头。豆形耳先画，头盖住内侧。浅弧画在露出的外缘。 */
    put('ear', Ell(103, 118, 9, 14, C.skin, INK, 3.2, ox));
    put('ear', Ell(217, 118, 9, 14, C.skin, INK, 3.2, ox));
    put('head', Ell(CX, HEAD_CY, HEAD_R, HEAD_R, C.skin, INK, 4.5, ox));
    put('ear', Py([[96, 112], [101, 118], [96, 124]], false, 'none', INK, 2, ox));
    put('ear', Py([[224, 112], [219, 118], [224, 124]], false, 'none', INK, 2, ox));

    /* 5. 前发。bangs 的头顶和刘海是同一块；short / crop 只占头顶。 */
    if (hair === 'bob') {
      putFront(Py(capWithBangs([
        [214, 78], [198, 88], [180, 92], [160, 90], [140, 92], [122, 88], [106, 78]
      ]), true, INK, INK, 4, ox));
    } else if (hair === 'side') {
      putFront(Py(capWithBangs([
        [214, 76], [196, 86], [176, 90], [160, 90], [142, 96], [122, 104], [106, 82]
      ]), true, INK, INK, 4, ox));
    } else if (hair === 'swoop') {
      putFront(Py(capWithBangs([
        [214, 86], [198, 104], [178, 94], [160, 90], [144, 86], [124, 80], [106, 74]
      ]), true, INK, INK, 4, ox));
    } else if (hair === 'bun') {
      putFront(Py(capWithBangs([
        [212, 80], [194, 90], [176, 93], [160, 91], [144, 93], [126, 90], [108, 80]
      ]), true, INK, INK, 4, ox));
      putFront(Crc(CX, 44, 16, INK, INK, 4, ox));
      putFront(Py([[CX - 11, 46], [CX + 11, 46]], false, 'none', C.detail, 4, ox));
    } else if (hair === 'twin') {
      putFront(Py(capWithBangs([
        [212, 80], [194, 92], [176, 88], [160, 90], [144, 88], [126, 92], [108, 80]
      ]), true, INK, INK, 4, ox));
      putFront(Crc(114, 58, 15, INK, INK, 4, ox));
      putFront(Crc(206, 58, 15, INK, INK, 4, ox));
      putFront(Crc(114, 58, 5, C.detail, INK, 2, ox));
      putFront(Crc(206, 58, 5, C.detail, INK, 2, ox));
    } else if (hair === 'long' || hair === 'pony' || hair === 'shoulder') {
      putFront(Py(capWithBangs([
        [214, 76], [200, 88], [180, 92], [160, 90], [140, 92], [120, 88], [106, 76]
      ]), true, INK, INK, 4, ox));
      if (hair === 'pony') putFront(Crc(214, 92, 6.5, C.detail, INK, 2.4, ox));
    }
    if (model.hair.type === 'bangs') {
      put('hairFront', Py([[136, 52], [156, 46], [174, 54]], false, 'none', '#FFFFFF', 3, ox)).opac = 0.5;
    }
    if (hair === 'buzz') {
      putFront(Ell(CX, 46, 40, 12, INK, INK, 4, ox));
      put('hairFront', Py([[148, 40], [160, 36], [172, 42]], false, 'none', '#FFFFFF', 2.2, ox)).opac = 0.45;
    }
    if (hair === 'short') {
      putFront(Ell(CX, 44, 48, 16, INK, INK, 4, ox));
      putFront(Crc(132, 34, 8, INK, INK, 3, ox));
      putFront(Crc(186, 32, 7, INK, INK, 3, ox));
    }
    if (hair === 'spiky') {
      putFront(Py([
        [160, 26], [148, 52], [126, 38], [132, 60],
        [108, 52], [124, 70], [148, 66], [160, 74],
        [172, 66], [196, 70], [212, 52], [188, 60],
        [194, 38], [172, 52]
      ], true, INK, INK, 4, ox));
    }
    if (hair === 'afro') {
      putFront(Crc(160, 62, 24, INK, INK, 4, ox));
      putFront(Crc(130, 74, 16, INK, INK, 3.5, ox));
      putFront(Crc(190, 74, 16, INK, INK, 3.5, ox));
    }

    if (model.eyes.id !== 'brow' && model.eyes.id !== 'sleepy') {
      put('brow', Py([[128, 102], [140, 96], [152, 102]], false, 'none', INK, 3.2, ox));
      put('brow', Py([[168, 102], [180, 96], [192, 102]], false, 'none', INK, 3.2, ox));
    }
    drawEyes(model.eyes.id);
    put('nose', Py([[156, 122], [164, 122], [160, 130]], true, INK, 'none', 0, ox));
    drawMouth(model.mouth.id);
    put('blush', Ell(124, 126, 9, 6, '#C8F542', 'none', 0, ox));
    put('blush', Ell(196, 126, 9, 6, '#C8F542', 'none', 0, ox));
    drawAccessory(model.accessory.id);
    return shapes;

    function drawEyes(id) {
      var y = eyeY;
      var x1 = 138;
      var x2 = 182;
      function pupil(x, s) {
        put('eye', Crc(x + 1, y + 1, 5.2 * s, INK, 'none', 0, ox));
        put('eye', Crc(x + 2.6, y - 1.6, 1.8 * s, WHITE, 'none', 0, ox));
      }
      if (id === 'rect' || id === 'sun') {
        var lens = id === 'sun' ? '#1A1A1A' : WHITE;
        put('eye', RR(118, y - 15, 36, 30, 8, lens, INK, 4, ox));
        put('eye', RR(166, y - 15, 36, 30, 8, lens, INK, 4, ox));
        put('eye', Py([[154, y], [166, y]], false, 'none', INK, 4, ox));
        if (id === 'sun') {
          put('eye', RR(126, y - 8, 18, 5, 2, WHITE, 'none', 0, ox));
          put('eye', RR(174, y - 8, 18, 5, 2, WHITE, 'none', 0, ox));
        } else {
          pupil(x1, 1);
          pupil(x2, 1);
        }
        return;
      }
      if (id === 'round') {
        put('eye', Crc(x1, y, 15, WHITE, INK, 4, ox));
        put('eye', Crc(x2, y, 15, WHITE, INK, 4, ox));
        put('eye', Py([[153, y], [167, y]], false, 'none', INK, 4, ox));
        pupil(x1, 1);
        pupil(x2, 1);
        return;
      }
      if (id === 'dot' || id === 'brow') {
        put('eye', Crc(x1, y, 5.2, INK, 'none', 0, ox));
        put('eye', Crc(x2, y, 5.2, INK, 'none', 0, ox));
        put('eye', Crc(x1 + 1.5, y - 1.5, 1.5, WHITE, 'none', 0, ox));
        put('eye', Crc(x2 + 1.5, y - 1.5, 1.5, WHITE, 'none', 0, ox));
        if (id === 'brow') {
          put('brow', Py([[x1 - 16, y - 14], [x1 + 4, y - 24]], false, 'none', INK, 3.6, ox));
          put('brow', Py([[x2 - 6, y - 12], [x2 + 16, y - 12]], false, 'none', INK, 3.6, ox));
        }
        return;
      }
      if (id === 'closed') {
        put('eye', Py(arcPts(x1, y + 2, 13, 1.15 * Math.PI, 1.85 * Math.PI, 8), false, 'none', INK, 4, ox));
        put('eye', Py(arcPts(x2, y + 2, 13, 1.15 * Math.PI, 1.85 * Math.PI, 8), false, 'none', INK, 4, ox));
        return;
      }
      if (id === 'wide') {
        put('eye', Ell(x1, y, 15, 16, WHITE, INK, 3.6, ox));
        put('eye', Ell(x2, y, 15, 16, WHITE, INK, 3.6, ox));
        pupil(x1, 1.15);
        pupil(x2, 1.15);
        return;
      }
      if (id === 'square') {
        put('eye', RR(x1 - 13, y - 12, 26, 24, 5, WHITE, INK, 3.6, ox));
        put('eye', RR(x2 - 13, y - 12, 26, 24, 5, WHITE, INK, 3.6, ox));
        pupil(x1, 1);
        pupil(x2, 1);
        return;
      }
      if (id === 'wink') {
        put('eye', Ell(x1, y, 14, 13, WHITE, INK, 3.6, ox));
        pupil(x1, 1);
        put('eye', Py(arcPts(x2, y + 1, 12, 1.18 * Math.PI, 1.85 * Math.PI, 8), false, 'none', INK, 4, ox));
        return;
      }
      /* sleepy：上眼睑压下来，还看得见一点瞳孔。 */
      put('eye', Ell(x1, y + 2, 13, 8, WHITE, INK, 3.4, ox));
      put('eye', Ell(x2, y + 2, 13, 8, WHITE, INK, 3.4, ox));
      put('eye', Py([[x1 - 13, y - 1], [x1 + 13, y - 1]], false, 'none', INK, 3.4, ox));
      put('eye', Py([[x2 - 13, y - 1], [x2 + 13, y - 1]], false, 'none', INK, 3.4, ox));
      put('eye', Crc(x1 + 1, y + 3, 3.2, INK, 'none', 0, ox));
      put('eye', Crc(x2 + 1, y + 3, 3.2, INK, 'none', 0, ox));
      put('brow', Py([[x1 - 12, y - 12], [x1 + 12, y - 14]], false, 'none', INK, 3, ox));
      put('brow', Py([[x2 - 12, y - 14], [x2 + 12, y - 12]], false, 'none', INK, 3, ox));
    }

    function drawMouth(id) {
      var y = mouthY;
      var x = CX;
      if (id === 'line') put('mouth', Py([[x - 14, y], [x + 14, y]], false, 'none', INK, 4, ox));
      else if (id === 'smile') put('mouth', Py(arcPts(x, y - 8, 15, 0.15 * Math.PI, 0.85 * Math.PI, 10), false, 'none', INK, 4, ox));
      else if (id === 'open') {
        put('mouth', Ell(x, y + 2, 13, 10, '#1A1A1A', INK, 3.5, ox));
        put('mouth', Ell(x, y + 5, 6, 3.6, C.accent, 'none', 0, ox));
      } else if (id === 'o') {
        put('mouth', Crc(x, y, 8.5, '#1A1A1A', INK, 3.5, ox));
        put('mouth', Crc(x, y + 2, 3.2, C.accent, 'none', 0, ox));
      } else if (id === 'cat') {
        put('mouth', Py([[x - 14, y - 2], [x - 5, y + 7], [x, y + 1], [x + 5, y + 7], [x + 14, y - 2]], false, 'none', INK, 4, ox));
      } else if (id === 'down') {
        put('mouth', Py(arcPts(x, y + 10, 13, 1.18 * Math.PI, 1.82 * Math.PI, 10), false, 'none', INK, 4, ox));
      } else if (id === 'smirk') {
        put('mouth', Py([[x - 2, y + 3], [x + 16, y - 5]], false, 'none', INK, 4, ox));
        put('mouth', Py(arcPts(x + 4, y - 2, 8, 0.15 * Math.PI, 0.7 * Math.PI, 6), false, 'none', INK, 3, ox));
      } else if (id === 'teeth') {
        put('mouth', Ell(x, y + 2, 15, 11, '#1A1A1A', INK, 3.5, ox));
        put('mouth', RR(x - 11, y - 6, 22, 8, 2, WHITE, 'none', 0, ox));
      } else if (id === 'wave') {
        put('mouth', Py([[x - 16, y], [x - 8, y + 6], [x, y], [x + 8, y + 6], [x + 16, y]], false, 'none', INK, 4, ox));
      } else put('mouth', Ell(x, y, 4.2, 3.4, INK, 'none', 0, ox));
    }

    function drawAccessory(id) {
      var col = C;
      var o = ox;
      if (id === 'none') return;
      if (id === 'pin') {
        put('accessory', RR(198, 58, 22, 10, 3, col.detail, INK, 3, o));
        return;
      }
      if (id === 'scarf') {
        put('accessory', RR(124, 192, 72, 14, 7, col.detail, INK, 3.6, o));
        put('accessory', RR(170, 202, 16, 28, 6, col.detail, INK, 3.6, o));
        return;
      }
      if (id === 'bag') {
        put('accessory', Py([[198, 176], [236, 198]], false, 'none', INK, 4, o));
        put('accessory', RR(214, 192, 36, 32, 6, col.detail, INK, 4, o));
        put('accessory', RR(224, 200, 16, 8, 2, WHITE, INK, 3, o));
        return;
      }
      if (id === 'band') {
        put('accessory', Py([[124, 52], [196, 52]], false, 'none', INK, 8, o));
        put('accessory', Py([[124, 52], [196, 52]], false, 'none', col.detail, 4, o));
        return;
      }
      if (id === 'bow') {
        put('accessory', Crc(146, 206, 8, col.detail, INK, 3, o));
        put('accessory', Crc(174, 206, 8, col.detail, INK, 3, o));
        put('accessory', Crc(160, 206, 4, INK, 'none', 0, o));
        return;
      }
      if (id === 'cheek') {
        put('accessory', Crc(118, 132, 5, col.detail, INK, 2.2, o));
        put('accessory', Crc(202, 132, 5, col.detail, INK, 2.2, o));
        return;
      }
      put('accessory', Crc(188, 216, 11, col.detail, INK, 3, o));
      put('accessory', Crc(188, 216, 4, WHITE, 'none', 0, o));
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

  function shapeBox(sh) {
    var m = (sh.sw || 0) / 2;
    var box = { minx: 1e9, miny: 1e9, maxx: -1e9, maxy: -1e9 };
    function take(x, y) {
      if (x < box.minx) box.minx = x;
      if (y < box.miny) box.miny = y;
      if (x > box.maxx) box.maxx = x;
      if (y > box.maxy) box.maxy = y;
    }
    if (sh.op === 'circle') {
      take(sh.cx - sh.r, sh.cy - sh.r);
      take(sh.cx + sh.r, sh.cy + sh.r);
    } else if (sh.op === 'ellipse') {
      take(sh.cx - sh.rx, sh.cy - sh.ry);
      take(sh.cx + sh.rx, sh.cy + sh.ry);
    } else if (sh.op === 'roundrect') {
      take(sh.x, sh.y);
      take(sh.x + sh.w, sh.y + sh.h);
    } else if (sh.op === 'poly' && sh.pts) {
      var p;
      for (p = 0; p < sh.pts.length; p++) take(sh.pts[p][0], sh.pts[p][1]);
    }
    box.minx -= m;
    box.miny -= m;
    box.maxx += m;
    box.maxy += m;
    return box;
  }
  function pointInPoly(pts, x, y) {
    var inside = false;
    var i;
    var j = pts.length - 1;
    for (i = 0; i < pts.length; i++) {
      var xi = pts[i][0];
      var yi = pts[i][1];
      var xj = pts[j][0];
      var yj = pts[j][1];
      var hit = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / ((yj - yi) === 0 ? 1e-9 : (yj - yi)) + xi);
      if (hit) inside = !inside;
      j = i;
    }
    return inside;
  }
  function extremum(shapes, name, wantMax) {
    var found = -1;
    var i;
    for (i = 0; i < shapes.length; i++) {
      if (shapes[i].part !== name) continue;
      if (found < 0 || (wantMax && i > found) || (!wantMax && i < found)) found = i;
    }
    return found;
  }

  /* 生成后断言。失败说明这套部件破了硬规则，不是某一张种子的特例。 */
  function audit(model, shapes) {
    var problems = [];
    var ox = model.pose.ox || 0;
    var cx = CX + ox;
    var head = null;
    var neck = null;
    var earsE = 0;
    var earsA = 0;
    var beanBad = 0;
    var shellTop = 1e9;
    var dipY = -1;
    var hands = 0;
    var shoes = 0;
    var soles = 0;
    var arms = 0;
    var legs = 0;
    var hairBack = 0;
    var united = 0;
    var frontLow = -1;
    var i;
    var sh;
    var p;
    if (!model.hair.type) problems.push('undeclared ' + model.hair.id);
    for (i = 0; i < shapes.length; i++) {
      sh = shapes[i];
      if (sh.part === 'head' && sh.op === 'ellipse') head = sh;
      if (sh.part === 'neck' && sh.op === 'poly' && sh.fill && sh.fill !== 'none') neck = sh;
      if (sh.part === 'ear' && sh.op === 'ellipse') {
        earsE++;
        if (!(sh.ry >= sh.rx * 1.3)) beanBad++;
      }
      if (sh.part === 'ear' && sh.op === 'poly') earsA++;
      if (sh.part === 'hand') hands++;
      if (sh.part === 'shoe') shoes++;
      if (sh.part === 'sole') soles++;
      if (sh.part === 'arm') arms++;
      if (sh.part === 'leg') legs++;
      if (sh.part === 'hairBack') hairBack++;
      if (sh.part === 'body' && sh.op === 'poly' && sh.pts && sh.fill && sh.fill !== 'none') {
        var bb = shapeBox(sh);
        if (bb.maxy - bb.miny > 36) {
          for (p = 0; p < sh.pts.length; p++) {
            if (sh.pts[p][1] < shellTop) shellTop = sh.pts[p][1];
            if (Math.abs(sh.pts[p][0] - cx) <= 10 && sh.pts[p][1] < 210 && sh.pts[p][1] > dipY) dipY = sh.pts[p][1];
          }
        }
      }
      if (sh.part === 'hairFront') {
        var fb = shapeBox(sh);
        if (fb.maxy > frontLow) frontLow = fb.maxy;
        if (sh.op === 'poly' && fb.miny < 52 && fb.maxy > 86) united++;
      }
      if (model.body.id === 'hoodie' && sh.fill && sh.fill !== 'none' && (sh.fill === model.colors.main || sh.fill === model.colors.deep)) {
        if (sh.part !== 'arm' && sh.part !== 'hand' && sh.part !== 'leg' && sh.part !== 'shoe' && sh.part !== 'shoeStripe' && sh.part !== 'accessory') {
          var hb = shapeBox(sh);
          if (hb.miny < COLLAR_Y - 8 && hb.minx < cx + 18 && hb.maxx > cx - 18) {
            problems.push('hood arch ' + model.body.id + ' ' + sh.part);
          }
        }
      }
    }
    if (!head || head.op !== 'ellipse') problems.push('round head missing');
    else {
      var ratio = head.rx > head.ry ? head.rx / head.ry : head.ry / head.rx;
      if (ratio > 1.08) problems.push('head not round ' + ratio);
      if (shellTop < 900) {
        var gap = shellTop - (head.cy + head.ry);
        if (gap < 6 || gap > 12.01) problems.push('neck gap ' + gap);
      } else problems.push('shell missing');
    }
    if (!neck) problems.push('neck missing');
    else if (dipY < 0 || shapeBox(neck).maxy < dipY - 1) problems.push('neck not in collar ' + dipY);
    else {
      var sdx;
      var sdy;
      var miss = 0;
      for (sdx = -6; sdx <= 6; sdx += 6) {
        for (sdy = -4; sdy <= 4; sdy += 4) {
          if (!pointInPoly(neck.pts, cx + sdx, 168 + sdy)) miss++;
        }
      }
      if (miss > 2) problems.push('neck samples ' + miss);
    }
    if (earsE < 2 || earsA < 2 || beanBad) problems.push('ears ' + earsE + '/' + earsA);
    if (hairBack < 1) problems.push('hairBack');
    if (model.hair.type === 'bangs' && united < 1) problems.push('hair split ' + model.hair.id);
    if ((model.hair.type === 'short' || model.hair.type === 'crop') && frontLow > 96) {
      problems.push('over eye ' + model.hair.id + ' ' + frontLow);
    }
    if (model.hair.type === 'crop' && frontLow > 64) problems.push('crop covered ' + model.hair.id + ' ' + frontLow);
    if (hands < 2 || shoes < 2 || soles < 2 || arms < 2 || legs < 2) problems.push('limbs');
    var lastBack = extremum(shapes, 'hairBack', true);
    var firstLeg = extremum(shapes, 'leg', false);
    var lastArm = extremum(shapes, 'arm', true);
    var firstNeck = extremum(shapes, 'neck', false);
    var firstHead = extremum(shapes, 'head', false);
    var firstFront = extremum(shapes, 'hairFront', false);
    var firstEye = extremum(shapes, 'eye', false);
    var firstEar = extremum(shapes, 'ear', false);
    var frontOk = firstFront < 0 || firstHead < firstFront;
    var faceOk = firstHead < firstEye && (firstFront < 0 || firstFront < firstEye);
    var earOk = firstEar < 0 || (firstNeck < firstEar && firstEar < firstEye && (firstFront < 0 || firstEar < firstFront));
    if (!(lastBack >= 0 && lastBack < firstLeg && firstLeg < lastArm && lastArm < firstNeck && firstNeck < firstHead && frontOk && faceOk && earOk)) {
      problems.push('order');
    }
    if (model.hair.id === 'long' || model.hair.id === 'shoulder') {
      var minX = 999;
      var maxX = -999;
      for (i = 0; i < shapes.length; i++) {
        if (shapes[i].part !== 'hairBack' || shapes[i].op !== 'poly') continue;
        for (p = 0; p < shapes[i].pts.length; p++) {
          if (shapes[i].pts[p][0] < minX) minX = shapes[i].pts[p][0];
          if (shapes[i].pts[p][0] > maxX) maxX = shapes[i].pts[p][0];
        }
      }
      if (!(minX < 100 && maxX > 230)) problems.push('back sheet ' + minX + ' ' + maxX);
    }
    var anchorShift = 0;
    if (Math.abs(poseNum(model.pose.ls, SH_L)) > 0.1) anchorShift = 1;
    if (Math.abs(poseNum(model.pose.rs, SH_R)) > 0.1) anchorShift = 1;
    if (Math.abs(poseNum(model.pose.lhip, HIP_L)) > 0.1) anchorShift = 1;
    if (Math.abs(poseNum(model.pose.rhip, HIP_R)) > 0.1) anchorShift = 1;
    if (anchorShift) problems.push('anchor moved ' + model.pose.id);
    for (i = 0; i < shapes.length; i++) {
      var ob = shapeBox(shapes[i]);
      if (ob.minx < -1 || ob.miny < -1 || ob.maxx > 321 || ob.maxy > 321) {
        problems.push('oob ' + shapes[i].part);
        break;
      }
    }
    return problems;
  }
  function poseNum(a, b) {
    return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
  }

  function figureShapes(fp) {
    return buildShapes(figureModel(fp));
  }
  function checkedShapes(fp) {
    var model = figureModel(fp);
    var shapes = buildShapes(model);
    var problems = audit(model, shapes);
    if (problems.length) throw new Error(problems[0]);
    return shapes;
  }
  function figureSVG(fp, size) {
    var s = Number(size);
    if (!isFinite(s) || s <= 0) s = VIEW;
    var shapes = checkedShapes(fp);
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
    var shapes = checkedShapes(fp);
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
    audit: audit,
    seedFor: seedFor,
    combo: comboCount(),
    HAIR_TYPE: HAIR_TYPE,
    hairs: HAIR,
    anchors: {
      headCy: HEAD_CY,
      headR: HEAD_R,
      collarY: COLLAR_Y,
      shoulderL: SH_L,
      shoulderR: SH_R,
      hipL: HIP_L,
      hipR: HIP_R,
      neckGapMin: 6,
      neckGapMax: 12
    },
    /* 采样区仍是额头带 y=64–84、脖子 y=168。刘海下沿约落到 y=88–92，眼睛画在 y=112 附近。x 再加 pose.ox。 */
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
