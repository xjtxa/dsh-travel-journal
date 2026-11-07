# 第三方组件与数据

本插件使用 busboy、exifr 和 sharp。通过 npm 安装时，包管理器会按 package.json 安装这些依赖及其平台组件，各组件的 LICENSE、NOTICE 和版权信息随对应依赖提供。sharp 的 Windows 平台组件包含预编译原生模块和 libvips，相关许可见 sharp 与 @img/sharp-win32-x64。

离线地图随包保存在 data/geo。OCHA ROAP / HDX 省市数据采用 CC BY 3.0 IGO；geoBoundaries / © OpenStreetMap contributors 区县资料采用 ODbL 1.0。修改后的数据库、来源署名及修改记录保留在 data/geo，重建脚本保留在 tools，完整来源与许可链接见 data/geo/README.md。

demo 包含 5 张公开许可照片，作者、来源、许可和模拟日期、GPS 修改说明见 demo/README.md 与 demo/manifest.json。
