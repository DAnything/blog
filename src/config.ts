import type {
	CommentConfig,
	ExpressiveCodeConfig,
	KofiConfig,
	LicenseConfig,
	NavBarConfig,
	NewsletterConfig,
	ProfileConfig,
	SiteConfig,
} from "./types/config";
import { LinkPreset } from "./types/config";

export const siteConfig: SiteConfig = {
	title: "Doa",
	subtitle: "気ままな備忘録",
	lang: "ja", // Language code, e.g. 'en', 'zh_CN', 'ja', etc.
	themeColor: {
		// テーマ色の色相 (0-360)。Fuwari の既定は 250 だが、この配色は
		// oklch(0.70 0.14 H) を使うため、170-230 と 250-290 は sRGB の色域から
		// はみ出してクリップされる (既定の 250 もその一つ)。
		// 色域に収まり、かつボタン文字のコントラストが最大に近い暖色域から選んだ。
		hue: 40,
		fixed: false, // Hide the theme color picker for visitors
	},
	banner: {
		enable: false,
		src: "assets/images/demo-banner.png", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
		position: "center", // Equivalent to object-position, only supports 'top', 'center', 'bottom'. 'center' by default
		credit: {
			enable: false, // Display the credit text of the banner image
			text: "", // Credit text to be displayed
			url: "", // (Optional) URL link to the original artwork or artist's page
		},
	},
	toc: {
		enable: true, // Display the table of contents on the right side of the post
		depth: 2, // Maximum heading depth to show in the table, from 1 to 3
	},
	favicon: [
		{
			src: "/static/favicons/favicon-32x32.png",
			sizes: "32x32",
		},
		{
			src: "/static/favicons/favicon-16x16.png",
			sizes: "16x16",
		},
		{
			src: "/static/favicons/apple-touch-icon.png",
			sizes: "180x180",
		},
	],
};

export const navBarConfig: NavBarConfig = {
	links: [
		LinkPreset.Home,
		LinkPreset.Archive,
		LinkPreset.About,
		{
			name: "GitHub",
			url: "https://github.com/DAnything/blog", // Internal links should not include the base path, as it is automatically added
			external: true, // Show an external link icon and will open in a new tab
		},
	],
};

export const profileConfig: ProfileConfig = {
	avatar: "/static/images/avatar.png", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
	name: "丸山 竜輝",
	bio: "気ままな備忘録",
	links: [
		{
			name: "GitHub",
			icon: "fa6-brands:github", // Visit https://icones.js.org/ for icon codes
			// You will need to install the corresponding icon set if it's not already included
			// `pnpm add @iconify-json/<icon-set-name>`
			url: "https://github.com/5ym/",
		},
		{
			name: "X",
			icon: "fa6-brands:x-twitter",
			url: "https://x.com/5yuim",
		},
		{
			name: "Facebook",
			icon: "fa6-brands:facebook",
			url: "https://www.facebook.com/5yuim/",
		},
		{
			name: "Instagram",
			icon: "fa6-brands:instagram",
			url: "https://www.instagram.com/5yuim/",
		},
		{
			name: "LinkedIn",
			icon: "fa6-brands:linkedin",
			url: "https://www.linkedin.com/in/yui/",
		},
		{
			name: "YouTube",
			icon: "fa6-brands:youtube",
			url: "https://www.youtube.com/channel/UCJWogAotKEJ70bs_e19yMyQ",
		},
	],
};

export const licenseConfig: LicenseConfig = {
	enable: true,
	name: "CC BY-NC-SA 4.0",
	url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
};

export const commentConfig: CommentConfig = {
	enable: true,
	artalk: {
		server: "https://ak.doany.io",
		site: "doany",
		locale: "ja",
	},
};

export const newsletterConfig: NewsletterConfig = {
	enable: true,
	// https://buttondown.com/<username> の <username> 部分
	username: "doa",
	title: "Newsletter",
	description: "新しい記事を公開したらお知らせします。",
	placeholder: "your@email.com",
	buttonLabel: "登録",
};

export const kofiConfig: KofiConfig = {
	enable: true,
	// https://ko-fi.com/<username> の <username> 部分
	username: "yui5m",
	title: "Support",
	description: "記事が役に立ったら応援していただけると励みになります。",
	buttonLabel: "Ko-fi で支援する",
};

export const expressiveCodeConfig: ExpressiveCodeConfig = {
	// Note: Some styles (such as background color) are being overridden, see the astro.config.mjs file.
	// Please select a dark theme, as this blog theme currently only supports dark background color
	theme: "github-dark",
};
