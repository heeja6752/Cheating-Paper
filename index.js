const { readFileSync } = require('fs');
const { createServer } = require('http');
const { Server } = require('socket.io');

const httpServer = createServer((req, res) => {
  if (req.url !== '/') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  // reload the file every time
  const content = readFileSync('index.html');
  const length = Buffer.byteLength(content);

  res.writeHead(200, {
    'Content-Type': 'text/html',
    'Content-Length': length,
  });
  res.end(content);
});

httpServer.listen(8000);

function getPlayerColor() {
  return '#' + Math.floor(Math.random() * 16777215).toString(16);
}

const io = new Server(httpServer, {
  // Socket.IO options
});

io.on('connection', (socket) => {
  console.log(`connect ${socket.id}`);

  socket.on('disconnect', (reason) => {
    console.log(`disconnect ${socket.id} due to ${reason}`);
  });
});

const startX = 1024 / 2;
const startY = 768 / 2;

class PlayerBall {
  constructor(socket) {
    this.socket = socket;
    this.x = startX;
    this.y = startY;
    this.color = getPlayerColor();
  }

  get id() {
    return this.socket.id;
  }
}

var balls = [];
var ballMap = {};

function joinGame(socket) {
  let ball = new PlayerBall(socket);

  balls.push(ball);
  ballMap[socket.id] = ball;

  return ball;
}

function endGame(socket) {
  for (var i = 0; i < balls.length; i++) {
    if (balls[i].id == socket.id) {
      balls.splice(i, 1);
      break;
    }
  }
  delete ballMap[socket.id];
}

io.on('connection', function (socket) {
  console.log(`${socket.id}님이 입장하셨습니다.`);

  socket.on('disconnect', function (reason) {
    console.log(`${socket.id}님이 ${reason}의 이유로 퇴장하셨습니다. `);
    endGame(socket);
    socket.broadcast.emit('leave_user', socket.id);
  });

  let newBall = joinGame(socket);
  socket.emit('user_id', socket.id);

  for (var i = 0; i < balls.length; i++) {
    let ball = balls[i];
    socket.emit('join_user', {
      id: ball.id,
      x: ball.x,
      y: ball.y,
      color: ball.color,
    });
  }
  socket.broadcast.emit('join_user', {
    id: socket.id,
    x: newBall.x,
    y: newBall.y,
    color: newBall.color,
  });

  socket.on('send_location', function (data) {
    socket.broadcast.emit('update_state', {
      id: data.id,
      x: data.x,
      y: data.y,
    });
  });
});
