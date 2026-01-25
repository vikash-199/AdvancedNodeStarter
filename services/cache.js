const mongoose = require('mongoose');
const redis = require('redis');
const util = require('util');

const redisUrl = 'redis://127.0.0.1:';
const client = redis.createClient(redisUrl);
client.get = util.promisify(client.get);
const exec = mongoose.Query.prototype.exec;

mongoose.Query.prototype.exec = async function () {
  const key = JSON.stringify(
    Object.assign({}, this.getQuery(), {
      Collection: this.mongooseCollection.name,
    }),
  );

  //see if we have value for key in redis
  const cachValue = await client.get(key);

  //if value is there in redis return
  if (cachValue) {
    const doc = new this.model(JSON.parse(cachValue));
    return doc;
  }

  // otherwise, issu the query and store the result in redis
  const result = await exec.apply(this, arguments);

  client.set(key, JSON.stringify(result));
  return result;
};
