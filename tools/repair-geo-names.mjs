// Build-time repair, not runtime lookup. Replays reviewed name corrections against
// the exact geoBoundaries source. No nearest-neighbour naming or new geometry.
// node tools/repair-geo-names.mjs <original ADM3 geojson> <2024 code facts txt>
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const root = new URL('../data/geo/', import.meta.url);
const sourceUrl = 'https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09/releaseData/gbOpen/CHN/ADM3/geoBoundaries-CHN-ADM3_simplified.geojson';
const expectedHash = 'ea64fe24f193e319ce48895f229a5b3f46d2a60f3f3df67e6172ab037e4cc8fd';
// Every entry was reconciled with the source feature name and its bounding box.
// The source boundaries describe 2017; an administrative rename does not make
// an old polygon a newly surveyed boundary. Special units retain their real
// parent code and a source boundary ID instead of inventing county codes.
const missing = {
  12:'150902',24:'520603',33:'410505',172:'370614',195:'140403',342:'130302',377:'340103',392:'350404',603:'410311',
  642:'230719',652:'320613',685:'211202',693:'320812',712:'231081',726:'410308',769:'152501',990:'360602',1000:'430407',
  1023:'653101',1041:'340209',1043:'620111',1065:'320114',1141:['820000','圣方济各堂区','澳门特别行政区'],1178:'441402',
  1205:'210802',1222:'220302',1228:'431202',1357:'230723',1402:'230717',1404:'130404',1411:'659006',1415:'460302',1416:'360203',
  1418:['820000','嘉模堂区','澳门特别行政区'],1507:'430602',1621:'230724',1625:['232700','新林区','大兴安岭地区'],
  1644:'230405',1696:'330105',1715:['230700','乌马河区（旧界）','伊春市'],1783:['620200','雄关区（旧界）','嘉峪关市'],
  1793:'210903',1799:'110107',1818:'360112',1827:'330102',1891:'150204',1896:'210905',1968:'130502',1999:'230751',
  2136:'220402',2248:['210700','锦州经济技术开发区','锦州市'],2337:['232700','呼中区','大兴安岭地区'],2345:'520303',
  2370:'410902',2375:'340311',2451:'632803',2468:'341102',2636:'140213',2667:['620200','长城区（旧界）','嘉峪关市'],
  2697:'130304',2791:'130524',2805:'620105',2828:'230724',2839:'230902',2840:'230903',2842:'130403',
  2849:['820000','澳门半岛','澳门特别行政区'],
};
// Confident name/geometry mismatches, not merely old-to-new type changes.
const mismatched = {
  8:'211122',19:'445202',29:'130306',39:'210504',55:'650502',119:'410522',141:'511902',155:'652701',159:'520304',164:'330327',
  175:'360202',221:'370911',231:'210882',261:'231086',263:'230406',304:'210881',310:'210211',313:'620122',329:'360681',337:'150222',
  340:'110108',353:'420111',399:'341103',453:'654323',506:'211221',532:'330109',661:'652824',762:'430621',803:'620121',807:'420106',
  844:'653223',863:'360112',908:'220322',963:'320115',970:'654201',984:'410928',999:'330110',1016:'220403',1022:'622922',1032:'520302',
  1064:'445102',1107:'430421',1148:'320412',1293:'340322',1350:'320402',1363:'370902',1401:'500107',1451:'320404',1452:'431221',
  1487:'410205',1544:'130408',1601:'410307',1686:'410212',1741:'340104',1751:'653121',1910:'230904',2012:'320322',2085:'441403',
  2104:'371311',2129:'130525',2292:'445203',2318:'150781',2342:'150103',2466:'371324',2559:'320321',2604:'220422',2616:'500104',
  2648:'445103',2691:'520602',2727:'511602',
  51:'152201',70:'211102',148:'210521',950:'210921',972:'152221',1121:'152524',1220:'211103',2672:'150926',2238:'371726',
  1413:['820000','路氹填海区','澳门特别行政区'],1131:['620200','镜铁区（旧界）','嘉峪关市'],
};
const historical = {
  172:'长岛县',195:'城区',392:'梅列区',642:'上甘岭区',652:'港闸区',693:'清浦区',726:'吉利区',
  1357:'汤旺河区',1402:'伊春区',1621:'新青区',1696:'下城区',1715:'乌马河区',1783:'雄关区',
  1818:'湾里区',1968:'桥东区',1999:'西林区',2451:'冷湖行政委员会',2636:'城区',2667:'长城区',2828:'五营区',1131:'镜铁区',
};
const boundaryReview = {
  1715:'2019年原乌马河区分属乌翠区、伊美区；没有新界线证据，保留旧界名称，仅确认伊春市。',
  503:'源英文名 Taixing City 与江苏宜兴几何位置不一致；保留已有宜兴市标签，未按英文盲改。',
  2605:'源英文名 Donghu District 位于海南海口；保留已有秀英区标签，未按英文盲改。',
  532:'原萧山区范围后来部分划入钱塘区，2017几何不能当作当前县界。',
  999:'原余杭区后来分为余杭区、临平区，2017几何不能当作当前县界。',
};

