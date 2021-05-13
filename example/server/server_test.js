const WebSocket = require('ws');
const fs = require('fs');
const FFmpegClient = require('./audio.js');
let buffer_data = Buffer.from([]);
let options = {
    'channel_id': "1",
    "url": "rtsp://admin:Admin123@10.61.185.18:554/Streaming/Channels/1",
    "audio_port": 8083,
    "ffmpeg_path": "/usr/bin/ffmpeg",
    "acodec": "pcm_s16le"
}
let ffmpegClient = new FFmpegClient(options);
ffmpegClient.ffmpegTurnOnCmd();
let wss = new WebSocket.Server({ port: 8180 });
console.log('Server ready...');

ffmpegClient.on('audio_rtp_packet', data => {
    // console.log(data.slice(0, 12));
    // console.log(data.slice(12, 24));
    let buffer = data.slice(12);
    // console.log("length:", buffer.length);
    sendData(buffer);
    // wss.emit('sending_data', data);
});

// let buffer_list = [],
//     sampleRate = 8000, // 8000 samples obtained per second
//     bytePerSample = 2, 
//     channels = 1,
//     buffer,
//     bytesChunk = (sampleRate * bytePerSample * channels);

// wss.on('sending_data', data => {
//     console.log('Socket connected. sending data...');
//     if (buffer_list.length <100){
//         buffer_list.push(data);
//     }
//     else{
//         buffer = Buffer.concat(buffer_list);
//         console.log("buffer length: ", buffer.length);
//         buffer_list = [];
//         sendData(buffer);
//     }

// });

function sendData(payload) {
    buffer_data = Buffer.concat([buffer_data, payload]);
    if (buffer_data.length < 32000) return;
    wss.clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN) {
        // console.log('sending.....' + payload.length )
        // client.send(payload);
        console.log('sending.....' + buffer_data.length)
        client.send(buffer_data);
      }
    });
    buffer_data = Buffer.from([]);
}
