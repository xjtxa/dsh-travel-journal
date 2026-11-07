"""Rebuild the offline province/city layer from the original OCHA COD-AB ZIP.

Build-time only; Python standard library, no runtime dependency. Usage:
  python tools/build-ocha.py --zip chn_adm_ocha_2020_shp.zip --codes codes-2024.txt
Code facts snapshot: https://raw.githubusercontent.com/yescallop/areacodes/master/data/2024.txt
Original geometry and complete Chinese hierarchy: OCHA COD-AB, CC BY 3.0 IGO.
This preserves the source geometry, except coordinate rounding to 6 decimals;
it never uses nearest-neighbour naming or combines boundaries by a centroid.
"""
import argparse
import hashlib
import json
import re
import struct
import zipfile
from pathlib import Path

SOURCE_URL = 'https://data.humdata.org/dataset/17a2aaa2-dea9-4a2e-8b3f-92d1bdfb850c/resource/9e67ddf9-ce26-4b7a-82b1-51e5ca0714c8/download/chn_adm_ocha_2020_shp.zip'
CODE_URL = 'https://raw.githubusercontent.com/yescallop/areacodes/master/data/2024.txt'
NAME_FIXES = {
    '莱芜市': '济南市',  # The entire former city was merged, not a guessed point assignment.
    '那曲地区': '那曲市',
    '海西蒙古族自治州': '海西蒙古族藏族自治州',
    '株州市': '株洲市',
    '香港': '香港特别行政区',
    '澳门': '澳门特别行政区',
}

def dbf(data):
    count = struct.unpack_from('<I', data, 4)[0]
    header, size = struct.unpack_from('<HH', data, 8)
    fields = []
    for offset in range(32, header - 1, 32):
        field = data[offset:offset + 32]
        fields.append((field[:11].split(b'\0')[0].decode('ascii'), field[16]))
    result = []
    for index in range(count):
        row = data[header + index * size:header + (index + 1) * size]
        if row[0:1] == b'*':
            raise ValueError('Deleted DBF row requires explicit reconciliation')
        position, values = 1, {}
        for name, length in fields:
            values[name] = row[position:position + length].strip().decode('utf-8')
            position += length
        result.append(values)
    return result

def ring_area(ring):
    return sum(ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1]
               for i, j in zip(range(len(ring)), [len(ring)-1] + list(range(len(ring)-1)))) / 2

def inside(ring, x, y):
    result = False
    for i, j in zip(range(len(ring)), [len(ring)-1] + list(range(len(ring)-1))):
        xi, yi = ring[i]; xj, yj = ring[j]
        if (yi > y) != (yj > y) and x < (xj-xi)*(y-yi)/(yj-yi)+xi:
            result = not result
    return result

def shapes(data):
    result, offset = [], 100
    while offset < len(data):
        _, size = struct.unpack_from('>ii', data, offset)
        content = data[offset+8:offset+8+size*2]; offset += 8+size*2
        kind = struct.unpack_from('<i', content)[0]
        if kind != 5:
            raise ValueError(f'Expected Polygon, received {kind}')
        bbox = list(struct.unpack_from('<4d', content, 4))
        parts, count = struct.unpack_from('<2i', content, 36)
        starts = list(struct.unpack_from(f'<{parts}i', content, 44)) + [count]
        coordinates = [struct.unpack_from('<2d', content, 44+parts*4+i*16) for i in range(count)]
        rings = [coordinates[starts[i]:starts[i+1]] for i in range(parts)]
        # Shapefile outer rings run clockwise; holes run counter-clockwise.
        polygons = [[ring] for ring in rings if ring_area(ring) < 0]
        for hole in [ring for ring in rings if ring_area(ring) >= 0]:
            parents = [polygon for polygon in polygons if inside(polygon[0], *hole[0])]
            if not parents:
                raise ValueError('Hole without containing outer ring')
            min(parents, key=lambda p: abs(ring_area(p[0]))).append(hole)
        result.append((bbox, [[[round(v, 6) for point in ring for v in point] for ring in poly] for poly in polygons]))
    return result

