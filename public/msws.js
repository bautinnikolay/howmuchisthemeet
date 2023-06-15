let socket;

window.onload = function() {
    let url = document.getElementById('room').value;
    
    if(document.getElementById('ms').value === 'true') {
        url += '?ms'
    }
    socket = new WebSocket("wss://howmuchisthemeet.ru:443/"+url);

    socket.onmessage = function(event) {
        if(event.data.includes('usersCount')) {
            document.getElementById('usersCount').textContent = event.data.split(':')[1];
        }
        if(event.data.includes('actualCost')) {
            document.getElementById('cost').textContent = event.data.split(':')[1];
        }
    };
    return false;
};

document.getElementById('start').onclick = function() {
    socket.send('start');
    document.getElementById('start').disabled = true;
}

document.getElementById('stop').onclick = function() {
    socket.send('stop');
    document.getElementById('start').disabled = false;
}

document.getElementById('exit').onclick = function() {
    window.location.replace('https://howmuchisthemeet.ru/');
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
