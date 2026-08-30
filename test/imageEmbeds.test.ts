import {
	formatEmbed,
	parseEmbed,
	stripEmbedSize,
	withEmbedWidthPercent
} from "../src/imageEmbeds";

describe('imageEmbeds', () => {
	describe('parseEmbed', () => {
		test('plain embed', () => {
			expect(parseEmbed('![[image.png]]')).toEqual({
				src: 'image.png', width: 0, widthUnit: 'px', height: 0
			});
		});

		test('pixel width', () => {
			expect(parseEmbed('![[image.png|300]]')).toEqual({
				src: 'image.png', width: 300, widthUnit: 'px', height: 0
			});
		});

		test('pixel width and height', () => {
			expect(parseEmbed('![[image.png|300x200]]')).toEqual({
				src: 'image.png', width: 300, widthUnit: 'px', height: 200
			});
		});

		test('percentage width', () => {
			expect(parseEmbed('![[image.png|50%]]')).toEqual({
				src: 'image.png', width: 50, widthUnit: '%', height: 0
			});
		});

		test('surrounding whitespace is tolerated', () => {
			expect(parseEmbed('  ![[image.png|50%]]  ')?.width).toBe(50);
		});

		test('non-embed text returns null', () => {
			expect(parseEmbed('not an embed')).toBeNull();
			expect(parseEmbed('![alt](image.png)')).toBeNull();
		});
	});

	describe('formatEmbed', () => {
		test('round-trips each form', () => {
			for (const text of ['![[a.png]]', '![[a.png|300]]', '![[a.png|300x200]]', '![[a.png|50%]]']) {
				expect(formatEmbed(parseEmbed(text)!)).toBe(text);
			}
		});

		test('drops a zero/negative width', () => {
			expect(formatEmbed({src: 'a.png', width: 0, widthUnit: '%', height: 0})).toBe('![[a.png]]');
		});
	});

	describe('withEmbedWidthPercent', () => {
		test('adds a percentage width', () => {
			expect(withEmbedWidthPercent('![[a.png]]', 40)).toBe('![[a.png|40%]]');
		});

		test('replaces an existing pixel width', () => {
			expect(withEmbedWidthPercent('![[a.png|300]]', 40)).toBe('![[a.png|40%]]');
		});

		test('replaces an existing percentage width and rounds', () => {
			expect(withEmbedWidthPercent('![[a.png|50%]]', 33.6)).toBe('![[a.png|34%]]');
		});

		test('leaves non-embed text untouched', () => {
			expect(withEmbedWidthPercent('plain text', 40)).toBe('plain text');
		});
	});

	describe('stripEmbedSize', () => {
		test('removes any size spec', () => {
			expect(stripEmbedSize('![[a.png|50%]]')).toBe('![[a.png]]');
			expect(stripEmbedSize('![[a.png|300x200]]')).toBe('![[a.png]]');
			expect(stripEmbedSize('![[a.png]]')).toBe('![[a.png]]');
		});
	});
});
