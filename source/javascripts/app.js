(function() {
  var app = angular.module('TorunJugApp', [], function($interpolateProvider) {
  	$interpolateProvider.startSymbol('[[');
  	$interpolateProvider.endSymbol(']]');
	});

  app.controller('MainController', function($scope, $http) {
  	$self = this;
    $self.speakers = [];
    $self.randomSpeakers = [];
    $http.get('/hall-of-fame/speakers.json').success(function(data, status, headers, config) {
      $self.randomSpeakers = new Array(data[Math.floor(Math.random()*data.length)]);
    	$self.speakers = data;
    });
    this.imageUrl = function(img) {
    	return "/images/speakers/" + img;
    };
    this.meetingUrl = function(number) {
    	return "/meeting/" + number + "/";
    };
  });
})();