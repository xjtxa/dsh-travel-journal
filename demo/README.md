# 旅行记录合成测试素材

全部拍摄日期、GPS、城市安排和随手说明均为合成测试数据，不代表用户或摄影作者真实到访。照片来自公开许可来源；没有修改任何用户原图。

5 张公开许可照片，模拟 3 座城市、3 天；广州同一天含风景、美食、饮品。奶茶照片故意没有 GPS，城市只来自合成说明，不能生成精确位置。

只替换 JPEG 的 EXIF，并移除可能冲突的旧 XMP/IPTC；未重新编码、缩放或修改像素。已逐张校验压缩图像部分和解码 RGB 像素完全一致。日期、偏移量、坐标、尺寸、哈希及预期归档结果见 manifest.json。

照片中的实际场景与合成城市可能不同（炒饭来源为印度，奶茶来源为香港）；这些数据专用于检验日期分组、位置读取、视觉分类与缺失字段，不是对真实拍摄地点的断言。

## 来源与许可

以下每张照片及仅改元数据的版本沿用所列许可。转发照片时应保留作者、来源、许可链接与修改说明；CC BY-SA 素材继续按对应相同许可分享。

- `photos/01-guangzhou-river.jpg` — [Guangzhou skyline.jpg](https://commons.wikimedia.org/wiki/File:Guangzhou_skyline.jpg)，作者 jo.sau，[CC BY 2.0](https://creativecommons.org/licenses/by/2.0)。修改：仅置入明确标记为合成测试的时间/GPS元数据。
- `photos/02-guangzhou-rice.jpg` — [FRIED RICE.jpg](https://commons.wikimedia.org/wiki/File:FRIED_RICE.jpg)，作者 ప్రశాంతి，[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0)。修改：仅置入明确标记为合成测试的时间/GPS元数据。
- `photos/03-guangzhou-tea-no-gps.jpg` — [Hong Kong-style milk tea.jpg](https://commons.wikimedia.org/wiki/File:Hong_Kong-style_milk_tea.jpg)，作者 City Foodsters，[CC BY 2.0](https://creativecommons.org/licenses/by/2.0)。修改：仅置入明确标记为合成测试的时间/GPS元数据。
- `photos/04-shenzhen-skyline.jpg` — [Shenzhen Skyline from Nanshan.jpg](https://commons.wikimedia.org/wiki/File:Shenzhen_Skyline_from_Nanshan.jpg)，作者 Simbaxu，[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0)。修改：仅置入明确标记为合成测试的时间/GPS元数据。
- `photos/05-hangzhou-lake.jpg` — [West Lake Hangzhou.jpg](https://commons.wikimedia.org/wiki/File:West_Lake_Hangzhou.jpg)，作者 jaaron，[CC BY 2.0](https://creativecommons.org/licenses/by/2.0)。修改：仅置入明确标记为合成测试的时间/GPS元数据。

## 建议检查

- 按 EXIF 拍摄日生成 3 条每日记录，不按下载或导入日分组。
- 8 月 1 日的 3 张照片归为同一日，并保留不同类别。
- 奶茶的 GPS 保持空；允许依据用户说明归入广州，但不得编造店名或精确坐标。
- 检索“在广州吃了什么”“哪天喝奶茶”“杭州的风景”时，返回相应照片和注明为合成的说明。
- 测试输出和长期存档保留 synthetic=true；不要混入真实旅行记录。
