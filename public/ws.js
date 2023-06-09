let socket, cost;
let actualCost = 0;

window.onload = function() {
  let url = document.getElementById('room').value;
  socket = new WebSocket("ws://howmuchisthemeet.ru:8081/"+url);
  socket.onmessage = function(event) {
    if(event.data.includes('newCost')) {
      cost = parseFloat(event.data.split(':')[1]);
    }
    if(event.data.includes('usersCount')) {
      document.getElementById('usersCount').textContent = event.data.split(':')[1];
    }
    if(event.data === 'start') {
      startTimer();
    }
    if(event.data === 'stop') {
      clearTimeout(timer);
    }
    if(event.data === 'close') {
      document.getElementById('content').innerHTML = '<h2 class="text-success">Комната была закрыта её владельцем</h2>'
      socket.close();
    }
  };
  return false;
};
 
function startTimer() {
    timer = setTimeout(function() {
        actualCost = actualCost+cost;
        document.getElementById('cost').textContent = actualCost.toFixed(2);
        startTimer();
    }, 1000);
}
