import {SheetChord} from "../chordsUtils";

export interface Token {
	type: 'word' | 'chord' | 'whitespace' | 'marker' | 'header' | 'rhythm' | 'notation' | 'label' | 'section' | 'property' | 'embed' ;
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
		trailingText?: SubToken
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
export interface LabelToken extends Token {
	type: 'label'
	labelType: string
	openingQuote: SubToken
	labelText: SubToken
	closingQuote: SubToken
}
export interface EmbedToken extends Token {
	type: 'embed'
	src: string
	width: number
	height: number
}
export interface PropertyToken extends Token {
	type: 'property'
	propertyTag: SubToken
	propertyName: string
	propertyValue: SubToken
}
export interface SectionToken extends Token {
	type: 'section',
}

export interface HeaderToken extends Token {
	type: 'header'
	openingBracket: SubToken
	headerName: SubToken
	closingBracket: SubToken
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
export function isLabelToken(token: Token | null | undefined): token is LabelToken {
	return !!token && token.type === 'label';
}
export function isSectionToken(token: Token | null | undefined): token is SectionToken {
	return !!token && token.type === 'section';
}
export function isPropertyToken(token: Token | null | undefined): token is PropertyToken {
	return !!token && token.type === 'property';
}
export function isEmbedToken(token: Token | null | undefined): token is EmbedToken {
	return !!token && token.type === 'embed';
}

export function isMarkerToken(token: Token | null | undefined): token is MarkerToken {
	return !!token && token.type === 'marker';
}

export function isHeaderToken(token: Token | null | undefined): token is HeaderToken {
	return !!token && token.type === 'header';
}
