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
	isQuotedToken,
	isInlineHeaderToken, isEmbedToken, isDirectionToken, isBreakToken
} from "./sheet-parsing/tokens";
import {tokenizeLine} from "./sheet-parsing/tokenizeLine";
import ChordSheetsPlugin from "./main";


function processDirectionOpening(value: string) {
		switch (value) {
			case "// ": return "";
			case "//": return "";
			case "->": return "➔";
		}
		return value;
	}

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

		const songPropertiesSummary = this.plugin.getSongPropertiesSummary();
		if (songPropertiesSummary.length>0) {
			codeEl.createDiv({ cls: "chord-sheet-properties", text: songPropertiesSummary});
		}

		const chordTokens: ChordToken[] = [];
		const lines = this.source.split("\n");
		let currentIndex = 0;

		for (const line of lines) {
			const tokenizedLine = tokenizeLine(line, currentIndex, chordLineMarker, textLineMarker);

			const lineDiv = codeEl.createDiv({
				cls: "chord-sheet-chord-line"
			});

			for (let i = 0; i < tokenizedLine.tokens.length; i++) {
				const token = tokenizedLine.tokens[i];

				if (isChordToken(token)) {
					chordTokens.push(token);

					let nextToken = tokenizedLine.tokens[i + 1];
					const isTokenPair =
						this.settings.displayInlineChordsOverLyrics &&
						token.inlineChord && (
							!nextToken || nextToken?.type === "word" || nextToken?.type === "whitespace" ||
							isChordToken(nextToken)
						);


					const pairSpan = isTokenPair ? lineDiv.createSpan({
						cls: "chord-sheet-chord-text-pair"
					}) : null;

					const chordSpan = (pairSpan ?? lineDiv).createSpan({
						cls: "chord-sheet-chord",
					});


					if (token.inlineChord) {
						if (isTokenPair) {
							lineDiv.addClass("chord-sheet-inline-over-lyrics");
						}
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

						const trailingSpan = pairSpan?.createSpan({
							cls: `chord-sheet-inline-chord-trailing-text`
						});

						if (trailingSpan) {
							// fast-forward until the next chord token
							while (nextToken && !isChordToken(nextToken)) {
								trailingSpan.createSpan({
									cls: `chord-sheet-${nextToken.type}`,
									text: nextToken.value
								});
								i++;
								nextToken = tokenizedLine.tokens[i + 1];
							}
						}
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
				} else if (isBreakToken(token)) {
					lineDiv.addClass("chord-sheet-column-break");
				} else if (isInlineHeaderToken(token)) {
					const headerSpan = lineDiv.createSpan({
						cls: "chord-sheet-section-header-content",
					});
					headerSpan.createSpan({
						cls: `chord-sheet-section-header-name cm-strong`,
						text: token.headerName.value
					});
					headerSpan.createSpan({
						cls: `chord-sheet-section-header-bracket`,
						text: token.closingBracket.value
					});
				} else if (isQuotedToken(token)) {
					const labelSpan = lineDiv.createSpan({
						cls: "chord-sheet-quoted",
						attr: { type: token.quoteType },
					});
					labelSpan.createSpan({
						cls: `chord-sheet-quoted-quote`,
						text: token.openingQuote.value
					});
					labelSpan.createSpan({
						cls: `chord-sheet-quoted-text`,
						text: token.quotedText.value
					});
					labelSpan.createSpan({
						cls: `chord-sheet-quoted-quote`,
						text: token.closingQuote.value
					});

				} else if (isDirectionToken(token)) {
					const labelSpan = lineDiv.createSpan({
						cls: "chord-sheet-direction",
					});
					labelSpan.createSpan({
						cls: `chord-sheet-direction-opening`,
						text: processDirectionOpening(token.opening.value)
					});
					labelSpan.createSpan({
						cls: `chord-sheet-direction-text`,
						text: token.directionText.value
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
					lineDiv.append(token.value);
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
