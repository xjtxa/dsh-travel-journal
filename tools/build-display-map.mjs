// Build-time only. Creates one shared display topology, never edits geocoding data.
// Install the pinned tool outside the plugin:
//   npm install --prefix work/map-topology-build --save-exact --ignore-scripts mapshaper@0.7.101
// Run from any directory:
//   node tools/build-display-map.mjs --source original-ADM3.geojson --codes codes-2024.txt --mapshaper-dir path/to/work/map-topology-build
// Optional: --interval 150 (metres), --schematic-area 50 (km²; 0 disables),
//   --output-dir path/to/data/geo
// Mapshaper API/commands: https://mapshaper.org/docs/guides/programmatic.html
// https://mapshaper.org/docs/reference.html
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const VERSION = '0.7.101';
const SOURCE_SHA256 = 'ea64fe24f193e319ce48895f229a5b3f46d2a60f3f3df67e6172ab037e4cc8fd';
const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i], process.argv[i + 1]);
for (const name of ['--source', '--codes', '--mapshaper-dir']) if (!args.get(name)) throw new Error('Missing ' + name);
const interval = Number(args.get('--interval') || 150);
if (!Number.isFinite(interval) || interval < 1 || interval > 500) throw new Error('Interval must be 1–500 metres');
const schematicArea = Number(args.get('--schematic-area') ?? 50);
if (!Number.isFinite(schematicArea) || schematicArea < 0 || schematicArea > 500) throw new Error('Schematic area must be 0–500 km²');
const root = args.get('--output-dir') ? resolve(args.get('--output-dir')) : fileURLToPath(new URL('../data/geo/', import.meta.url));
const requireBuild = createRequire(resolve(args.get('--mapshaper-dir'), 'package.json'));
if (requireBuild('mapshaper/package.json').version !== VERSION) throw new Error('Use pinned mapshaper@' + VERSION);
const mapshaper = requireBuild('mapshaper');
const sha = data => createHash('sha256').update(data).digest('hex');
const sourceBytes = await readFile(args.get('--source'));
if (sha(sourceBytes) !== SOURCE_SHA256) throw new Error('Unreviewed ADM3 source hash');
const codeBytes = await readFile(args.get('--codes'));
const codes = new Map(String(codeBytes).split(/\r?\n/).filter(Boolean).map(line => { const [code, ...name] = line.trim().split(/\s+/); return [code, name.join(' ')]; }));
const readJSON = async name => JSON.parse(await readFile(resolve(root, name), 'utf8'));
const [countyFacts, cityFacts, provinceFacts] = await Promise.all(['counties.json', 'cities.json', 'provinces.json'].map(readJSON));
const source = JSON.parse(sourceBytes);
const byId = new Map(source.features.map(feature => [feature.properties.shapeID, feature]));
const cityRegistry = new Map(cityFacts.map(city => [city.p + ':' + city.n, city]));
const provinceRegistry = new Map(provinceFacts.map(province => [province.n, province]));
const factsByProvince = new Map(provinceFacts.map(province => [province.p, province.g.slice(0, 2)]));
const sourceGeometry = p2 => ({ type: 'MultiPolygon', coordinates: p2.map(polygon => polygon.map(ring => Array.from({ length: ring.length / 2 }, (_, i) => [ring[i * 2], ring[i * 2 + 1]]))) });
const fallbackCities = [];
const units = countyFacts.map(({ p2, b, ...properties }) => {
  const original = byId.get(properties.s);
  if (!original || !properties.n || !properties.p || !properties.c) throw new Error('Missing reviewed county identity: ' + properties.s);
  return { type: 'Feature', properties: { ...properties, codeLevel: properties.codeLevel || 'county', countyUnavailable: false }, geometry: original.geometry };
});
// Taiwan has no ADM3 source coverage. Use its disjoint OCHA shape once, and
// derive both upper levels from it; never invent Taiwan county boundaries.
const taiwan = cityFacts.find(city => city.g === '710000');
if (!taiwan) throw new Error('Missing reviewed Taiwan reference');
units.push({ type: 'Feature', properties: { n: taiwan.n, c: taiwan.n, p: taiwan.p, g: taiwan.g, s: taiwan.s, countyUnavailable: true }, geometry: sourceGeometry(taiwan.p2) });

