// src/content/posts/*.md から Zenn 用の articles/*.md を生成する。
//
//   node scripts/zenn-sync.mjs
//
// Zenn はリポジトリ直下の articles/*.md しか読まないため、Astro 側の記事を
// 変換して出力する。articles/ は全体が生成物なので、対応する記事がなくなった
// ファイルは削除される。手で置いたファイルは残らないので注意。
//
// 公開日は元記事の published をそのまま published_at に渡す。Zenn 側で
// 「一度設定すると変更できない」項目なので、公開前に正しい値を入れておくこと。
//
// Astro 側のフロントマターで挙動を上書きできる:
//   zennPublished: false  Zenn 上では下書きに留める (既定は公開)
//   zennSlug: xxxxxxxxxxx スラッグを明示する (12〜50文字)
//   zennEmoji: "🚗"        アイキャッチの絵文字 (既定は 📝)
//   zennType: idea        tech (既定) または idea

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const POSTS_DIR = "src/content/posts";
const OUT_DIR = "articles";
const SITE_URL = (process.env.SITE_URL || "https://doany.io").replace(/\/$/, "");

/** フロントマターと本文を分ける */
function parse(file) {
	const raw = fs.readFileSync(file, "utf8");
	const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
	if (!m) return null;

	const fm = {};
	for (const line of m[1].split(/\r?\n/)) {
		const mm = line.match(/^([A-Za-z_]+):\s*(.*)$/);
		if (mm) fm[mm[1]] = mm[2].trim().replace(/^['"]|['"]$/g, "");
	}
	return { fm, body: m[2] };
}

// Zenn のスラッグは a-z0-9_- の 12〜50 文字。ブログ側のファイル名は短いものが
// 多いが、リネームすると doany.io の URL が変わってしまうため、ここでだけ
// 決定的なハッシュを足して長さを満たす。
function toZennSlug(slug) {
	if (slug.length >= 12) return slug.slice(0, 50);
	const need = Math.max(4, 12 - slug.length - 1);
	const hash = crypto.createHash("sha256").update(slug).digest("hex");
	return `${slug}-${hash.slice(0, need)}`;
}

/** Zenn のトピックは空白を含められないため詰める */
function toTopics(tags) {
	if (!tags) return [];
	let list;
	try {
		list = JSON.parse(tags);
	} catch {
		return [];
	}
	return list.map((t) => String(t).replace(/\s+/g, "")).slice(0, 5);
}

// GitHub 形式のアラートは Zenn では素の引用になってしまうため、
// Zenn のメッセージ記法に変換する。
function convertAdmonitions(body) {
	return body.replace(
		/^> \[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\r?\n((?:>.*(?:\r?\n|$))+)/gm,
		(_, kind, rest) => {
			const inner = rest
				.split(/\r?\n/)
				.filter((l) => l.startsWith(">"))
				.map((l) => l.replace(/^>\s?/, ""))
				.join("\n")
				.trimEnd();
			const alert = kind === "WARNING" || kind === "CAUTION" ? " alert" : "";
			return `:::message${alert}\n${inner}\n:::\n`;
		},
	);
}

function convertBody(body, slug) {
	return (
		convertAdmonitions(body)
			// 画像は doany.io 上の絶対パスなので、Zenn から見えるよう URL にする
			.replace(/\]\(\/static\//g, `](${SITE_URL}/static/`)
			// Astro のディレクティブは Zenn のカード記法に置き換える
			.replace(/^::github\{repo="([^"]+)"\}$/gm, "@[card](https://github.com/$1)")
			.trimEnd()
			.concat(`\n\n---\n\n初出: ${SITE_URL}/posts/${slug}/\n`)
	);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const generated = new Set();
let published = 0;
let draft = 0;
let skipped = 0;

for (const name of fs.readdirSync(POSTS_DIR).sort()) {
	if (!name.endsWith(".md")) continue;

	const slug = path.basename(name, ".md");
	const parsed = parse(path.join(POSTS_DIR, name));
	if (!parsed?.fm.title) {
		console.log(`スキップ (title なし): ${name}`);
		skipped++;
		continue;
	}

	const { fm, body } = parsed;
	if (fm.draft === "true") {
		console.log(`スキップ (draft): ${name}`);
		skipped++;
		continue;
	}

	const zennSlug = fm.zennSlug || toZennSlug(slug);
	const isPublished = fm.zennPublished !== "false";

	const front = [
		"---",
		`title: ${JSON.stringify(fm.title)}`,
		`emoji: ${JSON.stringify(fm.zennEmoji || "📝")}`,
		`type: ${fm.zennType === "idea" ? "idea" : "tech"}`,
		`topics: ${JSON.stringify(toTopics(fm.tags))}`,
		`published: ${isPublished}`,
	];
	// 移行なので元記事の公開日を引き継ぐ。Zenn 側は後から変更できない
	if (/^\d{4}-\d{2}-\d{2}$/.test(fm.published || "")) {
		front.push(`published_at: ${fm.published}`);
	}
	front.push("---");

	fs.writeFileSync(
		path.join(OUT_DIR, `${zennSlug}.md`),
		`${front.join("\n")}\n\n${convertBody(body, slug)}`,
	);
	generated.add(`${zennSlug}.md`);

	if (isPublished) published++;
	else draft++;
}

// 元記事が消えた分の掃除
for (const name of fs.readdirSync(OUT_DIR)) {
	if (name.endsWith(".md") && !generated.has(name)) {
		fs.unlinkSync(path.join(OUT_DIR, name));
		console.log(`削除: ${name}`);
	}
}

console.log(`\n公開 ${published} 件 / 下書き ${draft} 件 / スキップ ${skipped} 件`);
