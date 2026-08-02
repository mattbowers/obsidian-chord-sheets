// Some utils useful for debugging I'm leaving in for now

import {gutter, GutterMarker, hoverTooltip, tooltips} from "@codemirror/view";
import {chordBlocksStateField} from "./chordBlocksStateField";
import {RangeSetBuilder} from "@codemirror/state";

class ChordSheetDebugMarker extends GutterMarker {
	constructor(private cls: string) {
		super();
	}

	toDOM() {
		return createDiv({cls: this.cls, text: this.cls});
	}
}

export const debugExtensions = [
	hoverTooltip((_view, pos, _side) => {
		return {
			pos,
			above: true,
			create() {
				return {dom: createDiv({text: `${pos}`})};
			}
		};
	}, {hoverTime: 0}),
	tooltips({position: "absolute"}),
	gutter({
		class: "cm-mygutter",
		markers: v => {
			const builder = new RangeSetBuilder<ChordSheetDebugMarker>();
			const iter = v.state.field(chordBlocksStateField).ranges.iter(0);
			while (iter.value) {
				builder.add(iter.from, iter.to, new ChordSheetDebugMarker("S"));
				const endLine = v.state.doc.lineAt(iter.to);
				builder.add(endLine.from, endLine.from, new ChordSheetDebugMarker("E"));
				iter.next();
			}


			return builder.finish();
		}
	})
];