const prepareCommand = `-i units.geojson name=units -clean gap-width=0 overlap-rule=min-area `
  + `-simplify dp interval=${interval}m keep-shapes stats `
  + '-clean gap-width=0 overlap-rule=min-area '
  + '-dissolve p,c target=units no-repair copy-fields=p,c + name=cities '
  + '-dissolve p target=units no-repair copy-fields=p + name=provinces '
  + '-o target=units,cities,provinces format=topojson no-quantization prepared.json';
const preparedOutput = await mapshaper.applyCommands(prepareCommand, { 'units.geojson': { type: 'FeatureCollection', features: units } });
const prepared = JSON.parse(preparedOutput['prepared.json']);
const arcId = id => id < 0 ? ~id : id;
const polygonIds = geometry => geometry.type === 'Polygon' ? [geometry.arcs] : geometry.arcs;
const preparedRing = ids => ids.flatMap((id, index) => {
  const arc = id < 0 ? [...prepared.arcs[~id]].reverse() : prepared.arcs[id];
  return index ? arc.slice(1) : arc;
});
// Spherical display area, not an administrative or cadastral area estimate.
const ringAreaKm2 = ring => {
  let sum = 0;
  const rad = Math.PI / 180;
  for (let i = 1; i < ring.length; i++) sum += (ring[i][0] - ring[i - 1][0]) * rad * (Math.sin(ring[i][1] * rad) + Math.sin(ring[i - 1][1] * rad));
  return Math.abs(sum) * 6371008.8 ** 2 / 2e6;
};
const coordinateBounds = points => points.reduce((b, point) => [Math.min(b[0], point[0]), Math.min(b[1], point[1]), Math.max(b[2], point[0]), Math.max(b[3], point[1])], [Infinity, Infinity, -Infinity, -Infinity]);
function coordinateRingContains(ring, [x, y]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}
const polygonContains = (polygon, point) => coordinateRingContains(polygon[0], point) && !polygon.slice(1).some(ring => coordinateRingContains(ring, point));
function interiorPoint(polygon) {
  const b = coordinateBounds(polygon[0]);
  let best = null, span = 0;
  for (const fraction of [0.5, 0.25, 0.75, 0.1, 0.9]) {
    const y = b[1] + (b[3] - b[1]) * fraction, crossings = [];
    for (const ring of polygon) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[i], c = ring[j];
      if ((a[1] > y) !== (c[1] > y)) crossings.push(a[0] + (y - a[1]) * (c[0] - a[0]) / (c[1] - a[1]));
    }
    crossings.sort((a, b) => a - b);
    for (let i = 0; i + 1 < crossings.length; i += 2) if (crossings[i + 1] - crossings[i] > span) {
      span = crossings[i + 1] - crossings[i]; best = [(crossings[i] + crossings[i + 1]) / 2, y];
    }
  }
  if (!best || !polygonContains(polygon, best)) throw new Error('Cannot find a protected component interior point');
  return best;
}
const unitArcUsers = new Map();
for (const geometry of prepared.objects.units.geometries) for (const id of new Set(geometry.arcs.flat(Infinity).map(arcId))) {
  if (!unitArcUsers.has(id)) unitArcUsers.set(id, new Set());
  unitArcUsers.get(id).add(geometry.properties.s);
}
const componentsOf = geometry => polygonIds(geometry).map((ids, index) => {
  const coordinates = ids.map(preparedRing), areaKm2 = ringAreaKm2(coordinates[0]) - coordinates.slice(1).reduce((sum, ring) => sum + ringAreaKm2(ring), 0);
  return { index, ids, coordinates, areaKm2, point: interiorPoint(coordinates) };
});
const protectedRegions = new Set(['香港特别行政区', '澳门特别行政区', '台湾省']);
const preparedUnits = prepared.objects.units.geometries.map(geometry => {
  const components = componentsOf(geometry), largest = components.reduce((best, part) => part.areaKm2 > best.areaKm2 ? part : best);
  return { geometry, components, largest };
});
const selected = new Set(), skipped = { protectedRegion: 0, primaryComponent: 0, nestedComponent: 0, coastalComponent: 0, parentPrimaryComponent: 0, combinedGapTooLarge: 0 };
for (const unit of preparedUnits) for (const part of unit.components) {
  if (part.areaKm2 > schematicArea || schematicArea === 0) continue;
  const properties = unit.geometry.properties;
  if (protectedRegions.has(properties.p)) { skipped.protectedRegion++; continue; }
  if (part === unit.largest) { skipped.primaryComponent++; continue; }
  if (part.ids.length !== 1) { skipped.nestedComponent++; continue; }
  if (!part.ids[0].every(id => unitArcUsers.get(arcId(id))?.size === 2)) { skipped.coastalComponent++; continue; }
  selected.add(properties.s + ':' + part.index);
}
// County primary components are always kept. Also retain an upper-level primary
// component if it consists entirely of otherwise removable county fragments.
for (const level of ['cities', 'provinces']) for (const parent of prepared.objects[level].geometries) {
  const components = componentsOf(parent), largest = components.reduce((best, part) => part.areaKm2 > best.areaKm2 ? part : best);
  const members = preparedUnits.filter(unit => unit.geometry.properties.p === parent.properties.p && (level === 'provinces' || unit.geometry.properties.c === parent.properties.c))
    .flatMap(unit => unit.components.filter(part => polygonContains(largest.coordinates, part.point)).map(part => ({ key: unit.geometry.properties.s + ':' + part.index, part })));
  if (members.length && members.every(member => selected.has(member.key))) for (const member of members) {
    selected.delete(member.key); skipped.parentPrimaryComponent++;
  }
}
// Neighbouring removed fragments become one gap. Keep a connected group if its
// combined area would exceed the same fill threshold and leave a larger hole.
const componentByKey = new Map(preparedUnits.flatMap(unit => unit.components.map(part => [unit.geometry.properties.s + ':' + part.index, part])));
const leader = new Map([...selected].map(key => [key, key]));
const findLeader = key => { let next = key; while (leader.get(next) !== next) next = leader.get(next); return next; };
const selectedArcOwner = new Map();
for (const key of selected) for (const id of componentByKey.get(key).ids[0]) {
  const other = selectedArcOwner.get(arcId(id));
  if (other) leader.set(findLeader(key), findLeader(other));
  else selectedArcOwner.set(arcId(id), key);
}
const selectedGroups = new Map();
for (const key of selected) { const group = findLeader(key); if (!selectedGroups.has(group)) selectedGroups.set(group, []); selectedGroups.get(group).push(key); }
for (const group of selectedGroups.values()) if (group.reduce((sum, key) => sum + componentByKey.get(key).areaKm2, 0) > schematicArea) for (const key of group) {
  selected.delete(key); skipped.combinedGapTooLarge++;
}
const removedComponents = [];
for (const unit of preparedUnits) {
  const kept = unit.components.filter(part => {
    const p = unit.geometry.properties;
    if (!selected.has(p.s + ':' + part.index)) return true;
    removedComponents.push({ s: p.s, n: p.n, c: p.c, p: p.p, g: p.g, component: part.index, areaKm2: part.areaKm2, interiorPoint: part.point });
    return false;
  });
  if (!kept.length || !kept.includes(unit.largest)) throw new Error('Schematic simplification removed a county primary component');
  unit.geometry.type = kept.length === 1 ? 'Polygon' : 'MultiPolygon';
  unit.geometry.arcs = kept.length === 1 ? kept[0].ids : kept.map(part => part.ids);
}
// Only units are re-imported. Upper layers are always rebuilt from these exact
// same faces after closed-gap filling; no independent layer-specific patching.
const schematicInput = { ...prepared, objects: { units: prepared.objects.units } };
const finishCommand = '-i schematic.topojson name=units '
  + `-clean gap-fill-area=${schematicArea}km2 sliver-control=0 overlap-rule=min-area `
  + '-dissolve p,c target=units no-repair copy-fields=p,c + name=cities '
  + '-dissolve p target=units no-repair copy-fields=p + name=provinces '
  + '-filter "countyUnavailable !== true" target=units name=counties '
  + '-o target=counties,cities,provinces format=topojson quantization=10000000 fix-geometry display.json';
