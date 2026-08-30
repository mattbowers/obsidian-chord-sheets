// Pure helpers for the `![[src|size]]` image-embed syntax used inside chord
// blocks. Kept framework-free so it can be unit-tested like chordProcessing.ts.

export interface EmbedParts {
	src: string;
	/** 0 when no width is specified. */
	width: number;
	widthUnit: "px" | "%";
	/** 0 when no height is specified (only meaningful for px widths). */
	height: number;
}

// Mirrors the `embed` pattern in sheet-parsing/tokenizeLine.ts, anchored to match
// a single embed string in full.
const EMBED_RE =
	/^!\[\[(?<src>[^[|]+)(?:\|(?<width>\d+)(?:(?<pct>%)|x(?<height>\d+))?)?]]$/;

export function parseEmbed(embedText: string): EmbedParts | null {
	const match = EMBED_RE.exec(embedText.trim());
	if (!match) {
		return null;
	}
	const groups = match.groups!;
	return {
		src: groups.src,
		width: groups.width ? Number(groups.width) : 0,
		widthUnit: groups.pct ? "%" : "px",
		height: groups.height ? Number(groups.height) : 0
	};
}

export function formatEmbed(parts: EmbedParts): string {
	const {src, width, widthUnit, height} = parts;
	if (!width || width <= 0) {
		return `![[${src}]]`;
	}
	if (widthUnit === "%") {
		return `![[${src}|${width}%]]`;
	}
	if (height && height > 0) {
		return `![[${src}|${width}x${height}]]`;
	}
	return `![[${src}|${width}]]`;
}

/** Re-emit an embed string with its width set to `percent` of the container. */
export function withEmbedWidthPercent(embedText: string, percent: number): string {
	const parts = parseEmbed(embedText);
	if (!parts) {
		return embedText;
	}
	return formatEmbed({
		src: parts.src,
		width: Math.round(percent),
		widthUnit: "%",
		height: 0
	});
}

/** Re-emit an embed string with any size specification removed. */
export function stripEmbedSize(embedText: string): string {
	const parts = parseEmbed(embedText);
	if (!parts) {
		return embedText;
	}
	return formatEmbed({src: parts.src, width: 0, widthUnit: "px", height: 0});
}
