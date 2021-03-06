#!/bin/sh

rm -rf /tmp/sde;
unzip $1/*.zip -d /tmp;
find /tmp/sde -name "*.DS_Store" -type f -delete;
find /tmp/sde -name "*.DS_Store" -type d -delete;

node import_sde_mongo.js clear bsd &&
    node import_sde_mongo.js clear fsd &&
    node import_sde_mongo.js transform bsd &&
    node import_sde_mongo.js transform fsd &&
    node import_sde_mongo.js transform universe &&
    node import_sde_mongo.js import bsd &&
    node import_sde_mongo.js import fsd;
