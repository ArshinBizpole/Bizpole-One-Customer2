#!/usr/bin/env node
/*
  Translate the Meta-ads trademark page (public/trademark-search/meta/index.html)
  into Indian languages with Qwen, writing public/trademark-search/meta/i18n/<lang>.js.
  The page shows a language with ?lang=<code>.

    node scripts/translate-tm-meta.mjs                 # all languages, only new/changed strings
    node scripts/translate-tm-meta.mjs hi ta           # just these
    node scripts/translate-tm-meta.mjs hi --force      # retranslate everything for hi
    node scripts/translate-tm-meta.mjs --dry           # list what would be translated, no API calls

  Qwen access (env, or Bizpole-One-Customer2/.env / .env.local — NOT VITE_-prefixed,
  so the key never reaches the browser bundle):
    QWEN_API_KEY   (or DASHSCOPE_API_KEY)   required
    QWEN_BASE_URL  default https://dashscope-intl.aliyuncs.com/compatible-mode/v1
                   (OpenAI-compatible; mainland China accounts: https://dashscope.aliyuncs.com/compatible-mode/v1)
    QWEN_MODEL     default qwen-max

  Re-run after changing any English copy on the page. Existing translations are kept
  (so hand fixes by a native speaker survive); only strings missing from a language
  file are sent, and strings no longer on the page are dropped. Every translation is
  checked to keep the same numbered tags (<0>…</0>) and {placeholders}; one that fails
  twice is left out and that string shows in English.
*/
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { parseHTML } from "linkedom";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PAGE = path.join(ROOT, "public/trademark-search/meta/index.html");
const OUT = path.join(ROOT, "public/trademark-search/meta/i18n");
const RUNTIME = path.join(OUT, "i18n.js");

const LANGS = {
  hi: "Hindi (Devanagari script)",
  bn: "Bengali (Bangla script)",
  te: "Telugu",
  mr: "Marathi (Devanagari script)",
  ta: "Tamil",
  gu: "Gujarati",
  kn: "Kannada",
  ml: "Malayalam",
  or: "Odia (Oriya script)",
  pa: "Punjabi (Gurmukhi script)",
  as: "Assamese (Assamese/Bengali script)",
  ur: "Urdu (Perso-Arabic script, written right to left)",
};

// ---------- env ----------
function loadEnvFiles() {
  for (const f of [".env", ".env.local"]) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*(QWEN_[A-Z_]+|DASHSCOPE_API_KEY)\s*=\s*(.*?)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}
loadEnvFiles();
const API_KEY = process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY || "";
const BASE_URL = (process.env.QWEN_BASE_URL || "https://dashscope-intl.aliyuncs.com/compatible-mode/v1").replace(/\/+$/, "");
const MODEL = process.env.QWEN_MODEL || "qwen-max";

// ---------- extract ----------
function extract() {
  const src = fs.readFileSync(PAGE, "utf8");
  const { window } = parseHTML(src);
  new Function("window", fs.readFileSync(RUNTIME, "utf8"))(window);
  const { units, attrs } = window.TMI18N.collect(window.document);

  const strings = new Map(); // key (normalized English text) → source to translate (HTML or plain)
  for (const u of units) strings.set(u.key, u.key);
  for (const a of attrs) if (!strings.has(a.key)) strings.set(a.key, a.key);

  // JS-built strings: t("…") / tr("…"), plus the I18N_EXTRA list of server messages
  const norm = window.TMI18N.norm;
  const scripts = [...src.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*ld\+json)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join("\n");
  const lit = (s) => JSON.parse('"' + s + '"');
  for (const m of scripts.matchAll(/\b(?:t|tr)\(\s*"((?:[^"\\]|\\.)*)"/g)) {
    const s = lit(m[1]); if (!strings.has(norm(s))) strings.set(norm(s), s);
  }
  const extra = scripts.match(/I18N_EXTRA\s*=\s*\[([\s\S]*?)\];/);
  if (extra) for (const m of extra[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)) {
    const s = lit(m[1]); if (!strings.has(norm(s))) strings.set(norm(s), s);
  }
  return strings;
}

// ---------- validate ----------
// Numbered tag placeholders (<0>…</0>, <1/>) and {vars} must all survive, with nothing added
const tagsOf = (s) => [...s.matchAll(/<\/?\d+\/?>/g)].map((m) => m[0]).sort().join(",");
const varsOf = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
function valid(src, out) {
  if (typeof out !== "string" || !out.trim()) return false;
  if (/<(?!\/?\d+\/?>)/.test(out)) return false; // any other markup
  return tagsOf(src) === tagsOf(out) && varsOf(src) === varsOf(out);
}

