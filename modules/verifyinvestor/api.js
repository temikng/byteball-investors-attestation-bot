/*jslint node: true */
'use strict';
const request = require('request');
const conf = require('byteballcore/conf.js');
const notifications = require('./../notifications.js');

const API_TOKEN = conf.verifyInvestorApiToken;
const USER_AUTHORIZATION_TOKEN = conf.verifyInvestorUserAuthorizationToken;
const URL = conf.verifyInvestorUrl;

exports.getAuthUrn= (identifier) => {
	return getUrnByKey('auth', identifier);
};

exports.checkAuthAndGetId = (identifier, onDone) => {
	sendRequest(
		getUrnByKey('identifier', identifier),
		(err, response, body) => {
			if (err) {
				notifications.notifyAdmin(`verifyinvestor api checkAuth: ${identifier} err`, err);
				return onDone(err);
			}

			const statusCode = response.statusCode;
			if (statusCode !== 200) {
				if (statusCode === 404) {
					return onDone(null, false);
				}

				notifications.notifyAdmin(`verifyinvestor api checkAuth: ${identifier} statusCode ${statusCode}`, body);
				return onDone(statusCode);
			}

			if (!body || !body.id) {
				notifications.notifyAdmin(`verifyinvestor api checkAuth: ${identifier} body`, body);
				return onDone('wrong body');
			}

			return onDone(null, body.id);
		}
	);
};

exports.postVerificationRequestToUser = (user_id, onDone) => {
	sendRequest(
		{
			method: 'POST',
			urn: getUrnByKey('user_verification_requests', user_id)
		}, (err, response, body) => {
			if (err) {
				notifications.notifyAdmin(`verifyinvestor api postVerificationRequestToUser: ${user_id} err`, err);
				return onDone(err);
			}

			const statusCode = response.statusCode;
			if (statusCode !== 201) {
				notifications.notifyAdmin(`verifyinvestor api postVerificationRequestToUser: ${user_id} statusCode ${statusCode}`, body);
				return onDone(statusCode);
			}

			if (!body || !body.id) {
				notifications.notifyAdmin(`verifyinvestor api postVerificationRequestToUser: ${user_id} body`, body);
				return onDone('wrong body');
			}

			return onDone(null, body.id);
		}
	);
};

exports.getUserVerifyRequestStatus = (user_id, vr_id, onDone) => {
	sendRequest(
		getUrnByKey('verify_user', user_id, vr_id),
		(err, response, body) => {
			if (err) {
				notifications.notifyAdmin(`verifyinvestor api checkUserVerifyRequest: ${user_id} ${vr_id} err`, err);
				return onDone(err);
			}

			const statusCode = response.statusCode;
			if (statusCode !== 200) {
				notifications.notifyAdmin(`verifyinvestor api checkUserVerifyRequest: ${user_id} ${vr_id} statusCode ${statusCode}`, body);
				return onDone(statusCode);
			}

			if (!body || !body.id || body.id !== vr_id || !body.status) {
				notifications.notifyAdmin(`verifyinvestor api checkUserVerifyRequest: ${user_id} ${vr_id} body`, body);
				return onDone('wrong body');
			}

			return onDone(null, body.status);
		}
	);
};


function getUrnByKey(key) {
	switch (key) {
		case 'api':
			return `/api/v1`;
		case 'auth': {
			if (!arguments[1]) throw new Error('require set identifier');
			return `/authorization/${USER_AUTHORIZATION_TOKEN}?identifier=${arguments[1]}`;
		}
		case 'identifier': {
			if (!arguments[1]) throw new Error('require set identifier');
			return `/api/v1/users/identifier/${arguments[1]}`;
		}
		case 'users':
			return '/api/v1/users';
		case 'user': {
			if (!arguments[1]) throw new Error('require set user id');
			return `/api/v1/users/${arguments[1]}`;
		}
		case 'user_verification_requests': {
			if (!arguments[1]) throw new Error('require set user id');
			return `/api/v1/users/${arguments[1]}/verification_requests`
		}
		case 'verify_user': {
			if (!arguments[1]) throw new Error('require set user id');
			if (!arguments[2]) throw new Error('require set verification request id');
			return `/api/v1/users/${arguments[1]}/verification_requests/${arguments[2]}`;
		}
		case 'user_review_request': { // staging only
			if (!arguments[1]) throw new Error('require set user id');
			if (!arguments[2]) throw new Error('require set verification request id');
			return `/api/v1/users/${arguments[1]}/verification_requests/${arguments[2]}/review`;
		}
		default:
			throw new Error(`undefined key: ${key}`);
	}
}

function sendRequest(options, callback) {
	let urn;
	if (typeof options === 'string') {
		urn = options;
		options = {};
	} else {
		if (!options.urn) throw new Error('require define urn param in options');
		urn = options.urn;
		delete options.urn;
	}
	let resultOptions = Object.assign({}, {
		method: 'GET',
		url: `${URL}${urn}`,
		json: true,
		headers: {
			'Authorization': `Token ${API_TOKEN}`,
			"Content-Type": "application/json",
			"User-Agent": "Byteball attestation/1.0"
		}
	}, options);
	request(resultOptions, (err, request, body) => callback(err, request, body, resultOptions));
}