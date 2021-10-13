// Start base tracking script
(function () {

	var _cookieName = "_trcr";
	var _expiredOn = '30_days'

	var _localStorageEnabled = true;
	var _cookieEnabled = true;

	var _events = [];

	var inputParms = {};

	//locate and set the global variables

	if (window._trcr_q) {
		for (var i = 0; i < window._trcr_q.length; i++) {
			inputParms[window._trcr_q[i][0]] = window._trcr_q[i][1];
		}
	}

	inputParms._apiURL = 'https://domain.com';

	//html5 storage
	var _storageName = '_trcr_session_' + inputParms._siteId;

	// Cookies class variable
	var CRCookies;

	try {
		CRCookies = Cookies.noConflict();
	} catch (error) {
		_pushEvent(error);
	}

	// VisitorDevice class declare and properties
	// this class will save the visitor device info
	function VisitorDevice() {
		this.AppCodeNameCL;
		this.AppNameCL;
		this.AppVersionCL;
		this.CookieEnabledCL;
		this.GeolocationCL;
		this.LanguageCL;
		this.PlatformCL;
		this.UserAgentCL;
		this.IPCL;
		this.ScreenSize;
	};

	// get and set the visitor device info
	VisitorDevice.prototype.fillData = function () {
		this.AppCodeNameCL = null;
		this.AppNameCL = null;
		this.AppVersionCL = null;
		this.CookieEnabledCL = null;
		this.GeolocationCL = null;
		this.LanguageCL = null;
		this.PlatformCL = null;
		this.userAgent = null;
		this.IPCL = null;
		this.ScreenSize = _getScreenSize();
	};

	// CrVisit class declare and properties
	// this class will save the visitor session info
	function CrVisit() {
		this.VisitorId;
		this.CreatedOn;
		this.LastActivityOn;
		this.ExpiredOn;
		this.LandURL;
		this.StoreCode;
	};

	// constructor
	CrVisit.prototype.init = function () {
		this.VisitorId = _guid();
		this.CreatedOn = _getDateString();
		this.LastActivityOn = this.CreatedOn;
		this.ExpiredOn = _expiredOn;
		this.LandURL = null;
		this.StoreCode = inputParms._siteId;
	};

	// reset the values
	CrVisit.prototype.reset = function () {
		this.VisitorId = null;
		this.CreatedOn = null;
		this.LastActivityOn = null;
		this.ExpiredOn = null;
		this.LandURL = null;
		this.StoreCode = null;
	};

	// convert the class object to json
	CrVisit.prototype.json = function () {
		return JSON.stringify(this);
	};

	// convert the json string to class object
	CrVisit.prototype.jsonParse = function (json) {
		try {
			var parsed = JSON.parse(json);
			this.VisitorId = parsed.VisitorId;
			this.CreatedOn = parsed.CreatedOn;
			this.LastActivityOn = parsed.LastActivityOn;
			this.ExpiredOn = parsed.ExpiredOn;
			this.LandURL = parsed.LandURL;
			this.StoreCode = parsed.StoreCode;

			return true;
		} catch (error) {
			return false;
		}
	};

	// will check the object is valid or not
	CrVisit.prototype.isValidObject = function () {
		try {
			return this.VisitorId != null && this.CreatedOn != null && this.LastActivityOn != null;
		} catch (error) {
			return false;
		}
	};

	// method will check the url have valid UTM parameters
	// if valid then make initialize the user session.
	// set the visitor id, expired date
	// set the storage
	// set the cookies
	CrVisit.prototype.checkUTMS = function () {

		var isValidUTMS = _checkUTMS();

		if (isValidUTMS)
			this.init();

		var isValid = this.isValidObject();

		if (isValid && isValidUTMS) {
			_resetStorage();
			this.setLocalStorage();
			this.setCookie();
		}
	};

	// method will verify the saved storage or cookies data is valid
	// will check the session is expired or not
	// if session is expired; reset the object
	CrVisit.prototype.verifySavedData = function () {

		this.loadSavedData();

		var isValidObject = this.isValidObject();
		var isExpired = this.checkExpire();

		if (isValidObject && isExpired) {
			this.reset();
		}
	};

	// special method to track all the visitor
	// this method doesn't required the utms
	// will use for specific stores
	CrVisit.prototype.checkAllVisit = function () {

		var isLoaded = this.loadSavedData();
		var isValid = this.isValidObject();

		if (!isLoaded || !isValid) {
			_resetStorage();

			this.init();
			this.setLocalStorage();
			this.setCookie();
		}

	};

	// method will set the local storage session
	CrVisit.prototype.setLocalStorage = function () {

		try {

			var isLocalStorage = _isLocalStorage();

			if (isLocalStorage) {

				localStorage.setItem(_storageName, this.json());

				_pushEvent('set local storage');

				return true;
			}

			return false;

		} catch (e) {
			_pushEvent('failed set local storage');

			return false;
		}
	};

	// method will set the cookies session value
	CrVisit.prototype.setCookie = function () {

		try {

			var isCookie = _isCookie();

			if (isCookie) {
				var cookie = CRCookies.get(_cookieName);

				if (cookie) {
					CRCookies.remove(_cookieName);
				}

				CRCookies.set(_cookieName, this.json(), { expires: 30 });

				_pushEvent('set cookie true');

				return true;
			}

			return false;

		} catch (e) {
			_pushEvent('failed set cookie');

			return false;
		}
	};

	// method will load the data from storage and cookies
	CrVisit.prototype.loadSavedData = function () {

		try {

			var isLocalStorage = _isLocalStorage();
			var isCookie = _isCookie();

			var storedData;

			var parsedDone = false;

			if (isLocalStorage) {
				storedData = localStorage.getItem(_storageName);
			}

			if (storedData) {
				parsedDone = this.jsonParse(storedData);
				storedData = null;
				_pushEvent('parsing from storage ' + parsedDone);
			}

			if (isCookie && !parsedDone) {

				storedData = CRCookies.get(_cookieName);

				if (storedData) {
					parsedDone = this.jsonParse(storedData);
					_pushEvent('parsing from cookie ' + parsedDone);
				}
			}

			_pushEvent('load saved data ' + parsedDone);

			return parsedDone;

		} catch (e) {
			_pushEvent('failed load saved data');

			return false;
		}
	};

	// method will check the data is expired or not
	CrVisit.prototype.checkExpire = function () {

		try {

			if (!this.ExpiredOn) return false;

			var today = new Date();
			var Christmas = new Date(this.CreatedOn);
			var diffMs = (today - Christmas);
			var diffDays = Math.floor(diffMs / 86400000); // days
			var diffHrs = Math.floor((diffMs % 86400000) / 3600000); // hours
			var diffMins = Math.round(((diffMs % 86400000) % 3600000) / 60000); // minutes

			var expired = this.ExpiredOn.split('_');

			if (expired[1] == 'mins') {
				if (diffDays <= 0 && diffHrs <= 0 && diffMins <= parseInt(expired[0])) {
					return false;
				}
			} else if (expired[1] == 'days') {
				if (diffDays <= parseInt(expired[0])) {
					return false;
				}
			}

			return true;

		} catch (e) {
			_pushEvent('failed load saved data');

			return true;
		}
	};

	// initialize the classes
	// note these classes will remain private.
	// will not accessible outside this namespace
	var _vDevice = new VisitorDevice()
	var _crVisit = new CrVisit();

	// CRTracking main public class / pulgin 
	this.CRTracking = function () {

		// default parameters/properties
		var defaults = {
			checkExpire: true,
			checkUTMS: true,
			checkURLChange: true,
			expiredOn: '30_days',
			storeCode: undefined
		};

		// set the default parameters on call
		if (arguments[0] && typeof arguments[0] === "object") {
			this.options = _extendDefaults(defaults, arguments[0]);
		}

		// get the session expired time value
		if (defaults.expiredOn) {
			_expiredOn = defaults.expiredOn;
			_crVisit.ExpiredOn = _expiredOn;
		}

		// get the store code
		if (!inputParms._siteId && defaults.storeCode) {
			inputParms._siteId = defaults.storeCode
			_storageName = '_trcr_session_' + inputParms._siteId;
			_crVisit.storeCode = inputParms._siteId;
		}

		// call and set visitor device info
		_vDevice.fillData();

		if (defaults.checkUTMS == true && defaults.checkExpire == true) {
			_crVisit.checkUTMS();
			_crVisit.verifySavedData();
		}
		else {
			_crVisit.checkAllVisit();
		}

		this.VisitorDeviceObject = _vDevice;
		this.VisitorObject = _crVisit;

		if (defaults.checkURLChange) {

			var pushState = history.pushState;

			history.pushState = function () {
				pushState.apply(history, arguments);
				_pushPageVisitData();
			};

		}

		_pushPageVisitData();

		_printStoredData();
	};

	CRTracking.prototype.PushPageVisit = function () {

	};

	CRTracking.prototype.PushAction = function (actionName) {
		_pushVisitorAction(actionName);
	};

	CRTracking.prototype.PushOrder = function (orderDetails) {
		_pushOrder(orderDetails);
	};

	function _extendDefaults(source, properties) {
		var property;
		for (property in properties) {
			if (properties.hasOwnProperty(property)) {
				source[property] = properties[property];
			}
		}
		return source;
	};

	function _mergeObject(vObject, vsObj) {
		var extendedProps = {};

		for (property in vObject) {
			extendedProps[property] = vObject[property];
		}

		for (property in vsObj) {
			extendedProps[property] = vsObj[property];
		}

		return extendedProps;
	};

	function _pushPageVisitData() {
		try {

			if (_crVisit.isValidObject()) {

				var vdm = {
					s_z: _vDevice.ScreenSize
				};

				var cvm = {
					v_i: _crVisit.VisitorId,
					c_on: _safeISOStr(_crVisit.CreatedOn),
					l_a_on: _safeISOStr(_crVisit.LastActivityOn),
					e_on: _crVisit.ExpiredOn,
					s_c: _crVisit.StoreCode
				};

				var data = _mergeObject(vdm, cvm);

				var url = inputParms._apiURL + "/api/visitors/logme?data=" + JSON.stringify(data);

				var reqImage = new Image(1, 1);
				reqImage.src = url;
				reqImage.style = 'position: absolute;top: -500px;left: -500px;'
				reqImage.id = 'crTrackRQ';
				document.body.appendChild(reqImage);

				setTimeout(function () {
					document.getElementById('crTrackRQ').remove();
				}, 1000);

			}
			return null;
		} catch (e) {
			return null;
		}
	};

	function _pushVisitorAction(actionName) {
		try {

			if (_crVisit.isValidObject()) {

				var data = {
					VisitorId: _crVisit.VisitorId,
					StoreCode: _crVisit.StoreCode
				};

				if (typeof actionName === 'object') {
					data = _mergeObject(data, actionName);
				}
				else {
					data.Name = actionName;
				}

				var url = inputParms._apiURL + "/api/visitors/logaction?data=" + JSON.stringify(data);

				var reqImage = new Image(1, 1);
				reqImage.src = url;
				reqImage.style = 'position: absolute;top: -500px;left: -500px;'
				reqImage.id = 'crTrackRQ';
				document.body.appendChild(reqImage);

				setTimeout(function () {
					document.getElementById('crTrackRQ').remove();
				}, 1000);

			}
			return null;
		} catch (e) {
			return null;
		}
	};

	function _pushOrder(data) {
		try {

			if (_crVisit.isValidObject()) {

				data.VisitorId = _crVisit.VisitorId;
				data.StoreCode = _crVisit.StoreCode;

				var url = inputParms._apiURL + "/api/visitors/logorder?data=" + JSON.stringify(data);

				var reqImage = new Image(1, 1);
				reqImage.src = url;
				reqImage.style = 'position: absolute;top: -500px;left: -500px;'
				reqImage.id = 'crTrackRQ';
				document.body.appendChild(reqImage);

				setTimeout(function () {
					document.getElementById('crTrackRQ').remove();
				}, 1000);

			}
			return null;
		} catch (e) {
			return null;
		}
	};

	function _isLocalStorage() {
		var _supportsLocalStorage = !!window.localStorage
			&& typeof localStorage.getItem === 'function'
			&& typeof localStorage.setItem === 'function'
			&& typeof localStorage.removeItem === 'function';

		return _supportsLocalStorage && _localStorageEnabled;
	};

	function _isCookie() {
		return _cookieEnabled;
	};

	function _checkUTMS() {

		var vars = {};

		if (window.location.href.indexOf('?') >= 0) {

			var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {
				vars[key] = value;
			});
		}

		if (window.location.href.indexOf('#') >= 0) {
			var parts = window.location.href.replace(/[#&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {
				vars[key] = value;
			});
		}

		var utms = vars['utm_ref'] == 'cartright';

		_pushEvent('check utms ' + utms);

		return utms;
	};

	function _pushEvent(name) {
		var e = { Name: name, Date: new Date() };
		_events.push(e);
	};

	function _printStoredData() {
		try {
			var cookie = CRCookies.get(_cookieName);
			var storedData = localStorage.getItem(_storageName);
		} catch (error) {
			_pushEvent(error);
		}
	};

	function _getDateString() {
		return new Date().toString();
	}

	function _resetStorage() {

		try {
			CRCookies.remove(_cookieName);
		} catch (error) {
		}

		try {
			localStorage.removeItem(_storageName);
		} catch (error) {
		}
	};

	function _getScreenSize() {
		try {
			var width = window.innerWidth
				|| document.documentElement.clientWidth
				|| document.body.clientWidth;

			var height = window.innerHeight
				|| document.documentElement.clientHeight
				|| document.body.clientHeight;

			return width + 'x' + height;
		} catch (error) {
			return null;
		}
	};

	function _guid() {
		return 'o1' + '-xxxxxxxx-'.replace(/[x]/g, function (c) {
			var r = Math.random() * 36 | 0,
				v = c == 'x' ? r : r & 0x3 | 0x8;
			return v.toString(36);
		}) + (1 * new Date()).toString(36);
	};

	function _safeISOStr(input) {
		try {
			return new Date(input).toISOString();
		} catch (error) {
			return input;
		}
	};

}());


