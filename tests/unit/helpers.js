// Interaction points from mission1 (kept in sync manually with logic.js; logic.js imports browser-only modules).
import { PROPS, DESKS } from '../../src/missions/mission1/layout.js';
export const INTERACTABLES_POSITIONS = [
  [PROPS.whiteboard.x, 7.9], [PROPS.printer.x - 1.2, PROPS.printer.z], [PROPS.vending.x - 1.3, PROPS.vending.z],
  [PROPS.cabinet.x - 1.2, PROPS.cabinet.z], [PROPS.lectern.x + 1.1, PROPS.lectern.z], [PROPS.coffee.x, PROPS.coffee.z - 1.2],
  ...DESKS.map((d) => [d.x + 1.05, d.z]),
];
