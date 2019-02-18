const assert = require('assert');
const mongoose = require("mongoose");
const process = require('process');
const Schema = mongoose.Schema;
const mongooseLeanVirtuals = require('mongoose-lean-virtuals');
const userInfo = [
  {firstname: "foo", lastname: 'bar'},
  {firstname: "baz", lastname: 'biz'},
];

const UserSchema = new Schema({
  firstname: {
    type: String
  },
  lastname: {
    type: String
  },
  bffId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  toObject: {
    virtuals: true
  },
  toJSON: {
    virtuals: true
  }
});

UserSchema.virtual("fullname").get(function() {
  if (this._fullname === undefined) {
    this._fullname = this.firstname + this.lastname;
  }
  return this._fullname;
});

UserSchema.virtual('bff', {
  ref: 'User',
  localField: 'bffId',
  foreignField: '_id',
  justOne: true,
});

UserSchema.plugin(mongooseLeanVirtuals);

const User = mongoose.model('User', UserSchema);

mongoose.connect(process.env.DBURL || "mongodb://localhost/test", {
  useNewUrlParser: true,
}).then(() => {
  return User.findOne(userInfo[0]).exec();
}).then((users) => {
  if (users) return;
  // If user0 not found, assume new db; create both.
  let usr0 = new User(userInfo[0]);
  let usr1 = new User(userInfo[1]);
  usr1.bffId = usr0._id;
  return Promise.all([usr0.save(), usr1.save()]);
}).then(() => {
  return User.findOne(userInfo[1]).populate("bff").lean({virtuals: true}).exec();
}).then((user1) => {
  assert(user1, 'User 1 is expected to be defined');
  assert(user1.bff, 'User 1\'s BFF should be populated');
  assert(user1.bff._id === user1.bffId, 'User 1\'s BFF should be populated with user 0');
}).catch((err) => {
  console.error('There was an error: ' + (err.stack || err));
}).finally(() => {
  return mongoose.disconnect();
});
