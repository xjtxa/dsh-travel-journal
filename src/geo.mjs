import { readFile } from 'node:fs/promises';

const GRID = 0.5;
const FILES = { counties: '../data/geo/counties.json', provinces: '../data/geo/provinces.json', cities: '../data/geo/cities.json' };

function insideRing(ring, x, y) {
  let hit = false;
  for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
    const xi = ring[i], yi = ring[i + 1], xj = ring[j], yj = ring[j + 1];
    const cross = (x-xi)*(yj-yi)-(y-yi)*(xj-xi);
    if (Math.abs(cross) <= 1e-12 && x >= Math.min(xi,xj)-1e-12 && x <= Math.max(xi,xj)+1e-12
      && y >= Math.min(yi,yj)-1e-12 && y <= Math.max(yi,yj)+1e-12) return 2;
    if ((yi > y) !== (yj > y) && x < ((xj-xi)*(y-yi))/(yj-yi)+xi) hit = !hit;
  }
  return hit ? 1 : 0;
}

export function insidePolygon(polygon, x, y) {
  if (!polygon?.length || !insideRing(polygon[0], x, y)) return false;
  // Hole edges belong to the excluded hole, not to the enclosing county.
  return !polygon.slice(1).some(ring => insideRing(ring, x, y));
}

function buildGrid(features) {
  const grid = new Map();
  features.forEach((feature, index) => {
    if (!Array.isArray(feature.b) || feature.b.length !== 4 || !feature.b.every(Number.isFinite) || !feature.p2?.length) return;
    const [x0,y0,x1,y1] = feature.b;
    if (x0 > x1 || y0 > y1 || x0 < -180 || x1 > 180 || y0 < -90 || y1 > 90) throw new Error('Invalid offline boundary extent');
    for (let gx=Math.floor(x0/GRID);gx<=Math.floor(x1/GRID);gx++) {
      for (let gy=Math.floor(y0/GRID);gy<=Math.floor(y1/GRID);gy++) {
        const key=gx+':'+gy;
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key).push(index);
      }
    }
  });
  // Explicit smaller units win over enclosing administrative geometries.
  const area = f => (f.b[2]-f.b[0])*(f.b[3]-f.b[1]);
  for (const entries of grid.values()) entries.sort((a,b)=>area(features[a])-area(features[b]) || a-b);
  return grid;
}

function containing(features, grid, latitude, longitude) {
  const key=Math.floor(longitude/GRID)+':'+Math.floor(latitude/GRID);
  return (grid.get(key)||[]).map(index=>features[index]).filter(feature => {
    const [x0,y0,x1,y1]=feature.b;
    return longitude>=x0&&longitude<=x1&&latitude>=y0&&latitude<=y1
      &&feature.p2.some(polygon=>insidePolygon(polygon,longitude,latitude));
  });
}

function confirmedParent(county, cities) {
  if (!county.n || !county.c || !county.p || !county.s || !/^\d{6}$/.test(county.g || '')) return null;
  return cities.find(city => {
    if (city.n !== county.c || city.p !== county.p || !/^\d{6}$/.test(city.g || '')) return false;
    // Names alone are insufficient: also require the administrative code's
    // explicit parent prefix (or the same code for province-admin county cities).
    const length = city.g.endsWith('0000') ? 2 : city.g.endsWith('00') ? 4 : 6;
    return city.g.slice(0,length) === county.g.slice(0,length);
  }) || null;
}

/** Offline WGS-84 lookup. The self-contained OCHA province/city hierarchy is the
 * primary source. Older county boundaries may add detail, never change its city.
 * Publication date is not claimed to be a survey/boundary date. */
