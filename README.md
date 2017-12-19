# 一些eve online工具


1. 导入静态数据，执行import_sde_mongo.js(原始数据见有用链接)
2. 缓存市场数据，cache_market.js
3. 计算每种商品最大利润路线，calculate_type_profit.js
4. 计算指定两站之间的多商品运输利润路线，store_station_pair.js(队列缓存需要计算的空间站对), calculate_station_profit.js(可多进程执行)
5. api目录下为调用计算结果的接口

## 有用链接
- [API接口](https://esi.tech.ccp.is/latest/)
- [原始数据库文件等](https://developers.eveonline.com/resource/resources)
