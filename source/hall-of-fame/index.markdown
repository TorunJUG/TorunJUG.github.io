---
layout: page
title: "Hall of Fame"
description: Lista wszystkich prelegentów, którzy wystąpili na spotkaniach toruńskiej grupy użytkowników języka Java.
navbar: "Hall of Fame"
comments: false
sharing: false
footer: false
---
<div class="ng-cloak" ng-cloak ng-controller="HallOfFameController as hofCtrl">
  <div class="panel panel-default hof-speaker" ng-repeat="speaker in speakers | orderBy:'-lastMeeting'" ng-animate=" 'animate' ">
    <div class="panel-body">
      <div class="row">
        <div class="col-tn-4 col-xs-3 col-sm-2 col-md-2 col-lg-2 face">
          <img class="no-border" ng-src="[[imageUrl(speaker.img)]]" />
        </div>
        <div class="col-tn-8 col-xs-9 col-sm-10 col-md-10 col-lg-10">
          <h4 class="speaker-name">
            <span ng-bind="speaker.name"></span>
            <a ng-show="speaker.twitter" ng-href="https://twitter.com/[[speaker.twitter]]" target="_blank">
              <span class="fa fa-twitter fa-1-5x"></span>
            </a>
          </h4>
        </div>
        <div class="col-tn-12 col-xs-12 col-sm-10 col-md-10 col-lg-10 talks">
          <table class="table table-striped table-hover">
            <tbody>
              <tr ng-repeat="talk in speaker.talks | orderBy:'-meetingNumber'" >
                <td class="col-tn-1 text-right">
                  <a ng-href="[[meetingUrl(talk.meetingNumber)]]" class="btn btn-primary btn-xs" ng-bind-template="#[[talk.meetingNumber]]"></a>
                </td>
                <td class="col-tn-9" ng-bind="talk.title"></td>
                <td class="col-tn-1 text-center">
                  <a ng-show="talk.youtube" ng-href="[[talk.youtube]]" target="_blank">
                    <span class="fa fa-video-camera fa-1-5x"></span>
                  </a>
                </td>
                <td class="col-tn-1 text-center">
                  <a ng-show="talk.slides" ng-href="[[talk.slides]]" target="_blank">
                    <span class="fa fa-picture-o fa-1-5x"></span>
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</div>