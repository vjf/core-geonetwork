(function() {
  goog.provide('gn_mdview_service');

  var module = angular.module('gn_mdview_service', [
  ]);

  module.value('gnMdViewObj', {
    previousRecords: [],
    current: {
      record: null,
      index: null
    }
  });

    module.service('gnMdView', [
    'gnSearchLocation',
    '$rootScope',
    'gnMdFormatter',
    'Metadata',
    'gnMdViewObj',
    'gnSearchManagerService',
    'gnSearchSettings',
    function(gnSearchLocation, $rootScope, gnMdFormatter, Metadata,
             gnMdViewObj, gnSearchManagerService, gnSearchSettings) {

      var lastSearchParams = {};

      this.feedMd = function(index, md, records) {
        gnMdViewObj.records = records || gnMdViewObj.records;
        if (angular.isUndefined(md)) {
          md = gnMdViewObj.records[index];
        }

        angular.extend(md, {
          links: md.getLinksByType('LINK'),
          downloads: md.getLinksByType('DOWNLOAD'),
          layers: md.getLinksByType('OGC', 'kml'),
          contacts: md.getContacts(),
          overviews: md.getThumbnails() ? md.getThumbnails().list : undefined,
          encodedUrl: encodeURIComponent(gnSearchLocation.absUrl())
        });

        gnMdViewObj.current.record = md;
        gnMdViewObj.current.index = index;

        // TODO: do not add duplicates
        gnMdViewObj.previousRecords.push(md);

        // Set the route
        this.setLocationUuid(md.getUuid());
      };

      /**
       * Update location to be /metadata/uuid.
       * Remove the search path and attributes from location too.
       * @param {string} uuid
       */
      this.setLocationUuid = function(uuid) {
        if (gnSearchLocation.isSearch()) {
          lastSearchParams = angular.copy(gnSearchLocation.getParams());
          gnSearchLocation.saveLastUrl();
          gnSearchLocation.removeParams();
        }
        gnSearchLocation.setUuid(uuid);
      };

      this.removeLocationUuid = function() {
        if (!gnSearchLocation.isSearch()) {
          gnSearchLocation.setSearch(lastSearchParams);
        }
      };

      this.openMdView = function(index, md, records) {
        if(md && index) {
          this.feedMd(index, md, records);
        }
        this.setUuid(md.getUuid());
      };

      this.initMdView = function(scope) {
        var that = this;
        var loadMdView = function() {
          var uuid = gnSearchLocation.getUuid();
          if(uuid) {
            if(!gnMdViewObj.current.record ||
                gnMdViewObj.current.record.getUuid() != uuid) {

              gnSearchManagerService.gnSearch({
                uuid:uuid,
                fast:'index',
                _content_type:'json'
              }).then(function(data) {
                if(data.metadata.length == 1) {
                  data.metadata[0] = new Metadata(data.metadata[0]);
                  that.feedMd(0,undefined, data.metadata);
                }
              });
            }
          }
        };
        $rootScope.$on('gnSearchLocationChangeSuccess', loadMdView);
      };

      this.initFormatter = function(selector) {
        var loadFormatter = function() {
          var url = gnSearchLocation.path();
          if (gnSearchLocation.isMdView()) {
            var uuid = url.substring(10, url.length);
            gnMdFormatter.load(gnSearchSettings.formatter.defaultUrl + uuid,
                selector);
          }
        };
        loadFormatter();
        $rootScope.$on('gnSearchLocationChangeSuccess', loadFormatter);
      };
    }
  ]);

  module.service('gnMdFormatter', [
    '$rootScope',
    '$http',
    '$compile',
    '$sce',
    function($rootScope, $http, $compile, $sce) {

      this.load = function(url, selector) {
        $http.get(url).then(function(response) {
          var scope = angular.element($(selector)).scope();
          scope.fragment = $sce.trustAsHtml(response.data);
          var el = document.createElement('div');
          el.setAttribute('gn-metadata-display', '');
          $(selector).append(el);
          $compile(el)(scope);
        });
      };
    }
  ]);

})();
