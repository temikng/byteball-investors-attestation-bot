/*jslint node: true */
'use strict';
const db = require('byteballcore/db');
const conf = require('byteballcore/conf');
const api = require('./api');
const texts = require('./../texts.js');
const notifications = require('./../notifications.js');

exports.getAuthUrl = (identifier) => {
	return conf.verifyInvestorUrl + api.getAuthUrn(identifier);
};

exports.getVerReqStatusDescription = (vi_status) => {
	switch (vi_status) {
		case 'accredited':
			return 'The investor is verified as accredited';
		case 'no_verification_request':
			return 'You have no active verification request for this user (investor)';
		case 'waiting_for_investor_acceptance':
			return 'The verification is ready and waiting for the investor to accept it';
		case 'accepted_by_investor':
			return 'The investor has accepted the verification request but has not yet completed it';
		case 'waiting_for_review':
			return "Investor has completed the request, and it is now in the reviewers' queue";
		case 'in_review':
			return 'The verification request has been assigned a reviewer and is under review';
		case 'not_accredited':
			return 'After review, it appears the investor is not accredited';
		case 'waiting_for_information_from_investor':
			return 'The reviewer has requested additional information from the investor';
		case 'accepted_expire':
			return 'The verification request has expired. The investor accepted but did not complete';
		case 'declined_expire':
			return 'The verification request has expired. The investor never accepted';
		case 'declined_by_investor':
			return 'The investor has declined the verification request';
		case 'self_not_accredited':
			return 'The investor has declined the verification request';
		default: {
			return null;
		}
	}
};

exports.retryCheckAuthAndPostVerificationRequest = () => {
	db.query(
		`SELECT transaction_id, device_address, user_address
		FROM transactions JOIN receiving_addresses USING(receiving_address)
		WHERE vi_status = 0`,
		(rows) => {
			rows.forEach((row) => {
				checkAuthAndPostVerificationRequest(row.transaction_id, row.device_address, row.user_address);
			});
		}
	);
};

function checkAuthAndPostVerificationRequest(transaction_id, device_address, user_address, onDone = () => {}) {
	const mutex = require('byteballcore/mutex.js');
	const device = require('byteballcore/device.js');
	mutex.lock(['tx-' + transaction_id], (unlock) => {
		db.query(
			`SELECT 
				vi_status
			FROM transactions
			WHERE transaction_id=?`,
			[transaction_id],
			(rows) => {
				let row = rows[0];
				if (row.vi_status !== 0) {
					unlock();
					return onDone();
				}

				api.checkAuthAndGetUserId('ua'+user_address, (err, vi_user_id) => {
					if (err || !vi_user_id) {
						unlock();
						return onDone();
					}

					api.postVerificationRequestToUser(vi_user_id, user_address, (err, vi_vr_id) => {
						if (err) {
							unlock();
							return onDone();
						}

						db.query(
							`UPDATE transactions
							SET vi_status=1, vi_user_id=?, vi_vr_id=?
							WHERE transaction_id=?`,
							[vi_user_id, vi_vr_id, transaction_id],
							() => {
								unlock();
								onDone();
							}
						);
						device.sendMessageToDevice(
							device_address,
							'text',
							texts.receivedAuthToUserAccount() + '\n\n' + texts.waitingWhileVerificationRequestFinished()
						);
					});

				});
			}
		);
	});
}

exports.retryCheckVerificationRequests = () => {
	db.query(
		`SELECT transaction_id, device_address, vi_user_id, vi_vr_id
		FROM transactions JOIN receiving_addresses USING(receiving_address)
		WHERE vi_status = 1`,
		(rows) => {
			rows.forEach((row) => {
				checkUserVerificationRequest(row.transaction_id, row.device_address, row.vi_user_id, row.vi_vr_id);
			});
		}
	);
};

function checkUserVerificationRequest(transaction_id, device_address, vi_user_id, vi_vr_id, onDone = () => {}) {
	const mutex = require('byteballcore/mutex.js');
	const device = require('byteballcore/device.js');
	mutex.lock(['tx-' + transaction_id], (unlock) => {
		db.query(
			`SELECT 
				vi_status
			FROM transactions
			WHERE transaction_id=?`,
			[transaction_id],
			(rows) => {
				let row = rows[0];
				if (row.vi_status !== 1) {
					unlock();
					return onDone();
				}

				api.getUserVerifyRequestStatus(vi_user_id, vi_vr_id, (err, statusCode, vr_status) => {
					if (err) {
						unlock();
						return onDone();
					}

					if (statusCode === 404 || vr_status === 'no_verification_request') {
						// User or verification does not exist, or API user is not authorized to check
						return db.query(
							`UPDATE transactions
							SET vi_status=0
							WHERE transaction_id=?`,
							[transaction_id],
							() => {
								unlock();
								onDone();
							}
						);
					}

					let vrStatusDescription = exports.getVerReqStatusDescription(vr_status);
					if (!vrStatusDescription) {
						// may be it will be new status in service
						notifications.notifyAdmin(`getVerReqStatusDescription`, `Status ${vr_status} not found`);
						unlock();
						return onDone();
					}

					if (checkIfVerificationRequestStatusIsNeutral(vr_status)) {
						unlock();
						return onDone();
					}

					let numNewVIStatus;
					let text = texts.verificationRequestCompletedWithStatus(vrStatusDescription) + '\n\n';
					if (vr_status === 'accredited') {
						numNewVIStatus = 2;
						//TODO: add attestation
					} else {
						numNewVIStatus = 3;
						text += texts.currentAttestationFailed();
					}

					db.query(
						`UPDATE transactions
						SET vi_status=?, vi_vr_status=?
						WHERE transaction_id=?`,
						[numNewVIStatus, vr_status, transaction_id],
						() => {
							unlock();
							onDone();
						}
					);
					device.sendMessageToDevice(device_address, 'text', text);
				});
			}
		);
	});
}

function checkIfVerificationRequestStatusIsNeutral(status) {
	switch (status) {
		case 'waiting_for_investor_acceptance':
		case 'accepted_by_investor':
		case 'waiting_for_review':
		case 'in_review':
		case 'waiting_for_information_from_investor':
			return true;
		default:
			return false;
	}
}