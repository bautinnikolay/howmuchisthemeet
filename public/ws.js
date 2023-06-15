let socket;

window.onload = function() {
  let url = document.getElementById('room').value;
  socket = new WebSocket("wss://howmuchisthemeet.ru:443/"+url);
  socket.onmessage = function(event) {
    console.log('event here: '+event);
    if(event.data.includes('usersCount')) {
      document.getElementById('usersCount').textContent = event.data.split(':')[1];
    }
    if(event.data.includes('actualCost')) {
      document.getElementById('cost').textContent = event.data.split(':')[1];
    }
    if(event.data === 'close') {
      document.getElementById('content').innerHTML = '<h2 class="text-success">Комната была закрыта её владельцем</h2>'
      socket.close();
    }
  };
  return false;
};