export function createGeoIndex({ read = (path) => readFile(new URL(path, import.meta.url), 'utf8') } = {}) {
  let loading = null;
  let displayLoading = null;
  let placeChoices = null;
  async function load() {
    if (!loading) {
      loading = (async () => {
        const counties = JSON.parse(await read(FILES.counties));
        const provinces = JSON.parse(await read(FILES.provinces));
        const cities = JSON.parse(await read(FILES.cities));
        return { counties, provinces, cities,
          grid: buildGrid(counties), cityGrid: buildGrid(cities), provinceGrid: buildGrid(provinces) };
      })().catch((error) => { loading = null; throw error; });
    }
    return loading;
  }

  async function locate(latitude, longitude) {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
    const { counties, provinces, cities, grid, cityGrid, provinceGrid } = await load();
    const city = containing(cities, cityGrid, latitude, longitude).find(item=>item.n&&item.p&&item.g);
    if (!city) {
      // The two offline sources have different coastline coverage. Only an
      // actual labelled county polygon hit, with a verified parent name/code,
      // may fill a city-layer gap. Never select a nearby city or snap a point.
      const candidates = containing(counties, grid, latitude, longitude)
        .map(county=>({county,parent:confirmedParent(county,cities)})).filter(item=>item.parent);
      if (!candidates.length || new Set(candidates.map(item=>item.parent.g)).size !== 1) return null;
      const {county,parent}=candidates[0];
      return {code:county.g,name:county.n,district:county.n,city:parent.n,province:parent.p,
        codeLevel:county.codeLevel||'county',boundaryId:county.s,cityBoundaryId:parent.s,
        boundaryYear:2017,citySource:'geoBoundaries CHN ADM3 (2017)',countySource:'geoBoundaries CHN ADM3 (2017)',
        cityResolution:'county-boundary-fallback',
        ...(county.historicalName?{historicalName:county.historicalName}:{}),
      };
    }
    const province = containing(provinces, provinceGrid, latitude, longitude).find(item=>item.n===city.p);
    // The city's parent is an explicit OCHA field. Province outlines sometimes
    // differ at coastlines; do not assign a different parent from proximity.
    const parent = province?.n || city.p;
    const county = containing(counties, grid, latitude, longitude)
      .find(item=>item.n&&item.g&&item.c===city.n&&item.p===parent);
    return { code: county?.g || city.g, name: county?.n || city.n,
      district: county?.n || null, city: city.n, province: parent,
      codeLevel: county?.codeLevel || (county ? 'county' : 'city'),
      boundaryId: county?.s || city.s, cityBoundaryId: city.s,
      boundaryYear: county ? 2017 : null, citySource: 'OCHA COD-AB', cityPublished: '2020-09-10', cityResolution:'city-boundary',
      ...(county ? { countySource: 'geoBoundaries CHN ADM3 (2017)' } : {}),
      ...(county?.historicalName ? { historicalName: county.historicalName } : {}),
    };
  }

  async function file(name) {
    if (name === 'display') {
      if (!displayLoading) displayLoading = Promise.resolve().then(() => read('../data/geo/display.json')).then(JSON.parse).catch(error => { displayLoading = null; throw error; });
      return displayLoading;
    }
    if (!FILES[name]) return null;
    const { counties, provinces, cities } = await load();
    return name === 'counties' ? counties : name === 'provinces' ? provinces : cities;
  }

  /** Selection catalog from the same offline parent/city labels used by locate.
   * Promise<Array<{name: string, cities: string[]}>>; no approximate coordinates,
   * aliases or historical county names are introduced for manual selections. */
  async function listPlaceChoices() {
    if(!placeChoices){
      const {provinces,cities}=await load();
      const groups=new Map(provinces.filter(p=>typeof p.n==='string'&&p.n.trim()).map(p=>[p.n,new Set()]));
      for(const city of cities)if(groups.has(city.p)&&typeof city.n==='string'&&city.n.trim())groups.get(city.p).add(city.n);
      placeChoices=[...groups].map(([name,values])=>({name,cities:[...values].sort((a,b)=>a.localeCompare(b,'zh-CN'))})).sort((a,b)=>a.name.localeCompare(b.name,'zh-CN'));
    }
    return placeChoices.map(({name,cities})=>({name,cities:[...cities]}));
  }

  return { locate, file, load, listPlaceChoices };
}
