# angular-kendo-tabs.js
angular-kendo-tabs.js

Angular Kendo Window

Here is a angular directive that helps create <a target='_blank' href='http://kendoui.com'>KendoUI</a> dynamic tab with its own template and controller.

<b>This is highly influenced by <a target='_blank' href='http://angular-ui.github.io/bootstrap/#/modal'>UI Bootstrap modal directive</a>.</b>

<h1>Example</h1>
<pre>
   var tabStrip = $("#tabstripContent").kendoTabStrip().data("kendoTabStrip");
   var tabInstance = $kTab.open({
                        tabStrip: tabStrip,
                        modal: true,
                        title: "Window title",
                        templateUrl: 'modal1.html',
                        controller: 'modalController',
                        resolve: {
                            parameter1: function () {
                                return "Test...";
                            }
                        }
                    });
                    tabInstance.result.then(function (result) {
                        // Here you can get result from the window
                    });
 
</pre>
