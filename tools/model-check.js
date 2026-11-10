/* 确定性、维度独立、四肢存在、图形不越出 viewBox。 */
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var root = path.join(__dirname, '..');
var sandbox = { window: {}, console: console, Math: Math, isFinite: isFinite, Number: Number, String: String };
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'js/fingerprint.js'), 'utf8'), sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'js/figure-avatar.js'), 'utf8'), sandbox);

var G = sandbox.YKBD_FIGURE;
var F = sandbox.YKBD_F;
var fails = [];
function fail(msg) { fails.push(msg); }

if (G.combo !== 39321600) fail('combo ' + G.combo);
var seenType = {};
for (i = 0; i < G.hairs.length; i++) {
  var hid = G.hairs[i].id;
  if (seenType[hid]) fail('dup hair ' + hid);
  seenType[hid] = 1;
  if (!G.HAIR_TYPE[hid]) fail('undeclared ' + hid);
  if (G.hairs[i].type !== G.HAIR_TYPE[hid]) fail('type mismatch ' + hid);
  if (G.HAIR_TYPE[hid] !== 'bangs' && G.HAIR_TYPE[hid] !== 'short' && G.HAIR_TYPE[hid] !== 'crop') fail('bad type ' + hid);
}
for (var typeKey in G.HAIR_TYPE) {
  if (!seenType[typeKey]) fail('orphan type ' + typeKey);
}
var dims = G.dims;
var expect = { hair: 12, eyes: 10, mouth: 10, body: 8, pose: 8, main: 8, accent: 8, accessory: 8 };
var i;
for (i = 0; i < dims.length; i++) {
  if (dims[i].options.length !== expect[dims[i].key]) fail('count ' + dims[i].key + ' ' + dims[i].options.length);
  if (dims[i].options.length < 8) fail('dim < 8 ' + dims[i].key);
}

var hero = 'B665-6G14-RPME';
var a = G.figureModel(hero);
var b = G.figureModel('b665-6g14-rpme');
if (a.raw !== 'B6656G14RPME') fail('raw ' + a.raw);
if (a.fp !== b.fp) fail('case fold');
if (G.figureSVG(hero) !== G.figureSVG('B6656G14RPME')) fail('svg unstable');
if (G.figureSVG(hero) !== G.figureSVG(hero)) fail('svg twice');
if (G.figureSVG(hero) === G.figureSVG('0000-0000-0000')) fail('different seeds collide');

var zero = G.figureModel(G.seedFor({ hair: 0, eyes: 0, mouth: 0, body: 0, pose: 0, main: 0, accent: 0, accessory: 0 }));
if (zero.hair.id !== 'bob' || zero.eyes.id !== 'rect' || zero.body.id !== 'tee' || zero.pose.id !== 'stand') {
  fail('seedFor zero ' + JSON.stringify(zero.indices));
}

var keys = ['hair', 'eyes', 'mouth', 'body', 'pose', 'main', 'accent', 'accessory'];
for (i = 0; i < keys.length; i++) {
  var key = keys[i];
  var n = expect[key];
  var k;
  for (k = 0; k < n; k++) {
    var idx = { hair: 0, eyes: 0, mouth: 0, body: 0, pose: 0, main: 0, accent: 0, accessory: 0 };
    idx[key] = k;
    var model = G.figureModel(G.seedFor(idx));
    if (model.indices[key] !== k) fail('roundtrip ' + key + ' ' + k + ' got ' + model.indices[key]);
    var other;
    for (other = 0; other < keys.length; other++) {
      if (keys[other] !== key && model.indices[keys[other]] !== 0) fail('leak ' + key + '->' + keys[other]);
    }
  }
}

function inflated(sh) {
  var m = (sh.sw || 0) / 2;
  var box = { minx: 1e9, miny: 1e9, maxx: -1e9, maxy: -1e9 };
  function take(x, y) {
    if (x < box.minx) box.minx = x;
    if (y < box.miny) box.miny = y;
    if (x > box.maxx) box.maxx = x;
    if (y > box.maxy) box.maxy = y;
  }
  if (sh.op === 'circle') { take(sh.cx - sh.r, sh.cy - sh.r); take(sh.cx + sh.r, sh.cy + sh.r); }
  else if (sh.op === 'ellipse') { take(sh.cx - sh.rx, sh.cy - sh.ry); take(sh.cx + sh.rx, sh.cy + sh.ry); }
  else if (sh.op === 'roundrect') { take(sh.x, sh.y); take(sh.x + sh.w, sh.y + sh.h); }
  else if (sh.op === 'poly') {
    var p;
    for (p = 0; p < sh.pts.length; p++) take(sh.pts[p][0], sh.pts[p][1]);
  }
  box.minx -= m; box.miny -= m; box.maxx += m; box.maxy += m;
  return box;
}

function partsOf(shapes) {
  var map = {};
  var i2;
  for (i2 = 0; i2 < shapes.length; i2++) map[shapes[i2].part] = (map[shapes[i2].part] || 0) + 1;
  return map;
}
function extremum(shapes, name, wantMax) {
  var found = -1;
  var i3;
  for (i3 = 0; i3 < shapes.length; i3++) {
    if (shapes[i3].part !== name) continue;
    if (found < 0 || (wantMax && i3 > found) || (!wantMax && i3 < found)) found = i3;
  }
  return found;
}

