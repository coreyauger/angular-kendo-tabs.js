angular.module('kendo.tab', [])

/**
 * A helper, internal data structure that acts as a map but also allows getting / removing
 * elements in the LIFO order
 */
    .factory('$$stackedMap2', function () {
        return {
            createNew: function () {
                var stack = [];

                return {
                    add: function (key, value) {
                        stack.push({
                            key: key,
                            value: value
                        });
                    },
                    get: function (key) {
                        for (var i = 0; i < stack.length; i++) {
                            if (key == stack[i].key) {
                                return stack[i];
                            }
                        }
                    },
                    keys: function () {
                        var keys = [];
                        for (var i = 0; i < stack.length; i++) {
                            keys.push(stack[i].key);
                        }
                        return keys;
                    },
                    top: function () {
                        return stack[stack.length - 1];
                    },
                    remove: function (key) {
                        var idx = -1;
                        for (var i = 0; i < stack.length; i++) {
                            if (key == stack[i].key) {
                                idx = i;
                                break;
                            }
                        }
                        return stack.splice(idx, 1)[0];
                    },
                    removeTop: function () {
                        return stack.splice(stack.length - 1, 1)[0];
                    },
                    length: function () {
                        return stack.length;
                    }
                };
            }
        };
    })

    .factory('$tabStack', ['$document', '$compile', '$rootScope', '$$stackedMap2',
        function ($document, $compile, $rootScope, $$stackedMap) {


            var body = $document.find('body').eq(0);
            var openedWindows = $$stackedMap.createNew();
            var $tabStack = {};




            function removeWindow(windowInstance) {

                var kendoWindow = openedWindows.get(windowInstance).value;

                $(kendoWindow.windowDomEl).data("kendoWindow").destroy();

                //clean up the stack
                openedWindows.remove(windowInstance);

                //remove window DOM element
                kendoWindow.windowDomEl.remove();


                //destroy scope
                kendoWindow.windowScope.$destroy();

            }



            $tabStack.open = function (windowInstance, kWindow) {

                openedWindows.add(windowInstance, {
                    deferred: kWindow.deferred,
                    windowScope: kWindow.scope,
                    keyboard: kWindow.keyboard
                });


                var angularDomEl = angular.element('<div id="' + windowInstance.id + '"></div>');
                angularDomEl.attr('window-class', kWindow.windowClass);
                angularDomEl.attr('index', openedWindows.length() - 1);
                angularDomEl.html(kWindow.content);

                var windowDomEl = $compile(angularDomEl)(kWindow.scope);
                openedWindows.top().value.windowDomEl = windowDomEl;
                //body.append(windowDomEl);
                kWindow.tabStrip.append({
                    text: kWindow.title,
                    content: '<div class="tabview view" id="' + windowInstance.id + 'Holder"></div>'
                });
                setTimeout(function(){
                    $('#'+windowInstance.id + 'Holder').append(windowDomEl);
                    console.log('kWindow.tabStrip', kWindow.tabStrip.contentElements);
                    kWindow.tabStrip.select(kWindow.tabStrip.contentElements.length-1);
                },1);


            };

            $tabStack.close = function (windowInstance, result) {
                var kendoWindow = openedWindows.get(windowInstance).value;
                if (kendoWindow) {
                    kendoWindow.deferred.resolve(result);
                    removeWindow(windowInstance);
                }
            };

            $tabStack.dismiss = function (windowInstance, reason) {
                var kendoWindow = openedWindows.get(windowInstance).value;
                if (kendoWindow) {
                    kendoWindow.deferred.reject(reason);
                    removeWindow(windowInstance);
                }
            };

            $tabStack.getTop = function () {
                return openedWindows.top();
            };

            $tabStack.length = function () {
                return openedWindows.length();
            }

            return $tabStack;
        }])

    .provider('$kTab', function () {

        var $windowProvider = {
            options: {
                keyboard: true
            },
            $get: ['$injector', '$rootScope', '$q', '$http', '$templateCache', '$controller', '$tabStack',
                function ($injector, $rootScope, $q, $http, $templateCache, $controller, $tabStack) {

                    var $kTab = {};

                    function getTemplatePromise(options) {
                        return options.template ? $q.when(options.template) :
                            $http.get(options.templateUrl, { cache: $templateCache }).then(function (result) {
                                return result.data;
                            });
                    }

                    function getResolvePromises(resolves) {
                        var promisesArr = [];
                        angular.forEach(resolves, function (value, key) {
                            if (angular.isFunction(value) || angular.isArray(value)) {
                                promisesArr.push($q.when($injector.invoke(value)));
                            }
                        });
                        return promisesArr;
                    }

                    $kTab.open = function (windowOptions) {

                        var windowResultDeferred = $q.defer();
                        var windowOpenedDeferred = $q.defer();

                        //prepare an instance of a window to be injected into controllers and returned to a caller
                        var windowInstance = {
                            id: "kTab" + $tabStack.length(),
                            result: windowResultDeferred.promise,
                            opened: windowOpenedDeferred.promise,
                            close: function (result) {
                                $tabStack.close(windowInstance, result);
                            },
                            dismiss: function (reason) {
                                $tabStack.dismiss(windowInstance, reason);
                            }
                        };

                        //merge and clean up options
                        windowOptions = angular.extend({}, $windowProvider.options, windowOptions);
                        windowOptions.resolve = windowOptions.resolve || {};

                        //verify options
                        if (!windowOptions.template && !windowOptions.templateUrl) {
                            throw new Error('One of template or templateUrl options is required.');
                        }

                        var templateAndResolvePromise =
                            $q.all([getTemplatePromise(windowOptions)].concat(getResolvePromises(windowOptions.resolve)));



                        templateAndResolvePromise.then(function resolveSuccess(tplAndVars) {


                            var kendoWindow;
                            var windowScope = (windowOptions.scope || $rootScope).$new();
                            windowScope.$close = windowInstance.close;
                            windowScope.$dismiss = windowInstance.dismiss;

                            var ctrlInstance, ctrlLocals = {};
                            var resolveIter = 1;

                            //controllers
                            if (windowOptions.controller) {
                                ctrlLocals.$scope = windowScope;
                                ctrlLocals.$windowInstance = windowInstance;
                                angular.forEach(windowOptions.resolve, function (value, key) {
                                    ctrlLocals[key] = tplAndVars[resolveIter++];
                                });

                                ctrlInstance = $controller(windowOptions.controller, ctrlLocals);
                            }

                            $tabStack.open(windowInstance, {
                                title: windowOptions.title,
                                opts: windowOptions,
                                tabStrip: windowOptions.tabStrip,
                                scope: windowScope,
                                deferred: windowResultDeferred,
                                content: tplAndVars[0],
                                keyboard: windowOptions.keyboard,
                                windowClass: windowOptions.windowClass
                            });

                        }, function resolveError(reason) {
                            windowResultDeferred.reject(reason);
                        });


                        templateAndResolvePromise.then(function () {
                            var opts = {
                                title: windowOptions.title,
                                modal: false,
                                width: 500,
                                actions: ["Close"],
                                visible: false,
                                close: function (e) {
                                    windowInstance.close(null);
                                },
                                activate: function () {
                                    var autofocusElements = $(":input[autofocus]");
                                    if (autofocusElements.length > 0) {
                                        autofocusElements[0].focus();
                                    }
                                    windowOpenedDeferred.resolve(true);
                                }
                            };

                            if (windowOptions.width) {
                                opts.width = windowOptions.width;
                            }
                            if (windowOptions.height) {
                                opts.height = windowOptions.height;
                            }

                        }, function () {
                            windowOpenedDeferred.reject(false);
                        });

                        return windowInstance;
                    };

                    return $kTab;
                }]
        };

        return $windowProvider;
    });
