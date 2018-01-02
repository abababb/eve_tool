#!/bin/sh

cd /tmp
rm -rf backup_mongo;
mkdir backup_mongo;
cd backup_mongo;
mongodump -d fsd -o .;
mongodump -d bsd -o .;
cd ..;
tar -czvf backup_mongo.tar.gz backup_mongo