const output = await mapshaper.applyCommands(finishCommand, { 'schematic.topojson': JSON.stringify(schematicInput) });
const topology = JSON.parse(output['display.json']);
if (topology.type !== 'Topology') throw new Error('Expected standard TopoJSON');
for (const level of ['counties', 'cities', 'provinces']) if (!topology.objects[level]?.geometries) throw new Error('Missing layer: ' + level);
if (topology.objects.counties.geometries.length !== countyFacts.length) throw new Error('Cleaning dropped county features; review required');
const expectedCities = new Set(units.map(unit => unit.properties.p + ':' + unit.properties.c));
const expectedProvinces = new Set(units.map(unit => unit.properties.p));
if (topology.objects.cities.geometries.length !== expectedCities.size || topology.objects.provinces.geometries.length !== expectedProvinces.size) throw new Error('Schematic simplification removed a parent feature');
const outputCounties = new Map(topology.objects.counties.geometries.map(geometry => [geometry.properties.s, geometry]));
for (const { p2, b, ...properties } of countyFacts) {
  const actual = outputCounties.get(properties.s)?.properties;
  if (!actual || Object.entries(properties).some(([key, value]) => JSON.stringify(actual[key]) !== JSON.stringify(value))) throw new Error('Schematic build changed county metadata: ' + properties.s);
}

