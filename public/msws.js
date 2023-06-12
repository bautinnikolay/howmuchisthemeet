let socket, cost;
let actualCost = 0;

window.onload = function() {
    let url = document.getElementById('room').value;
    
    if(document.getElementById('ms').value === 'true') {
        url += '?ms'
    }
    socket = new WebSocket("wss://howmuchisthemeet.ru:443/"+url);

    socket.onmessage = function(event) {
        if(event.data.includes('newCost')) {
            cost = parseFloat(event.data.split(':')[1]);
        }
        if(event.data.includes('usersCount')) {
            document.getElementById('usersCount').textContent = event.data.split(':')[1];
        }
    };
    return false;
};

document.getElementById('start').onclick = function() {
    socket.send('start');
    startTimer();
    document.getElementById('start').disabled = true;
}

document.getElementById('stop').onclick = function() {
    socket.send('stop');
    clearTimeout(timer);
    document.getElementById('start').disabled = false;
}

document.getElementById('exit').onclick = function() {
    window.location.replace('https://howmuchisthemeet.ru/');
}

function startTimer() {
    timer = setTimeout(function() {
        actualCost = actualCost+cost;
        document.getElementById('cost').textContent = actualCost.toFixed(2);
        startTimer();
    }, 1000);
}

function copyUrl() {
    navigator.clipboard.writeText(document.getElementById('roomUrl').value);
    let cpButton = document.getElementById('cpButton');
    cpButton.disabled = true;
    cpButton.textContent = 'Готово!';
    cpButton.classList.remove('btn-outline-secondary');
    cpButton.classList.add('btn-success');
    setTimeout(function() {
        cpButton.disabled = false;
        cpButton.textContent = 'Копировать';
        cpButton.classList.remove('btn-success');
        cpButton.classList.add('btn-outline-secondary');
    }, 2000)
}
