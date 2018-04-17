var Advertisement = artifacts.require("./Advertisement.sol");
var AppCoins = artifacts.require("./AppCoins.sol");
var chai = require('chai');
var web3 = require('web3');
var expect = chai.expect;
var chaiAsPromissed = require('chai-as-promised');
chai.use(chaiAsPromissed);

var appcInstance;
var addInstance;
var devShare = 0.85;
var appStoreShare = 0.1;
var oemShare = 0.05;

var expectRevert = RegExp('revert');

var campaignPrice;
var campaignBudget;

contract('Advertisement', function(accounts) {
  beforeEach(async () => {
		
		appcInstance = await AppCoins.new();
		
		addInstance = await	Advertisement.new(appcInstance.address);

		campaignPrice = 50000000000000000;
		campaignBudget = 1000000000000000000;

		await appcInstance.approve(addInstance.address,campaignBudget);
		await addInstance.createCampaign("com.facebook.orca","PT,UK,FR",[1,2],campaignPrice,campaignBudget,20,1922838059980);

		examplePoA = new Object();
		examplePoA.packageName = "com.facebook.orca";
		// Need to get bid generated by create Campaign
		examplePoA.bid = web3.utils.toHex("0x0000000000000000000000000000000000000000000000000000000000000000");
		examplePoA.timestamp = new Array();
		examplePoA.nonce = new Array();

		example2PoA = new Object();		
		example2PoA.packageName = "com.facebook.orca";
		example2PoA.bid = examplePoA.bid;
		example2PoA.timestamp = new Array();
		example2PoA.nonce = new Array();

		wrongTimestampPoA = new Object();
		wrongTimestampPoA.packageName = "com.facebook.orca";
		wrongTimestampPoA.bid = examplePoA.bid;
		wrongTimestampPoA.timestamp = new Array();
		wrongTimestampPoA.nonce = new Array();

		for(var i = 0; i < 12; i++){
			var timeNow = new Date().getTime();
			examplePoA.timestamp.push(timeNow+10000*i);
			examplePoA.nonce.push(Math.floor(Math.random()*500*i));
			example2PoA.timestamp.push(new Date().getTime()+10000*i);
			example2PoA.nonce.push(Math.floor(Math.random()*520*i));
			wrongTimestampPoA.timestamp.push(new Date().getTime()+i);
			wrongTimestampPoA.nonce.push(Math.floor(Math.random()*520*i));
		}
	});

	it('should emit an event when PoA is received', function () {
		return addInstance.registerPoA(examplePoA.packageName,examplePoA.bid,examplePoA.timestamp,examplePoA.nonce,accounts[1],accounts[2]).then( instance => {
			expect(instance.logs.length).to.be.equal(1);
		});
	});

	it('should revert registerPoA when nonce list and timestamp list have diferent lengths', async function () {
		var reverted = false;
		await addInstance.registerPoA(examplePoA.packageName,examplePoA.bid,examplePoA.timestamp,examplePoA.nonce.splice(2,3),accounts[1],accounts[2]).catch(
			(err) => {
				reverted = expectRevert.test(err.message);
			});
		expect(reverted).to.be.equal(true,"Revert expected");	
	});

	it('should registerPoA and transfer the equivalent to one installation to the user registering a PoA', async function () {
		async function getBalance(account) {
			return JSON.parse(await appcInstance.balanceOf(account));
		}

		var userInitBalance = await getBalance(accounts[0]);
		var appSInitBalance = await getBalance(accounts[1]);
		var oemInitBalance = await getBalance(accounts[2]);
		var campaignBudget = JSON.parse(await addInstance.getBudgetOfCampaign(examplePoA.bid));
		var contractBalance = JSON.parse(await appcInstance.balanceOf(addInstance.address));
		
		await addInstance.registerPoA(examplePoA.packageName,examplePoA.bid,examplePoA.timestamp,examplePoA.nonce,accounts[1],accounts[2]);
		
		var newUserBalance = await getBalance(accounts[0]);
		var newAppStoreBalance = await getBalance(accounts[1]);
		var newOemBalance = await getBalance(accounts[2]);
		var newCampaignBudget = JSON.parse(await addInstance.getBudgetOfCampaign(examplePoA.bid));
		var newContractBalance = JSON.parse(await appcInstance.balanceOf(addInstance.address));
		
		expect(campaignBudget-campaignPrice).to.be.equal(newCampaignBudget,"Campaign budget not updated.");
		expect(contractBalance-campaignPrice).to.be.equal(newContractBalance,"Contract balance not updated.");
		
		var error = new Number("1.99208860077274e-9");
		var expectedUserBalance = userInitBalance+(campaignPrice*devShare)
		expect(newUserBalance).to.be.within(expectedUserBalance - (expectedUserBalance*error), expectedUserBalance + (expectedUserBalance*error),"User balance not updated.");
		
		expect(appSInitBalance+(campaignPrice*appStoreShare)).to.be.equal((newAppStoreBalance),"AppStore balance not updated.");
		expect(oemInitBalance+(campaignPrice*oemShare)).to.be.equal((newOemBalance),"OEM balance not updated.");
	});

	it('should revert registerPoA when same user sends duplicate registerPoA', async function () {
		var reverted = false;
		await addInstance.registerPoA(examplePoA.packageName,examplePoA.bid,examplePoA.timestamp,examplePoA.nonce,accounts[1],accounts[2]);
		await addInstance.registerPoA(example2PoA.packageName,example2PoA.bid,example2PoA.timestamp,example2PoA.nonce,accounts[1],accounts[2]).catch(
			(err) => {
				reverted = expectRevert.test(err.message);
			});
		expect(reverted).to.be.equal(true,"Revert expected");	
	});

	it('should revert registerPoA if timestamps are not spaced exactly 10 secounds from each other', async function () {
		var reverted = false;
		await addInstance.registerPoA(wrongTimestampPoA.packageName,wrongTimestampPoA.bid,wrongTimestampPoA.timestamp,wrongTimestampPoA.nonce,accounts[1],accounts[2]).catch(
			(err) => {
				reverted = expectRevert.test(err.message);
			});
		expect(reverted).to.be.equal(true,"Revert expected");
	})
});
