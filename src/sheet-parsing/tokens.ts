import {SheetChord} from "../chordsUtils";

export interface Token {
	type: 'word' | 'chord' | 'whitespace' | 'marker' | 'header' | 'rhythm' | 'notation' | 'quoted' | 'inlineHeader' | 'embed' | 'direction' | 'break';
	value: string;
	range: [start: number, end: number];
}

interface SubToken {
	value: string;
	range: [start: number, end: number];
}

export interface ChordInfo {
	chord: SheetChord
	chordSymbol: SubToken

	inlineChord?: {
		openingBracket: SubToken
		auxText?: SubToken
		closingBracket: SubToken
	}

	userDefinedChord?: {
		openingBracket: SubToken
		closingBracket: SubToken
		position?: SubToken
		positionSeparator?: SubToken
		frets: SubToken
	}
}

export type ChordToken = Token & ChordInfo & {
	type: "chord"
};
export type RhythmToken = Token & {
	type: "rhythm"
};

export interface MarkerToken extends Token {
	type: 'marker',
}
export interface NotationToken extends Token {
	type: 'notation',
}
export interface QuotedToken extends Token {
	type: 'quoted'
	openingQuote: SubToken
	quotedText: SubToken
	closingQuote: SubToken
}
export interface EmbedToken extends Token {
	type: 'embed'
	src: string
	width: number
	height: number
}
export interface BreakToken extends Token {
	type: 'break'
}
export interface InlineHeaderToken extends Token {
	type: 'inlineHeader'
	headerName: SubToken
	closingBracket: SubToken
}

export interface HeaderToken extends Token {
	type: 'header'
	openingBracket: SubToken
	headerName: SubToken
	closingBracket: SubToken
}

export interface DirectionToken extends Token {
	type: 'direction'
	opening: SubToken
	directionText: SubToken
}
export interface TokenizedLine {
	tokens: Token[]
	isChordLine: boolean
}

export function isChordToken(token: Token | null | undefined): token is ChordToken {
	return token?.type === 'chord' && 'chord' in token;
}

export function isRhythmToken(token: Token | null | undefined): token is RhythmToken {
	return token?.type === 'rhythm';
}

export function isNotationToken(token: Token | null | undefined): token is NotationToken {
	return !!token && token.type === 'notation';
}
export function isQuotedToken(token: Token | null | undefined): token is QuotedToken {
	return !!token && token.type === 'quoted';
}
export function isInlineHeaderToken(token: Token | null | undefined): token is InlineHeaderToken {
	return !!token && token.type === 'inlineHeader';
}
export function isEmbedToken(token: Token | null | undefined): token is EmbedToken {
	return !!token && token.type === 'embed';
}
export function isBreakToken(token: Token | null | undefined): token is BreakToken {
	return !!token && token.type === 'break';
}
export function isMarkerToken(token: Token | null | undefined): token is MarkerToken {
	return !!token && token.type === 'marker';
}

export function isHeaderToken(token: Token | null | undefined): token is HeaderToken {
	return !!token && token.type === 'header';
}
export function isDirectionToken(token: Token | null | undefined): token is DirectionToken {
	return !!token && token.type === 'direction';
}
