// Small helpers to keep level files readable.
export const rect = (x, y, w, h, mat, r = 0) => ({ t: 'rect', x, y, w, h, mat, r });
export const poly = (pts, mat) => ({ t: 'poly', pts, mat });
export const ell = (x, y, rx, ry, mat) => ({ t: 'ellipse', x, y, rx, ry, mat });
export const hole = (x, y, w, h) => ({ t: 'rect', x, y, w, h, erase: true });
// side walls so penguins bounce at the screen edges
export const walls = (mat) => [rect(0, 0, 36, 960, mat), rect(1884, 0, 36, 960, mat)];
export const spikes = (x, y, w, h = 30) => ({ t: 'spikes', x, y, w, h });
export const coinRow = (x, y, n, dx = 60, dy = 0) => Array.from({ length: n }, (_, i) => ({ x: x + i * dx, y: y + i * dy }));
