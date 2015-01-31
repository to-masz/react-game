var Players = new Mongo.Collection("players");
var Boards = new Mongo.Collection("boards");



if (Meteor.isClient) {
	var currentPlayerId = localStorage.getItem('playerId');
	if (currentPlayerId === null) {
		currentPlayerId = Random.id();
		localStorage.setItem('playerId', currentPlayerId);
	}
	
	Meteor.subscribe("players");
	Meteor.subscribe("player", currentPlayerId);
	Meteor.subscribe("board");
	
	Meteor.startup(function () {
		Meteor.call('playerInit', currentPlayerId);
		
	});
	
	/** board template **/
	Template.board.helpers({
		current: function () {
			var board = Boards.findOne({_id: "main"});
			if (board && board.time !== Session.get('boardTime')) {
				Session.set('boardTime', board.time);
				Session.set('answerState', null);
			}
			return board;
		},
		items: function () {
			var html = '';
			for (var i=0; this.data.values && i<this.data.values.length; i++) {
				html += '<span class="board-dot '+(this.data.values[i] ? 'white' : 'black')+'"></span>';
			}		
			return html;
		},
		state: function () {
			return Session.get('answerState');
		},
		winner: function (playerId) {
			var winner = Players.find({_id: playerId}).fetch()[0];
			return winner ? winner.name : null;
		}
	});
	Template.board.events({
		"click .answer": function (event) {
			event.preventDefault();
			if (!Session.get('answerState')) {
				Session.set('answerState', 'answered');
				Meteor.call('gameReact', currentPlayerId, function (error, result) {
					if (result === true) {
						Session.set('answerState', 'win');
					}
					else if (result === false) {
						Session.set('answerState', 'loose');
					}
				});
			}
		}
	});
	
	/** players template **/
	Template.players.helpers({
		list: function () {
			var players = Players.find({
				time: {$gt: (Date.now() - 900000)}
			}, {
				sort: [['points', 'desc']]
			}).fetch();
			
			var board = Boards.findOne({_id: "main"});
			if (board && board.looserPlayerIds) {
				for (var i=0, l=players.length; i<l; i++) {
					players[i].looser = board.looserPlayerIds.indexOf(players[i]._id) > -1;
				}
			}
			
			return players;
		},
		name: function () {
			var player = Players.find({_id: currentPlayerId}).fetch()[0];
			return player ? player.name : null;
		}
	});
	Template.players.events({
		"keyup input": function (event) {
			var name = event.target.value;
			Meteor.call('playerUpdateName', currentPlayerId, name);
		}
	});
}



if (Meteor.isServer) {
	
	BlackWhiteBoard = (function() {
		var intervalId = null, timeoutId = null;
		
		var methods = {
			startBoard: function () {
				Boards.update({_id: 'main'}, {
					_id: "main",
					name: 'blackWhiteBoard',
					question: 'More black than white?',
					time: Date.now(),
					data: {},
					points: 1,
					active: true,
					winnerPlayerId: null,
					looserPlayerIds: []
				}, {
					upsert: true
				});
				
				this.updateBoard();
				
				thiz = this;
				intervalId = Meteor.setInterval(function () {
					thiz.updateBoard();
				}, 2000);
				
				this.extendBoard();
			},
			
			extendBoard: function () {
				if (timeoutId) {
					Meteor.clearTimeout(timeoutId);
				}
				timeoutId = Meteor.setTimeout(function () {
					thiz.closeBoard();
				}, 10000);
			},
			
			updateBoard: function () {
				var board = [];
				for (var i=0; i<7*10; i++) {
					board.push(Math.round(Math.random()));
				}
				Boards.update({_id: 'main'}, {$set: {
					data: {
						type: 'matrix',
						rows: 7,
						cols: 10,
						values: board
					}
				}});
			},
			
			checkBoard: function (playerId) {
				var board, points = 0;
			
				board = Boards.findOne({_id: 'main'});
				if (!board || board.winnerPlayerId !== null || board.looserPlayerIds.indexOf(playerId) > 0) {
					return undefined;
				}
				
				this.extendBoard();
				
				var result = board.data.values.reduce(function (a, b) {
					return a + b;timeoutId = Meteor.setTimeout(function () {
					thiz.closeBoard();
				}, 1000);
				});
				if (result > board.data.rows*board.data.cols/2) {
					points = board.points;
					
					Boards.update({_id: 'main'}, {$set: {
						winnerPlayerId: playerId
					}});
					this.closeBoard();
				}
				else {
					points = -1;
					Boards.update({_id: 'main'}, {
						$inc: {points: 1},
						$push: {looserPlayerIds: playerId}
					});
					
				}

				Players.update({_id: playerId}, {
					$set: {
						time: Date.now()
					}, 
					$inc: {
						points: points
					}
				});
				
				return points > 0;
			},
			
			closeBoard: function () {
				Meteor.clearInterval(intervalId);
				
				Boards.update({_id: 'main'}, {$set: {
						active: false
				}});
				
				Meteor.setTimeout(function() {
					BlackWhiteBoard.startBoard();
				}, 3000);
			}
		};
		
		return methods;
	})();
	
	Meteor.publish("players", function () {
		return Players.find({});
	});
	Meteor.publish("player", function (id) {
		return Players.find({_id: id});
	});
	Meteor.publish("board", function () {
		return Boards.find({_id: "main"});
	});
	
	Meteor.startup(function () {
		BlackWhiteBoard.startBoard();
	});
	
	Meteor.methods({
		
		'playerInit': function (playerId) {
			var player = Players.findOne({_id: playerId});
			if (!player) {
				var animals = ['alligator', 'anteater', 'armadillo', 'auroch', 
					'axolotl', 'badger', 'bat', 'beaver', 'buffalo', 'camel',
					'chameleon', 'cheetah', 'chipmunk', 'chinchilla', 
					'chupacabra', 'cormorant', 'coyote', 'crow', 'dingo', 
					'dinosaur', 'dolphin', 'duck', 'elephant', 'ferret', 'fox', 
					'frog', 'giraffe', 'gopher', 'grizzly', 'hedgehog', 'hippo',
					'hyena', 'jackal', 'ibex', 'ifrit', 'iguana', 'koala', 
					'kraken', 'lemur', 'leopard', 'liger', 'llama', 'manatee', 
					'mink', 'monkey', 'narwhal', 'nyan cat', 'orangutan', 
					'otter', 'panda', 'penguin', 'platypus', 'python', 'pumpkin',
					'quagga', 'rabbit', 'raccoon', 'rhino', 'sheep', 'shrew',
					'skunk', 'slow loris', 'squirrel', 'turtle', 'walrus', 
					'wolf', 'wolverine', 'wombat'];
				
				Players.insert({
					_id: playerId,
					name: 'Anonymous ' + animals[Math.floor(Math.random() * animals.length)],
					time: Date.now(),
					points: 0
				});
			}
		},
		
		'playerUpdateName': function (playerId, name) {
			check(name, String);
			check(name, Match.Where(function (s) {
				return s.length > 0;
			}))
			Players.update({_id: playerId}, {$set: {name: name.substr(0, Math.min(name.length, 15))}});
		},
		
		'gameReact': function (playerId)  {
			return BlackWhiteBoard.checkBoard(playerId);
		},
		
	});
}