// ---------- Qwen ----------
function systemPrompt(langName) {
  return [
    `You translate website copy from English into ${langName} for Bizpole, an Indian business-services company.`,
    `The page is a free trademark (brand name) search landing page shown to small business owners and first-time founders who arrive from Facebook/Instagram ads.`,
    `Write the way people in India actually speak and read ${langName.split(" (")[0]} online: simple, warm, clear and natural — not stiff, literary or word-for-word.`,
    `Where everyday speakers use the English word for a business/tech term (e.g. trademark, brand, logo, report, class, online), write that word as it is commonly written in ${langName.split(" (")[0]} script rather than an obscure formal coinage.`,
    `Keep these exactly as they are, in Latin script: Bizpole, Bizpole One, WhatsApp, GST, LLP, OPC, HUF, AOP, BOI, PNG, JPG, MB, ™, ®, ₹ amounts, numbers, "+91" and the Nice class numbers.`,
    `Input strings may contain numbered tags like <0>…</0> and <1/> marking bold text, links, line breaks etc. Keep every one of them exactly (same numbers, each opened and closed once), around the words that correspond; you may move them to fit the ${langName.split(" (")[0]} word order. Add no other tags or markup.`,
    `Keep placeholders like {m}, {n}, {c}, {q} exactly as they are.`,
    `Short UI labels (buttons, menu items, form labels, dropdown options) must stay short.`,
    `Reply with only a JSON object mapping each input id to its translation, with the same ids. No explanations.`,
  ].join("\n");
}

async function chat(langName, batch) {
  const input = Object.fromEntries(batch.map(([id, s]) => [id, s]));
  const body = {
    model: MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt(langName) },
      { role: "user", content: JSON.stringify(input, null, 1) },
    ],
  };
  for (let attempt = 1; ; attempt++) {
    let res;
    try {
      res = await fetch(BASE_URL + "/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + API_KEY },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(180000),
      });
    } catch (e) {
      if (attempt >= 4) throw e;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
      continue;
    }
    if (res.status === 429 || res.status >= 500) {
      if (attempt >= 4) throw new Error(`Qwen HTTP ${res.status}: ${await res.text()}`);
      await new Promise((r) => setTimeout(r, 4000 * attempt));
      continue;
    }
    if (!res.ok) throw new Error(`Qwen HTTP ${res.status}: ${(await res.text()).slice(0, 500)}`);
    const j = await res.json();
    const text = j.choices?.[0]?.message?.content || "";
    try {
      return JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ""));
    } catch {
      if (attempt >= 4) throw new Error("Qwen did not return JSON: " + text.slice(0, 300));
    }
  }
}

// ---------- files ----------
function fileOf(lang) { return path.join(OUT, lang + ".js"); }
function readDict(lang) {
  const f = fileOf(lang);
  if (!fs.existsSync(f)) return {};
  const txt = fs.readFileSync(f, "utf8");
  const at = txt.indexOf("TM_I18N_DICT");
  const json = txt.slice(txt.indexOf("=", at) + 1).trim().replace(/;\s*$/, "");
  try { return JSON.parse(json).strings || {}; } catch { return null; }
}
function writeDict(lang, strings) {
  const sorted = Object.fromEntries(Object.keys(strings).sort().map((k) => [k, strings[k]]));
  fs.writeFileSync(fileOf(lang),
    `/* ${LANGS[lang]} — /trademark-search/meta?lang=${lang}\n` +
    `   Keys are the English text (tags as <0>…</0>, keep them and {vars}). Check with scripts/translate-tm-meta.mjs --check;\n` +
    `   the script with a Qwen key fills in any missing strings.\n` +
    `   Hand edits are kept when the script is re-run; delete a line to have it retranslated. */\n` +
    `window.TM_I18N_DICT = ${JSON.stringify({ lang, strings: sorted }, null, 1)};\n`);
}
function bumpVersion() {
  const h = crypto.createHash("sha1");
  for (const f of fs.readdirSync(OUT).sort()) h.update(fs.readFileSync(path.join(OUT, f)));
  const v = h.digest("hex").slice(0, 8);
  const page = fs.readFileSync(PAGE, "utf8").replace(/var I18N_V = "[^"]*";/, `var I18N_V = "${v}";`);
  fs.writeFileSync(PAGE, page);
  return v;
}