def cleaned(name):
    name = re.sub(r'[\[〔]\d+[\]〕]', '', name).strip()
    return NAME_FIXES.get(name, name)

def build(zip_path, codes_path, output):
    codes = [line.split(' ', 1) for line in codes_path.read_text(encoding='utf-8').splitlines() if line.strip()]
    by_name = {}
    for code, name in codes:
        by_name.setdefault(name.strip(), []).append(code)
    archive = zipfile.ZipFile(zip_path)
    layers = {}
    for level in [1, 2]:
        stem = f'chn_admbnda_adm{level}_ocha_2020'
        attributes = dbf(archive.read(stem+'.dbf'))
        geometry = shapes(archive.read(stem+'.shp'))
        if len(attributes) != len(geometry):
            raise ValueError('Attribute/geometry record count differs')
        rows = []
        for index, (item, (bbox, polygons)) in enumerate(zip(attributes, geometry)):
            original = item[f'ADM{level}_ZH']; name = cleaned(original)
            province = cleaned(item['ADM1_ZH'])
            options = by_name.get(name, [])
            province_code = by_name.get(province, [''])[0]
            options = [code for code in options if code[:2] == province_code[:2]]
            if len(options) != 1:
                raise ValueError(f'Unresolved code for {province}/{name}: {options}')
            code = options[0]
            rows.append({'i': index, 'n': name, 'c': name if level == 2 else '', 'p': province,
                         'g': code, 's': 'ocha:'+item[f'ADM{level}_PCODE'],
                         'codeLevel': 'city' if level == 2 else 'province',
                         'name': name, 'province': province, 'key': code,
                         'sourceNames': [original], 'sourcePcodes': [item[f'ADM{level}_PCODE']],
                         'parentPcode': item['ADM1_PCODE'],
                         'b': [round(v, 6) for v in bbox], 'p2': polygons})
        if level == 2:
            # Full municipal mergers keep every component; never interpolate a boundary.
            grouped = {}
            for row in rows:
                key = row['g']
                if key not in grouped:
                    grouped[key] = row
                else:
                    target = grouped[key]
                    target['sourceNames'] += row['sourceNames']; target['sourcePcodes'] += row['sourcePcodes']
                    target['p2'] += row['p2']
                    target['b'] = [min(target['b'][0],row['b'][0]),min(target['b'][1],row['b'][1]),max(target['b'][2],row['b'][2]),max(target['b'][3],row['b'][3])]
            rows = list(grouped.values())
            for index, row in enumerate(rows): row['i'] = index
        layers['provinces' if level == 1 else 'cities'] = rows
    output.mkdir(parents=True, exist_ok=True)
    for name, rows in layers.items():
        (output/(name+'.json')).write_text(json.dumps(rows, ensure_ascii=False, separators=(',',':')), encoding='utf-8')
    provenance = {'source': 'OCHA ROAP China COD-AB', 'url': SOURCE_URL,
                  'sourceSha256': hashlib.sha256(zip_path.read_bytes()).hexdigest(),
                  'published': '2020-09-10', 'reviewed': '2024-10', 'boundaryYear': None,
                  'boundaryYearNote': 'The publisher states the date boundaries were established is unknown; publication/review dates are not geometry dates.',
                  'license': 'CC BY 3.0 IGO', 'licenseUrl': 'https://creativecommons.org/licenses/by/3.0/igo/legalcode',
                  'originalProvinceCount': 34, 'originalCityCount': 361,
                  'provinceCount': len(layers['provinces']), 'cityCount': len(layers['cities']),
                  'coordinateDecimals': 6, 'simplified': False,
                  'codeFacts': {'url': CODE_URL, 'sha256': hashlib.sha256(codes_path.read_bytes()).hexdigest(), 'asOf': '2024-12-31'},
                  'nameCorrections': NAME_FIXES}
    (output/'ocha-provenance.json').write_text(json.dumps(provenance, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({k:len(v) for k,v in layers.items()}))

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--zip', type=Path, required=True)
    parser.add_argument('--codes', type=Path, required=True)
    parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parent.parent/'data'/'geo')
    args = parser.parse_args()
    build(args.zip, args.codes, args.output)