//Start Cookies Plugin
//https://github.com/js-cookie/js-cookie

; (function (factory) {
	var registeredInModuleLoader;
	if (typeof define === 'function' && define.amd) {
		define(factory);
		registeredInModuleLoader = true;
	}
	if (typeof exports === 'object') {
		module.exports = factory();
		registeredInModuleLoader = true;
	}
	if (!registeredInModuleLoader) {
		var OldCookies = window.Cookies;
		var api = window.Cookies = factory();
		api.noConflict = function () {
			window.Cookies = OldCookies;
			return api;
		};
	}
}(function () {
	function extend() {
		var i = 0;
		var result = {};
		for (; i < arguments.length; i++) {
			var attributes = arguments[i];
			for (var key in attributes) {
				result[key] = attributes[key];
			}
		}
		return result;
	}

	function decode(s) {
		return s.replace(/(%[0-9A-Z]{2})+/g, decodeURIComponent);
	}

	function init(converter) {
		function api() { }

		function set(key, value, attributes) {
			if (typeof document === 'undefined') {
				return;
			}

			attributes = extend({
				path: '/'
			}, api.defaults, attributes);

			if (typeof attributes.expires === 'number') {
				attributes.expires = new Date(new Date() * 1 + attributes.expires * 864e+5);
			}

			// We're using "expires" because "max-age" is not supported by IE
			attributes.expires = attributes.expires ? attributes.expires.toUTCString() : '';

			try {
				var result = JSON.stringify(value);
				if (/^[\{\[]/.test(result)) {
					value = result;
				}
			} catch (e) { }

			value = converter.write ?
				converter.write(value, key) :
				encodeURIComponent(String(value))
					.replace(/%(23|24|26|2B|3A|3C|3E|3D|2F|3F|40|5B|5D|5E|60|7B|7D|7C)/g, decodeURIComponent);

			key = encodeURIComponent(String(key))
				.replace(/%(23|24|26|2B|5E|60|7C)/g, decodeURIComponent)
				.replace(/[\(\)]/g, escape);

			var stringifiedAttributes = '';
			for (var attributeName in attributes) {
				if (!attributes[attributeName]) {
					continue;
				}
				stringifiedAttributes += '; ' + attributeName;
				if (attributes[attributeName] === true) {
					continue;
				}

				// Considers RFC 6265 section 5.2:
				// ...
				// 3.  If the remaining unparsed-attributes contains a %x3B (";")
				//     character:
				// Consume the characters of the unparsed-attributes up to,
				// not including, the first %x3B (";") character.
				// ...
				stringifiedAttributes += '=' + attributes[attributeName].split(';')[0];
			}

			return (document.cookie = key + '=' + value + stringifiedAttributes);
		}

		function get(key, json) {
			if (typeof document === 'undefined') {
				return;
			}

			var jar = {};
			// To prevent the for loop in the first place assign an empty array
			// in case there are no cookies at all.
			var cookies = document.cookie ? document.cookie.split('; ') : [];
			var i = 0;

			for (; i < cookies.length; i++) {
				var parts = cookies[i].split('=');
				var cookie = parts.slice(1).join('=');

				if (!json && cookie.charAt(0) === '"') {
					cookie = cookie.slice(1, -1);
				}

				try {
					var name = decode(parts[0]);
					cookie = (converter.read || converter)(cookie, name) ||
						decode(cookie);

					if (json) {
						try {
							cookie = JSON.parse(cookie);
						} catch (e) { }
					}

					jar[name] = cookie;

					if (key === name) {
						break;
					}
				} catch (e) { }
			}

			return key ? jar[key] : jar;
		}

		api.set = set;
		api.get = function (key) {
			return get(key, false /* read as raw */);
		};
		api.getJSON = function (key) {
			return get(key, true /* read as json */);
		};
		api.remove = function (key, attributes) {
			set(key, '', extend(attributes, {
				expires: -1
			}));
		};

		api.defaults = {};

		api.withConverter = init;

		return api;
	}

	return init(function () { });
}));

//END Cookies Plugin

//Start Doc Ready function
// This function make sure the html page is loaded completely and ready for use.
(function (funcName, baseObj) {
	"use strict";
	// The public function name defaults to window.docReady
	// but you can modify the last line of this function to pass in a different object or method name
	// if you want to put them in a different namespace and those will be used instead of 
	// window.docReady(...)
	funcName = funcName || "docReady";
	baseObj = baseObj || window;
	var readyList = [];
	var readyFired = false;
	var readyEventHandlersInstalled = false;

	// call this when the document is ready
	// this function protects itself against being called more than once
	function ready() {
		if (!readyFired) {
			// this must be set to true before we start calling callbacks
			readyFired = true;
			for (var i = 0; i < readyList.length; i++) {
				// if a callback here happens to add new ready handlers,
				// the docReady() function will see that it already fired
				// and will schedule the callback to run right after
				// this event loop finishes so all handlers will still execute
				// in order and no new ones will be added to the readyList
				// while we are processing the list
				readyList[i].fn.call(window, readyList[i].ctx);
			}
			// allow any closures held by these functions to free
			readyList = [];
		}
	}

	function readyStateChange() {
		if (document.readyState === "complete") {
			ready();
		}
	}

	// This is the one public interface
	// docReady(fn, context);
	// the context argument is optional - if present, it will be passed
	// as an argument to the callback
	baseObj[funcName] = function (callback, context) {
		if (typeof callback !== "function") {
			throw new TypeError("callback for docReady(fn) must be a function");
		}
		// if ready has already fired, then just schedule the callback
		// to fire asynchronously, but right away
		if (readyFired) {
			setTimeout(function () { callback(context); }, 1);
			return;
		} else {
			// add the function and context to the list
			readyList.push({ fn: callback, ctx: context });
		}
		// if document already ready to go, schedule the ready function to run
		// IE only safe when readyState is "complete", others safe when readyState is "interactive"
		if (document.readyState === "complete" || (!document.attachEvent && document.readyState === "interactive")) {
			setTimeout(ready, 1);
		} else if (!readyEventHandlersInstalled) {
			// otherwise if we don't have event handlers installed, install them
			if (document.addEventListener) {
				// first choice is DOMContentLoaded event
				document.addEventListener("DOMContentLoaded", ready, false);
				// backup is window load event
				window.addEventListener("load", ready, false);
			} else {
				// must be IE
				document.attachEvent("onreadystatechange", readyStateChange);
				window.attachEvent("onload", ready);
			}
			readyEventHandlersInstalled = true;
		}
	}
})("docReady", window);

//End Doc Ready

/* Umbrella JS 3.1.0 umbrellajs.com */

var u = function (t, e) { return this instanceof u ? t instanceof u ? t : ("string" == typeof t && (t = this.select(t, e)), t && t.nodeName && (t = [t]), void (this.nodes = this.slice(t))) : new u(t, e) }; u.prototype = { get length() { return this.nodes.length } }, u.prototype.nodes = [], u.prototype.addClass = function () { return this.eacharg(arguments, function (t, e) { t.classList.add(e) }) }, u.prototype.adjacent = function (i, t, n) { return "number" == typeof t && (t = 0 === t ? [] : new Array(t).join().split(",").map(Number.call, Number)), this.each(function (r, o) { var e = document.createDocumentFragment(); u(t || {}).map(function (t, e) { var n = "function" == typeof i ? i.call(this, t, e, r, o) : i; return "string" == typeof n ? this.generate(n) : u(n) }).each(function (t) { this.isInPage(t) ? e.appendChild(u(t).clone().first()) : e.appendChild(t) }), n.call(this, r, e) }) }, u.prototype.after = function (t, e) { return this.adjacent(t, e, function (t, e) { t.parentNode.insertBefore(e, t.nextSibling) }) }, u.prototype.append = function (t, e) { return this.adjacent(t, e, function (t, e) { t.appendChild(e) }) }, u.prototype.args = function (t, e, n) { return "function" == typeof t && (t = t(e, n)), "string" != typeof t && (t = this.slice(t).map(this.str(e, n))), t.toString().split(/[\s,]+/).filter(function (t) { return t.length }) }, u.prototype.array = function (o) { o = o; var i = this; return this.nodes.reduce(function (t, e, n) { var r; return o ? ((r = o.call(i, e, n)) || (r = !1), "string" == typeof r && (r = u(r)), r instanceof u && (r = r.nodes)) : r = e.innerHTML, t.concat(!1 !== r ? r : []) }, []) }, u.prototype.attr = function (t, e, r) { return r = r ? "data-" : "", this.pairs(t, e, function (t, e) { return t.getAttribute(r + e) }, function (t, e, n) { t.setAttribute(r + e, n) }) }, u.prototype.before = function (t, e) { return this.adjacent(t, e, function (t, e) { t.parentNode.insertBefore(e, t) }) }, u.prototype.children = function (t) { return this.map(function (t) { return this.slice(t.children) }).filter(t) }, u.prototype.clone = function () { return this.map(function (t, e) { var n = t.cloneNode(!0), r = this.getAll(n); return this.getAll(t).each(function (t, e) { for (var n in this.mirror) this.mirror[n] && this.mirror[n](t, r.nodes[e]) }), n }) }, u.prototype.getAll = function (t) { return u([t].concat(u("*", t).nodes)) }, u.prototype.mirror = {}, u.prototype.mirror.events = function (t, e) { if (t._e) for (var n in t._e) t._e[n].forEach(function (t) { u(e).on(n, t) }) }, u.prototype.mirror.select = function (t, e) { u(t).is("select") && (e.value = t.value) }, u.prototype.mirror.textarea = function (t, e) { u(t).is("textarea") && (e.value = t.value) }, u.prototype.closest = function (e) { return this.map(function (t) { do { if (u(t).is(e)) return t } while ((t = t.parentNode) && t !== document) }) }, u.prototype.data = function (t, e) { return this.attr(t, e, !0) }, u.prototype.each = function (t) { return this.nodes.forEach(t.bind(this)), this }, u.prototype.eacharg = function (n, r) { return this.each(function (e, t) { this.args(n, e, t).forEach(function (t) { r.call(this, e, t) }, this) }) }, u.prototype.empty = function () { return this.each(function (t) { for (; t.firstChild;)t.removeChild(t.firstChild) }) }, u.prototype.filter = function (e) { var t = function (t) { return t.matches = t.matches || t.msMatchesSelector || t.webkitMatchesSelector, t.matches(e || "*") }; return "function" == typeof e && (t = e), e instanceof u && (t = function (t) { return -1 !== e.nodes.indexOf(t) }), u(this.nodes.filter(t)) }, u.prototype.find = function (e) { return this.map(function (t) { return u(e || "*", t) }) }, u.prototype.first = function () { return this.nodes[0] || !1 }, u.prototype.generate = function (t) { return /^\s*<tr[> ]/.test(t) ? u(document.createElement("table")).html(t).children().children().nodes : /^\s*<t(h|d)[> ]/.test(t) ? u(document.createElement("table")).html(t).children().children().children().nodes : /^\s*</.test(t) ? u(document.createElement("div")).html(t).children().nodes : document.createTextNode(t) }, u.prototype.handle = function () { var t = this.slice(arguments).map(function (e) { return "function" == typeof e ? function (t) { t.preventDefault(), e.apply(this, arguments) } : e }, this); return this.on.apply(this, t) }, u.prototype.hasClass = function () { return this.is("." + this.args(arguments).join(".")) }, u.prototype.html = function (e) { return void 0 === e ? this.first().innerHTML || "" : this.each(function (t) { t.innerHTML = e }) }, u.prototype.is = function (t) { return 0 < this.filter(t).length }, u.prototype.isInPage = function (t) { return t !== document.body && document.body.contains(t) }, u.prototype.last = function () { return this.nodes[this.length - 1] || !1 }, u.prototype.map = function (t) { return t ? u(this.array(t)).unique() : this }, u.prototype.not = function (e) { return this.filter(function (t) { return !u(t).is(e || !0) }) }, u.prototype.off = function (t) { return this.eacharg(t, function (e, n) { u(e._e ? e._e[n] : []).each(function (t) { e.removeEventListener(n, t) }) }) }, u.prototype.on = function (t, e, r) { if ("string" == typeof e) { var o = e; e = function (e) { var n = arguments; u(e.currentTarget).find(o).each(function (t) { if (t === e.target || t.contains(e.target)) { try { Object.defineProperty(e, "currentTarget", { get: function () { return t } }) } catch (t) { } r.apply(t, n) } }) } } var n = function (t) { return e.apply(this, [t].concat(t.detail || [])) }; return this.eacharg(t, function (t, e) { t.addEventListener(e, n), t._e = t._e || {}, t._e[e] = t._e[e] || [], t._e[e].push(n) }) }, u.prototype.pairs = function (n, t, e, r) { if (void 0 !== t) { var o = n; (n = {})[o] = t } return "object" == typeof n ? this.each(function (t) { for (var e in n) r(t, e, n[e]) }) : this.length ? e(this.first(), n) : "" }, u.prototype.param = function (e) { return Object.keys(e).map(function (t) { return this.uri(t) + "=" + this.uri(e[t]) }.bind(this)).join("&") }, u.prototype.parent = function (t) { return this.map(function (t) { return t.parentNode }).filter(t) }, u.prototype.prepend = function (t, e) { return this.adjacent(t, e, function (t, e) { t.insertBefore(e, t.firstChild) }) }, u.prototype.remove = function () { return this.each(function (t) { t.parentNode && t.parentNode.removeChild(t) }) }, u.prototype.removeClass = function () { return this.eacharg(arguments, function (t, e) { t.classList.remove(e) }) }, u.prototype.replace = function (t, e) { var n = []; return this.adjacent(t, e, function (t, e) { n = n.concat(this.slice(e.children)), t.parentNode.replaceChild(e, t) }), u(n) }, u.prototype.scroll = function () { return this.first().scrollIntoView({ behavior: "smooth" }), this }, u.prototype.select = function (t, e) { return t = t.replace(/^\s*/, "").replace(/\s*$/, ""), /^</.test(t) ? u().generate(t) : (e || document).querySelectorAll(t) }, u.prototype.serialize = function () { var r = this; return this.slice(this.first().elements).reduce(function (e, n) { return !n.name || n.disabled || "file" === n.type ? e : /(checkbox|radio)/.test(n.type) && !n.checked ? e : "select-multiple" === n.type ? (u(n.options).each(function (t) { t.selected && (e += "&" + r.uri(n.name) + "=" + r.uri(t.value)) }), e) : e + "&" + r.uri(n.name) + "=" + r.uri(n.value) }, "").slice(1) }, u.prototype.siblings = function (t) { return this.parent().children(t).not(this) }, u.prototype.size = function () { return this.first().getBoundingClientRect() }, u.prototype.slice = function (t) { return t && 0 !== t.length && "string" != typeof t && "[object Function]" !== t.toString() ? t.length ? [].slice.call(t.nodes || t) : [t] : [] }, u.prototype.str = function (e, n) { return function (t) { return "function" == typeof t ? t.call(this, e, n) : t.toString() } }, u.prototype.text = function (e) { return void 0 === e ? this.first().textContent || "" : this.each(function (t) { t.textContent = e }) }, u.prototype.toggleClass = function (t, e) { return !!e === e ? this[e ? "addClass" : "removeClass"](t) : this.eacharg(t, function (t, e) { t.classList.toggle(e) }) }, u.prototype.trigger = function (t) { var o = this.slice(arguments).slice(1); return this.eacharg(t, function (t, e) { var n, r = { bubbles: !0, cancelable: !0, detail: o }; try { n = new window.CustomEvent(e, r) } catch (t) { (n = document.createEvent("CustomEvent")).initCustomEvent(e, !0, !0, o) } t.dispatchEvent(n) }) }, u.prototype.unique = function () { return u(this.nodes.reduce(function (t, e) { return null != e && !1 !== e && -1 === t.indexOf(e) ? t.concat(e) : t }, [])) }, u.prototype.uri = function (t) { return encodeURIComponent(t).replace(/!/g, "%21").replace(/'/g, "%27").replace(/\(/g, "%28").replace(/\)/g, "%29").replace(/\*/g, "%2A").replace(/%20/g, "+") }, u.prototype.wrap = function (t) { return this.map(function (e) { return u(t).each(function (t) { (function (t) { for (; t.firstElementChild;)t = t.firstElementChild; return u(t) })(t).append(e.cloneNode(!0)), e.parentNode.replaceChild(t, e) }) }) }, "object" == typeof module && module.exports && (module.exports = u, module.exports.u = u);

// End Umbrella JS