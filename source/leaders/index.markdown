---
layout: page
title: "Liderzy"
description: Lista obecnych liderów toruńskiej grupy użytkowników języka Java.
navbar: "Leaders"
comments: false
sharing: false
footer: false
---
<div class="ng-cloak" ng-cloak ng-controller="LeadersController as leadCtrl">
  <div ng-repeat="(statusName, subLeaders) in leaders | groupBy: 'status'" class="row">
    <div class="col-tn-12">
      <h3 ng-bind="readableStatus(statusName)"></h3>
    </div>
    <div ng-repeat="leader in subLeaders">
      <div class="col-tn-12 col-xs-6 col-sm-4 col-md-4 col-lg-3">
        <div class="panel panel-default text-center leader" data-toggle="modal" data-target="#modal-[[statusName]]-[[$index]]">
          <div class="panel-body">
            <img class="no-border leader-face" ng-src="[[imageUrl(leader.photo)]]" />
          </div>
          <div class="panel-footer"><h3 class="panel-title" ng-bind="leader.name"></h3></div>
        </div>
      </div>
      <div id="modal-[[statusName]]-[[$index]]" class="modal fade leader" tabindex="-1" role="dialog" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
              <h4 class="modal-title" ng-bind="leader.name"></h4>
            </div>
            <div class="modal-body">
              <div>
                <div class="text-center">
                  <img class="no-border leader-face" ng-src="[[imageUrl(leader.photo)]]" />
                </div>
                <div class="description" ng-if="leader.description" ng-bind="leader.description"></div>
              </div>
            </div>
            <div class="modal-footer" ng-if="leader.urls">
              <a title="Strona domowa" ng-if="leader.urls.home" ng-href="[[leader.urls.home]]" target="_blank" class="no-text-decoration social fa fa-home fa-2x"></a>
              <a title="Facebook" ng-if="leader.urls.facebook" ng-href="[[leader.urls.facebook]]" target="_blank" class="no-text-decoration social fa fa-facebook fa-2x"></a>
              <a title="Twitter" ng-if="leader.urls.twitter" ng-href="[[leader.urls.twitter]]" target="_blank" class="no-text-decoration social fa fa-twitter fa-2x"></a>
              <a title="Google+" ng-if="leader.urls.googleplus" ng-href="[[leader.urls.googleplus]]" target="_blank" class="no-text-decoration social fa fa-google-plus fa-2x"></a>
              <a title="LinkedIn" ng-if="leader.urls.linkedin" ng-href="[[leader.urls.linkedin]]" target="_blank" class="no-text-decoration social fa fa-linkedin fa-2x"></a>
              <a title="GitHub" ng-if="leader.urls.github" ng-href="[[leader.urls.github]]" target="_blank" class="no-text-decoration social fa fa-github fa-2x"></a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
