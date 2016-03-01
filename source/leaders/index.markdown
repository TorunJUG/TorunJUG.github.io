---
layout: page
title: "Liderzy"
description: Lista obecnych liderów toruńskiej grupy użytkowników języka Java.
navbar: "Leaders"
comments: false
sharing: false
footer: false
---
<div id="leadersContainer" class="row"></div>

<script type="text/javascript">
jQuery.getJSON( "leaders.json", function( data ) {
  var people = [];
  jQuery.each( data, function( key, value ) {
    var modalTitle = (value.fullName) ? value.fullName : value.name;
    var home = (value.urls.home) ? '<a title="Strona domowa" href="'+value.urls.home+'" target="_blank" class="no-text-decoration social fa fa-home fa-2x"></a>' : ''; 
    var facebook = (value.urls.facebook) ? '<a title="Facebook" href="'+value.urls.facebook+'" target="_blank" class="no-text-decoration social fa fa-facebook fa-2x"></a>' : ''; 
    var twitter = (value.urls.twitter) ? '<a title="Twitter" href="'+value.urls.twitter+'" target="_blank" class="no-text-decoration social fa fa-twitter fa-2x"></a>' : ''; 
    var gplus = (value.urls.googleplus) ? '<a title="Google+" href="'+value.urls.googleplus+'" target="_blank" class="no-text-decoration social fa fa-google-plus fa-2x"></a>' : ''; 
    var linkedin = (value.urls.linkedin) ? '<a title="LinkedIn" href="'+value.urls.linkedin+'" target="_blank" class="no-text-decoration social fa fa-linkedin fa-2x"></a>' : ''; 
    var github = (value.urls.github) ? '<a title="GitHub" href="'+value.urls.github+'" target="_blank" class="no-text-decoration social fa fa-github fa-2x"></a>' : ''; 
    var modalFooter = (home||facebook||twitter||gplus||linkedin||github) ? '<div class="modal-footer">'+home+facebook+twitter+gplus+linkedin+github+'</div>' : '';
    var leader = '\
      <div class="col-tn-12 col-xs-6 col-sm-4 col-md-4 col-lg-3">\
        <div class="panel panel-default text-center leader" data-toggle="modal" data-target="#modal-'+key+'">\
          <div class="panel-body">\
            <img class="no-border leader-face" src="{{ root_url }}/images/leaders/'+value.photo+'" />\
          </div>\
          <div class="panel-footer"><h3 class="panel-title">'+value.name+'</h3></div>\
        </div>\
      </div>\
      <div id="modal-'+key+'" class="modal fade leader" tabindex="-1" role="dialog" aria-hidden="true">\
        <div class="modal-dialog">\
          <div class="modal-content">\
            <div class="modal-header">\
              <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>\
              <h4 class="modal-title">'+modalTitle+'</h4>\
            </div>\
            <div class="modal-body">\
              <div>\
                <div class="text-center">\
                  <img class="no-border leader-face" src="{{ root_url }}/images/leaders/'+value.photo+'" />\
                </div>\
                <div class="description">'+value.description+'</div>\
              </div>\
            </div>\
            '+modalFooter+'\
          </div>\
        </div>\
      </div>';
    if (value.inactive !== true) {
      people.push( leader );
    }
  });
  jQuery("#leadersContainer").append(people.join(""));
});
</script>