for (const geometry of topology.objects.counties.geometries) {
  delete geometry.properties.countyUnavailable;
  geometry.properties.displaySource = 'geoBoundaries CHN ADM3 (2017)';
}
for (const geometry of topology.objects.cities.geometries) {
  const { p, c } = geometry.properties;
  let original = cityRegistry.get(p + ':' + c);
  if (!original) {
    const candidates = [...codes].filter(([code, name]) => name === c && code.startsWith(factsByProvince.get(p) || 'INVALID'));
    if (candidates.length !== 1) throw new Error('Ambiguous parent city code: ' + p + ':' + c);
    original = { n: c, c, p, g: candidates[0][0], s: 'display-city:' + candidates[0][0] };
    fallbackCities.push({ p, c, g: original.g, reason: 'Explicit reviewed county parent; city absent from OCHA registry', codeEvidence: '2024 administrative code facts' });
  }
  geometry.properties = { n: c, c, p, g: original.g, s: original.s, key: original.g, codeLevel: 'city', displaySource: original.g === '710000' ? 'OCHA COD-AB Taiwan reference' : 'dissolved geoBoundaries county topology', ...(original.g === '710000' ? { countyUnavailable: true } : {}) };
}
for (const geometry of topology.objects.provinces.geometries) {
  const p = geometry.properties.p, original = provinceRegistry.get(p);
  if (!original) throw new Error('Missing province metadata: ' + p);
  geometry.properties = { n: p, c: '', p, g: original.g, s: original.s, key: original.g, codeLevel: 'province', displaySource: original.g === '710000' ? 'OCHA COD-AB Taiwan reference' : 'dissolved geoBoundaries county topology', ...(original.g === '710000' ? { countyUnavailable: true } : {}) };
}
topology.displayVersion = 2;
topology.purpose = 'footprint schematic';

