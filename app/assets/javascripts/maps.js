///////////////////////
// Global Variables  //
///////////////////////
var map, userAvatarUrl, redirectLng, redirectLat, redirectUserId, currentUserId;
var chiTown = {lat: 41.885311, lng: -87.62850019999999}
var currentMarkers = [];
var infowindows = [];

////////////////////////
// Map Initialization //
////////////////////////

function initMap(){

  map = new google.maps.Map(document.getElementById('map'), {zoom: 17, center: chiTown, zoomControl: true});
  if(!isNaN(redirectLng))
  { //This sets the map's center to the redirect pin's location
    map.setCenter({lat: redirectLat, lng: redirectLng})
    map.setZoom(17);
    var url = "/pins/" + redirectUserId
    if (currentUserId != redirectUserId)
    {
      checkFriendBox(redirectUserId);
    }
  }
  else
  {
    //This centers map go user's browser provided current geolocation
    if (navigator.geolocation)
    {
      navigator.geolocation.getCurrentPosition(function(position)
      {
        var pos = { lat: position.coords.latitude, lng: position.coords.longitude };
        map.setCenter(pos);
      }, function()
      {
        handleLocationError(true, map.getCenter());
      });
    }
    else { handleLocationError(false, map.getCenter());}
  }
//////////////////////////////////////////
//Autocomplete for search/////////////////
//////////////////////////////////////////
  var input = /** @type {!HTMLInputElement} */(document.getElementById('loc-input'));

  var autocomplete = new google.maps.places.Autocomplete(input);
  autocomplete.bindTo('bounds', map);

  autocomplete.addListener('place_changed', function() {

    var place = autocomplete.getPlace();
    if (!place.geometry) {
      window.alert("Autocomplete's returned place contains no geometry");
      return;
    }

    // If the place has a geometry, then present it on a map.
    if (place.geometry.viewport) {
      map.fitBounds(place.geometry.viewport);
    } else {
      map.setCenter(place.geometry.location);
      map.setZoom(17);  // Why 17? Because it looks good.
    }

    var address = '';
    if (place.address_components) {
      address = [
        (place.address_components[0] && place.address_components[0].short_name || ''),
        (place.address_components[1] && place.address_components[1].short_name || ''),
        (place.address_components[2] && place.address_components[2].short_name || '')
      ].join(' ');
    }

    placeAutosearchMarker(place, address);

  });

////////////////////////
///End of autocomplete//
////////////////////////

  //////////////////////
  // Event Responders //
  //////////////////////
  /// This is happening inside of initMap because this function serves almost as the
  /// "document ready" for the map.
  google.maps.event.addListener(map, 'rightclick', function(event) {
    placeMarker(event.latLng);
  });

}

function setAvatar(avatar_url){
    var avatar = {
      url: avatar_url,
      size: new google.maps.Size(71, 71),
      origin: new google.maps.Point(0, 0),
      anchor: new google.maps.Point(17, 34),
      scaledSize: new google.maps.Size(35, 35)
    }
    return avatar;
  }
///////////////////////////
// Marker Initialization //
///////////////////////////
//places marker on map from user's right click
function placeMarker(position) {
  var marker = new google.maps.Marker(
  {
      position: position,
      map: map,
      icon: setAvatar(userAvatarUrl),
  });
  currentMarkers.push(marker);
  var infoWindowOptions = { content: loadPinBox(marker) };
  var infoWindow = new google.maps.InfoWindow(infoWindowOptions);
  // This is where individual click event handlers are created for each pin,
  // notice that functions defined here can see 'marker' in their scope.
  closeWindows();
  infoWindow.open(map, marker);
  getAddress(marker);
  infowindows.push(infoWindow);

  google.maps.event.addListener(infoWindow,'closeclick',function(e)
    {
      marker.setMap(null);
    });
  google.maps.event.addListener(map, 'rightclick', function(e)
  {
    marker.setMap(null);
  });

  map.panTo(marker.getPosition())
  map.panBy(0, -150);
  $('#searchbar').focus();
  //if user clicks off of marker before saving, marker gets erased in helper method
}
function placeAutosearchMarker(place, address){
  var marker = new google.maps.Marker(
  {
    position: place.geometry.location,
    map: map,
    icon: setAvatar(userAvatarUrl),
  });
  currentMarkers.push(marker);
  // This is where individual click event handlers are created for each pin,
  // notice that functions defined here can see 'marker' in their scope.
  var infowindow = new google.maps.InfoWindow();
  infowindow.setContent('<div><strong>Location: ' + place.name + '</strong><br>' + address + '</div>' + loadPinBox(marker));
  closeWindows();
  infowindow.open(map, marker);
  getAddress(marker);
  infowindows.push(infowindow);

  google.maps.event.addListener(infowindow,'closeclick',function(e)
  {
      marker.setMap(null);
  });
  google.maps.event.addListener(map, 'rightclick', function(e)
  {
    marker.setMap(null);
  });

}
//gets markers from database
function placeDBMarker(pinData, avatarUrl) {
  var pinLatlng = new google.maps.LatLng(pinData.latitude, pinData.longitude);
  var marker = new google.maps.Marker(
  {
    position: pinLatlng,
    map: map,
    icon: setAvatar(avatarUrl),
  });
  currentMarkers.push(marker);
  var infoWindowOptions = { content: loadDBPinBox(pinData) };
  var infoWindow = new google.maps.InfoWindow(infoWindowOptions);
  // This is where individual click event handlers are created for each pin,
  // notice that functions defined here can see 'marker' in their scope.
    google.maps.event.addListener(marker,'click',function(e)
    {
      closeWindows();
      infoWindow.open(map, marker);
      infowindows.push(infoWindow);
      map.panTo(marker.getPosition())
      map.panBy(0, -150);
    });
}

