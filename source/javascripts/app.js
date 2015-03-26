(function() {
  var app = angular.module('TorunJugApp', [], function($interpolateProvider) {
  	$interpolateProvider.startSymbol('[[');
  	$interpolateProvider.endSymbol(']]');
	});

  app.controller('MainController', function($scope, $http) {
  	$self = this;
    $http.get('/hall-of-fame/speakers.json').success(function(data, status, headers, config) {
    	$self.speakers = data;
    	$self.randomSpeakers = new Array(data[Math.floor(Math.random()*data.length)]);
    });
    this.imageUrl = function(img) {
    	return "/images/speakers/" + img;
    };
    this.meetingUrl = function(number) {
    	return "/meeting/" + number + "/";
    };
  });
})();