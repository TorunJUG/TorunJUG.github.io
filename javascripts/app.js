(function() {
  var app = angular.module('TorunJugApp', ['angular.filter'], function($interpolateProvider) {
  	$interpolateProvider.startSymbol('[[');
  	$interpolateProvider.endSymbol(']]');
	});

  app.controller('HallOfFameController', function($scope, $http) {
    $scope.speakers = [];
    $scope.randomSpeakers = [];
    $http.get('/hall-of-fame/speakers.json').success(function(data) {
      $scope.randomSpeakers = new Array(data[Math.floor(Math.random()*data.length)]);
    	$scope.speakers = data;
    });
    $scope.imageUrl = function(img) {
    	return "/images/speakers/" + img;
    };
    $scope.meetingUrl = function(number) {
    	return "/meeting/" + number + "/";
    };
  });

  app.controller('LeadersController', function($scope, $http) {
    $scope.leaders = [];
    $http.get('/leaders/leaders.json').success(function(data) {
      $scope.leaders = data;
    });
    $scope.imageUrl = function(img) {
      return "/images/leaders/" + img;
    };
    $scope.readableStatus = function(status) {
      switch(status) {
        case "1_ACTIVE":
          return "Aktywni";
        case "2_INACTIVE":
          return "W stanie spoczynku";
        case "3_HONORABLE":
          return "Honorowi";
        default:
          return "Nie znam takiego statusu";
      }
    }
  });
})();