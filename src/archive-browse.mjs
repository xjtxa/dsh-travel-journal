import { createHash, randomUUID } from 'node:crypto';

const fail=message=>Object.assign(new Error(message),{status:400});
const digest=value=>createHash('sha256').update(value).digest('hex');
const clean=value=>typeof value==='string'?value.normalize('NFKC').trim():'';
const normal=value=>clean(value).toLocaleLowerCase();
const stableKey=(type,parts)=>type+':'+Buffer.from(JSON.stringify(parts)).toString('base64url');
const monthOf=date=>/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(date||'')?date.slice(0,7):'unknown';
const monthValid=key=>key==='unknown'||/^\d{4}-(0[1-9]|1[0-2])$/.test(key);
const keyLimit=(value,label,max=1000)=>{if(typeof value!=='string'||value.length>max)throw fail(label+'格式不正确');return value;};
const pageLimit=limit=>{if(!Number.isSafeInteger(limit)||limit<1||limit>100)throw fail('每页数量应为 1 至 100');return limit;};
const preferenceKey=({type,key,province=''})=>JSON.stringify([type,type==='city'?province:'',key]);
const compareParts=(a,b)=>{for(let i=0;i<a.length;i++){const result=a[i].localeCompare(b[i],'zh-CN');if(result)return result;}return 0;};
const descriptor=entry=>({recordId:entry.record.id,photoId:entry.photo.id,name:entry.photo.name||'照片'});

function placeOf(photo){
  const place=photo.place||{},country=clean(place.country),province=clean(place.province),city=clean(place.city);
  const unknown=!province;
  return {provinceKey:unknown?'unknown':stableKey('p',[country,province]),cityKey:!country&&!province&&!city?'unknown':stableKey('c',[country,province,city]),
    provinceTitle:province||'地点待补充',cityTitle:city||'城市待补充',
    locations:[place.country,place.province,place.city,place.district,place.town,place.name].map(normal).filter(Boolean)};
}
function decodeCursor(value,signature){
  if(!value)return null;
  try{
    if(typeof value!=='string'||value.length>4096)throw new Error();
    const cursor=JSON.parse(Buffer.from(value,'base64url').toString('utf8'));
    if(cursor.v!==1||cursor.signature!==signature||!Array.isArray(cursor.sort)||!cursor.sort.length||cursor.sort.length>4||cursor.sort.some(v=>typeof v!=='string'||v.length>1000))throw new Error();
    return cursor.sort;
  }catch{throw fail('浏览位置已失效，请重新打开当前分类');}
}