const flattenIds = geometry => geometry.arcs.flat(Infinity);
const arcIndex = id => id < 0 ? ~id : id;
const perimeter = geometries => {
  const counts = new Map();
  for (const geometry of geometries) for (const id of flattenIds(geometry)) { const index = arcIndex(id); counts.set(index, (counts.get(index) || 0) + 1); }
  return [...counts].filter(([, count]) => count % 2 === 1).map(([id]) => id).sort((a, b) => a - b);
};
const ownArcs = geometry => [...new Set(flattenIds(geometry).map(arcIndex))].sort((a, b) => a - b);
const cityChecks = topology.objects.cities.geometries.filter(city => !city.properties.countyUnavailable).map(city => {
  const children = topology.objects.counties.geometries.filter(county => county.properties.p === city.properties.p && county.properties.c === city.properties.c);
  return { key: city.properties.p + ':' + city.properties.c, matches: JSON.stringify(perimeter(children)) === JSON.stringify(ownArcs(city)), children: children.length };
});
const provinceChecks = topology.objects.provinces.geometries.map(province => {
  const children = topology.objects.cities.geometries.filter(city => city.properties.p === province.properties.p);
  return { key: province.properties.p, matches: JSON.stringify(perimeter(children)) === JSON.stringify(ownArcs(province)), children: children.length };
});
if (cityChecks.some(check => !check.matches) || provinceChecks.some(check => !check.matches)) throw new Error('Shared topology parent perimeter audit failed');
const arcUsers = new Map();
for (const county of topology.objects.counties.geometries) for (const id of ownArcs(county)) arcUsers.set(id, (arcUsers.get(id) || 0) + 1);
if ([...arcUsers.values()].some(count => count > 2)) throw new Error('County arc shared by more than two faces');
const arcDirections = new Map();
for (const county of topology.objects.counties.geometries) for (const id of flattenIds(county)) {
  const key = arcIndex(id); if (!arcDirections.has(key)) arcDirections.set(key, []); arcDirections.get(key).push(id < 0 ? -1 : 1);
}
if ([...arcDirections.values()].some(directions => directions.length === 2 && directions[0] === directions[1])) throw new Error('Shared county faces use the same boundary direction');
const json = JSON.stringify(topology);
// A deterministic regression window containing the reported Jiangxi defects.
// This is a coverage sample, not a claim of centimetre-accurate source data.
const decodedArcs = topology.arcs.map(arc => { let x = 0, y = 0; return arc.map(point => { x += point[0]; y += point[1]; return [x * topology.transform.scale[0] + topology.transform.translate[0], y * topology.transform.scale[1] + topology.transform.translate[1]]; }); });
const decode = geometry => {
  const ring = ids => ids.flatMap((id, index) => { const arc = id < 0 ? [...decodedArcs[~id]].reverse() : decodedArcs[id]; return index ? arc.slice(1) : arc; }).flat();
  const p2 = (geometry.type === 'Polygon' ? [geometry.arcs] : geometry.arcs).map(polygon => polygon.map(ring));
  const b = [Infinity, Infinity, -Infinity, -Infinity];
  for (const polygon of p2) for (const path of polygon) for (let i = 0; i < path.length; i += 2) { b[0] = Math.min(b[0], path[i]); b[1] = Math.min(b[1], path[i + 1]); b[2] = Math.max(b[2], path[i]); b[3] = Math.max(b[3], path[i + 1]); }
  return { ...geometry.properties, p2, b };
};
const bounds = [113.8, 27.5, 116.6, 29.2];
const intersects = b => b[0] < bounds[2] && b[2] > bounds[0] && b[1] < bounds[3] && b[3] > bounds[1];
const beforeCounties = countyFacts.filter(feature => intersects(feature.b)), beforeCities = cityFacts.filter(feature => intersects(feature.b));
const allAfterCounties = topology.objects.counties.geometries.map(decode), allAfterCities = topology.objects.cities.geometries.map(decode), allAfterProvinces = topology.objects.provinces.geometries.map(decode);
const afterCounties = allAfterCounties.filter(feature => intersects(feature.b)), afterCities = allAfterCities.filter(feature => intersects(feature.b));
function ringContains(ring, x, y) {
  let hit = false;
  for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) if ((ring[i + 1] > y) !== (ring[j + 1] > y) && x < (ring[j] - ring[i]) * (y - ring[i + 1]) / (ring[j + 1] - ring[i + 1]) + ring[i]) hit = !hit;
  return hit;
}
const contains = (feature, x, y) => x >= feature.b[0] && x <= feature.b[2] && y >= feature.b[1] && y <= feature.b[3] && feature.p2.some(polygon => ringContains(polygon[0], x, y) && !polygon.slice(1).some(ring => ringContains(ring, x, y)));
const primaryChecks = preparedUnits.filter(unit => !unit.geometry.properties.countyUnavailable).map(unit => {
  const after = allAfterCounties.find(county => county.s === unit.geometry.properties.s);
  return Boolean(after && contains(after, ...unit.largest.point));
});
if (primaryChecks.some(check => !check)) throw new Error('County primary component no longer covered by its own display feature');
const parentPrimaryChecks = ['cities', 'provinces'].flatMap(level => prepared.objects[level].geometries.map(parent => {
  const components = componentsOf(parent), largest = components.reduce((best, part) => part.areaKm2 > best.areaKm2 ? part : best);
  const after = (level === 'cities' ? allAfterCities : allAfterProvinces).find(feature => feature.p === parent.properties.p && (level === 'provinces' || feature.c === parent.properties.c));
  return Boolean(after && contains(after, ...largest.point));
}));
if (parentPrimaryChecks.some(check => !check)) throw new Error('Parent primary component no longer covered by its own display feature');
const removedChecks = removedComponents.map(component => ({ s: component.s, component: component.component, hits: allAfterCounties.filter(county => contains(county, ...component.interiorPoint)) }));
if (removedChecks.some(check => check.hits.length !== 1)) throw new Error('A removed inland component was not filled into exactly one display face');
const landmarks = [{ name: 'Anqing interior schematic fill', point: [116.942059, 30.647112], expectedCity: '安庆市' }, { name: 'Chizhou interior schematic fill', point: [117.284096, 30.456547], expectedCity: '池州市' }].map(check => ({ ...check, cities: allAfterCities.filter(city => contains(city, ...check.point)).map(city => city.n) }));
if (schematicArea >= 50 && landmarks.some(check => check.cities.length !== 1 || check.cities[0] !== check.expectedCity)) throw new Error('Footprint landmark simplification failed');
const holeCount = geometries => geometries.reduce((sum, geometry) => sum + polygonIds(geometry).reduce((count, polygon) => count + polygon.length - 1, 0), 0);
const schematicAudit = {
  removedComponents: removedComponents.length, affectedCounties: new Set(removedComponents.map(component => component.s)).size,
  primaryCountyComponentsRetained: primaryChecks.length, primaryParentComponentsRetained: parentPrimaryChecks.length, countyMetadataIdentitiesRetained: countyFacts.length, removedComponentSamplesSingleCoverage: removedChecks.length,
  holeCountsBefore: { counties: preparedUnits.filter(unit => !unit.geometry.properties.countyUnavailable).reduce((sum, unit) => sum + unit.components.reduce((count, part) => count + part.ids.length - 1, 0), 0), cities: holeCount(prepared.objects.cities.geometries), provinces: holeCount(prepared.objects.provinces.geometries) },
  holeCountsAfter: Object.fromEntries(['counties', 'cities', 'provinces'].map(level => [level, holeCount(topology.objects[level].geometries)])), landmarks,
};
const regression = { region: 'Jiangxi/Nanchang/Yichun and neighbouring borders', bounds, gridStepDegrees: 0.01, samples: 0, beforeCountyOverlaps: 0, afterCountyOverlaps: 0, beforeCountyGaps: 0, afterCountyGaps: 0, beforeCityCountyMismatch: 0, afterCityCountyMismatch: 0 };
for (let x = bounds[0] + 0.005; x < bounds[2]; x += 0.01) for (let y = bounds[1] + 0.005; y < bounds[3]; y += 0.01) {
  regression.samples++;
  const before = beforeCounties.filter(feature => contains(feature, x, y)), after = afterCounties.filter(feature => contains(feature, x, y));
  const oldCities = beforeCities.filter(feature => contains(feature, x, y)), newCities = afterCities.filter(feature => contains(feature, x, y));
  if (before.length > 1) regression.beforeCountyOverlaps++;
  if (after.length > 1) regression.afterCountyOverlaps++;
  if (!before.length) regression.beforeCountyGaps++;
  if (!after.length) regression.afterCountyGaps++;
  if (before.length && oldCities.length && !before.some(county => oldCities.some(city => county.c === city.n))) regression.beforeCityCountyMismatch++;
  if (after.length && newCities.length && !after.some(county => newCities.some(city => county.c === city.n))) regression.afterCityCountyMismatch++;
}
if (regression.afterCountyOverlaps || regression.afterCountyGaps || regression.afterCityCountyMismatch) throw new Error('Reported-region geometry regression failed');
const provenance = {
  version: 2, builtAt: '2026-10-31', purpose: topology.purpose,
  source: { url: 'https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09/releaseData/gbOpen/CHN/ADM3/geoBoundaries-CHN-ADM3_simplified.geojson', sha256: SOURCE_SHA256, bytes: sourceBytes.length, boundaryYear: 2017, license: 'ODbL 1.0', attribution: 'geoBoundaries; © OpenStreetMap contributors' },
  taiwan: { source: 'OCHA COD-AB', license: 'CC BY 3.0 IGO', attribution: 'OCHA ROAP / HDX', countyUnavailable: true, note: 'Disconnected shape only, no invented county subdivisions' },
  metadata: { countyIdentity: 'counties.json s matches original shapeID; no nearest-centre assignment', codesSha256: sha(codeBytes), additionalCityParents: fallbackCities },
  build: { tool: 'mapshaper', version: VERSION, runtimeDependency: false, simplification: 'shared topology Douglas-Peucker', intervalMetres: interval, quantization: 10000000,
    cleaning: 'Initial clean gap-width=0; schematic closed-gap fill only, sliver-control=0; no close-outer-gaps', prepareCommand, finishCommand,
    schematic: { authorizedPurpose: 'User-requested footprint illustration; display reassignment only', maxAreaKm2: schematicArea,
      rule: 'Remove hole-free non-primary county components only when every exterior arc is shared by exactly two counties; protect all primary components, parent primaries, coastal components and Hong Kong/Macao/Taiwan; fill closed gaps up to the same area; dissolve cities/provinces from the resulting single county topology',
      removedComponents: removedComponents.length, skipped, components: removedComponents } },
  audit: { countyCount: topology.objects.counties.geometries.length, cityCount: topology.objects.cities.geometries.length, provinceCount: topology.objects.provinces.geometries.length, arcs: topology.arcs.length, vertices: topology.arcs.reduce((sum, arc) => sum + arc.length, 0), countyArcsSharedByTwo: [...arcUsers.values()].filter(count => count === 2).length, countyArcsWithMoreThanTwoFaces: 0, sharedArcDirectionConflicts: 0, cityPerimetersChecked: cityChecks.length, cityPerimetersMismatch: 0, provincePerimetersChecked: provinceChecks.length, provincePerimetersMismatch: 0, schematic: schematicAudit, regression },
  output: { bytes: Buffer.byteLength(json), sha256: sha(json) },
  limitations: ['Footprint schematic, not an administrative boundary map: small inland fragments and closed gaps are intentionally absorbed for a continuous illustration.', 'Historical reference boundaries, not current legal/precise surveying data.', 'Display parents are dissolved from one county source; they intentionally differ from independent OCHA geocoding polygons.', 'No geocoding files, original metadata, stored places, or user data are modified by this builder.'],
};
await writeFile(resolve(root, 'display.json'), json);
await writeFile(resolve(root, 'display-provenance.json'), JSON.stringify(provenance, null, 2) + '\n');
console.log(JSON.stringify({ ...provenance.audit, ...provenance.output, additionalCityParents: fallbackCities }, null, 2));