// ---------- main ----------
async function translateLang(lang, strings, force) {
  const name = LANGS[lang];
  const old = force ? {} : readDict(lang);
  if (!old) throw new Error(`${lang}.js exists but could not be parsed — fix or delete it first (not overwritten)`);
  const next = {};
  const todo = [];
  for (const [key, src] of strings) {
    if (old[key] && valid(src, old[key])) next[key] = old[key];
    else todo.push([key, src]);
  }
  if (!todo.length) { writeDict(lang, next); console.log(`${lang}: up to date (${Object.keys(next).length} strings)`); return 0; }

  const ids = todo.map(([key, src], i) => ["s" + i, src, key]);
  let failed = [];
  const SIZE = 30;
  for (let i = 0; i < ids.length; i += SIZE) {
    const batch = ids.slice(i, i + SIZE);
    const out = await chat(name, batch.map(([id, src]) => [id, src]));
    for (const [id, src, key] of batch) {
      if (valid(src, out[id])) next[key] = out[id].trim(); else failed.push([id, src, key]);
    }
    process.stdout.write(`${lang}: ${Math.min(i + SIZE, ids.length)}/${ids.length}\r`);
  }
  // One more go for anything that lost a tag / placeholder, a few at a time
  const again = failed; failed = [];
  for (let i = 0; i < again.length; i += 5) {
    const batch = again.slice(i, i + 5);
    const out = await chat(name, batch.map(([id, src]) => [id, src])).catch(() => ({}));
    for (const [id, src, key] of batch) {
      if (valid(src, out[id])) next[key] = out[id].trim(); else failed.push([id, src, key]);
    }
  }
  writeDict(lang, next);
  console.log(`${lang}: ${todo.length - failed.length} translated, ${Object.keys(next).length} total` +
    (failed.length ? `, ${failed.length} left in English:` : ""));
  for (const [, , key] of failed) console.log("   - " + key.slice(0, 100));
  return failed.length;
}

const args = process.argv.slice(2);
const force = args.includes("--force"), dry = args.includes("--dry");
const picked = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--export");
const bad = picked.filter((l) => !LANGS[l]);
if (bad.length) { console.error("Unknown language code(s): " + bad.join(", ") + ". Use: " + Object.keys(LANGS).join(" ")); process.exit(1); }
const langs = picked.length ? picked : Object.keys(LANGS);

const strings = extract();
console.log(`${strings.size} strings on the page.`);
if (dry) {
  for (const [key, src] of strings) console.log("- " + (src === key ? key : src));
  for (const l of langs) {
    const old = readDict(l) || {}; const missing = [...strings].filter(([k, s]) => !(old[k] && valid(s, old[k]))).length;
    console.log(`${l}: ${missing} to translate`);
  }
  process.exit(0);
}
// --export <file>: the English strings as a JSON array (for translating by hand / another tool)
// --check: validate the language files (missing / broken strings), bump the page cache version
if (args.includes("--export")) {
  const f = args[args.indexOf("--export") + 1];
  fs.writeFileSync(f, JSON.stringify([...strings.keys()], null, 1));
  console.log("wrote " + f);
  process.exit(0);
}
if (args.includes("--check")) {
  let bad = 0;
  for (const l of langs) {
    const d = readDict(l);
    if (!d) { bad++; console.log(`${l}: FILE COULD NOT BE PARSED — left untouched`); continue; }
    const missing = [...strings.keys()].filter((k) => !d[k]);
    const broken = [...strings.keys()].filter((k) => d[k] && !valid(k, d[k]));
    bad += missing.length + broken.length;
    console.log(`${l}: ${strings.size - missing.length - broken.length}/${strings.size} ok` +
      (missing.length ? `, ${missing.length} missing` : "") + (broken.length ? `, ${broken.length} broken` : ""));
    for (const k of broken) console.log(`   broken: ${k.slice(0, 80)}  →  ${d[k].slice(0, 80)}`);
    if (fs.existsSync(fileOf(l))) writeDict(l, Object.fromEntries(Object.entries(d).filter(([k, v]) => strings.has(k) && valid(k, v))));
  }
  if (!args.includes("--no-bump")) console.log(`Page cache version → ${bumpVersion()}`);
  process.exit(bad ? 1 : 0);
}
if (!API_KEY) {
  console.error("Set QWEN_API_KEY (or DASHSCOPE_API_KEY) in the environment or in Bizpole-One-Customer2/.env.local");
  process.exit(1);
}
fs.mkdirSync(OUT, { recursive: true });
console.log(`Qwen ${MODEL} at ${BASE_URL}`);
let left = 0;
const queue = [...langs];
await Promise.all(Array.from({ length: 3 }, async () => {
  while (queue.length) {
    const l = queue.shift();
    try { left += await translateLang(l, strings, force); }
    catch (e) { left++; console.error(`${l}: FAILED — ${e.message}`); }
  }
}));
console.log(`Page cache version → ${bumpVersion()}` + (left ? `  (${left} string(s)/language(s) need attention, see above)` : ""));
