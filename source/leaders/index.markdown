---
layout: page
title: "Liderzy"
description: Lista obecnych liderów toruńskiej grupy użytkowników języka Java
navbar: "Leaders"
comments: false
sharing: false
footer: false
---
<div id="leadersContainer"></div>

<script type="text/javascript">
jQuery.getJSON( "leaders.json", function( data ) {
  var panels = [];
  jQuery.each( data, function( key, val ) {
    var panel = '\
      <div class="panel panel-default leader">\
        <div class="panel-heading">\
          <h3 class="panel-title">' + val.name + '</h3>\
        </div>\
        <div class="panel-body">\
          <div class="row">\
            <div class="col-xs-12 col-sm-4 col-md-4 col-lg-3 text-center">\
              <img class="no-border leader-face" src="{{ root_url }}/images/leaders/' + val.photo + '" />\
            </div>\
            <div class="col-xs-12 col-sm-8 col-md-8 col-lg-9">\
              <div class="row description">\
                <div class="text-column col-xs-12 col-sm-12 col-md-12 col-lg-12">' + val.description + '</div>\
              </div>\
              <div class="row links">\
                <div class="text-column col-xs-12 col-sm-12 col-md-12 col-lg-12">';
    panel += '<a href="" target="_blank" class="no-text-decoration fa fa-linkedin-square fa-2x"></a>'
    panel += '\
                </div>\
              </div>\
            </div>\
          </div>\
        </div>\
      </div>';
    panels.push( panel );
  });
 
  jQuery("#leadersContainer").append(panels.join(""));
});
</script>