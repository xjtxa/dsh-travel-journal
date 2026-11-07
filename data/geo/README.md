# 离线地图数据

## 足迹示意地图（2026-10-31）

客户端仅加载 `display.json`，这是独立展示用 TopoJSON。此前 OCHA 省市和逐面简化的县界混画，造成异源轮廓不一致及县间重叠/缝隙；现在从核对过身份的原始县源统一构建共享拓扑，县→市→省合并生成，所有层级共用同一套弧线。简化约 150 米，仅在构建时执行，浏览器不再逐面简化。填色、边界、悬停采用同一轮廓，每条共用边只描一次。

用户已明确要求以足迹示意观感为主。`displayVersion: 2` / `purpose: footprint schematic` 在同一县拓扑上合并小块内陆飞地和封闭小洞，再统一生成市、省；默认面积上限50 km²，保护各层唯一/最大主体、海岸海岛、港澳台及复杂带洞部件。移除221个符合规则的次要分片后再填封闭小空隙，所有2864县、366市、34省身份仍保留；该图不再表达这些小块的精确行政归属。原定位资料和用户照片地点不受影响。

展示层为 2864 县级参考单元、366 市级显示单元、34 省级单元。台湾缺少这个县源，使用 OCHA 独立轮廓并标明 `countyUnavailable`，没有人工捏造细分县界。市数与定位表不同，是因为县源保留了六个有明确父级名/代码但 OCHA 表未单列的市级单位。全部差异、构建依赖版本、许可、产物 SHA-256、拓扑与江西采样审计见 `display-provenance.json`。

`tools/build-display-map.mjs` 使用临时安装的 mapshaper 构建，不是插件运行依赖。`display.json` 约 4.74 MiB，随插件提供；更新展示文件不修改原图、GPS 或已保存地名。构建参数 `--schematic-area` 控制示意合并的面积上限，完整规则及被合并分片列表记录在 provenance 中。以下原文件继续专用于坐标解析和来源留存，不能直接叠加到展示地图。

## 定位资料（保持原数据）

定位用省、市图层来自 OCHA ROAP / HDX 的中国 COD-AB 数据。原始文件在 2020-09-10 发布，发布者记载最后一次复核为 2024 年 10 月；界线实际建立年份未知，不能把它描述为“2026 最新行政区划”。原文件同时带中文名、所属省及父子 P-code，避免用附近中心点猜地名。

- 34 个省级单元、360 个市级显示单元。原源为 361 个市级单元，原莱芜市完整并入济南市；记录了那曲地区等名称更新与原源拼写修正。
- 市级包含直辖市、特别行政区、源数据中的省直辖县级单元，不把这些实体伪装成地级市。
- `p2` 保留原始形状，仅保留 6 位小数。显示层可按屏幕简化，定位不使用显示层简化路径。
- 坐标为 WGS-84，经纬度顺序。结构为多多边形 → 环 → 扁平坐标。第一个环是外环，余下环是洞。

来源与再分发许可：[OCHA/HDX 原始数据](https://data.humdata.org/dataset/cod-ab-chn)，[CC BY 3.0 IGO](https://creativecommons.org/licenses/by/3.0/igo/legalcode)。署名 OCHA Regional Office for Asia and the Pacific (ROAP)。省市原文件 SHA-256、P-code、中文原名及修改列在 `ocha-provenance.json` 和每个单元的 `sourceNames` / `sourcePcodes`。

区县层保留 geoBoundaries / OpenStreetMap 的 **2017 年参考边界**，为 ODbL 1.0 数据。© [OpenStreetMap contributors](https://www.openstreetmap.org/copyright)，[geoBoundaries](https://www.geoboundaries.org/)，[ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/)。本目录包含修改后的数据库和可重放修改记录，可在这些许可条件下分发。

原来 67 个空名称不是源文件没有名字，而是先前“代表点落入某多边形”的中文匹配漏配。核对原始 `shapeID`、名称和完全对应的 bbox 后补齐 67 项，并修复 81 项明确错配。所有单元保留原 `shapeID`（`s`）和原名（`sn`）；修正前后字段、特殊旧区划、证据来源在 `name-corrections.json`。不按最近邻填名。澳门堂区等不捏造独立县码，使用真实上级码并明确 `codeLevel`，几何身份由 `s` 唯一确定。

区县层已存在 0.01° 简化和旧区划，不能视作精确现行边界。城市判定优先省市图层，旧区县只能补充同省、同市的名称，不得覆盖其城市。原乌马河区等发生拆分且无法从旧几何辨别现区的，保留“旧界”及所属市；人工修改始终优先。

两个离线源的海岸线覆盖不同。若省市层没有实际面命中，只有在旧县多边形确实包含该点、中文父省父市完整且行政代码与打包市表一致时，才能从县的明确归属补足城市。结果标注 `cityResolution: county-boundary-fallback`、2017 年及 geoBoundaries 来源。没有真实面命中、代码冲突或多个父市互相矛盾时仍为未收录，绝不按最近中心猜，也不联网查询。

构建时运行 `tools/build-ocha.py` 与 `tools/repair-geo-names.mjs`，输入是各自记录的原始源文件及 2024 代码事实表。构建不在客户电脑上运行，运行插件不需要下载地图、填 API key 或使用代理。
