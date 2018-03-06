/*jslint node: true */
'use strict';
const desktopApp = require('byteballcore/desktop_app.js');
const conf = require('byteballcore/conf');

/**
 * responses for clients
 */
exports.greeting = () => {
	//TODO: fix message for current bot
	return [
		"Here you can attest ....\n\n",

		`The price of attestation is $${conf.priceInUSD.toLocaleString([], {minimumFractionDigits: 2})}. `,
		"The payment is nonrefundable even if the attestation fails for any reason.\n\n",

		`After you successfully attestation for the first time, `,
		`you receive a $${conf.rewardInUSD.toLocaleString([], {minimumFractionDigits: 2})} reward in Bytes.`
	].join('');
};

exports.weHaveReferralProgram = () => {
	return [
		"Remember, we have a referral program: " +
		"if you send Bytes from your attested address to a new user who is not attested yet, " +
		"and he/she uses those Bytes to pay for a successful attestation, " +
		`you receive a $${conf.referralRewardInUSD.toLocaleString([], {minimumFractionDigits: 2})} reward in Bytes.`
	].join('');
};

exports.insertMyAddress = () => {
	return [
		"Please send me your address that you wish to attest (click ... and Insert my address).\n",
		"Make sure you are in a single-address wallet. ",
		"If you don't have a single-address wallet, ",
		"please add one (burger menu, add wallet) and fund it with the amount sufficient to pay for the attestation."
	].join('');
};

exports.goingToAttestAddress = (address) => {
	return `Thanks, going to attest your address: ${address}.`;
};

exports.pleasePay = (receivingAddress, price) => {
	return `Please pay for the attestation: [attestation payment](byteball:${receivingAddress}?amount=${price}).`;
};

exports.receivedPaymentFromMultipleAddresses = () => {
	return "Received a payment but looks like it was not sent from a single-address wallet.";
};

exports.receivedPaymentNotFromExpectedAddress = (address) => {
	return [
		`Received a payment but it was not sent from the expected address ${address}.\n`,
		"Make sure you are in a single-address wallet, ",
		"otherwise switch to a single-address wallet or create one and send me your address before paying."
	].join('');
};

exports.receivedYourPayment = (amount) => {
	return `Received your payment of ${amount} Bytes, waiting for confirmation. It should take 5-15 minutes.`;
};

exports.paymentIsConfirmed = () => {
	return "Your payment is confirmed, redirecting to verify investor ...";
};

exports.clickInvestorLink = (redirectUrn) => {
	return `Please click this link to start verification: ${conf.verifyInvestorUrl}${redirectUrn}`;
};

exports.attestedSuccessFirstTimeBonus = (rewardInBytes) => {
	return [
		"You requested an attestation for the first time and will receive a welcome bonus ",
		`of $${conf.rewardInUSD.toLocaleString([], {minimumFractionDigits: 2})} `,
		`(${(rewardInBytes/1e9).toLocaleString([], {maximumFractionDigits: 9})} GB) `,
		"from Byteball distribution fund."
	].join('')
};

exports.referredUserBonus = (referralRewardInBytes) => {
	return [
		"You referred a user who has just verified his identity and you will receive a reward ",
		`of $${conf.referralRewardInUSD.toLocaleString([], {minimumFractionDigits: 2})} `,
		`(${(referralRewardInBytes/1e9).toLocaleString([], {maximumFractionDigits: 9})} GB) `,
		"from Byteball distribution fund.\n",
		"Thank you for bringing in a new byteballer, the value of the ecosystem grows with each new user!"
	].join('');
};

exports.alreadyAttested = (attestationDate) => {
	return `You were already attested at ${attestationDate} UTC. Attest [again](command: again)?`;
};

exports.currentAttestationFailed = () => {
	return "Your attestation failed. Try [again](command: again)?";
};
exports.previousAttestationFailed = () => {
	return "Your previous attestation failed. Try [again](command: again)?";
};


/**
 * errors initialize bot
 */
exports.errorInitSql = () => {
	return "please import db.sql file\n";
};

exports.errorConfigSmtp = () => {
	return `please specify smtpUser, smtpPassword and smtpHost in your ${desktopApp.getAppDataDir()}/conf.json\n`;
};

exports.errorConfigEmail = () => {
	return `please specify admin_email and from_email in your ${desktopApp.getAppDataDir()}/conf.json\n`;
};

exports.errorConfigSalt = () => {
	return `please specify salt in your ${desktopApp.getAppDataDir()}/conf.json\n`;
};

exports.errorConfigVerifyInvestorToken = () => {
	return 'please specify verifyInvestorApiToken and verifyInvestorUserAuthorizationToken in your ${desktopApp.getAppDataDir()}/conf.json\n';
};