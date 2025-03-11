import {
	ChordInfo,
	ChordToken, EmbedToken,
	HeaderToken,
	QuotedToken,
	MarkerToken,
	NotationToken,
	Token,
	TokenizedLine, InlineHeaderToken, DirectionToken, BreakToken
} from "./tokens";
import escapeStringRegexp from "escape-string-regexp";
import {Chord} from "tonal";
import {SheetChord} from "../chordsUtils";

const CHORD_LINE_PROBABILITY_THRESHOLD = 0.5;

function offsetRange(range: [number, number], offset: number): [number, number] {
	return range && [range[0] + offset, range[1] + offset];
}

function getChord(maybeChordSymbol: string): SheetChord {
	const tonalJsChord = Chord.get(maybeChordSymbol);
	const {tonic, type, aliases: typeAliases} = tonalJsChord;
	return {tonic: tonic ?? "", type, typeAliases, bass: tonalJsChord.bass || null};
}

export function tokenizeLine(line: string, lineIndex: number, chordLineMarker: string, textLineMarker: string): TokenizedLine {
	const tokens: Token[] = [];

	const headerPattern = /(?<leadingWs>^\s*)(?<open>\[)(?<name>[^\]]+)(?<close>])(?<trailingWs>\s*$)/d;
	const headerMatch = line.match(headerPattern);
	if (headerMatch) {
		const {
			leadingWs, open: openingBracket, name: headerName, close: closingBracket, trailingWs
		} = headerMatch.groups!;
		const {
			leadingWs: leadingWsRange, open: openingBracketRange, name: headerNameRange, close: closingBracketRange,
			trailingWs: trailingWsRange
		} = headerMatch.indices!.groups!;

		if (leadingWs) {
			tokens.push({type: "whitespace", value: leadingWs, range: offsetRange(leadingWsRange, lineIndex)});
		}

		const headerToken: HeaderToken = {
			type: "header",
			value: headerMatch[0],
			range: offsetRange(headerMatch.indices![0], lineIndex),
			openingBracket: { value: openingBracket, range: openingBracketRange },
			headerName: {value: headerName, range: headerNameRange},
			closingBracket: { value: closingBracket, range: closingBracketRange }
		};

		tokens.push(headerToken);

		if (trailingWs) {
			tokens.push({type: "whitespace", value: trailingWs, range: offsetRange(trailingWsRange, lineIndex)});
		}

		return {tokens, isChordLine: false};
	}

	const chordLineMarkerPattern = escapeStringRegexp(chordLineMarker);
	const textLineMarkerPattern = escapeStringRegexp(textLineMarker);

	// The tokenization loop eats the line from start to end, so we have to match each
	// inline token against the start of the string. The order of patterns matters:
	// we want to match more specific tokens first (e.g. inlineChord vs. wordOrChord).
	const inlinePatterns = {
		// line type markers at the end of the line, can be user defined, default "%t" and "%c"
		lineMarker: new RegExp(`^(?<marker>${textLineMarkerPattern}|${chordLineMarkerPattern})\\s*$`, "d"),

		// Match for @xxxx MusGlyphs notation
		notation: /^[@][^\s]+/d,

		// Match for directions
		// x2 - open with a repeat mark
		// -> - open with an arrow
		// // - open with a double-slash
		direction: /^(?<open>(x\d+|->|\/\/\s?))(?<text>.*)$/d,

		// Match for break directive: three dashes on a line on their own
		break: /^---$/d,

		// Match for quoted label using identical symbols pairs (lazy matching syntax to avoid nested quotes)
		quoted: /^(?<open>['_!$&^*+=])(?<text>[^\1]+?)(?<close>\1)/d,

		// Match for ChordPro directives as a special case of quoted token
		chordProQuoted: /^(?<open>\{[^:]+?:\s*)(?<text>[^}]+?)(?<close>})/d,

		// Match for quoted label using symmetric symbol pairs
		smartQuoted: /^(?<open>‘)(?<text>[^’]+?)(?<close>’)/d,
		curlyQuoted: /^(?<open>\{)(?<text>[^}]+?)(?<close>})/d,
		angleQuoted: /^(?<open><)(?<text>[^>]+?)(?<close>>)/d,

		// Match for embed
		embed:  /^!\[\[(?<src>[^\[|]+)(?:(?:\|(?<width>\d+))(?:x(?<height>\d+))?)?]]/d,

		// Match for inline header
		inlineHeader: /^(?<name>[^:]+)(?<close>:)/d,

		// Inline chord notation in brackets mixed with words, optional auxiliarry test, eg:
		// [Am]Some [Dm aux. text]lyrics
		inlineChord: /^(?<open>\[)(?<chordSymbol>[^\s\]]+)(?<auxText>[^[()]*)(?<close>])/d,

		// Chord symbol with custom shape definition in brackets, optionally barre position:
		// Bbadd13[x13333], Dm6[4|x2x132] (with barree position), B*[_224442_] (with barre markers).
		// Chord symbol must start with uppercase, can contain #()+-°/*
		userDefinedChord: /^(?<chordSymbol>[A-Z][A-Za-z0-9#()+-°/*]*)(?<open>\[)(?:(?<pos>[0-9]+)(?<posSep>\|))?(?<frets>[0-9x_]+)(?<close>])/d,

		// Possible rhythm markers: bar lines (|), strums (/), repeats (%), etc
		// Interpretation depends on line context.
		wordOrRhythm: /^[[\]/|%.~]+/d,

		// Any text that isn't whitespace or starting with [ could be chord symbols.
		// Exclude bar lines to allow tight spacing, but we can't exclude slash because it is valid in a chord
		// Interpretation depends on line context.
		wordOrChord: /^[^|~\s[]+/d,

		// Record whitespace so that the input can be exactly recreated in the reading
		// view markdown post processor
		whitespace: /^\s+/d,

	};


	const tokensPendingReclassification = new Map<Token, ChordInfo | "rhythm">;

	let wordTokenCount: number = 0;
	let markerValue: MarkerToken['value'] | null = null;
	let hasUserDefinedChord = false;

	let remainingLine = line;
	let pos = lineIndex;
	while (remainingLine.length > 0) {
		let match: RegExpMatchArray | null = null;
		for (const [name, pattern] of Object.entries(inlinePatterns)) {

			match = remainingLine.match(pattern);
			if (match) {
				const matchValue = match[0];
				const matchRange = match.indices![0];

				const baseToken: Pick<Token, "value" | "range"> = {
					value: matchValue,
					range: offsetRange(matchRange, pos)
				};

				switch (name) {
					case "lineMarker": {
						markerValue = matchValue;
						tokens.push({...baseToken, type: "marker"});
						break;
					}

					case "wordOrRhythm": {
						const possibleRhythmToken: Token = {
							...baseToken, type: "word"
						};

						tokensPendingReclassification.set(possibleRhythmToken, "rhythm");
						tokens.push(possibleRhythmToken);
						break;
					}

					case "inlineChord": {
						const {open: openingBracket, chordSymbol, auxText, close: closingBracket} = match.groups!;
						const {
							open: openingBracketRange, chordSymbol: chordSymbolRange,
							auxText: auxTextRange, close: closingBracketRange
						} = match.indices!.groups!;

						const chord = getChord(chordSymbol);

						if (chord.tonic) {
							const chordToken: ChordToken = {
								...baseToken,
								type: "chord",
								chord,
								chordSymbol: { value: chordSymbol, range: chordSymbolRange},
								inlineChord: {
									openingBracket: {value: openingBracket, range: openingBracketRange},
									...(auxText && {auxText: {value: auxText, range: auxTextRange}}),
									closingBracket: {value: closingBracket, range: closingBracketRange},
								}
							};
							tokens.push(chordToken);
						} else {
							// does not look like a chord, treat as word
							tokens.push({type: "word", ...baseToken});
						}
						break;
					}

					case "userDefinedChord": {
							const {
								chordSymbol, open: openingBracket, pos: position, posSep: positionSeparator,
								close: closingBracket, frets
							} = match.groups!;
							const {
								chordSymbol: chordSymbolRange, open: openingBracketRange, pos: positionRange,
								posSep: positionSeparatorRange,	close: closingBracketRange, frets: fretsRange
							} = match.indices!.groups!;

							const chordToken: ChordToken = {
								...baseToken,
								type: "chord",
								chord: {
									...getChord(chordSymbol),
									userDefinedChord: { frets, position: position ? parseInt(position) : 0}
								},
								chordSymbol: { value: chordSymbol, range: chordSymbolRange },
								userDefinedChord: {
									openingBracket: {value: openingBracket, range: openingBracketRange},
									...(position && {
										position: { value: position, range: positionRange },
										positionSeparator: { value: positionSeparator, range: positionSeparatorRange }
									}),
									frets: {value: frets, range: fretsRange},
									closingBracket: {value: closingBracket, range: closingBracketRange},
								}
							};

							tokens.push(chordToken);
							hasUserDefinedChord = true;
						break;
					}

					case "wordOrChord": {
						const resultToken: Token = {
							...baseToken, type: "word"
						};

						const chord = getChord(matchValue);
						if (chord?.tonic) {
							tokensPendingReclassification.set(resultToken, {
								chord,
								chordSymbol: { value: matchValue, range: matchRange },
							});
						}

						tokens.push(resultToken);
						wordTokenCount++;
						break;
					}

					case "notation": {
						const notationToken: NotationToken = {
							...baseToken, type: "notation"
						};
						tokens.push(notationToken);
						break;
					}
					case "break": {
						const breakToken: BreakToken = {
							...baseToken, type: "break"
						};
						tokens.push(breakToken);
						break;
					}
					case "direction": {
						const {
							open: openingQuote, text: quotedText
						} = match.groups!;
						const {
							open: openingQuoteRange, text: textRange
						} = match.indices!.groups!;

						const directionToken: DirectionToken = {
							type: "direction",
							value: matchValue,
							range: offsetRange(matchRange, pos),
							opening: { value: openingQuote, range: openingQuoteRange },
							directionText: {value: quotedText, range: textRange},
						};
						tokens.push(directionToken);
						break;
					}
					case "inlineHeader": {
						const {
							name: nameText, close: closingBracket
						} = match.groups!;
						const {
							name: nameTextRange, close: closingBracketRange
						} = match.indices!.groups!;

						const inlineHeaderToken: InlineHeaderToken = {
							type: "inlineHeader",
							value: matchValue,
							range: offsetRange(matchRange, pos),
							headerName: {value: nameText, range: nameTextRange},
							closingBracket: { value: closingBracket, range: closingBracketRange }
						};
						tokens.push(inlineHeaderToken);
						break;
					}
					case "smartQuoted":
					case "curlyQuoted":
					case "angleQuoted":
					case "chordProQuoted":
					case "quoted": {
						const {
							open: openingQuote, text: quotedText, close: closingQuote
						} = match.groups!;
						const {
							open: openingQuoteRange, text: textRange, close: closingQuoteRange
						} = match.indices!.groups!;

						const quotedToken: QuotedToken = {
							type: "quoted",
							value: matchValue,
							range: offsetRange(matchRange, pos),
							openingQuote: { value: openingQuote, range: openingQuoteRange },
							quotedText: {value: quotedText, range: textRange},
							closingQuote: { value: closingQuote, range: closingQuoteRange },
							quoteType: getTypeFromQuote(openingQuote, name),
						};
						tokens.push(quotedToken);
						break;
					}
					case "embed": {
						const {
							src: src, width: width, height: height
						} = match.groups!;

						const embedToken: EmbedToken = {
							type: "embed",
							value: matchValue,
							range: offsetRange(matchRange, pos),
							src: src,
							width: Number(width),
							height: Number(height)
						};

						tokens.push(embedToken);
						break;
					}

					case "whitespace": {
						tokens.push({...baseToken, type: "whitespace"});
						break;
					}
				}

				pos += match[0].length;
				remainingLine = remainingLine.slice(match[0].length);
				break;
			}
		}

		if (!match) {
			// The inline patterns should have covered all possible input, all characters should be matched
			// by at least wordOrChord.
			throw new Error(
				`We shouldn't be here: no token pattern match for remaining line: ${remainingLine}\n` +
				`Please report this as a bug.`
			);
		}
	}

	const isChordLine =
			markerValue === chordLineMarker || hasUserDefinedChord ? true :
			markerValue === textLineMarker ? false :
			tokensPendingReclassification.size / wordTokenCount > CHORD_LINE_PROBABILITY_THRESHOLD;

	if (isChordLine) {
		for (const [token, tokenInfo] of tokensPendingReclassification) {
			if (tokenInfo === "rhythm") {
				token.type = "rhythm";
			} else {
				Object.assign(token, {type: "chord"}, tokenInfo);
			}
		}
	}

	return {tokens, isChordLine};
}

function getTypeFromQuote(openingQuote: string, name: string) : string {
	switch (name) {
		case "chordProQuoted":
			return "chordpro";
	}

	switch (openingQuote) {
		case "^": return "plain";
		case "'": return "lyric-cue";
		case "‘": return "lyric-cue";
		case "!": return "music-cue";
		case "_": return "part-1";
		case "*": return "part-2";
		case "+": return "part-3";
		case "&": return "part-4";
		case "$": return "part-5";
		case "=": return "rule";
		case "{": return "lozenge";
		case "<": return "small";
	}
	return "unknown";
}