//
//var Model = (function (){
//	var ModelPrototype = Object.create(null, {
//		
//		"id": {
//			enumerable: true,
//			writable: true,
//		},
//		
//		"collection": {},
//		
//		"findOne": {
//			value: function (filter) {
//				if (Match.test(this.collection, Meteor.Collection)) {
//					throw new Error('The collection not defined');
//				}
//				
//				var data, mode;
//				data = this.collection.findOne(filter)
//				if (data) {
//					var model = this.instantiate();
//					model.attributes = data;
//				}
//				
//				return model;
//			},
//		},
//		
//		"instantiate": {
//			value: function () {
//				return new this.constructor;
//			},
//		},
//		
//		"attributes": {
//			get: function () {
//				var attributes = {};
//				for(var name in this) {
//					attributes[name] = this[name];
//				}
//				
//				return attributes;
//			},
//			set: function (attributes) {
//				for(var name in attributes) {
//					this[name] = attributes[name];
//				}
//			},
//		}
//		
//	});
//	
//	function Model() {}
//	Model.prototype = ModelProtptype;
//	return Model;
//})();

	


//if (Meteor.isClient) {
//	var col = new Mongo.Collection("test");
//	
//	Template.board.helpers({
//		board: function() {
//			//var a = Meteor.call('getBoard');
//			//return a;
//			var a = col.find({}).fetch();
//			return [a[a.length-1].d];
//		},
//	})
//	
//  Template.userBox.helpers({
//      users: function () {
//          return [
//            {
//                id: "abr0jdse9",
//                name: "anonymous",
//                points: 21,
//            },
//          ]
//      }
//  });
//  
//}



//if (Meteor.isServer) {
//	
//	
//	var Board = (function() {
//		
//		var BoardPrototype = Object.create(Model.prototype, {
//			
//			"collection": {
//				value: new Meteor.Collection("board"),
//			}
//			
//		});
//		
//		
//		function Board() {
//			if (!(this instanceof Board)) {
//				return;
//			}
//			
//			
//		};
//		Board.prototype = BoardPrototype;
//		
//		return Board;
//	})();
//	
//	
//	var board = Board.prototype.findOne("main")
//	
//	
//	setInterval(Meteor.bindEnvironment(function() {
////		Board.set(Math.random());
////		Session.set("random", Math.random());
//		var a = col.find({});
//		if (!a.length) {
//			col.update(id, {"d": Math.random() });
//		}
//	}), 1000);
//	
//	Meteor.onConnection(function(connection) {
//		console.log('adding user: '+connection.id);
//		connection.onClose(function() {
//			console.log('removing user: '+connection.id);
//		});
//	});
//}