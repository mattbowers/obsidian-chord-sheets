import {Instrument, InstrumentRenderer} from "./types";
import {FretDiagramRenderer} from "./fretRenderer";

const instrumentRenderers: Record<Instrument, InstrumentRenderer> = {
	"guitar": new FretDiagramRenderer("guitar", "Guitar"),
	"ukulele": new FretDiagramRenderer("ukulele", "Ukulele"),
	"ukulele-d-tuning": new FretDiagramRenderer("ukulele-d-tuning","Ukulele (D tuning)"),
	"ukulele-baritone": new FretDiagramRenderer("ukulele-baritone", "Ukulele (Baritone)"),
	"mandolin": new FretDiagramRenderer("mandolin", "Mandolin"),
};

export function getRenderer(instrument: Instrument): InstrumentRenderer {
	return instrumentRenderers[instrument];
}

export const instruments = Object.keys(instrumentRenderers) as Instrument[];
export const instrumentLabels = Object.fromEntries(
	instruments.map(id => [id, getRenderer(id).label])
) as Record<Instrument, string>;

export function isInstrument(s: string): s is Instrument {
	return Object.hasOwn(instrumentRenderers, s);
}

