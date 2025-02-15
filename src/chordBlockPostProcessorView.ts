import {MarkdownRenderChild, TFile} from "obsidian";
import {Instrument, uniqueChordTokens} from "./chordsUtils";
import tippy from "tippy.js/headless";
import {makeChordDiagram, makeChordOverview} from "./chordDiagrams";
import {ChordSheetsSettings} from "./chordSheetsSettings";

import {
	ChordToken,
	isChordToken,
	isHeaderToken,
	isMarkerToken,
	isRhythmToken,
	isNotationToken,
	isLabelToken,
	isSectionToken, isPropertyToken, isEmbedToken
} from "./sheet-parsing/tokens";
import {tokenizeLine} from "./sheet-parsing/tokenizeLine";
import ChordSheetsPlugin from "./main";

export class ChordBlockPostProcessorView extends MarkdownRenderChild {
	source: string;

	constructor(
		containerEl: HTMLElement,
		private instrument: Instrument,
		private settings: ChordSheetsSettings,
		private plugin: ChordSheetsPlugin
	) {
		super(containerEl);
	}

	async onload() {

		const codeEl = this.containerEl.getElementsByTagName("code").item(0);
		if (codeEl) {
			this.source = codeEl.innerText;
		}

		this.render();
	}

	private render() {
		const {
			chordLineMarker,
			textLineMarker,
			showChordDiagramsOnHover,
			showChordOverview,
			diagramWidth,
			highlightChords,
			highlightSectionHeaders,
			highlightRhythmMarkers
		} = this.settings;

		if (this.containerEl.children.length > 0) {
			this.containerEl.empty();
		}

		const codeEl = this.containerEl.createEl("code", {cls: "chord-sheet-chord-block-preview"});

		const chordTokens: ChordToken[] = [];
		const lines = this.source.split("\n");
		let currentIndex = 0;
		for (const line of lines) {
			const tokenizedLine = tokenizeLine(line, currentIndex, chordLineMarker, textLineMarker);

			const lineDiv = codeEl.createDiv({
				cls: "chord-sheet-chord-line"
			});

			for (const token of tokenizedLine.tokens) {
				if (isChordToken(token)) {
					chordTokens.push(token);
					const chordSpan = lineDiv.createSpan({
						cls: "chord-sheet-chord",
					});

					if (token.inlineChord) {
						lineDiv.addClass("chord-sheet-inline");
						chordSpan.createSpan({
							cls: `chord-sheet-inline-chord-bracket`,
							text: token.inlineChord.openingBracket.value
						});
					}

					chordSpan.createSpan({
						cls: `chord-sheet-chord-name${highlightChords ? " chord-sheet-chord-highlight" : ""}`,
						text: token.chordSymbol.value
					});


					if (token.userDefinedChord) {
						const userDefinedChord = token.userDefinedChord;

						chordSpan.createSpan({
							cls: 'chord-sheet-user-defined-chord-bracket',
							text: userDefinedChord.openingBracket.value
						});
						userDefinedChord.position && chordSpan.createSpan({
							cls: 'chord-sheet-user-defined-chord-position',
							text: userDefinedChord.position.value
						});
						userDefinedChord.positionSeparator && chordSpan.createSpan({
							cls: 'chord-sheet-user-defined-chord-position-separator',
							text: userDefinedChord.positionSeparator.value
						});
						chordSpan.createSpan({
							cls: 'chord-sheet-user-defined-chord-frets',
							text: userDefinedChord.frets.value
						});
						chordSpan.createSpan({
							cls: 'chord-sheet-user-defined-chord-bracket',
							text: userDefinedChord.closingBracket.value
						});

					}

					if (token.inlineChord) {
						if (token.inlineChord.auxText) {
							chordSpan.createSpan({
								cls: `chord-sheet-inline-chord-aux-text`,
								text: token.inlineChord.auxText.value
							});
						}
						chordSpan.createSpan({
							cls: `chord-sheet-inline-chord-bracket`,
							text: token.inlineChord.closingBracket.value
						});

						chordSpan.createSpan({
							cls: `chord-sheet-inline-chord-trailing-text`,
							text: token.inlineChord.trailingText ? token.inlineChord.trailingText.value : " "
						});

					}


					if (showChordDiagramsOnHover === "always" || showChordDiagramsOnHover === "preview") {
						this.attachChordDiagram(token, chordSpan);
					}
				} else if (highlightRhythmMarkers && isRhythmToken(token)) {
					lineDiv.createSpan({
						cls: `chord-sheet-rhythm-marker`,
						text: token.value
					});
				} else if (isMarkerToken(token)) {
					lineDiv.createSpan({
						cls: `chord-sheet-line-marker`,
						text: token.value
					});
				} else if (isNotationToken(token)) {
					lineDiv.createSpan({
						cls: `chord-sheet-notation`,
						text: token.value
					});
				} else if (isSectionToken(token)) {
					lineDiv.createSpan({
						cls: `chord-sheet-section`,
						text: token.value
					});
				} else if (isPropertyToken(token)) {
					lineDiv.addClass("chord-sheet-property-"+token.propertyName);
					const propertySpan = lineDiv.createSpan({
						cls: "chord-sheet-property-"+token.propertyName
					});
					propertySpan.createSpan({
						cls: `chord-sheet-property-tag`,
						text: token.propertyTag.value
					});
					propertySpan.createSpan({
						cls: `chord-sheet-property-value`,
						text: token.propertyValue.value
					});
				} else if (isLabelToken(token)) {
					const labelSpan = lineDiv.createSpan({
						cls: "chord-sheet-label" + token.labelType,
					});
					labelSpan.createSpan({
						cls: `chord-sheet-label-quote`,
						text: token.openingQuote.value
					});
					labelSpan.createSpan({
						cls: `chord-sheet-label-text`,
						text: token.labelText.value
					});
					labelSpan.createSpan({
						cls: `chord-sheet-label-quote`,
						text: token.closingQuote.value
					});

				} else if (isEmbedToken(token)) {
					const embedSpan = lineDiv.createSpan({
						cls: "chord-sheet-embed",
					});

					// This works, but is it efficient to call everytime? Other plugins seem to create a cache
					const tfile = this.plugin.app.vault.getFileByPath(this.plugin.app.vault.config.attachmentFolderPath + "/" + token.src);
					if (tfile instanceof TFile) {
						const src = this.plugin.app.vault.getResourcePath(tfile);
						const img = embedSpan.createEl("img", {attr: {src: src}});
						if (token.width > 0) { img.width = token.width; }
						if (token.height > 0) { img.height = token.height; }
					}

				} else if (highlightSectionHeaders && isHeaderToken(token)) {
					lineDiv.addClass("chord-sheet-section-header");
					const headerSpan = lineDiv.createSpan({
						cls: "chord-sheet-section-header-content",
					});
					headerSpan.createSpan({
						cls: `chord-sheet-section-header-bracket`,
						text: token.openingBracket.value
					});
					headerSpan.createSpan({
						cls: `chord-sheet-section-header-name cm-strong`,
						text: token.headerName.value
					});
					headerSpan.createSpan({
						cls: `chord-sheet-section-header-bracket`,
						text: token.closingBracket.value
					});
				} else {
					lineDiv.append(document.createTextNode(token.value));
				}
			}

			currentIndex = currentIndex + line.length;
		}

		if (showChordOverview === "always" || showChordOverview === "preview") {
			const uniqueTokens = uniqueChordTokens(chordTokens);
			const overviewContainerEl = createDiv({cls: "chord-sheet-chord-overview-container"});
			const overviewEl = overviewContainerEl.createDiv({cls: "chord-sheet-chord-overview"});
			makeChordOverview(this.instrument, overviewEl, uniqueTokens, diagramWidth);
			this.containerEl.prepend(overviewContainerEl);
		}
	}

	private attachChordDiagram(token: ChordToken, tokenEl: HTMLElement) {
		const popper = document.createElement("div");
		const { instrument, settings } = this;
		const { diagramWidth } = settings;

		popper.classList.add("chord-sheet-chord-popup");

		// noinspection JSUnusedGlobalSymbols
		tippy(tokenEl, {
			interactive: true,
			render() {
				return {popper};
			},
			onShow(instance) {
				const chordBox = makeChordDiagram(instrument, token, diagramWidth);
				if (chordBox) {
					instance.popper.appendChild(chordBox);
				} else {
					return false;
				}
			},
			onHidden(instance) {
				instance.popper.empty();
			}
		});

	}

}
