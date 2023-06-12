const express = require('express');
const sess = require('express-session');
const mongoSanitize = require('express-mongo-sanitize');
const favicon = require('serve-favicon');
const {mongoose} = require('./mongoose/mongoose');
const WebSocket = require( "ws");
const {Room} = require('./models/rooms');

let socketPort = process.env.SOCKET_PORT ? process.env.SOCKET_PORT : 8081;
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
        res.render('preroom', {room: req.params.roomid});
    }
})

const options = {
    cert: fs.readFileSync('/etc/letsencrypt/live/howmuchisthemeet.ru/fullchain.pem'),
    key: fs.readFileSync('/etc/letsencrypt/live/howmuchisthemeet.ru/privkey.pem')
};

let server = require('https').createServer(app, options)

const webSocketServer = new WebSocket.Server({
    port: socketPort
});

let clients = {}//куча клиентов

webSocketServer.on('connection', function(ws, req) {
    let id = Math.random();
    clients[id] = ws
    let ms = req.url.slice(1).split('?')[1];
    let roomID = req.url.slice(1).split('?')[0];
    Room.findOne({_id: roomID}).then((result) => {
        if(result) {
            Room.updateOne({_id: result._id}, {$push: {users: id}}).then(() => {
                cost = (result.cost/576000).toFixed(2);//делим общую кучу денег на количество рабочих секунд в месяце из расчёта 20 дней по 8 часов
                clients[id].send('newCost:'+cost);
                result.users.forEach(user => {
                    clients[user].send('newCost:'+cost);
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
                        result.users.forEach(user => {
                            clients[user].send('start');
                        });
                    }
                    if(message.toString() === 'stop') {
                        result.users.forEach(user => {
                            clients[user].send('stop');
                        });
                    }
                }
            });
        }
    })
    
    ws.on('close', function() {
        if(ms) {//если вышел владелец - удаляем комнату из базы, и клиентов из кучи
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
            Room.updateOne({_id: roomID}, {$pull: {users: id}}).then(() => {
                delete clients[user];
            });
        }
    });
});

server.listen(443);
console.log('Server started!');