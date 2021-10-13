# Online Visitor Tracker

### Goal ###

The goal of this trial project is to create a small script to track the visitor activit. The specs are detailed below.

* Track the visitor landed URL.
* Track & record the visitor shopping cart data (products).
* HTML5 storage supported.
* Tracking with pixel

#### Usage

  var _trackingObj = new CRTracking({
                checkExpire: true,
                checkUTMS: true,
                checkURLChange: false
            });
