import {ChordToken, isChordToken, RhythmToken, tokenizeLine} from '../src/chordsUtils';

describe('tokenizeLine', () => {
	const chordLineMarker = '%c';
	const textLineMarker = '%t';
	const lineIndex = 0;

	describe('basic token types', () => {
		test('should tokenize words and whitespace', () => {
			const line = 'Hello world';
			const result = tokenizeLine(line, lineIndex, chordLineMarker, textLineMarker);

			expect(result).toEqual({
				tokens: [
					{
						type: 'word',
						value: 'Hello',
						index: [0, 5]
					},
					{
						type: 'whitespace',
						value: ' ',
						index: [5, 6]
					},
					{
						type: 'word',
						value: 'world',
						index: [6, 11]
					}
				],
				isChordLine: false
			});
		});

		test('should identify chord line markers', () => {
			const line = 'Am G F %c';
			const { tokens } = tokenizeLine(line, lineIndex, chordLineMarker, textLineMarker);

			expect(tokens).toHaveLength(7);
			expect(tokens[6]).toEqual({
				type: 'marker',
				value: '%c',
				index: [7, 9]
			});
		});


		test('should identify text line markers', () => {
			const line = 'Lyrics here %t';
			const { tokens } = tokenizeLine(line, lineIndex, chordLineMarker, textLineMarker);

			expect(tokens[tokens.length - 1]).toEqual({
				type: 'marker',
				value: '%t',
				index: [12, 14]
			});
		});
	});


	describe('chord detection', () => {
		test('should handle basic chords', () => {
			const line = 'Am C G D';
			const { tokens } = tokenizeLine(line, lineIndex, chordLineMarker, textLineMarker);

			expect(tokens).toHaveLength(7);
			const chordTokens = tokens.filter(t => isChordToken(t)) as ChordToken[];

			expect(chordTokens).toHaveLength(4);

			expect(chordTokens[0].chord.tonic).toBe('A');
			expect(chordTokens[0].chord.type).toBe('minor');
			expect(chordTokens[0].chord.bass).toBe(null);

			expect(chordTokens[1].chord.tonic).toBe('C');
			expect(chordTokens[1].chord.type).toBe('major');
			expect(chordTokens[1].chord.bass).toBe(null);

			expect(chordTokens[2].chord.tonic).toBe('G');
			expect(chordTokens[3].chord.tonic).toBe('D');

			chordTokens.filter(t => t.type === 'chord').forEach((token) => {
				expect(token.index).toEqual([line.indexOf(token.value), line.indexOf(token.value) + token.value.length]);
				expect(token.chordSymbolIndex).toEqual([0, token.chordSymbol.length]);
			});
		});

		test('should handle complex chords', () => {
			const line = 'Cmaj7 Dm7b5 G7sus4';
			const { tokens } = tokenizeLine(line, lineIndex, chordLineMarker, textLineMarker);

			expect(tokens).toHaveLength(5);
			const chordTokens = tokens.filter(t => isChordToken(t)) as ChordToken[];

			expect(chordTokens).toEqual([
					{
						type: 'chord',
						value: 'Cmaj7',
						index: [0, 5],
						chord: {
							tonic: 'C',
							type: 'major seventh',
							typeAliases: expect.any(Array),  // This array comes from tonal.js, we can't predict exact values
							bass: null
						},
						chordSymbol: 'Cmaj7',
						chordSymbolIndex: [0, 5]
					},
					{
						type: 'chord',
						value: 'Dm7b5',
						index: [6, 11],
						chord: {
							tonic: 'D',
							type: 'half-diminished',
							typeAliases: expect.any(Array),
							bass: null
						},
						chordSymbol: 'Dm7b5',
						chordSymbolIndex: [0, 5]
					},
					{
						type: 'chord',
						value: 'G7sus4',
						index: [12, 18],
						chord: {
							tonic: 'G',
							type: 'suspended fourth seventh',
							typeAliases: expect.any(Array),
							bass: null
						},
						chordSymbol: 'G7sus4',
						chordSymbolIndex: [0, 6]
					}
				]
			);
		});

		test('should handle slash/bass chords', () => {
			const line = 'C/G Am/F Dm7/C';
			const { tokens } = tokenizeLine(line, lineIndex, chordLineMarker, textLineMarker);

			expect(tokens).toHaveLength(5);
			const chordTokens = tokens.filter(t => isChordToken(t)) as ChordToken[];

			expect(chordTokens).toMatchObject([
					{
						index: [0, 3],
						chord: {
							tonic: 'C',
							type: 'major',
							typeAliases: expect.any(Array),
							bass: 'G'
						},
						chordSymbol: 'C/G',
						chordSymbolIndex: [0, 3]
					},
					{
						index: [4, 8],
						chord: {
							tonic: 'A',
							type: 'minor',
							typeAliases: expect.any(Array),
							bass: 'F'
						},
						chordSymbol: 'Am/F',
						chordSymbolIndex: [0, 4]
					},
					{
						index: [9, 14],
						chord: {
							tonic: 'D',
							type: 'minor seventh',
							typeAliases: expect.any(Array),
							bass: 'C'
						},
						chordSymbol: 'Dm7/C',
						chordSymbolIndex: [0, 5]
					}
					]);
		});

		test('should handle inline chords', () => {
			const line = 'The [C#/D#] Eastern world, it [F# spec.] is ex-[G#7  ]plodin\'';
			const result = tokenizeLine(line, lineIndex, chordLineMarker, textLineMarker);

			const tokens = result.tokens;
			expect(result.isChordLine).toBe(false);

			const chordTokens = tokens.filter(t => t.type === 'chord');
			expect(chordTokens).toHaveLength(3);

			expect(chordTokens[0]).toMatchObject({
				value: '[C#/D#]',
				chord: {
					tonic: 'C#',
					type: 'major',
					bass: 'D#'
				},
				chordSymbol: 'C#/D#',
				chordSymbolIndex: [1, 6],
				startTag: { value: '[', index: [0, 1] },
				endTag: { value: ']', index: [6, 7] }
			});

			expect(chordTokens[1]).toMatchObject({
				value: '[F# spec.]',
				chord: {
					tonic: 'F#',
					type: 'major',
					bass: null
				},
				chordSymbol: 'F#',
				chordSymbolIndex: [ 1, 3 ],
				startTag: { value: '[', index: [ 0, 1 ] },
				endTag: { value: ']', index: [ 9, 10 ] },
				auxText: { value: ' spec.', index: [ 3, 9 ] }
			});

			expect(chordTokens[2]).toMatchObject({
				value: '[G#7  ]',
				index: [ 47, 54 ],
				chord: {
					tonic: 'G#',
					type: 'dominant seventh'
				},
				chordSymbol: 'G#7',
				auxText: { value: '  ', index: [ 4, 6 ] },
			});


			const wordTokens = tokens.filter(t => t.type === 'word');
			expect(wordTokens).toHaveLength(7);
			expect(wordTokens.map(t => t.value)).toEqual(['The', 'Eastern', 'world,', 'it', 'is', 'ex-', 'plodin\'']);

		});

		test('should handle user-defined chords', () => {
			const line = 'Some Am[x02210] user-defined C*4[3|x32010] chords C°[x34_24_]';
			const { tokens } = tokenizeLine(line, lineIndex, chordLineMarker, textLineMarker);

			const chordTokens = tokens.filter(t => isChordToken(t)) as ChordToken[];
			expect(chordTokens[0]).toMatchObject({
				index: [5, 15],
				chord: {
					userDefinedChord: {
						"frets": "x02210",
						"position": 0,
					},
				},
				chordSymbol: "Am",
				chordSymbolIndex: [0, 2],
			});

			expect(chordTokens[1]).toMatchObject({
				index: [29, 42],
				chord: {
					userDefinedChord: {
						frets: 'x32010',
						position: 3
					}
				},
				chordSymbol: "C*4",
				chordSymbolIndex: [0, 3],
			});

			expect(chordTokens[2]).toMatchObject({
				index: [50, 61],
				chord: {
					userDefinedChord: {
						frets: 'x34_24_',
						position: 0
					}
				},
				chordSymbol: "C°",
				chordSymbolIndex: [0, 2],
			});
		});
	});

	describe('headers', () => {
		describe('valid headers', () => {
			test('basic header with no spaces', () => {
				const line = '[Verse 1]';
				const result = tokenizeLine(line, lineIndex, chordLineMarker, textLineMarker);

				expect(result).toMatchObject({
					isChordLine: false,
					tokens: [{
						value: '[Verse 1]',
						index: [0, 9],
						startTag: '[',
						endTag: ']',
						headerName: 'Verse 1',
						startTagIndex: [0, 1],
						headerNameIndex: [1, 8],
						endTagIndex: [8, 9]
					}]
				});
			});

			test('header with surrounding whitespace', () => {
				const line = '  [Chorus]  ';
				const result = tokenizeLine(line, lineIndex, chordLineMarker, textLineMarker);

				expect(result.tokens).toHaveLength(3);
				expect(result.tokens[1]).toMatchObject({
					value: '[Chorus]',
					headerName: 'Chorus',
					startTag: '[',
					endTag: ']',
					index: [2, 10],
					startTagIndex: [0, 1],
					headerNameIndex: [1, 7],
					endTagIndex: [7, 8]
				});
			});

			test('header with special characters', () => {
				const line = '[Bridge #2 (alternate)]';
				const result = tokenizeLine(line, lineIndex, chordLineMarker, textLineMarker);

				expect(result.tokens[0]).toMatchObject({
					type: 'header',
					headerName: 'Bridge #2 (alternate)',
					startTag: '[',
					endTag: ']'
				});
			});

			test('header with opening bracket in content', () => {
				const line = '[Verse [1]';
				const result = tokenizeLine(line, lineIndex, chordLineMarker, textLineMarker);

				expect(result.tokens[0]).toMatchObject({
					type: 'header',
					headerName: 'Verse [1',
					startTag: '[',
					endTag: ']'
				});
			});
		});

		describe('invalid headers', () => {
			test('header in middle of line', () => {
				const line = 'Hello [Verse 1] there';
				const result = tokenizeLine(line, lineIndex, chordLineMarker, textLineMarker);

				const headerTokens = result.tokens.filter(t => t.type === 'header');
				expect(headerTokens).toHaveLength(0);
			});

			test('unclosed header', () => {
				const line = '[Verse 1';
				const result = tokenizeLine(line, lineIndex, chordLineMarker, textLineMarker);

				const headerTokens = result.tokens.filter(t => t.type === 'header');
				expect(headerTokens).toHaveLength(0);
			});

			test('multiple headers on one line', () => {
				const line = '[Verse 1][Chorus]';
				const result = tokenizeLine(line, lineIndex, chordLineMarker, textLineMarker);

				const headerTokens = result.tokens.filter(t => t.type === 'header');
				expect(headerTokens).toHaveLength(0);
			});

			test('empty header', () => {
				const line = '[]';
				const result = tokenizeLine(line, lineIndex, chordLineMarker, textLineMarker);

				const headerTokens = result.tokens.filter(t => t.type === 'header');
				expect(headerTokens).toHaveLength(0);
			});

			// TODO just brackets with whitespace shouldn't be detected as header
			// test('just brackets with whitespace', () => {
			// 	const line = '[   ]';
			// 	const result = tokenizeLine(line, lineIndex, chordLineMarker, textLineMarker);
			//
			// 	const headerTokens = result.tokens.filter(t => t.type === 'header');
			// 	expect(headerTokens).toHaveLength(0);
			// });
		});
	});

	describe('rhythm patterns', () => {
		test('rhythm patterns with whitespace', () => {
			const line = '| / /  |    %    |';
			const { tokens } = tokenizeLine(line, lineIndex, chordLineMarker, textLineMarker);
			const rythmTokens = tokens.filter(t => t.type === 'rhythm') as RhythmToken[];
			expect(rythmTokens).toHaveLength(6);
			expect(rythmTokens).toMatchObject([
				{ value: '|', index: [0, 1] },
				{ value: '/', index: [2, 3] },
				{ value: '/', index: [4, 5] },
				{ value: '|', index: [7, 8] },
				{ value: '%', index: [12, 13] },
				{ value: '|', index: [17, 18] }
			]);
		});

		test('rhythm patterns with chords', () => {
			const line = '| G / / / | Am / C /  |    %    |';
			const tokens = tokenizeLine(line, lineIndex, chordLineMarker, textLineMarker)
							.tokens
							.filter(t => t.type !== 'whitespace');

			expect(tokens).toHaveLength(13);
			expect(tokens).toMatchObject([
				{ type: 'rhythm', value: '|' },
				{ type: 'chord', value: 'G' },
				{ type: 'rhythm', value: '/' },
				{ type: 'rhythm', value: '/' },
				{ type: 'rhythm', value: '/' },
				{ type: 'rhythm', value: '|' },
				{ type: 'chord', value: 'Am' },
				{ type: 'rhythm', value: '/' },
				{ type: 'chord', value: 'C' },
				{ type: 'rhythm', value: '/' },
				{ type: 'rhythm', value: '|' },
				{ type: 'rhythm', value: '%' },
				{ type: 'rhythm', value: '|' }
			]);
		});

		test('rhythm patterns with chords and words', () => {
			const line = '| G / Am once | F repeat /  % to coda';
			const tokens = tokenizeLine(line, lineIndex, chordLineMarker, textLineMarker)
				.tokens
				.filter(t => t.type !== 'whitespace');

			expect(tokens).toHaveLength(12);
			expect(tokens).toMatchObject([
				{ type: 'rhythm', value: '|' },
				{ type: 'chord', value: 'G' },
				{ type: 'rhythm', value: '/' },
				{ type: 'chord', value: 'Am' },
				{ type: 'word', value: 'once' },
				{ type: 'rhythm', value: '|' },
				{ type: 'chord', value: 'F' },
				{ type: 'word', value: 'repeat' },
				{ type: 'rhythm', value: '/' },
				{ type: 'rhythm', value: '%' },
				{ type: 'word', value: 'to' },
				{ type: 'word', value: 'coda' }
			]);
		});

		test('text with forward slashes should not be rhythm', () => {
			const line = 'look at this/that thing';
			const result = tokenizeLine(line, lineIndex, chordLineMarker, textLineMarker);

			expect(result.tokens.filter(t => t.type === 'rhythm')).toHaveLength(0);
		});
	});

	describe('should detect chord line / text lines', () => {
		test('should detect chord line', () => {
			let result = tokenizeLine("A", lineIndex, chordLineMarker, textLineMarker);
			expect(result.tokens.filter(t => t.type === 'chord')).toHaveLength(1);

			result = tokenizeLine("A bla", lineIndex, chordLineMarker, textLineMarker);
			expect(result.tokens.filter(t => t.type === 'chord')).toHaveLength(0);

			result = tokenizeLine("A bla C", lineIndex, chordLineMarker, textLineMarker);
			expect(result.tokens.filter(t => t.type === 'chord')).toHaveLength(2);

			result = tokenizeLine("Am G F (comment that breaks chord detection) C", lineIndex, chordLineMarker,
				textLineMarker);
			expect(result.tokens.filter(t => t.type === 'chord')).toHaveLength(0);

			result = tokenizeLine("A Ana e a Ema estão a comer e a beber em casa", lineIndex, chordLineMarker,
				textLineMarker);
			expect(result.tokens.filter(t => t.type === 'chord')).toHaveLength(7);
		});

		test('should detect chord line with chord line marker', () => {
			let result = tokenizeLine("Am G F (comment that breaks chord detection) C %c", lineIndex, chordLineMarker,
				textLineMarker);
			expect(result.tokens.filter(t => t.type === 'chord')).toHaveLength(4);

			result = tokenizeLine("Am G F (comment that breaks chord detection) C [chords!]", lineIndex, "[chords!]",
				"[text!]");
			expect(result.tokens.filter(t => t.type === 'chord')).toHaveLength(4);
		});

		test('should detect text line with text line marker', () => {
			let result = tokenizeLine("A Ana e a Ema estão a comer e a beber em casa %t", lineIndex, chordLineMarker,
				textLineMarker);
			expect(result.tokens.filter(t => t.type === 'chord')).toHaveLength(0);

			result = tokenizeLine("A Ana e a Ema estão a comer e a beber em casa [text!]", lineIndex, "[chords!]",
				"[text!]");
			expect(result.tokens.filter(t => t.type === 'chord')).toHaveLength(0);
		});
	});

	describe('edge cases', () => {
		test('should handle empty lines', () => {
			const line = '';
			const {tokens, isChordLine} = tokenizeLine(line, lineIndex, chordLineMarker, textLineMarker);

			expect(tokens).toHaveLength(0);
			expect(isChordLine).toBe(false);
		});

		test('should handle lines with only whitespace', () => {
			const line = '    ';
			const {tokens, isChordLine} = tokenizeLine(line, lineIndex, chordLineMarker, textLineMarker);

			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe('whitespace');
			expect(isChordLine).toBe(false);
		});
	});
});
