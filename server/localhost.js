// express
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var os = require('os');

var request = require('request');
var onURL = 'https://maker.ifttt.com/trigger/lightsensor_on/with/key/' + process.env.IFTTT_KEY;
var offURL = 'https://maker.ifttt.com/trigger/lightsensor_off/with/key/' + process.env.IFTTT_KEY;
var irkitOption = {
  uri: 'http://' + process.env.IRKIT_HOST + '.local/messages',
  headers: { 'X-Requested-With': 'curl' },
  body: JSON.stringify(
    {"format":"raw","freq":38,"data":[3968,1994,11139,2064,3013,1002,3013,1002,1002,1002,1002,1002,1002,1002,1002,1002,1002,1002,1002,1002,3013,1002,1002,1002,1002,1002,1002,1002,1002,1002,1002,1002,1002,1002,3013,1002,1002,1002,1002,1002,3013,1002,1002,1002,1002,1002,1002,1002,1002,1002,1002,1002,1002,1002,1002,1002,1002,1002,1002,1002,1002,1002,1002,1002,1002,1002,1002,1002,1002,1002,1002,1002,3013,1002,3013,1002,3013,1002,1002,1002,3013,1002,3013,1002,1002]} 
  )
};

var lightOn = true;
var lowCounter = 0;

var MILKCOCOA_APP_ID = process.env.MILKCOCOA_APP_ID;
var MILKCOCOA_DATASTORE_ID = "lightsensor_data";

console.log(new Date());
console.log("MILKCOCOA_APP_ID:" + MILKCOCOA_APP_ID);
console.log("MILKCOCOA_DATASTORE_ID:" + MILKCOCOA_DATASTORE_ID);

// NodeJS起動時に自分のネットワーク状態を調べる
// まだMilkcocoaには送らない
console.log("os.networkInterfaces");
console.log(os.networkInterfaces());

// milkcocoa /////////////////////////////////

var MilkCocoa = require("./node_modules/milkcocoa/index.js");
var milkcocoa = new MilkCocoa(MILKCOCOA_APP_ID + ".mlkcca.com");
// dataStore設定
var sampleDataStore = milkcocoa.dataStore(MILKCOCOA_DATASTORE_ID);
// データがpushされたときのイベント通知
sampleDataStore.on("push", function(datum) {
    // 内部のログ
    console.log('[push complete]');
    console.log(datum);

    // データストアの最大件数に達しないように古いデータを削除
    sampleDataStore.stream().size(1).sort('asc').next(function(err, data) {
      if (err) {
        console.log('Error: ' + err);
        return;
      }

      data.forEach(function(value) {
        console.log('[remove ' + value.id + ']');
        sampleDataStore.remove(value.id,
            function(err, datum) {
              if (err !== null )
                console.log('Remove Error: ' + err);
            },
            function(err) {
              console.log('Remove Error: ' + err);
            });
      });
    });
});

// Server ////////////////////////////////////

app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.listen(app.get('port'), function() {
    // サーバー起動時にMilkcocoaにネットワーク状態を送る
    var networkInterfaces = os.networkInterfaces();
    sampleDataStore.push(networkInterfaces);
    // こちらは通常の起動したログを出す
    console.log("Node app is running at localhost:" + app.get('port'));
});

// root
app.get('/', function(request, response) {
    response.send('Hello Milkcocoa!');
});

// Serial Port ///////////////////////////////

var serialport = require('serialport');
var portName = '/dev/ttyACM0';
var sp = new serialport.SerialPort(portName, {
    baudRate: 9600,
    dataBits: 8,
    parity: 'none',
    stopBits: 1,
    flowControl: false,
    parser: serialport.parsers.readline("\r\n")
});

// シリアルポート入力からのMilkcocoaへのデータ送信
sp.on('data', function(input) {
    var sensorData = new Buffer(input, 'utf8');
    try {
        console.log('sensorData: ' + sensorData);
        //sampleDataStore.push({ sensorData : (sensorData + '').split(',').map(Number) });
        dataArray = (sensorData + '').split(',');
        data = {
          light: Number(dataArray[0]),
          sound: Number(dataArray[1]),
          motion: Number(dataArray[2])
        };
        sampleDataStore.push({ sensorData : data },
            function(err, datum) {
              if (err !== null )
                console.log('Error: ' + err);
            },
            function(err) {
              console.log('Error: ' + err);
            });

        console.log(Number(data.light));
        console.log(lightOn);
        var now = new Date();
        if ((7 <= now.getHours()) && (now.getHours() <= 22)) {
          if (!lightOn && (Number(data.motion) == 1)) {
            console.log('IRKit on');
            request.post(irkitOption, function (error, response, body) {
              if (!error && response.statusCode == 200) {
                console.log(body);
              } else {
                console.log('error: '+ response.statusCode);
              }
            });
          }
        }
        if (!lightOn && (500 < Number(data.light))) {
          lowCounter = 0;
          console.log('light on');
          lightOn = true;
          request(onURL, function (error, response, body) {
            if (!error && response.statusCode == 200) {
              //console.log(JSON.parse(body).name);
              console.log(body);
            } else {
              console.log('error: '+ response.statusCode);
            }
          })
        } else if (lightOn && (Number(data.light) < 300)) {
          console.log('light low');
          lowCounter++;

          if (10 < lowCounter) {
            console.log('light off');
            lightOn = false;
            request(offURL, function (error, response, body) {
              if (!error && response.statusCode == 200) {
                //console.log(JSON.parse(body).name);
                console.log(body);
              } else {
                console.log('error: '+ response.statusCode);
              }
            })
          }
        } else {
          lowCounter = 0;
        }
    } catch(e) {
        console.log(e);
        return;
    }
});