const [sourcePath, codePath] = process.argv.slice(2);
if (!sourcePath || !codePath) throw new Error('Pass source GeoJSON and 2024 code facts file');
const bytes = await readFile(sourcePath);
if (createHash('sha256').update(bytes).digest('hex') !== expectedHash) throw new Error('Unexpected source version; manual review required');
const source = JSON.parse(bytes).features;
const counties = JSON.parse(await readFile(new URL('counties.json', root), 'utf8'));
const codeBytes = await readFile(codePath);
const codeNames = Object.fromEntries(codeBytes.toString('utf8').trim().split(/\r?\n/).map(line => [line.slice(0,6),line.slice(7).trim()]));
const previousAudit = await readFile(new URL('name-corrections.json', root),'utf8').then(JSON.parse).catch(()=>null);
const oldPatches = new Map((previousAudit?.corrections || []).map(item=>[item.index,item]));
const corrections = [];
const bbox = (coordinates, result=[Infinity,Infinity,-Infinity,-Infinity]) => {
  if (typeof coordinates[0] === 'number') {
    result[0]=Math.min(result[0],coordinates[0]);result[1]=Math.min(result[1],coordinates[1]);
    result[2]=Math.max(result[2],coordinates[0]);result[3]=Math.max(result[3],coordinates[1]);
  } else for(const value of coordinates)bbox(value,result);
  return result;
};
if (source.length !== counties.length) throw new Error('Source/counties count differs');
for (let i=0;i<counties.length;i++) {
  const county=counties[i], original=source[i];
  const bounds=bbox(original.geometry.coordinates);
  if(bounds.some((value,k)=>Math.abs(value-county.b[k])>0.000051))throw new Error(`Geometry identity mismatch at ${i}`);
  county.s=original.properties.shapeID;county.sn=original.properties.shapeName;
  const selected=missing[i]||mismatched[i];
  if(selected){
    const [g,explicitName,explicitCity]=Array.isArray(selected)?selected:[selected];
    if(!codeNames[g])throw new Error(`Unknown code ${g}`);
    const p=codeNames[g.slice(0,2)+'0000'];
    const n=explicitName||codeNames[g];
    const c=explicitCity||codeNames[g.slice(0,4)+'00']||(/^(11|12|31|50)/.test(g)?p:n);
    const before=oldPatches.get(i)?.before||{n:county.n,c:county.c,p:county.p,g:county.g};
    const after={n,c,p,g};Object.assign(county,after);
    if(g.endsWith('0000'))county.codeLevel='province';else if(g.endsWith('00'))county.codeLevel='city';else delete county.codeLevel;
    if(historical[i])county.historicalName=historical[i];
    corrections.push({index:i,boundaryId:county.s,sourceName:county.sn,before,after,kind:missing[i]?'missing-label':'wrong-label',
      ...(historical[i]?{historicalName:historical[i]}:{}),...(boundaryReview[i]?{note:boundaryReview[i]}:{})});
  }
  // Direct-admin municipalities/province-admin counties need a usable display group.
  if(!county.c&&county.p)county.c=/^(北京市|天津市|上海市|重庆市|香港特别行政区|澳门特别行政区)$/.test(county.p)?county.p:county.n;
}
if(counties.some(c=>!c.n||!c.c||!c.p||!c.g))throw new Error('Empty labels remain');
await writeFile(new URL('counties.json',root),JSON.stringify(counties));
await writeFile(new URL('name-corrections.json',root),JSON.stringify({version:2,sourceUrl,sourceSha256:expectedHash,boundaryYear:2017,
  codeFacts:{url:'https://raw.githubusercontent.com/yescallop/areacodes/master/data/2024.txt',sha256:createHash('sha256').update(codeBytes).digest('hex'),asOf:'2024-12-31'},
  reason:'The earlier representative-point name join lost 67 names and assigned some neighbouring names to the wrong polygon. Source names and exact feature identity are retained; names are never inferred from nearest centres.',
  references:[
    'https://zfgb.hangzhou.gov.cn/18/106220253/t106220253064/528872.shtml',
    'https://www.qhrd.gov.cn/zyfb/cwhhy/sssjrdcwhdlchy/hywj_260/201809/t20180919_18985.html',
    'https://www.ycwc.gov.cn/wcqrmzf/c100253/zjwc.shtml',
    'https://www.gansu.gov.cn/gsszf/c100075/201907/169354/files/c9bd6d8c9c8d4041ac8baeaf329963e2.pdf',
    'https://dxalxl.gov.cn/dxalxl/c100484/zoujin.shtml',
    'https://www.huzhong.gov.cn/'
  ],missingLabelsRepaired:Object.keys(missing).length,wrongLabelsRepaired:Object.keys(mismatched).length,
  unresolvedGeometryChanges:boundaryReview,corrections},null,2)+'\n');
console.log(JSON.stringify({named:counties.length,missingLabelsRepaired:Object.keys(missing).length,wrongLabelsRepaired:Object.keys(mismatched).length}));
