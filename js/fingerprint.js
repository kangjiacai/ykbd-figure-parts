/* 指纹编解码（兼容「你可能不知道」小工具的 F.encode / F.decode）
 * 指纹 = 版本(2bit) + 5 × [题库序号 6bit, 对错 1bit, 用时秒 4bit] + 校验 3bit = 60bit → 12 位 Crockford Base32
 * 形象绘制不在本文件。全身简笔小人见 js/figure-avatar.js。
 * Chrome 61 / ES5。
 */
(function () {
  'use strict';
  var F = {};
  var ALPHA = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  var VER = 1;
  F.ALPHA = ALPHA;
  F.TIME_LIMIT = 15;

  function pushBits(arr, val, n) { for (var i = n - 1; i >= 0; i--) arr.push((val >> i) & 1); }
  function readBits(arr, pos, n) { var v = 0; for (var i = 0; i < n; i++) v = (v << 1) | arr[pos + i]; return v; }
  function check(bits) { var c = 0; for (var i = 0; i < bits.length; i++) c = (c + bits[i] * ((i % 7) + 1)) % 8; return c; }

  /* rounds: [{ idx, correct, t }]，t 为秒 */
  F.encode = function (rounds) {
    var bits = [];
    pushBits(bits, VER, 2);
    rounds.forEach(function (r) {
      pushBits(bits, r.idx & 63, 6);
      pushBits(bits, r.correct ? 1 : 0, 1);
      pushBits(bits, Math.max(0, Math.min(15, Math.ceil(r.t))), 4);
    });
    pushBits(bits, check(bits), 3);
    var s = '';
    for (var i = 0; i < bits.length; i += 5) s += ALPHA.charAt(readBits(bits, i, 5));
    return s.slice(0, 4) + '-' + s.slice(4, 8) + '-' + s.slice(8, 12);
  };
  F.decode = function (code) {
    var s = String(code || '').toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
    if (s.length !== 12) return null;
    var bits = [];
    for (var i = 0; i < 12; i++) { var v = ALPHA.indexOf(s.charAt(i)); if (v < 0) return null; pushBits(bits, v, 5); }
    var body = bits.slice(0, 57);
    if (readBits(bits, 57, 3) !== check(body)) return null;
    if (readBits(bits, 0, 2) !== VER) return null;
    var rounds = [], p = 2;
    for (var k = 0; k < 5; k++) {
      rounds.push({ idx: readBits(bits, p, 6), correct: !!bits[p + 6], t: readBits(bits, p + 7, 4) });
      p += 11;
    }
    return rounds;
  };

  /* 计分：答对得 难度×10；连对第 2 题起加 2×(连击-1)，单题最多 +6；全对 +15；错 / 超时 0 */
  F.score = function (rounds, bank) {
    var total = 0, streak = 0, detail = [];
    rounds.forEach(function (r) {
      var q = bank[r.idx], pts = 0, bonus = 0;
      if (r.correct && q) {
        streak++;
        pts = q.difficulty * 10;
        if (streak >= 2) bonus = Math.min(6, 2 * (streak - 1));
      } else { streak = 0; }
      total += pts + bonus;
      detail.push({ pts: pts, bonus: bonus });
    });
    var correct = rounds.filter(function (r) { return r.correct; }).length;
    var allBonus = correct === rounds.length && rounds.length > 0 ? 15 : 0;
    return { total: total + allBonus, correct: correct, allBonus: allBonus, detail: detail };
  };
  F.title = function (correct) {
    if (correct >= 5) return '全对大师';
    if (correct === 4) return '你可能知道一点';
    if (correct >= 2) return '日常猎奇员';
    return '路人观察员';
  };
  F.level = function (totalCorrect) {
    if (totalCorrect >= 60) return '词源玩家';
    if (totalCorrect >= 30) return '图鉴官';
    if (totalCorrect >= 10) return '侦探';
    return '见习';
  };

  function fnv(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h >>> 0;
  }
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  F.fnv = fnv;
  F.rng = rng;

  window.YKBD_F = F;
})();
