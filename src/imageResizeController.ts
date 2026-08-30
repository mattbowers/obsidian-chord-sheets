import {App, Notice, TFile} from "obsidian";
import {withEmbedWidthPercent} from "./imageEmbeds";

export interface ImageResizeTarget {
	app: App;
	/** The note file that contains the chord block, or null if it can't be resolved. */
	file: () => TFile | null;
	/** 0-based line number of the code fence line within the note, or null. */
	sectionLineStart: () => number | null;
	/** 0-based source line of the embed within the code block. */
	lineInBlock: number;
	/** Column of `embedText` within its source line. */
	colInLine: number;
	/** The original `![[...]]` text as written in the note. */
	embedText: string;
	/** Lower bound for the resulting width, as a percentage of the container. */
	minWidthPercent: number;
}

type Corner = "nw" | "ne" | "sw" | "se";
const CORNERS: Corner[] = ["nw", "ne", "sw", "se"];

// Only one image is interactively resizable at a time.
let activeTeardown: (() => void) | null = null;

export function attachImageResizeHandles(img: HTMLImageElement, target: ImageResizeTarget) {
	img.addClass("chord-sheet-embed-resizable");
	img.addEventListener("pointerdown", (event: PointerEvent) => {
		if (event.button !== 0) {
			return;
		}
		event.preventDefault();
		activate(img, target);
	});
}

function activate(img: HTMLImageElement, target: ImageResizeTarget) {
	activeTeardown?.();

	const doc = img.ownerDocument;
	const win = doc.defaultView;
	const controller = new AbortController();
	const {signal} = controller;

	const overlay = doc.body.createDiv({cls: "chord-sheet-embed-resize-overlay"});
	const readout = overlay.createDiv({cls: "chord-sheet-embed-resize-readout"});

	const reposition = () => {
		const rect = img.getBoundingClientRect();
		overlay.style.top = `${rect.top}px`;
		overlay.style.left = `${rect.left}px`;
		overlay.style.width = `${rect.width}px`;
		overlay.style.height = `${rect.height}px`;
	};

	const teardown = () => {
		controller.abort();
		overlay.remove();
		img.removeClass("is-resizing");
		if (activeTeardown === teardown) {
			activeTeardown = null;
		}
	};

	for (const corner of CORNERS) {
		const handle = overlay.createDiv({cls: `chord-sheet-embed-resize-handle mod-${corner}`});
		handle.addEventListener(
			"pointerdown",
			(event: PointerEvent) => startDrag(event, handle, corner, img, reposition, readout, target, teardown),
			{signal}
		);
	}

	reposition();
	readout.setText(`${widthPercent(img)}%`);

	win?.addEventListener("scroll", reposition, {capture: true, signal});
	win?.addEventListener("resize", reposition, {signal});

	// A pointer press outside the image and overlay closes the editor.
	doc.addEventListener(
		"pointerdown",
		(event: PointerEvent) => {
			const node = event.target as Node;
			if (!img.contains(node) && !overlay.contains(node)) {
				teardown();
			}
		},
		{capture: true, signal}
	);

	activeTeardown = teardown;
}

function containerWidth(img: HTMLImageElement): number {
	const line = img.closest<HTMLElement>(".chord-sheet-chord-line");
	return line?.clientWidth || img.parentElement?.clientWidth || img.getBoundingClientRect().width || 1;
}

function widthPercent(img: HTMLImageElement): number {
	return Math.round((img.getBoundingClientRect().width / containerWidth(img)) * 100);
}

function startDrag(
	event: PointerEvent,
	handle: HTMLElement,
	corner: Corner,
	img: HTMLImageElement,
	reposition: () => void,
	readout: HTMLElement,
	target: ImageResizeTarget,
	teardown: () => void
) {
	event.preventDefault();
	event.stopPropagation();
	handle.setPointerCapture(event.pointerId);

	const basis = containerWidth(img);
	const minWidth = (Math.max(1, target.minWidthPercent) / 100) * basis;
	const startWidth = img.getBoundingClientRect().width;
	const startX = event.clientX;
	const grows = corner === "ne" || corner === "se"; // dragging the right edge widens
	const originalInlineWidth = img.style.width;

	img.addClass("is-resizing");

	let percent = Math.round((startWidth / basis) * 100);

	const onMove = (moveEvent: PointerEvent) => {
		const delta = (moveEvent.clientX - startX) * (grows ? 1 : -1);
		const width = Math.max(minWidth, Math.min(basis, startWidth + delta));
		percent = Math.max(1, Math.min(100, Math.round((width / basis) * 100)));
		img.style.width = `${percent}%`;
		readout.setText(`${percent}%`);
		reposition();
	};

	const onUp = () => {
		handle.removeEventListener("pointermove", onMove);
		handle.removeEventListener("pointerup", onUp);
		handle.removeEventListener("pointercancel", onUp);
		void writeBack(target, percent, () => {
			img.style.width = originalInlineWidth;
		});
		teardown();
	};

	handle.addEventListener("pointermove", onMove);
	handle.addEventListener("pointerup", onUp);
	handle.addEventListener("pointercancel", onUp);
}

async function writeBack(target: ImageResizeTarget, percent: number, revert: () => void) {
	const file = target.file();
	const lineStart = target.sectionLineStart();
	if (!file || lineStart == null) {
		revert();
		new Notice("Chord Sheets: couldn't locate the image in the note.");
		return;
	}

	const noteLine = lineStart + 1 + target.lineInBlock;
	const replacement = withEmbedWidthPercent(target.embedText, percent);

	try {
		await target.app.vault.process(file, (data) => {
			const lines = data.split("\n");
			if (noteLine < 0 || noteLine >= lines.length) {
				throw new Error("line out of range");
			}
			const line = lines[noteLine];
			const at = line.slice(target.colInLine, target.colInLine + target.embedText.length) === target.embedText
				? target.colInLine
				: line.indexOf(target.embedText);
			if (at < 0) {
				throw new Error("embed not found on line");
			}
			lines[noteLine] = line.slice(0, at) + replacement + line.slice(at + target.embedText.length);
			return lines.join("\n");
		});
	} catch (error) {
		revert();
		new Notice(`Chord Sheets: failed to save image size — ${(error as Error).message}`);
	}
}