/** Cached metadata only. Original bytes and complete day records never leave this layer. */
export function createArchiveBrowse({getRecords,getDataRevision,getRevision,search,toCard,getPreferences,savePreference,canUsePhoto=()=>true}){
  const salt=randomUUID();let cacheRevision,entries=[],emptyRecords=[];const selections=new Map(),dayEntries=new Map();
  function data(){
    const current=getDataRevision();
    if(current!==cacheRevision){
      cacheRevision=current;entries=[];emptyRecords=[];selections.clear();dayEntries.clear();
      for(const record of getRecords()){
        if(!(record.media||[]).some(photo=>photo.status==='saved'))emptyRecords.push(record);
        const day=[];dayEntries.set(record.id,day);
        for(const photo of record.media||[])if(photo.status==='saved'){
          const entry={record,photo,month:monthOf(record.date),...placeOf(photo)};
          entries.push(entry);day.push(entry);
        }
      }
    }
    return entries;
  }
  function options(input={}){
    const mode=input.mode??'date',reverse=input.reverse===true||input.reverse===1||input.reverse==='1';
    if(!['date','month','province','random'].includes(mode))throw fail('浏览方式不正确');
    if(input.reverse!==undefined&&![true,false,0,1,'0','1'].includes(input.reverse))throw fail('排序方式不正确');
    const value={mode,reverse,q:keyLimit(input.q??'','搜索内容',500).trim(),place:keyLimit(input.place??'','地点',200).trim(),
      province:keyLimit(input.province??'','省份'),city:keyLimit(input.city??'','城市'),month:keyLimit(input.month??'','月份',20),
      seed:keyLimit(input.seed??'','随机顺序',200),jump:keyLimit(input.jump??'','跳转月份',20),
      searchId:keyLimit(input.searchId??'','搜索编号',100),after:input.after??'',limit:pageLimit(input.limit??24)};
    if(value.city&&!value.province)throw fail('请先选择省份');
    if(value.month&&!monthValid(value.month)||value.jump&&!monthValid(value.jump))throw fail('月份格式不正确');
    if(value.after&&value.jump)throw fail('继续加载时不能同时跳转月份');
    return value;
  }
  const matchesFolder=(entry,value,ignoreMonth=false)=>(!value.province||entry.provinceKey===value.province)
    &&(!value.city||entry.cityKey===value.city)&&(ignoreMonth||!value.month||entry.month===value.month);
  function scoped(value,{ignoreMonth=false,searchHits}={}){
    const all=data(),cacheKey=JSON.stringify([value.q,value.place,value.province,value.city,ignoreMonth?'':value.month]);
    if(!searchHits&&selections.has(cacheKey))return selections.get(cacheKey);
    const hits=searchHits??((value.q||value.place)?hitMap(search(value.q,{place:value.place||undefined,limit:null})):null);
    const location=normal(value.place),selected=all.filter(entry=>{
      if(!matchesFolder(entry,value,ignoreMonth))return false;
      if(location&&!entry.locations.some(part=>part.includes(location)))return false;
      if(hits){const matched=hits.get(entry.record.id);if(!matched||matched.size&&!matched.has(entry.photo.id))return false;}
      return true;
    });
    if(!searchHits){
      if(selections.size>=12)selections.delete(selections.keys().next().value);
      selections.set(cacheKey,selected);
    }
    return selected;
  }
  const hitMap=hits=>new Map(hits.map(hit=>[hit.id,new Set(hit.matchedPhotoIds)]));
  const browseSignature=value=>digest(JSON.stringify([value.mode,value.reverse,value.q,value.place,value.province,value.city,value.month,value.mode==='random'?(value.seed||salt):'',value.searchId]));
  function cover(list,scope){
    if(!list.length)return null;
    const saved=getPreferences()?.[preferenceKey(scope)];
    // An explicit cover belongs to the entire folder or day, even while the
    // current query happens to match a different subset of its photographs.
    const chosen=saved&&coverEntries(scope).find(entry=>entry.record.id===saved.recordId&&entry.photo.id===saved.photoId);
    if(chosen&&canUsePhoto(chosen.record,chosen.photo))return descriptor(chosen);
    // Stable pseudo-random priorities keep a group's fallback unchanged while
    // browsing and avoid reshuffling all covers after a different day is edited.
    const key=preferenceKey(scope),ordered=scope.type==='day'?list:list.map(entry=>({entry,rank:digest(salt+key+entry.record.id+'/'+entry.photo.id)})).sort((a,b)=>a.rank.localeCompare(b.rank)).map(item=>item.entry);
    for(const entry of ordered)if(canUsePhoto(entry.record,entry.photo))return descriptor(entry);
    return null;
  }
  function paginate(list,{after,limit,signature,compare,start=0}){
    const anchor=decodeCursor(after,signature);
    let offset=start;
    if(anchor){let lo=0,hi=list.length;while(lo<hi){const mid=(lo+hi)>>>1;if(compare(list[mid].sort,anchor)<=0)lo=mid+1;else hi=mid;}offset=lo;}
    const selected=list.slice(offset,offset+limit),hasMore=offset+selected.length<list.length;
    const nextCursor=hasMore?Buffer.from(JSON.stringify({v:1,signature,sort:selected.at(-1).sort})).toString('base64url'):null;
    return {selected,hasMore,nextCursor};
  }
  function monthRail(selected,reverse,extraRecords=[]){
    const months=new Map();for(const entry of selected){if(!months.has(entry.month))months.set(entry.month,new Set());months.get(entry.month).add(entry.record.id);}
    for(const record of extraRecords){const month=monthOf(record.date);if(!months.has(month))months.set(month,new Set());months.get(month).add(record.id);}
    return [...months].map(([key,ids])=>({key,title:key==='unknown'?'日期待补充':Number(key.slice(5))+'月',...(key==='unknown'?{}:{year:Number(key.slice(0,4))}),count:ids.size}))
      .sort((a,b)=>(reverse?1:-1)*(a.key==='unknown'?'':a.key).localeCompare(b.key==='unknown'?'':b.key));
  }
  function renderBrowse(value,signature,result){
    const searchHits=result&&hitMap(result.hits),selected=scoped(value,{searchHits});
    const searchInfo=result?{search:result.search}:{};
    const textOnly=['date','random'].includes(value.mode)&&![value.q,value.place,value.province,value.city,value.month].some(Boolean)?emptyRecords:[];
    const months=monthRail(value.month?scoped(value,{ignoreMonth:true,searchHits}):selected,value.reverse,textOnly);
    const grouping=value.mode==='month'&&!value.month?'month':value.mode==='province'&&!value.province?'province':value.mode==='province'&&!value.city?'city':null;
    if(grouping){
      const buckets=new Map();for(const entry of selected){const key=grouping==='month'?entry.month:grouping==='province'?entry.provinceKey:entry.cityKey;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(entry);}
      const groups=[...buckets].map(([key,list])=>{
        const title=grouping==='month'?(key==='unknown'?'日期待补充':Number(key.slice(5))+'月'):grouping==='province'?list[0].provinceTitle:list[0].cityTitle;
        const unknown=grouping==='month'?key==='unknown':grouping==='province'?key==='unknown':title==='城市待补充';
        return {key,list,title,sort:grouping==='month'?[unknown?'':key]:[unknown?(value.reverse?'0':'1'):(value.reverse?'1':'0'),title,key],...(grouping==='month'&&!unknown?{year:Number(key.slice(0,4))}:{})};
      });
      const compare=grouping==='month'?(a,b)=>(value.reverse?1:-1)*compareParts(a,b):compareParts;groups.sort((a,b)=>compare(a.sort,b.sort));
      const page=paginate(groups,{...value,signature,compare});
      return {kind:'groups',groups:page.selected.map(group=>({key:group.key,title:group.title,...(group.year===undefined?{}:{year:group.year}),photoCount:group.list.length,dayCount:new Set(group.list.map(e=>e.record.id)).size,
        cover:cover(group.list,{type:grouping,key:group.key,province:grouping==='city'?value.province:''})})),records:[],months,total:groups.length,hasMore:page.hasMore,nextCursor:page.nextCursor,revision:getRevision(),...searchInfo};
    }
    const byDay=new Map();for(const entry of selected){if(!byDay.has(entry.record.id))byDay.set(entry.record.id,[]);byDay.get(entry.record.id).push(entry);}
    const days=[...[...byDay.values()].map(list=>({list,record:list[0].record})),...textOnly.map(record=>({list:[],record}))].map(day=>({...day,
      sort:value.mode==='random'?[day.record.date?(value.reverse?'1':'0'):(value.reverse?'0':'1'),digest((value.seed||salt)+'/'+day.record.id),day.record.id]:[day.record.date||'',day.record.savedAt||'',day.record.id]}));
    const compare=value.mode==='random'?compareParts:(a,b)=>(value.reverse?1:-1)*compareParts(a,b);days.sort((a,b)=>compare(a.sort,b.sort));
    let start=0;
    if(value.jump&&value.mode==='date'){
      const target=value.jump==='unknown'?'':value.jump;
      start=days.findIndex(day=>value.reverse?(day.record.date||'').slice(0,7)>=target:(day.record.date||'').slice(0,7)<=target);
      if(start<0)start=days.length;
    }
    const page=paginate(days,{...value,signature,compare,start});
    return {kind:'days',groups:[],records:page.selected.map(({list,record})=>{
      const matchedPhotoIds=[value.q,value.place,value.province,value.city].some(Boolean)?list.map(entry=>entry.photo.id):[],base=toCard(record);
      const selectedCover=cover(list,{type:'day',key:record.id}),photo=selectedCover&&record.media.find(photo=>photo.id===selectedCover.photoId);
      if(!photo)return {...base,matchedPhotoIds,media:[]};
      return {...base,matchedPhotoIds,media:[{id:photo.id,name:photo.name,status:photo.status,relativePath:photo.relativePath,metadata:Object.fromEntries(['mime','width','height','capturedAt','bytes'].filter(k=>photo.metadata?.[k]!==undefined).map(k=>[k,photo.metadata[k]]))}]};
    }),months,total:days.length,hasMore:page.hasMore,nextCursor:page.nextCursor,revision:getRevision(),...searchInfo};
  }
  function browse(input={}){
    const value=options(input);
    return renderBrowse(value,browseSignature(value));
  }
  async function browseWithSearch(input,selectPhotos){
    const value=options(input),signature=browseSignature(value);
    if(!value.q)return renderBrowse(value,signature);
    // Reject stale or malformed cursors before incurring a model call.
    decodeCursor(value.after,signature);
    const folder=[value.province,value.city,value.month];
    const folderFilter=folder.some(Boolean)?()=>{
      const allowed=new Map();
      for(const entry of data())if(matchesFolder(entry,value)){
        if(!allowed.has(entry.record.id))allowed.set(entry.record.id,new Set());
        allowed.get(entry.record.id).add(entry.photo.id);
      }
      return (recordId,photoId)=>Boolean(allowed.get(recordId)?.has(photoId));
    }:undefined;
    const result=await selectPhotos(value.q,{place:value.place,searchId:value.searchId,folder,folderFilter,continuation:Boolean(value.after)});
    return renderBrowse(value,signature,result);
  }
  function coverScope(input){
    const type=input.type,key=keyLimit(input.key??'','分类'),province=keyLimit(input.province??'','省份');
    if(!['province','city','month','day'].includes(type)||!key||type==='month'&&!monthValid(key))throw fail('封面分类格式不正确');
    return {type,key,province:type==='city'?province:''};
  }
  function coverEntries(scope){
    const all=data();
    if(scope.type==='day')return dayEntries.get(scope.key)||[];
    return all.filter(entry=>scope.type==='month'?entry.month===scope.key:scope.type==='province'?entry.provinceKey===scope.key:(!scope.province||entry.provinceKey===scope.province)&&entry.cityKey===scope.key);
  }
  function listCovers(input={}){
    const scope=coverScope(input),limit=pageLimit(input.limit??24),signature=digest(JSON.stringify(scope));
    const all=coverEntries(scope).filter(entry=>canUsePhoto(entry.record,entry.photo)).map(entry=>({entry,sort:[entry.record.date||'',entry.record.savedAt||'',entry.record.id,entry.photo.id]}));
    const compare=(a,b)=>-compareParts(a,b);all.sort((a,b)=>compare(a.sort,b.sort));
    const page=paginate(all,{after:input.after??'',limit,signature,compare});
    return {photos:page.selected.map(({entry})=>descriptor(entry)),nextCursor:page.nextCursor,hasMore:page.hasMore,total:all.length};
  }
  async function setCover(input={}){
    const scope=coverScope(input),recordId=keyLimit(input.recordId??'','档案编号',100),photoId=keyLimit(input.photoId??'','照片编号',100);
    const entry=coverEntries(scope).find(entry=>entry.record.id===recordId&&entry.photo.id===photoId);
    if(!entry||!canUsePhoto(entry.record,entry.photo))throw fail('这张照片不属于当前分类，或原图已不可用');
    await savePreference(preferenceKey({...scope,province:scope.type==='city'?entry.provinceKey:''}),{recordId,photoId});
    return {cover:descriptor(entry),revision:getRevision()};
  }
  return {browse,browseWithSearch,listCovers,setCover};
}
