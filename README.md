# 一些eve online工具


## 各js工具作用:
1. 导入静态数据，执行import_sde_mongo.js(原始数据见有用链接)
2. 缓存市场数据，cache_market.js
3. 计算每种商品最大利润路线，calculate_type_profit.js
4. 计算指定两站之间的多商品运输利润路线，store_station_pair.js(队列缓存需要计算的空间站对), calculate_station_profit.js(可多进程执行)
5. 缓存市场数据到mongodb，cache_market_mongo.js

## /bin目录下工具:
1. backup_mongo.sh 备份导入的静态数据库
2. import_mongo.sh 导入静态数据库
3. calculate.sh 缓存市场数据并计算

## api启动方法:
node api/index.js

## 其它说明
1. 当线上环境内存特别小时，先在本地执行import_mongo.sh，再将/tmp/sde整个目录压缩后sftp传到线上解包，最后执行node import_sde_mongo.js import fsd 和 node import_sde_mongo.js import bsd
2. 缓存redis内存不够时。定时脚本缓存市场数据到mongo：*/5 * * * * echo $(date) >> /tmp/eve_cache_market.log && /home/zzz/.nvm/versions/node/v8.9.3/bin/node /home/zzz/eve_tool/cache_market_mongo.js cache >> /tmp/eve_cache_market.log

## 有用链接
- [API接口](https://esi.tech.ccp.is/latest/)
- [原始数据库文件等](https://developers.eveonline.com/resource/resources)
