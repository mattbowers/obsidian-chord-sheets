import {IChordsDB} from "@tombatossals/chords-db";
import {SheetChord} from "../chordsUtils";

export type Instrument = keyof IChordsDB;

export interface ChordDiagram {
	readonly numVoicings: number;
	render(index: number, width: number): HTMLDivElement;
}

export interface InstrumentRenderer {
	readonly instrument: Instrument;
	readonly label: string;

	getDiagram(chord: SheetChord): ChordDiagram | null;
	renderMissing(width: number): HTMLDivElement;
}

