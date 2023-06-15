const express = require('express');
const sess = require('express-session');
const mongoSanitize = require('express-mongo-sanitize');
const favicon = require('serve-favicon');
const {mongoose} = require('./mongoose/mongoose');
const WebSocket = require( "ws");
const {Room} = require('./models/rooms');
const fs = require('fs');

let app = express();
app.disable('x-powered-by');
app.use(express.static('public'));
app.use(express.json({limit: '2mb'}))
app.use(express.urlencoded({limit: '2mb', extended: true }))
app.use(mongoSanitize());
app.set('view cache', true);

app.use(sess({
    secret: 'howmuchisthemeet',
    resave: false,
    saveUninitialized: true,
    cookie: { expires: new Date(Date.now() + 9000000000) }
}));

app.use(favicon('./public/favicon.png'));

app.set('view engine', 'pug');

app.get('/', (req, res) => {
    res.render('index');
});

//метод создания новой комнаты
app.post('/create', (req, res) => {
    req.session.ms = true;
    let room = new Room({
        cost: req.body.cost,
        users: [],
        usersCount: 1
    });
    room.save().then((result) => {
        req.session.room = result._id;
        res.redirect('/room/'+result._id);
    })
});

//метод присоединения к имеющейся комнате
app.post('/join', (req, res) => {
    Room.findOne({_id: req.body.roomid}).then((result) => {
        if(result) {
            req.session.room = result._id;
            Room.updateOne({_id: req.body.roomid}, {$inc: {cost: req.body.cost, usersCount: 1}}).then(() => {
                res.redirect('/room/'+req.body.roomid);
            })
        } else {
            res.redirect('/')
        }
    })
});

//метод открытия страницы комнаты
app.get('/room/:roomid', (req, res) => {
    if(req.session.room === req.params.roomid) {
        Room.findOne({_id: req.params.roomid}).then((result) => {
            if(result) {
                let data = {};
                if(req.session.ms) {
                    data.ms = true
                }
                data.room = result._id;
                data.usersCount = result.usersCount;
                res.render('room', {data: data});
            } else {
                res.redirect('/');
            }
        });
    } else {
        Room.findOne({_id: req.params.roomid}).then((result) => {
            if(result) {
                res.render('preroom', {room: req.params.roomid});
            } else {
                res.redirect('/')
            }
        });
    }
})

const options = {
    cert: fs.readFileSync('/etc/letsencrypt/live/howmuchisthemeet.ru/fullchain.pem'),
    key: fs.readFileSync('/etc/letsencrypt/live/howmuchisthemeet.ru/privkey.pem'),
    ciphers: [
        "ECDHE-RSA-AES128-SHA256",
        "DHE-RSA-AES128-SHA256",
        "AES128-GCM-SHA256",
        "RC4",
        "HIGH",
        "!MD5",
        "!aNULL"
    ].join(':')
};

let server = require('https').createServer(options, app);
//let server = require('http').createServer(app);

const webSocketServer = new WebSocket.Server({server});

let clients = {};//куча клиентов
webSocketServer.on('connection', function(ws, req) {
    let id = Math.random();
    clients[id] = ws
    let ms = req.url.slice(1).split('?')[1];
    let roomID = req.url.slice(1).split('?')[0];
    let timer;
    let actualCost = 0;
    Room.findOne({_id: roomID}).then((result) => {
        if(result) {
            Room.updateOne({_id: result._id}, {$push: {users: id}}).then(() => {
                result.users.forEach(user => {
                    clients[user].send('usersCount:'+result.usersCount);
                });
            })
        }
    });

    ws.on('message', function(message) {
        if(ms) {
            Room.findOne({_id: roomID}).then((result) => {
                if(result) {
                    if(message.toString() === 'start') {
                        timer = setInterval(function() {
                            Room.findOne({_id: roomID}).then((data) => {
                                actualCost = actualCost + (data.cost/576000*5);
                                data.users.forEach(user => {
                                    clients[user].send('actualCost:'+actualCost.toFixed(2));
                                });
                            })
                        }, 5000);
                    }
                    if(message.toString() === 'stop') {
                        clearInterval(timer);
                        result.users.forEach(user => {
                            clients[user].send('actualCost:'+actualCost.toFixed(2));
                        });
                    }
                }
            });
        }
    })
    
    ws.on('close', function() {
        if(ms) {//если вышел владелец - удаляем комнату из базы, и клиентов из кучи
            clearInterval(timer);
            Room.findOne({_id: roomID}).then((result) => {
                if(result) {
                    result.users.forEach(user => {
                        clients[user].send('close');
                        delete clients[user];
                    });
                }
                Room.deleteOne({_id: roomID}).then(() => {});
            });
        } else {//если вышел клиент - просто удаляем его из кучи
            Room.findOne({_id: roomID}).then((result) => {
                if(result) {
                    Room.updateOne({_id: roomID}, {$pull: {users: id}}).then(() => {
                        try {
                            delete clients[user];
                        } catch(e) {}
                    });
                }
            })
        }
    });
});

server.listen(443);
console.log('Server started!');