var hi, pi, bi, xi;
for (hi = 0; hi < 12; hi++) {
  for (pi = 0; pi < 8; pi++) {
    for (bi = 0; bi < 8; bi++) {
      for (xi = 0; xi < 8; xi++) {
        var code = G.seedFor({ hair: hi, eyes: hi % 10, mouth: hi % 10, body: bi, pose: pi, main: bi, accent: xi % 8, accessory: xi });
        var model = G.figureModel(code);
        var shapes = G.figureShapes(code);
        var auditProblems = G.audit(model, shapes);
        if (auditProblems.length) {
          fail('audit ' + auditProblems[0] + ' ' + code);
          hi = 99; pi = 99; bi = 99; xi = 99;
        }
        var part = partsOf(shapes);
        if ((part.hairBack || 0) < 1) fail('hairBack ' + code);
        if (!model.hair.type) fail('undeclared ' + model.hair.id);
        if (model.hair.type === 'bangs' && (part.hairFront || 0) < 1) fail('hairFront ' + code);
        if ((part.neck || 0) < 1) fail('neck ' + code);
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
          fail('order ' + code + ' ' + [lastBack, firstLeg, lastArm, firstNeck, firstHead, firstFront].join('<'));
          hi = 99; pi = 99; bi = 99; xi = 99;
        }
        if (model.hair.id === 'long' || model.hair.id === 'shoulder') {
          var minX = 999;
          var maxX = -999;
          var s2;
          for (s2 = 0; s2 < shapes.length; s2++) {
            if (shapes[s2].part !== 'hairBack' || shapes[s2].op !== 'poly') continue;
            var p2;
            for (p2 = 0; p2 < shapes[s2].pts.length; p2++) {
              if (shapes[s2].pts[p2][0] < minX) minX = shapes[s2].pts[p2][0];
              if (shapes[s2].pts[p2][0] > maxX) maxX = shapes[s2].pts[p2][0];
            }
          }
          if (!(minX < 100 && maxX > 230)) fail('back sheet ' + code + ' ' + minX + ' ' + maxX);
        }
        if ((part.arm || 0) < 2) fail('arms ' + code);
        if ((part.leg || 0) < 2) fail('legs ' + code);
        if ((part.hand || 0) < 2) fail('hands ' + code);
        if ((part.shoe || 0) < 2) fail('shoes ' + code);
        if ((part.head || 0) < 1) fail('head ' + code);
        if ((part.eye || 0) < 1) fail('eye ' + code);
        if ((part.mouth || 0) < 1) fail('mouth ' + code);
        var s;
        for (s = 0; s < shapes.length; s++) {
          var box = inflated(shapes[s]);
          if (box.minx < -0.5 || box.miny < -0.5 || box.maxx > 320.5 || box.maxy > 320.5) {
            fail('oob ' + code + ' ' + shapes[s].part + ' ' + shapes[s].op + ' ' + Math.round(box.minx) + ',' + Math.round(box.miny) + ' ' + Math.round(box.maxx) + ',' + Math.round(box.maxy));
            hi = 99; pi = 99; bi = 99; xi = 99;
          }
        }
      }
    }
  }
}

var sampleRounds = [];
for (i = 0; i < 5; i++) sampleRounds.push({ idx: i + 1, correct: i !== 2, t: 3 + i });
var enc = F.encode(sampleRounds);
var dec = F.decode(enc);
if (!dec) fail('encode/decode');
else {
  for (i = 0; i < 5; i++) {
    if (dec[i].idx !== sampleRounds[i].idx || dec[i].correct !== sampleRounds[i].correct || dec[i].t !== sampleRounds[i].t) {
      fail('roundtrip ' + i);
    }
  }
}

var rounds = F.decode(hero);
if (!rounds) fail('hero does not decode');
else {
  var correct = 0;
  var sec = 0;
  for (i = 0; i < rounds.length; i++) {
    if (rounds[i].correct) correct++;
    sec += rounds[i].t;
  }
  console.log('HERO ' + a.cardLine + ' | ' + F.title(correct) + ' ' + correct + '/5 ' + sec + 's');
}
console.log('MODEL ' + a.hair.name + ' / ' + a.eyes.name + ' / ' + a.mouth.name + ' / ' + a.body.name + ' / ' + a.pose.name + ' / ' + a.main.name + ' / ' + a.accent.name + ' / ' + a.accessory.name);

var samples = ['B665-6G14-RPME', '0000-0000-0000', '0708-0253-0243', '0509-0736-0305', '0401-0174-0474'];
var seenName = {};
for (i = 0; i < samples.length; i++) {
  var m = G.figureModel(samples[i]);
  console.log('SEED ' + m.fp + ' ' + m.displayName + ' ' + m.hair.id + ' ' + m.eyes.id + ' ' + m.mouth.id + ' ' + m.body.id + ' ' + m.pose.id + ' ' + m.main.id + ' ' + m.accent.id + ' ' + m.accessory.id);
  if (!m.displayName || m.displayName.length < 2 || m.displayName.length > 4) fail('name len ' + m.fp + ' ' + m.displayName);
  if (m.displayName.indexOf('·') >= 0) fail('name parts ' + m.fp);
  if (G.figureModel(m.fp).displayName !== m.displayName) fail('name unstable ' + m.fp);
  if (seenName[m.displayName]) fail('name collide ' + m.displayName);
  seenName[m.displayName] = 1;
}

if (fails.length) {
  console.error(fails.slice(0, 20).join('\n'));
  console.error('FAILS ' + fails.length);
  process.exit(1);
}
console.log('MODEL_OK');