////////////////////
// Document Ready //
////////////////////
$(function() {
  //variables for redirect if query pin exists

  redirectLat = parseFloat($('#query-pin').attr("data-lat"));
  redirectLng = parseFloat($('#query-pin').attr("data-lng"));
  redirectUserId = $('#query-pin').attr("data-redirectuser-id");
  currentUserId = $('#map').attr("data-c-user");

  $(document).on("submit", "#song_form", function(event)
  {
    event.preventDefault();
    var token = $('meta[name=csrf-token]').attr('content');
    var song_data = {};
    $.each($(this).serializeArray(), function(i, field)
    {
      song_data[field.name] = field.value;
    });
    var data = { song_artist: song_data["song_artist"], song_title: song_data["song_title"], lat: song_data["lat"], lng: song_data["lng"], authenticity_token: token, song_id: song_data["song_id"], comment: song_data['comment'], address: song_data['address'] };
    $.post("/pins", data);
    closeWindows();
    getPins();
    deleteMarkers();
  });

  $(document).on("click", ".river_div", function(event){
    var commentLat = $(this).children(".river_lat").text();
    var commentLng = $(this).children(".river_lng").text();
    var pinLat = $(this).attr("data-lat");
    var pinLng = $(this).attr("data-lng");
    map.setCenter({lat: parseFloat(pinLat), lng: parseFloat(pinLng)})
    map.setZoom(17);
;    var river_user_id = $(this).attr("data-user-id");
    //check if the friend's name is already checked. if it's not checked, check it
    if(!isChecked(river_user_id))
    {
      checkFriendBox(river_user_id);
    }
  });

  //Makes sure user's 'My Pins' button is clicked on page load
  $(function(){
    $('.friend_check:first-child').click();
  })

 $(".friend_check").on("click", function(event){
      deleteMarkers();
      var parent = $(this).closest('form');
      var inputs = parent.find('input.friend_check');
      for(var i=0; i < inputs.length; i++) {
        var target = $(inputs[i]);
        if(target.is(':checked')){
          var friend_id = target.attr('id');
          var url = "/pins/" + friend_id;
          getPins(url);
        }
      };
  });

})


///////////////////////////
///Helper functions////////
///////////////////////////
//
function isChecked(riverUserId){
  var parentForm = $(".friend_check").closest('form');
  var friends = parentForm.find('input.friend_check');
  for(var i=0; i < friends.length; i++)
  {
    var target = $(friends[i]);
    if(target.is(':checked'))
    {
      var checked_friend_id = target.attr('id');
      if (riverUserId == checked_friend_id) { return true; }
    }
  }
}
//Checks the appropriate name in the friend sidebar
function checkFriendBox(friend_id){
  var parentForm = $(".friend_check").closest('form');
  var friends = parentForm.find('input.friend_check');
  for(var i=0; i < friends.length; i++)
  {
    var target = $(friends[i]);
    if(target.attr('id') == friend_id)
    {
      target.click();
    }
  }
}
//sets the map for markers in marker array. comes in handy when removing markers
function setMapOnAll(map) {
  for (var i = 0; i < currentMarkers.length; i++) {
    currentMarkers[i].setMap(map);
  }
}
//removes currentMarkers in the array from the map
function clearMarkers() {
  setMapOnAll(null);
}
//removes currentMarkers in the array from the map and removes them from array
function deleteMarkers() {
  clearMarkers();
  currentMarkers = [];
}

//closes all infoWindows in windows array
function closeWindows(){
  infowindows.forEach(function(window){
    window.close();
  });
  deleteWindows();
}
//deletes infoWindows from array
function deleteWindows(){
  infowindows = [];
}
function getAddress(){
  var lat = $('#song_form #latitude').val();
  var lng = $('#song_form #longitude').val();
  var url = "https://maps.googleapis.com/maps/api/geocode/json?latlng=" + lat + "," + lng
  var getAjax = $.get(url);
  getAjax.done(function(response) {
    $('#song_form #address').val(response.results[0].formatted_address)
  })
}
//gets pins of user's friends
function getPins(url){
  var getUrl =  url || "/pins";
  var getAjax = $.get(getUrl, "json");
    getAjax.done(function(response)
    {
      var avatarUrl = response.avatar_url;
      for (var i = 0; i < response.pins.length; i ++)
      {
        if(response.pins[i].user_id == currentUserId)
        {
          userAvatarUrl = avatarUrl;
        }
        placeDBMarker(response.pins[i], avatarUrl);
      }
    });
}
