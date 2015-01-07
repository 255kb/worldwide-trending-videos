var ytplayer;
var ytplayer_autoplay = false;
var ytplayer_ready = false;
var ytplayer_api_ready = false;

var gapiKey = 'AIzaSyCw4rG9w1P8z_2qSQ6q_bSnsuhSs5wEjq4';
function gapiLoad(){
	gapi.client.setApiKey(gapiKey);
	gapi.client.load('youtube', 'v3', function(response) {var scope = angular.element($('#videoctrl')).scope();scope.$apply(function(){scope.yt_api_ready = true;});});
}
function onYouTubeIframeAPIReady() {
	ytplayer_api_ready =true;
}
function onPlayerReady(event) {
	ytplayer_ready = true;
	if(ytplayer_autoplay){
		event.target.playVideo();
	}
}

function avoidFlickering(){
	$(".video-list").css("min-height", $(".video-list").height());
}

(function(){
	var app = angular.module('app', ['ngRoute','angularMoment', 'ngSanitize']);

	app.filter('fromNow', function() {
		return function(date) {
			return moment(date).fromNow();
		};
	});
	app.filter('numberSpaces', function(){
		return function(input){
			return (""+input).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
		};
	});
	app.filter('nlToBr', function(){
		return function(input){
			if(input){
        		return input.replace(/\n/g, '<br>');
        	}else{
        		return '';
        	}
		};
	});
	app.filter('urls', function(){
	    return function(input) {
            return input.replace(/(\b(https?):\/\/[A-Z0-9+&@#\/%?=~_|!:,.;-]*[-A-Z0-9+&@#\/%=~_|])/gim, "<a href=\"$1\" target=\"_blank\">$1</a>");
	    };
	});

	app.config(function($routeProvider, $locationProvider){
		$routeProvider.when('/category/:categoryId/country/:countryId', {
			controller: 'VideosController'
		});
		$locationProvider.hashPrefix('!');
	});

	app.controller('VideosController', function($scope, $http, $routeParams, $location, $sce){
		$scope.$watch('yt_api_ready',function(newValue, oldValue){
			if(newValue){
				$scope.init();
			}
		});

		$scope.init = function(){
			$scope.currentCountry = '';
			$scope.currentCategory = '0';
			$scope.selectedCountry = 'all';
			$scope.selectedCategory = 'all';
			$scope.nextPageToken = '';
			$scope.currentVideo = '';
			$scope.firstLoad = true;
			$scope.isEmpty = false;
			$scope.toggleDesc = false;

			var categories_request = gapi.client.youtube.videoCategories.list({
				part: 'snippet',
				hl: 'en',
				regionCode: 'US'
			}).execute(function(response){
				$scope.$apply(function(){
					$scope.categories = response.result;
				});
			});

			$scope.loadVideos('');
			$scope.rebuildUrl();
		};

		$scope.$on("$routeChangeSuccess", function($currentRoute, $previousRoute){
				if($routeParams.categoryId !== $scope.selectedCategory){
					$scope.selectedCategory = $routeParams.categoryId;
					$scope.changeCategory();
				}
				if($routeParams.countryId !== $scope.selectedCountry){
					$scope.selectedCountry = $routeParams.countryId;
					$scope.changeCountry();
				}
			}
		);

		$scope.playVideo = function(video, autoPlay){
			if($scope.currentVideo.id !== video.id){
				$scope.currentVideo = video;
				ytplayer_autoplay = autoPlay;
				$scope.toggleDesc = false;
				$scope.launchPlayer();
			}
		};

		$scope.launchPlayer = function(){
			if(ytplayer_api_ready && !ytplayer_ready){
				ytplayer = new YT.Player('ytplayer', {
					videoId: $scope.currentVideo.id,
					events: {
			            'onReady': onPlayerReady
			      	}
				});
			} else if(ytplayer_api_ready && ytplayer_ready){
				ytplayer.loadVideoById({videoId:$scope.currentVideo.id});
			}
		};

		$scope.changeCategory = function(){
			if($scope.selectedCategory === 'all'){
				$scope.currentCategory = '0';
			}else{
				$scope.currentCategory = $scope.selectedCategory;
			}
			$scope.rebuildUrl();
		};

		$scope.changeCountry = function(){
			if($scope.selectedCountry === 'all'){
				$scope.currentCountry = '';
			}else{
				$scope.currentCountry = $scope.selectedCountry;
			}
			$scope.rebuildUrl();
		};

		$scope.rebuildUrl = function(){
			$location.path('/category/' + $scope.selectedCategory + '/country/' + $scope.selectedCountry);
		};

		$scope.$watch('(currentCategory + currentCountry)',function(newValue, oldValue){
			if($scope.yt_api_ready){
				$scope.loadVideos();
			}
		});

		$scope.nextPage = function(){
			$scope.loadVideos($scope.nextPageToken);
		};

		$scope.loadVideos = function(next){
			next = typeof next !== 'undefined' ? next : '';
			var options  = {
				part: 'snippet,statistics',
				chart: 'mostPopular',
				videoCategoryId: $scope.currentCategory,
				maxResults: 5,
				pageToken: next
			};
			if($scope.currentCountry !== ''){
				options.regionCode = $scope.currentCountry;
			}
			var request = gapi.client.youtube.videos.list(options).execute(function(response){
				$scope.$apply(function(){
					if(undefined !== response.items && response.items.length){
						$scope.videos = response.items;
						avoidFlickering();
						$scope.nextPageToken = response.nextPageToken;
						$scope.isEmpty = false;
						if($scope.firstLoad){
							$scope.playVideo($scope.videos[0], false);
						}
						$scope.firstLoad = false;
					}else{
						$scope.nextPageToken = '';
						$scope.videos = '';
						$scope.isEmpty = true;
					}
				});
			});
		};
	});

})();