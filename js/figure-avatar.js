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

  /* B3 定稿坐标系：viewBox 400×720。头、脖子、领口锚点与 gen-b3 相同。 */
  var VIEW_W = 400;
  var VIEW_H = 720;
  var VIEW = VIEW_W;
  var INK = '#111111';
  var WHITE = '#FFFFFF';
  var HAIR_INK = '#1A1A1A';
  var BLUSH = '#C8F542';
  var CX = 200;
  var HEAD_CX = 200;
  var HEAD_CY = 188;
  var HEAD_RX = 88;
  var HEAD_RY = 94;
  var HEAD_BOTTOM = 282;
  var COLLAR_TOP = 290;
  var NECK_X = 176;
  var NECK_Y = 262;
  var NECK_W = 48;
  var NECK_H = 74;
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
    { id: 'lean', name: '歪站', ox: 0,
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
  var PANTS = '#3B4CCA';

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
        shoe: detail,
        hair: HAIR_INK,
        blush: BLUSH
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

  /* —— B3 定稿画法。路径来自定稿生成器，再铺到 12/10/10/8/8 个槽位上。 —— */

  var CROWN = 'M100 214 C85 160 125 70 200 66 C275 70 315 160 300 214';
  var CROP_CROWN = 'M100 214 C88 165 130 92 200 88 C270 92 312 165 300 214';
  var BUZZ_CROWN = 'M100 214 C98 168 145 112 200 108 C255 112 302 168 300 214';
  var EDGE = {
    fringe: 'L288 186 Q276 168 260 164 Q246 172 230 162 Q216 172 200 162 Q184 172 170 162 Q154 172 140 164 Q124 168 112 186 L100 214',
    swept: 'L292 186 C278 168 252 160 228 162 C210 170 192 164 174 166 C154 170 132 178 112 190 L100 214',
    side: 'L286 180 C270 166 248 158 220 160 C200 164 184 160 168 164 C150 170 128 188 108 200 L100 214',
    swoop: 'L292 198 C278 176 252 158 224 160 C204 166 184 160 166 158 C148 164 124 172 108 186 L100 214',
    spiky: 'L288 188 L274 164 L258 168 L242 158 L224 168 L200 156 L176 168 L158 158 L142 168 L126 164 L112 188 L100 214',
    curly: 'L290 186 Q284 168 266 166 Q252 178 236 168 Q220 180 200 168 Q180 180 164 168 Q148 178 134 166 Q116 168 110 186 L100 214',
    crop: 'L294 170 Q284 128 262 122 Q236 116 200 120 Q164 116 138 122 Q116 128 106 170 L100 214',
    buzz: 'L294 150 Q276 118 240 112 Q218 106 200 108 Q182 106 160 112 Q124 118 106 150 L100 214'
  };
  var EDGE_OF = {
    bob: 'fringe', short: 'crop', side: 'side', bun: 'fringe', twin: 'fringe',
    long: 'swept', pony: 'fringe', afro: 'curly', shoulder: 'swept', spiky: 'spiky',
    buzz: 'buzz', swoop: 'swoop'
  };
  var TORSO = 'M122 340 C122 312 140 290 164 290 L176 290 L176 324 C180 336 220 336 224 324 L224 290 L236 290 C260 290 278 312 278 340 L278 495 C278 520 250 538 200 538 C150 538 122 520 122 495 Z';
  var LEG_L = 'M162 505 C155 575 148 635 142 665 L176 668 C180 635 186 575 190 512 Z';
  var LEG_R = 'M238 505 C245 575 252 635 258 665 L224 668 C220 635 214 575 210 512 Z';
  var LEG_L_OUT = 'M162 498 C154 555 145 618 136 666 L180 670 C186 618 192 555 196 508 Z';
  var LEG_R_OUT = 'M238 498 C246 555 255 618 270 664 L226 670 C220 618 214 555 204 508 Z';
  var LEG_L_WALK = 'M150 508 C128 570 108 635 98 668 L146 672 C158 632 164 575 176 514 Z';
  var LEG_R_WALK = 'M248 500 C272 555 302 625 318 658 L274 666 C262 625 246 560 226 508 Z';
  var SHOE_L = 'M122 658 C122 658 112 676 132 680 L178 680 C188 680 188 668 178 664 Z';
  var SHOE_R = 'M222 658 C222 658 212 676 232 680 L278 680 C288 680 288 668 278 664 Z';
  var SHOE_L_OUT = 'M116 660 C116 660 106 678 128 682 L182 682 C192 682 194 670 184 666 Z';
  var SHOE_R_OUT = 'M244 660 C244 660 234 678 256 682 L310 680 C320 678 318 666 308 664 Z';
  var SHOE_L_WALK = 'M86 656 C86 656 78 674 98 678 L150 678 C160 678 158 666 148 662 Z';
  var SHOE_R_WALK = 'M262 650 C262 650 254 668 274 672 L332 670 C340 668 338 656 328 652 Z';
  var ARM = {
    standL: 'M128 340 C95 380 78 440 92 470 C100 482 116 476 118 462 C112 430 120 385 140 350 Z',
    standR: 'M272 340 C305 380 322 440 308 470 C300 482 284 476 282 462 C288 430 280 385 260 350 Z',
    waveL: 'M130 330 C110 350 78 390 62 430 C58 442 68 452 80 448 C100 400 118 362 136 342 Z',
    waveR: 'M270 328 C290 300 310 250 322 210 C328 198 344 202 342 216 C328 270 300 320 278 348 Z',
    outL: 'M128 335 C90 360 48 400 36 438 C32 450 44 460 56 454 C78 410 108 370 140 348 Z',
    outR: 'M272 335 C310 360 352 400 364 438 C368 450 356 460 344 454 C322 410 292 370 260 348 Z',
    hipL: 'M130 338 C100 358 62 392 70 428 C76 442 96 444 104 430 C96 396 112 360 148 346 Z',
    akL: 'M130 336 C102 352 64 378 60 416 C56 430 76 440 88 426 C96 392 114 356 152 344 Z',
    akR: 'M270 336 C298 352 336 378 340 416 C344 430 324 440 312 426 C304 392 286 356 248 344 Z',
    upL: 'M130 328 C110 300 90 250 78 210 C72 198 56 202 58 216 C72 270 100 320 122 348 Z',
    upR: 'M270 328 C290 300 310 250 322 210 C328 198 344 202 342 216 C328 270 300 320 278 348 Z',
    walkL: 'M128 332 C108 300 92 250 86 210 C82 198 96 194 102 206 C112 250 124 310 142 346 Z',
    leanL: 'M126 342 C100 390 88 450 108 478 C116 488 130 480 128 468 C120 430 122 380 146 350 Z',
    leanR: 'M274 338 C300 370 318 410 304 448 C296 460 280 454 278 442 C286 410 280 370 258 348 Z'
  };
  var HAND = {
    stand: [[98, 472, 20, 18], [302, 472, 20, 18]],
    wave: [[68, 448, 22, 20], [334, 204, 24, 22]],
    out: [[40, 452, 22, 20], [360, 452, 22, 20]],
    hip: [[78, 434, 22, 20], [302, 472, 20, 18]],
    akimbo: [[72, 424, 22, 20], [328, 424, 22, 20]],
    cheer: [[66, 204, 24, 22], [334, 204, 24, 22]],
    walk: [[92, 206, 22, 20], [302, 472, 20, 18]],
    lean: [[112, 476, 20, 18], [296, 452, 20, 18]],
    wide: [[40, 452, 22, 20], [360, 452, 22, 20]]
  };

  function pathBox(d) {
    var re = /-?\d+(?:\.\d+)?/g;
    var m;
    var nums = [];
    while ((m = re.exec(d))) nums.push(Number(m[0]));
    var box = { minx: 1e9, miny: 1e9, maxx: -1e9, maxy: -1e9 };
    var i;
    for (i = 0; i + 1 < nums.length; i += 2) {
      var x = nums[i];
      var y = nums[i + 1];
      if (x < box.minx) box.minx = x;
      if (y < box.miny) box.miny = y;
      if (x > box.maxx) box.maxx = x;
      if (y > box.maxy) box.maxy = y;
    }
    return box;
  }
  function geomBox(sh) {
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
    } else if (sh.op === 'path') {
      return pathBox(sh.d);
    }
    return box;
  }
  function stampBox(sh) {
    var b = geomBox(sh);
    var tx = sh.tx || 0;
    var ty = sh.ty || 0;
    var m = (sh.sw || 0) / 2;
    sh.box = {
      minx: b.minx + tx - m,
      miny: b.miny + ty - m,
      maxx: b.maxx + tx + m,
      maxy: b.maxy + ty + m
    };
    return sh;
  }
  function P(d, fill, stroke, sw, tx, ty) {
    return stampBox({ op: 'path', d: d, fill: fill || 'none', stroke: stroke || 'none', sw: sw || 0, tx: tx || 0, ty: ty || 0 });
  }
  function El(cx, cy, rx, ry, fill, stroke, sw) {
    return stampBox({ op: 'ellipse', cx: cx, cy: cy, rx: rx, ry: ry, fill: fill || 'none', stroke: stroke || 'none', sw: sw || 0 });
  }
  function Ci(cx, cy, r, fill, stroke, sw) {
    return stampBox({ op: 'circle', cx: cx, cy: cy, r: r, fill: fill || 'none', stroke: stroke || 'none', sw: sw || 0 });
  }
  function Rc(x, y, w, h, rx, fill, stroke, sw) {
    return stampBox({ op: 'roundrect', x: x, y: y, w: w, h: h, rx: rx, fill: fill || 'none', stroke: stroke || 'none', sw: sw || 0 });
  }

  function buildShapes(model) {
    var shapes = [];
    function add(part, sh) { sh.part = part; shapes.push(sh); return sh; }
    var C = model.colors;
    var hairId = model.hair.id;
    var body = model.body.id;
    var pose = model.pose.id;
    var SW = 7;
    var shirt = C.main;
    var armFill = C.main;
    if (body === 'overalls' || body === 'vest') shirt = C.detail;
    if (body === 'dress' || body === 'vest') armFill = C.skin;
    else armFill = shirt;
    var legMode = 'down';
    if (pose === 'wave' || pose === 'wide' || pose === 'cheer') legMode = 'apart';
    if (pose === 'walk') legMode = 'stride';
    var armL = ARM.standL;
    var armR = ARM.standR;
    var hands = HAND.stand;
    if (pose === 'wave') { armL = ARM.waveL; armR = ARM.waveR; hands = HAND.wave; }
    else if (pose === 'wide') { armL = ARM.outL; armR = ARM.outR; hands = HAND.wide; }
    else if (pose === 'cheer') { armL = ARM.upL; armR = ARM.upR; hands = HAND.cheer; }
    else if (pose === 'hip') { armL = ARM.hipL; armR = ARM.standR; hands = HAND.hip; }
    else if (pose === 'akimbo') { armL = ARM.akL; armR = ARM.akR; hands = HAND.akimbo; }
    else if (pose === 'walk') { armL = ARM.walkL; armR = ARM.standR; hands = HAND.walk; }
    else if (pose === 'lean') { armL = ARM.leanL; armR = ARM.leanR; hands = HAND.lean; }

    var legL = legMode === 'stride' ? LEG_L_WALK : (legMode === 'apart' ? LEG_L_OUT : LEG_L);
    var legR = legMode === 'stride' ? LEG_R_WALK : (legMode === 'apart' ? LEG_R_OUT : LEG_R);
    var shoeL = legMode === 'stride' ? SHOE_L_WALK : (legMode === 'apart' ? SHOE_L_OUT : SHOE_L);
    var shoeR = legMode === 'stride' ? SHOE_R_WALK : (legMode === 'apart' ? SHOE_R_OUT : SHOE_R);

    /* 硬投影：整身纯色偏移，先于一切部件。 */
    add('shadow', P('M122 340 C122 312 140 290 164 290 L176 290 L176 320 C180 336 220 336 224 320 L224 290 L236 290 C260 290 278 312 278 340 L280 505 C280 530 245 550 200 550 C155 550 120 530 120 505 Z', '#111', 'none', 0, 10, 12));
    add('shadow', El(HEAD_CX, HEAD_CY, 90, 96, '#111', 'none', 0));
    shapes[shapes.length - 1].tx = 10;
    shapes[shapes.length - 1].ty = 12;
    stampBox(shapes[shapes.length - 1]);
    add('shadow', P(armL, '#111', 'none', 0, 10, 12));
    add('shadow', P(armR, '#111', 'none', 0, 10, 12));
    add('shadow', P(legL, '#111', 'none', 0, 10, 12));
    add('shadow', P(legR, '#111', 'none', 0, 10, 12));

    if (hairId === 'long' || hairId === 'shoulder') {
      var bot = hairId === 'long' ? 535 : 430;
      add('hairBack', P(
        'M118 175 C98 210 92 300 108 ' + (bot - 80) + ' C118 ' + (bot - 10) + ' 160 ' + bot + ' 200 ' + (bot + 4) + ' C240 ' + bot + ' 282 ' + (bot - 10) + ' 292 ' + (bot - 80) + ' C308 300 302 210 282 175 C260 145 230 128 200 124 C170 128 140 145 118 175 Z',
        C.hair, INK, SW
      ));
      add('hairBack', P(
        'M96 190 C62 240 50 330 58 ' + (bot - 70) + ' C64 ' + (bot - 20) + ' 96 ' + (bot - 8) + ' 112 ' + (bot - 28) + ' C96 ' + (bot - 80) + ' 84 330 104 240 Z',
        C.hair, INK, SW
      ));
      add('hairBack', P(
        'M304 190 C338 240 350 330 342 ' + (bot - 70) + ' C336 ' + (bot - 20) + ' 304 ' + (bot - 8) + ' 288 ' + (bot - 28) + ' C304 ' + (bot - 80) + ' 316 330 296 240 Z',
        C.hair, INK, SW
      ));
    } else if (hairId === 'pony') {
      add('hairBack', P(
        'M230 150 C268 160 300 200 296 280 C292 340 250 360 228 340 C248 280 236 190 206 158 Z',
        C.hair, INK, SW
      ));
    }

    add('leg', P(legL, C.pants, INK, SW));
    add('leg', P(legR, C.pants, INK, SW));
    add('shoeUpper', P(shoeL, C.shoe, INK, SW));
    add('shoeUpper', P(shoeR, C.shoe, INK, SW));
    if (legMode === 'stride') {
      add('shoe', Rc(78, 674, 74, 12, 6, WHITE, INK, 5));
      add('shoe', Rc(258, 668, 78, 12, 6, WHITE, INK, 5));
      add('shoeStripe', P('M96 678 L150 678', 'none', C.accent, 4));
      add('shoeStripe', P('M274 672 L328 672', 'none', C.accent, 4));
    } else if (legMode === 'apart') {
      add('shoe', Rc(112, 676, 74, 12, 6, WHITE, INK, 5));
      add('shoe', Rc(240, 674, 74, 12, 6, WHITE, INK, 5));
      add('shoeStripe', P('M128 680 L178 680', 'none', C.accent, 4));
      add('shoeStripe', P('M256 678 L304 678', 'none', C.accent, 4));
    } else {
      add('shoe', Rc(118, 674, 66, 12, 6, WHITE, INK, 5));
      add('shoe', Rc(220, 672, 66, 12, 6, WHITE, INK, 5));
      add('shoeStripe', P('M132 678 L176 678', 'none', C.accent, 4));
      add('shoeStripe', P('M232 676 L274 676', 'none', C.accent, 4));
    }

    add('body', P(TORSO, shirt, INK, SW));
    add('collar', P('M164 290 L176 290 M224 290 L236 290', 'none', INK, 5));

    if (body === 'hoodie') {
      add('hood', P('M184 308 L184 360 M216 308 L216 360', 'none', INK, 4));
      add('hood', Ci(184, 374, 6, C.accent, INK, 3));
      add('hood', Ci(216, 374, 6, C.accent, INK, 3));
      add('pocket', P('M150 470 L162 420 L238 420 L250 470 Z', 'none', INK, 5));
      add('body', P('M132 500 L268 500', 'none', INK, 4));
    } else if (body === 'overalls') {
      add('body', P('M150 320 L160 400 M250 320 L240 400', 'none', C.main, 10));
      add('body', P('M150 320 L160 400 M250 320 L240 400', 'none', INK, 3));
      add('body', P('M152 390 L248 390 L262 520 C230 536 170 536 138 520 Z', C.main, INK, 5));
      add('button', Ci(164, 402, 6, INK, 'none', 0));
      add('button', Ci(236, 402, 6, INK, 'none', 0));
      add('pocket', P('M180 418 L220 418 L220 450 L180 450 Z', 'none', INK, 4));
    } else if (body === 'shirt') {
      add('collar', P('M164 290 L200 378 L236 290 Z', WHITE, INK, 5));
      add('body', P('M200 360 L200 520', 'none', INK, 5));
      add('collar', P('M164 290 L150 350 L186 360 Z', shirt, INK, 4.5));
      add('collar', P('M236 290 L250 350 L214 360 Z', shirt, INK, 4.5));
      add('pocket', P('M144 440 L180 440 M220 440 L256 440', 'none', INK, 5));
      add('button', Ci(200, 400, 5, C.accent, INK, 2));
      add('button', Ci(200, 450, 5, C.accent, INK, 2));
    } else if (body === 'sweater') {
      add('body', P('M148 500 L252 500', 'none', C.deep, 8));
      add('body', P('M140 518 L260 518', 'none', C.deep, 8));
      add('collar', P('M168 300 Q200 318 232 300', 'none', C.deep, 6));
    } else if (body === 'dress') {
      add('body', P('M150 500 C110 540 96 600 108 640 L292 640 C304 600 290 540 250 500 Z', shirt, INK, SW));
      add('button', Ci(200, 470, 6, C.accent, INK, 2));
    } else if (body === 'vest') {
      add('body', P('M136 360 L146 520 L196 516 L186 378 Z', C.main, INK, 5));
      add('body', P('M264 360 L254 520 L204 516 L214 378 Z', C.main, INK, 5));
      add('button', Ci(190, 420, 5, INK, 'none', 0));
      add('button', Ci(190, 460, 5, INK, 'none', 0));
    } else if (body === 'stripes') {
      add('stripe', P('M150 400 L250 400 L248 418 L152 418 Z', C.accent, 'none', 0));
      add('stripe', P('M146 444 L254 444 L252 462 L148 462 Z', C.accent, 'none', 0));
      add('stripe', P('M144 488 L256 488 L254 506 L146 506 Z', C.accent, 'none', 0));
      add('body', P(TORSO, 'none', INK, SW));
    } else {
      add('pocket', P('M214 400 L256 400 L256 436 L214 436 Z', 'none', INK, 4.5));
      add('pocket', P('M214 412 L256 412', 'none', INK, 4));
      add('button', Ci(200, 360, 6, INK, 'none', 0));
      add('button', Ci(200, 392, 6, INK, 'none', 0));
      add('body', P('M132 470 L268 470', 'none', C.accent, 10));
    }

    add('arm', P(armL, armFill, INK, SW));
    add('arm', P(armR, armFill, INK, SW));
    add('hand', El(hands[0][0], hands[0][1], hands[0][2], hands[0][3], C.skin, INK, 6));
    add('hand', El(hands[1][0], hands[1][1], hands[1][2], hands[1][3], C.skin, INK, 6));
    if (pose === 'wave') {
      add('handDetail', P('M58 448 Q68 458 80 448', 'none', INK, 3.5));
      add('handDetail', P('M318 192 C308 180 318 172 326 180', C.skin, INK, 5));
    } else if (pose === 'cheer') {
      add('handDetail', P('M82 192 C72 180 82 172 90 180', C.skin, INK, 5));
      add('handDetail', P('M318 192 C308 180 318 172 326 180', C.skin, INK, 5));
    }

    add('neck', P('M176 262 L176 324 C180 336 220 336 224 324 L224 262 Z', C.skin, INK, 5.5));
    add('head', El(HEAD_CX, HEAD_CY, HEAD_RX, HEAD_RY, C.skin, INK, SW));
    add('ear', P('M102 182 C92 184 88 198 94 210 C100 220 112 218 116 208', C.skin, INK, 5));
    add('ear', P('M108 196 Q102 202 108 208', 'none', INK, 2.8));
    shapes[shapes.length - 1].opac = 0.55;
    add('ear', P('M298 182 C308 184 312 198 306 210 C300 220 288 218 284 208', C.skin, INK, 5));
    add('ear', P('M292 196 Q298 202 292 208', 'none', INK, 2.8));
    shapes[shapes.length - 1].opac = 0.55;

    var edgeKey = EDGE_OF[hairId] || 'fringe';
    var crown = CROWN;
    if (edgeKey === 'crop') crown = CROP_CROWN;
    if (edgeKey === 'buzz') crown = BUZZ_CROWN;
    var hairD = crown + ' ' + EDGE[edgeKey] + ' Z';
    if (hairId === 'spiky') {
      hairD = 'M104 178 C96 140 108 88 150 76 C168 70 182 78 200 72 C218 78 232 70 250 76 C292 88 304 140 298 188 ' + EDGE.spiky + ' Z';
    }
    add('hairFront', P(hairD, C.hair, INK, SW));
    if (hairId === 'afro') {
      var puffs = [[112, 150], [122, 112], [146, 84], [178, 72], [212, 72], [246, 82], [272, 108], [288, 142]];
      var pi;
      for (pi = 0; pi < puffs.length; pi++) add('hairFront', Ci(puffs[pi][0], puffs[pi][1], 28, C.hair, INK, SW));
    }
    if (hairId === 'bun') {
      add('hairFront', Ci(200, 78, 36, C.hair, INK, SW));
      add('hairFront', P('M178 96 Q200 108 222 96', 'none', C.accent, 8));
    }
    if (hairId === 'twin') {
      add('hairFront', Ci(148, 96, 30, C.hair, INK, SW));
      add('hairFront', Ci(252, 96, 30, C.hair, INK, SW));
      add('hairFront', Ci(148, 96, 8, C.accent, INK, 3));
      add('hairFront', Ci(252, 96, 8, C.accent, INK, 3));
    }
    add('hairFront', P('M150 112 Q170 100 190 106 M214 104 Q236 100 252 114', 'none', '#FFFFFF', 4));
    shapes[shapes.length - 1].opac = 0.35;

    add('brow', P('M148 168 Q165 160 180 168', 'none', INK, 5));
    if (model.eyes.id === 'wink') add('brow', P('M220 172 Q235 164 252 170', 'none', INK, 5));
    else add('brow', P('M220 168 Q235 160 252 168', 'none', INK, 5));
    drawEyes(model.eyes.id);
    add('nose', P('M200 208 L196 226 Q200 230 204 226 Z', INK, 'none', 0));
    shapes[shapes.length - 1].opac = 0.85;
    drawMouth(model.mouth.id);
    add('blush', El(128, 228, 14, 10, C.blush, 'none', 0));
    shapes[shapes.length - 1].opac = 0.75;
    add('blush', El(272, 228, 14, 10, C.blush, 'none', 0));
    shapes[shapes.length - 1].opac = 0.75;
    drawAccessory(model.accessory.id);
    return shapes;

    function drawEyes(id) {
      if (id === 'wide' || id === 'brow') {
        add('eye', El(164, 192, 18, id === 'brow' ? 16 : 20, WHITE, INK, 5.5));
        add('eye', El(236, 192, 18, id === 'brow' ? 16 : 20, WHITE, INK, 5.5));
        add('eye', Ci(166, 194, 9, INK, 'none', 0));
        add('eye', Ci(238, 194, 9, INK, 'none', 0));
        add('eye', Ci(169, 190, 3.2, WHITE, 'none', 0));
        add('eye', Ci(241, 190, 3.2, WHITE, 'none', 0));
        if (id === 'brow') {
          add('brow', P('M146 156 L178 146', 'none', INK, 5));
          add('brow', P('M222 150 L256 158', 'none', INK, 5));
        }
        return;
      }
      if (id === 'wink') {
        add('eye', El(164, 192, 18, 20, WHITE, INK, 5.5));
        add('eye', Ci(166, 194, 9, INK, 'none', 0));
        add('eye', Ci(169, 190, 3.2, WHITE, 'none', 0));
        add('eye', P('M218 195 Q236 182 254 195', 'none', INK, 6.5));
        return;
      }
      if (id === 'rect' || id === 'round' || id === 'sun') {
        if (id === 'round') {
          add('eye', Ci(164, 196, 24, WHITE, INK, 6.5));
          add('eye', Ci(236, 196, 24, WHITE, INK, 6.5));
          add('eye', P('M188 196 L212 196', 'none', INK, 5.5));
        } else {
          var lens = id === 'sun' ? '#1A1A1A' : WHITE;
          add('eye', Rc(128, 176, 58, 44, 14, lens, INK, 6.5));
          add('eye', Rc(214, 176, 58, 44, 14, lens, INK, 6.5));
          add('eye', P('M186 198 L214 198', 'none', INK, 5.5));
          add('eye', P('M128 192 L110 192', 'none', INK, 5.5));
          add('eye', P('M272 192 L290 192', 'none', INK, 5.5));
        }
        if (id === 'sun') {
          add('eye', Rc(140, 186, 28, 8, 3, WHITE, 'none', 0));
          add('eye', Rc(226, 186, 28, 8, 3, WHITE, 'none', 0));
        } else {
          add('eye', Ci(157, 198, 9, INK, 'none', 0));
          add('eye', Ci(243, 198, 9, INK, 'none', 0));
          add('eye', Ci(160, 194, 3, WHITE, 'none', 0));
          add('eye', Ci(246, 194, 3, WHITE, 'none', 0));
        }
        return;
      }
      if (id === 'dot') {
        add('eye', Ci(164, 196, 8, INK, 'none', 0));
        add('eye', Ci(236, 196, 8, INK, 'none', 0));
        add('eye', Ci(167, 193, 2.4, WHITE, 'none', 0));
        add('eye', Ci(239, 193, 2.4, WHITE, 'none', 0));
        return;
      }
      if (id === 'closed') {
        add('eye', P('M146 200 Q164 184 182 200', 'none', INK, 6));
        add('eye', P('M218 200 Q236 184 254 200', 'none', INK, 6));
        return;
      }
      if (id === 'square') {
        add('eye', Rc(142, 174, 44, 40, 8, WHITE, INK, 6));
        add('eye', Rc(214, 174, 44, 40, 8, WHITE, INK, 6));
        add('eye', Ci(164, 196, 9, INK, 'none', 0));
        add('eye', Ci(236, 196, 9, INK, 'none', 0));
        add('eye', Ci(167, 192, 3, WHITE, 'none', 0));
        add('eye', Ci(239, 192, 3, WHITE, 'none', 0));
        return;
      }
      add('eye', El(164, 198, 16, 10, WHITE, INK, 5));
      add('eye', El(236, 198, 16, 10, WHITE, INK, 5));
      add('eye', P('M148 192 L180 192', 'none', INK, 5));
      add('eye', P('M220 192 L252 192', 'none', INK, 5));
      add('eye', Ci(164, 202, 4, INK, 'none', 0));
      add('eye', Ci(236, 202, 4, INK, 'none', 0));
    }

    function drawMouth(id) {
      if (id === 'teeth') {
        add('mouth', P('M168 242 Q200 278 232 242 Z', INK, INK, 4));
        add('mouth', P('M176 244 Q200 266 224 244 Z', C.accent, 'none', 0));
        add('mouth', P('M182 248 Q200 258 218 248', WHITE, 'none', 0));
        shapes[shapes.length - 1].opac = 0.9;
        return;
      }
      if (id === 'smile' || id === 'cat') {
        if (id === 'cat') add('mouth', P('M168 248 L184 264 L200 250 L216 264 L232 248', 'none', INK, 6));
        else add('mouth', P('M172 248 Q200 272 228 248', 'none', INK, 6.5));
        return;
      }
      if (id === 'line') {
        add('mouth', P('M178 250 L222 250', 'none', INK, 6.5));
        return;
      }
      if (id === 'open' || id === 'o') {
        var ry = id === 'o' ? 16 : 12;
        var rx = id === 'o' ? 14 : 16;
        add('mouth', El(200, 252, rx, ry, INK, 'none', 0));
        add('mouth', El(200, 256, 8, 6, C.accent, 'none', 0));
        shapes[shapes.length - 1].opac = 0.85;
        return;
      }
      if (id === 'down') {
        add('mouth', P('M174 262 Q200 240 226 262', 'none', INK, 6.5));
        return;
      }
      if (id === 'smirk') {
        add('mouth', P('M176 252 Q210 246 230 236', 'none', INK, 6.5));
        return;
      }
      if (id === 'wave') {
        add('mouth', P('M168 250 L184 262 L200 248 L216 262 L232 250', 'none', INK, 6));
        return;
      }
      add('mouth', El(200, 252, 8, 6, INK, 'none', 0));
    }

    function drawAccessory(id) {
      if (id === 'none') return;
      if (id === 'pin') {
        add('accessory', Rc(248, 118, 28, 14, 4, C.detail, INK, 3));
        return;
      }
      if (id === 'scarf') {
        add('accessory', Rc(150, 348, 100, 22, 10, C.detail, INK, 4));
        add('accessory', Rc(214, 364, 22, 36, 8, C.detail, INK, 4));
        return;
      }
      if (id === 'bag') {
        add('accessory', P('M250 360 L300 400', 'none', INK, 5));
        add('accessory', Rc(286, 392, 48, 42, 8, C.detail, INK, 4));
        add('accessory', Rc(298, 404, 22, 12, 3, WHITE, INK, 3));
        return;
      }
      if (id === 'band') {
        add('accessory', P('M132 108 Q200 96 268 108', 'none', INK, 12));
        add('accessory', P('M132 108 Q200 96 268 108', 'none', C.detail, 6));
        return;
      }
      if (id === 'bow') {
        add('accessory', Ci(176, 360, 12, C.detail, INK, 3));
        add('accessory', Ci(224, 360, 12, C.detail, INK, 3));
        add('accessory', Ci(200, 360, 6, INK, 'none', 0));
        return;
      }
      if (id === 'cheek') {
        add('accessory', Ci(118, 236, 7, C.detail, INK, 2.5));
        add('accessory', Ci(282, 236, 7, C.detail, INK, 2.5));
        return;
      }
      add('accessory', Ci(168, 430, 14, C.detail, INK, 3));
      add('accessory', Ci(168, 430, 5, WHITE, 'none', 0));
    }
  }

  function num(v) {
    var n = Math.round(Number(v) * 10) / 10;
    if (n === 0) return '0';
    return String(n);
  }
  function svgShape(sh) {
    var fill = sh.fill || 'none';
    var stroke = sh.stroke || 'none';
    var sw = sh.sw || 0;
    var common = ' fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + num(sw) + '"';
    if (sh.opac != null && sh.opac < 1) common += ' opacity="' + num(sh.opac) + '"';
    if (sh.tx || sh.ty) common += ' transform="translate(' + num(sh.tx || 0) + ',' + num(sh.ty || 0) + ')"';
    if (sh.op === 'circle') return '<circle cx="' + num(sh.cx) + '" cy="' + num(sh.cy) + '" r="' + num(sh.r) + '"' + common + '/>';
    if (sh.op === 'ellipse') return '<ellipse cx="' + num(sh.cx) + '" cy="' + num(sh.cy) + '" rx="' + num(sh.rx) + '" ry="' + num(sh.ry) + '"' + common + '/>';
    if (sh.op === 'roundrect') return '<rect x="' + num(sh.x) + '" y="' + num(sh.y) + '" width="' + num(sh.w) + '" height="' + num(sh.h) + '" rx="' + num(sh.rx) + '" ry="' + num(sh.rx) + '"' + common + '/>';
    return '<path d="' + sh.d + '"' + common + '/>';
  }
  function figureShapes(fp) {
    return buildShapes(figureModel(fp));
  }
  function figureSVG(fp, size) {
    var s = Number(size);
    if (!isFinite(s) || s <= 0) s = VIEW_W;
    var hgt = s * (VIEW_H / VIEW_W);
    var shapes = figureShapes(fp);
    var h = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + VIEW_W + ' ' + VIEW_H + '" width="' + num(s) + '" height="' + num(hgt) + '" role="img" aria-label="全身形象">';
    h += '<g stroke-linejoin="round" stroke-linecap="round">';
    var i;
    for (i = 0; i < shapes.length; i++) h += svgShape(shapes[i]);
    h += '</g></svg>';
    return h;
  }

  function tokenizePath(d) {
    var out = [];
    var i = 0;
    var n = d.length;
    while (i < n) {
      var c = d.charAt(i);
      if (c === ' ' || c === ',' || c === '\n' || c === '\t' || c === '\r') { i++; continue; }
      if ((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z')) { out.push(c); i++; continue; }
      var j = i;
      if (c === '-' || c === '+') j++;
      var dot = 0;
      while (j < n) {
        var ch = d.charAt(j);
        if (ch >= '0' && ch <= '9') { j++; continue; }
        if (ch === '.' && !dot) { dot = 1; j++; continue; }
        break;
      }
      if (j === i || ((d.charAt(i) === '-' || d.charAt(i) === '+') && j === i + 1)) { i++; continue; }
      out.push(parseFloat(d.slice(i, j)));
      i = j;
    }
    return out;
  }
  function tracePath(ctx, d) {
    var t = tokenizePath(d);
    var i = 0;
    var cmd = '';
    var cx = 0;
    var cy = 0;
    var sx = 0;
    var sy = 0;
    ctx.beginPath();
    function num() { return t[i++]; }
    while (i < t.length) {
      if (typeof t[i] === 'string') cmd = t[i++];
      if (cmd === 'M') {
        cx = num(); cy = num();
        ctx.moveTo(cx, cy);
        sx = cx; sy = cy;
        cmd = 'L';
      } else if (cmd === 'L') {
        cx = num(); cy = num();
        ctx.lineTo(cx, cy);
      } else if (cmd === 'H') {
        cx = num();
        ctx.lineTo(cx, cy);
      } else if (cmd === 'V') {
        cy = num();
        ctx.lineTo(cx, cy);
      } else if (cmd === 'C') {
        var x1 = num();
        var y1 = num();
        var x2 = num();
        var y2 = num();
        cx = num(); cy = num();
        ctx.bezierCurveTo(x1, y1, x2, y2, cx, cy);
      } else if (cmd === 'Q') {
        var qx = num();
        var qy = num();
        cx = num(); cy = num();
        ctx.quadraticCurveTo(qx, qy, cx, cy);
      } else if (cmd === 'Z' || cmd === 'z') {
        ctx.closePath();
        cx = sx; cy = sy;
      } else break;
    }
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
    tracePath(ctx, sh.d);
  }
  function drawFigure(ctx, fp, x, y, size) {
    if (!ctx || !ctx.save) return;
    var s = Number(size);
    if (!isFinite(s) || s <= 0) s = VIEW_W;
    var x0 = Number(x);
    var y0 = Number(y);
    if (!isFinite(x0)) x0 = 0;
    if (!isFinite(y0)) y0 = 0;
    var shapes = figureShapes(fp);
    var k = s / VIEW_W;
    ctx.save();
    ctx.translate(x0, y0);
    ctx.scale(k, k);
    var i;
    for (i = 0; i < shapes.length; i++) {
      var sh = shapes[i];
      ctx.save();
      if (sh.tx || sh.ty) ctx.translate(sh.tx || 0, sh.ty || 0);
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
      ctx.restore();
    }
    ctx.restore();
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
  function audit(model, shapes) {
    var problems = [];
    var gap = COLLAR_TOP - HEAD_BOTTOM;
    if (gap < 6 || gap > 12) problems.push('neck gap ' + gap);
    var head = null;
    var neck = null;
    var ears = 0;
    var arcs = 0;
    var hands = 0;
    var shoes = 0;
    var arms = 0;
    var legs = 0;
    var hairFront = 0;
    var i;
    var sh;
    if (!model.hair.type) problems.push('undeclared ' + model.hair.id);
    for (i = 0; i < shapes.length; i++) {
      sh = shapes[i];
      if (sh.part === 'head' && sh.op === 'ellipse') head = sh;
      if (sh.part === 'neck') neck = sh;
      if (sh.part === 'ear' && sh.fill && sh.fill !== 'none') ears++;
      if (sh.part === 'ear' && (!sh.fill || sh.fill === 'none')) arcs++;
      if (sh.part === 'hand' && sh.op === 'ellipse') hands++;
      if (sh.part === 'shoe') shoes++;
      if (sh.part === 'arm') arms++;
      if (sh.part === 'leg') legs++;
      if (sh.part === 'hairFront' && sh.op === 'path' && sh.fill && sh.fill !== 'none') hairFront++;
      if (sh.box && (sh.box.minx < -1 || sh.box.miny < -1 || sh.box.maxx > VIEW_W + 1 || sh.box.maxy > VIEW_H + 1)) {
        problems.push('oob ' + sh.part);
        break;
      }
      if (model.body.id === 'hoodie' && sh.fill === model.colors.main && sh.box && sh.box.miny < 250 && sh.box.minx < CX + 30 && sh.box.maxx > CX - 30 && sh.part !== 'arm' && sh.part !== 'hand') {
        problems.push('hood arch');
      }
    }
    if (!head || Math.abs(head.cx - HEAD_CX) > 0.1 || Math.abs(head.cy - HEAD_CY) > 0.1 || Math.abs(head.rx - HEAD_RX) > 0.1 || Math.abs(head.ry - HEAD_RY) > 0.1) {
      problems.push('head anchor');
    }
    if (!neck || !neck.box || neck.box.maxy < 330) problems.push('neck not in collar');
    if (ears < 2 || arcs < 2) problems.push('ears');
    if (hairFront < 1) problems.push('hair set ' + model.hair.id);
    if (hands < 2 || shoes < 2 || arms < 2 || legs < 2) problems.push('limbs');
    var lastBack = extremum(shapes, 'hairBack', true);
    var firstLeg = extremum(shapes, 'leg', false);
    var lastArm = extremum(shapes, 'arm', true);
    var firstNeck = extremum(shapes, 'neck', false);
    var firstHead = extremum(shapes, 'head', false);
    var firstFront = extremum(shapes, 'hairFront', false);
    var firstEye = extremum(shapes, 'eye', false);
    var firstEar = extremum(shapes, 'ear', false);
    var backOk = lastBack < 0 || lastBack < firstLeg;
    var frontOk = firstFront < 0 || firstHead < firstFront;
    var faceOk = firstHead < firstEye && (firstFront < 0 || firstFront < firstEye);
    var earOk = firstNeck < firstEar && firstEar < firstEye && firstEar < firstFront;
    if (!(backOk && firstLeg < lastArm && lastArm < firstNeck && firstNeck < firstHead && frontOk && faceOk && earOk)) {
      problems.push('order');
    }
    if (model.hair.id === 'long' || model.hair.id === 'shoulder') {
      if (lastBack < 0) problems.push('hairBack');
      var minX = 1e9;
      var maxX = -1e9;
      for (i = 0; i < shapes.length; i++) {
        if (shapes[i].part !== 'hairBack' || !shapes[i].box) continue;
        if (shapes[i].box.minx < minX) minX = shapes[i].box.minx;
        if (shapes[i].box.maxx > maxX) maxX = shapes[i].box.maxx;
      }
      if (!(minX < 100 && maxX > 280)) problems.push('back sheet ' + minX + ' ' + maxX);
    }
    return problems;
  }

  function comboCount() {
    return HAIR.length * EYES.length * MOUTH.length * BODY.length * POSE.length * MAIN.length * ACCENT.length * ACCESSORY.length;
  }

  var api = {
    view: VIEW_W,
    viewH: VIEW_H,
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
      headCx: HEAD_CX,
      headCy: HEAD_CY,
      headRx: HEAD_RX,
      headRy: HEAD_RY,
      headBottom: HEAD_BOTTOM,
      collarY: COLLAR_TOP,
      neckX: NECK_X,
      neckY: NECK_Y,
      neckW: NECK_W,
      neckH: NECK_H,
      neckGapMin: 6,
      neckGapMax: 12
    },
    zones: {
      cx: 200,
      neckY: 300,
      neckHalf: 8,
      neckStep: 4,
      browY0: 116,
      browY1: 156,
      browHalfX: 36,
      depthMin: 154,
      depthMax: 172,
      eyeY: 192,
      hair: HAIR_INK,
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
