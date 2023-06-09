const mongoose = require('mongoose')

let RoomSchema = new mongoose.Schema({
    cost: {
        type: Number,
        required: true
    },
    users: {
        type: Array,
        required: true
    },
    usersCount: {
        type: Number,
        required: true
    }
  })
  
  const Room = mongoose.model('Room', RoomSchema)
  
  module.exports = {Room}