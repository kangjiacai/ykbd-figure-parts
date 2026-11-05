/* 扫描运行时代码里的 Chrome 61 不兼容写法和禁用项。本文件自身不在扫描范围内。 */
var fs = require('fs');
var path = require('path');

var root = path.join(__dirname, '..');
var files = [
  'js/fingerprint.js',
  'js/figure-avatar.js',
  'preview.html',
  'tools/model-check.js',
  'tools/canvas-check.html',
  'tools/hard-rules-check.html',
  'tools/sheet.html',
  'README.md'
];

var rules = [
  ['optional chaining', /\?\./],
  ['nullish', /\?\?/],
  ['fromEntries', /Object\.fromEntries/],
  ['array flat', /\.flat\s*\(/],
  ['flatMap', /\.flatMap\s*\(/],
  ['class', /\bclass\b/],
  ['arrow', /=>/],
  ['let', /\blet\b/],
  ['const', /\bconst\b/],
  ['backtick', /`/],
  ['spread', /\.\.\./],
  ['async', /\basync\b/],
  ['await', /\bawait\b/],
  ['Math.random', /Math\.random/],
  ['fetch', /\bfetch\s*\(/],
  ['globalThis', /\bglobalThis\b/],
  ['includes', /\.includes\s*\(/],
  ['startsWith', /\.startsWith\s*\(/],
  ['endsWith', /\.endsWith\s*\(/],
  ['padStart', /\.padStart\s*\(/],
  ['Object.assign', /Object\.assign\s*\(/],
  ['Array.from', /Array\.from\s*\(/],
  ['for-of', /\bfor\s*\([^;]*\bof\b/]
];

var bannedWord = '冷' + '知识';
var bannedPhrases = [bannedWord, '本局卡', '指纹名', '仅此一局'];
var fails = [];

function hasBanned(text) {
  var i;
  for (i = 0; i < bannedPhrases.length; i++) {
    if (text.indexOf(bannedPhrases[i]) >= 0) return bannedPhrases[i];
  }
  return '';
}

function lineOf(text, index) {
  var n = 1;
  var i;
  for (i = 0; i < index && i < text.length; i++) if (text.charAt(i) === '\n') n++;
  return n;
}

function scanSource(rel, text) {
  var i;
  var stripped = text.replace(/http:\/\/www\.w3\.org\/2000\/svg/g, '');
  if (/https?:\/\//.test(stripped)) {
    fails.push(rel + ': unexpected http(s) URL');
  }
  for (i = 0; i < rules.length; i++) {
    var m = rules[i][1].exec(text);
    if (m) fails.push(rel + ':' + lineOf(text, m.index) + ' ' + rules[i][0]);
  }
}

function scriptsOf(html) {
  var out = [];
  var re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  var m;
  while ((m = re.exec(html))) {
    if (/\bsrc\s*=/.test(m[1])) {
      var src = m[1];
      if (/https?:|\/\//.test(src)) fails.push('external script: ' + src);
    } else {
      out.push(m[2]);
    }
  }
  return out.join('\n');
}

var f;
for (f = 0; f < files.length; f++) {
  var rel = files[f];
  var abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    fails.push('missing ' + rel);
    continue;
  }
  var text = fs.readFileSync(abs, 'utf8');
  if (/\.html$/.test(rel)) {
    if (/<link\b/i.test(text)) fails.push(rel + ': external link');
    if (/url\s*\(\s*["']?https?:/i.test(text)) fails.push(rel + ': css url');
    scanSource(rel + ' script', scriptsOf(text));
    if (rel === 'preview.html' || rel === 'tools/sheet.html') {
      var banned = hasBanned(text);
      if (banned) fails.push(rel + ': banned copy ' + banned);
    }
    var noNs = text.replace(/http:\/\/www\.w3\.org\/2000\/svg/g, '');
    if (/https?:\/\//.test(noNs)) fails.push(rel + ': unexpected http(s) URL');
  } else if (/\.md$/.test(rel)) {
    var md = text.replace(/http:\/\/www\.w3\.org\/2000\/svg/g, '');
    if (/https?:\/\//.test(md)) fails.push(rel + ': unexpected http(s) URL');
  } else {
    scanSource(rel, text);
    if (rel === 'js/figure-avatar.js') {
      var bannedJs = hasBanned(text);
      if (bannedJs) fails.push(rel + ': banned copy ' + bannedJs);
    }
  }
}

if (fails.length) {
  console.error(fails.join('\n'));
  process.exit(1);
}
console.log('ES5_OK ' + files.length + ' files');
