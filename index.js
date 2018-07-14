var async = require("async");
 
var fs = require("fs");
var GameManager = require("./offline/game_manager");
var game = new GameManager(4);
var neataptic = require("neataptic");
var NNode = neataptic.Node;
var Neat = neataptic.Neat;
var Network = neataptic.Network;
var Methods = neataptic.Methods;
var architect = neataptic.architect;
var batchSize = 121+11;
var bestEver = 0;
var pop = [];
var strictEnd = false;
var loadedNet = randNet();
var loadIt = true;
function randNet() {
  //return neataptic.
  var network = architect.Random(game.size * game.size, 10,4);
  return network;
}
if (loadIt) {
  fs.readFile('training_state.json','utf8', (err, data) => {
    if (err){
      console.log(err);
      for (var i = 0; i < batchSize; i++) {
        //pop.push(randNet());
        pop.push({net:randNet(),score:false});
      }
      go();
    }
    //console.log(data);
    //console.log(data.split(";")[0]);
    pop = data.split("\n").map(n => ({net:Network.fromJSON(JSON.parse(n)),score:false}));
    if(pop.length<batchSize){
      pop=pop.slice(0,batchSize);
    }
    while(pop.length<batchSize){
      //pop.push(randNet());
    pop.push({net:randNet(),score:false});
    }
    go();
    //batchSize = pop.length;
  });
} else {
  for (var i = 0; i < batchSize; i++) {
    //pop.push(randNet());
  pop.push({net:randNet(),score:false});
  }
  go();
}
function go(){
console.log("MADE");
function currentBoard() {
  return game.grid.cells.reduce((a, b) => a.concat(b)).map(x => (
    x
    ? 0.5 / x.value
    : 1));
}

var runningNet = false;
var runningLoop = -1;
var stuck = false;
//drawGraph(network.graph(1000, 800), '.svg');
function testNetVisible(network) {
  window.clearInterval(runningLoop);
  game.restart();
  runningNet = network;
  stuck = false;
  runningLoop = window.setInterval(tickVisible, 20);
  /*while(!game.over){
    var choices=network.activate(currentBoard());
    var max=Math.max(...choices);
    game.move([0,1,2,3].filter(x=>choices[x]===max)[0]);
  }*/
}

var runningNet = false;
var runningLoop = -1;
var stuck = false;
//drawGraph(network.graph(1000, 800), '.svg');
function testNet(network) {
  //  window.clearInterval(runningLoop);
  game.restart();
  runningNet = network;
  stuck = false;
  //  runningLoop=window.setInterval(tick,100);
  while (!(game.over || stuck)) {
    var choices = runningNet.activate(currentBoard());
    var max = Math.max(...choices);
    var markedChoices = [0, 1, 2, 3].map(x => ({v: x, s: choices[x]}));
    markedChoices.sort(function(a, b) {
      return b.s - a.s;
    });
    var moved = game.move(markedChoices[0].v);
    if (!moved) {
      if (strictEnd) {
        stuck = true;
      } else {
        var moved = game.move(markedChoices[1].v);
        if (!moved) {
          var moved = game.move(markedChoices[2].v);
          if (!moved) {
            var moved = game.move(markedChoices[3].v);
            if (!moved) {
              stuck = true;
            }
          }
        }
      }
    }
  }
  /*if(game.score>bestEver){
    console.log("New Best",game.score);
    bestEver=game.score;
  }*/
  return game.score;
}
function advancedTest(network, times) {
  /*var ave=0;//10000;
  for(var i=0;i<times;i++){
    ave+=testNet(network)/times;
  //  ave=Math.min(testNet(network),ave);
}*/
  var ave1 = 100000;
  var ave2 = 0;
  var ave0 = 0;
  for (var i = 0; i < times; i++) {
    //ave+=testNet(network)/times;
    var res = testNet(network);
    ave1 = Math.min(res, ave1);
    ave2 = Math.max(ave2, res);
    ave0 += res / times;
  }
  var ave = ave1 / 2 + ave2 / 2;
  var ave = ave1*0.9 + ave *0.1;
  if (ave > bestEver) {
    console.log("New Best", ave);
    bestEver = ave;
    fs.writeFileSync('op.json', JSON.stringify(network.toJSON()), "utf8");
    //console.log(JSON.stringify(network.toJSON()))
  }
  return ave;
}

function findBests(population,cb) {
  var markedPop = [];
  markedPop.sort(function(a, b) {
    return b.score - a.score;
  });
  var obj = {dev: "/dev.json", test: "/test.json", prod: "/prod.json"};
  var configs = {};
   
  async.map(population, (value, callback) => {
      callback(null,{
          net: value.net,
          score: (value.score&&false)?value.score:advancedTest(value.net, 1)
        });
  }, (err,results) => {
      if (err) console.error(err.message);
      //console.log("best",results)
      // configs is now a map of JSON data
      cb(results);
  });
  //return markedPop;
}
function newGen(population,cb) {
  var reserved = 11;
  findBests(population,function(res){
  var nextPop=res.slice(0, reserved);
  for (var i = 0; i < batchSize - reserved; i++) {
    var a = nextPop[Math.floor(Math.pow(Math.random(),2) * reserved)].net;
    var b = nextPop[Math.floor(Math.pow(Math.random(),2) * reserved)].net;
    nextPop.push({net:Network.crossOver(a, b),score:false});
    if (Math.random() < 11/121) {
      nextPop[nextPop.length - 1].net.mutate(neataptic.methods.mutation.ALL);
    }
  }
  cb(nextPop);
  });
}
function increment(cb) {
  newGen(pop,function(res){pop=res;cb()});
}
function showBest(population) {
  var best = findBests(population)[0];
  //game.actuator.clearMessage();
  console.log("BEST SCORE", best.score, testNet(best.net));
}
function evolve(times,cb) {
  //game.actuator.uiOn=false;
  var i=0;
 function pp(){
      	if(i<times){
      		i++;
      		pp();
      	}else{
      	fs.writeFileSync('training_state.json', pop.map(network => JSON.stringify(network.net.toJSON())).join("\n"), "utf8");
      	  
      		cb();
      	}
      }
    increment(pp);
  
  //game.actuator.uiOn=true;
  //showBest(pop);
  //console.log("BEST SCORE",testNet(pop[0]));
  //console.log(game.score);
}
//fs.writeFileSync('test.json', "hi","utf8");
var ep = 0;
function loop() {
  console.log("EPOC:" + ep++);
  evolve(1,loop);
}
loop();
/* window.onready=function(){
evolve(100);
} */
}
