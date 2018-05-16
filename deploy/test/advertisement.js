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

async function getBalance(account) {
	return JSON.parse(await appcInstance.balanceOf(account));
}

async function expectErrorMessageTest(errorMessage,callback){
	var events = addInstance.allEvents();
	
	await callback();
	var eventLog = await new Promise(
			function(resolve, reject){
	        events.watch(function(error, log){ events.stopWatching(); resolve(log); });
	    });

    assert.equal(eventLog.event, "Error", "Event must be an Error");
    assert.equal(eventLog.args.message,errorMessage,"Event message should be: "+errorMessage);	
}

contract('Advertisement', function(accounts) {
  beforeEach(async () => {

		nonceWrongTs = [ 70356,
						45021,
						32669,
						37785,
						15906,
						10179,
						17014,
						167317,
						63419,
						381,
						31182,
						52274];

		nonceList = [ 75824,
					111779,
					188882,
					15136,
					5936,
					41188,
					55418,
					162348,
					29001,
					99111,
					119649,
					30337];

		timestamp = [ 1524042553578,
					  1524042563843,
					  1524042574305,
					  1524042584823,
					  1524042595355,
					  1524042605651,
					  1524042615837,
					  1524042626245,
					  1524042636491,
					  1524042646740,
					  1524042657099,
					  1524042667471 ];

		wrongTimestamp = [ 1524042553761,
						  1524042554294,
						  1524042554557,
						  1524042555200,
						  1524042555437,
						  1524042555714,
						  1524042556061,
						  1524042556318,
						  1524042556654,
						  1524042557044,
						  1524042557465,
						  1524042557509 ];

		appcInstance = await AppCoins.new();

		addInstance = await	Advertisement.new(appcInstance.address);

		campaignPrice = 50000000000000000;
		campaignBudget = 1000000000000000000;

		await appcInstance.approve(addInstance.address,campaignBudget);
		await addInstance.createCampaign("com.facebook.orca","PT,UK,FR",[1,2],campaignPrice,campaignBudget,20,1922838059980);

		await appcInstance.transfer(accounts[1],1000000000000000000);
		await appcInstance.approve(addInstance.address,campaignBudget,{ from : accounts[1]});
		await addInstance.createCampaign("com.facebook.orca","PT,UK,FR",[1,2],campaignPrice,campaignBudget,20,1922838059980, { from : accounts[1]});

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

		wrongNoncePoA = new Object();
		wrongNoncePoA.packageName = examplePoA.packageName;
		wrongNoncePoA.bid = web3.utils.toHex("0x0000000000000000000000000000000000000000000000000000000000000000");
		wrongNoncePoA.timestamp = new Array();
		// any nounce list except the correct one will work here
		wrongNoncePoA.nonce = new Array();

		walletName = "com.asfoundation.wallet.dev"

		for(var i = 0; i < 12; i++){
			//var timeNow = new Date().getTime();
			var time = timestamp[i];
			//var time = 158326;

			var wrongTime = wrongTimestamp[i];
			//var correctNonce = Math.floor(Math.random()*520*i);
			var correctNonce = nonceList[i];
			var wrongTimeNonce = nonceWrongTs[i];
			examplePoA.timestamp.push(time);
			examplePoA.nonce.push(correctNonce);
			example2PoA.timestamp.push(time);
			example2PoA.nonce.push(correctNonce);
			wrongTimestampPoA.timestamp.push(wrongTime);
			wrongTimestampPoA.nonce.push(wrongTimeNonce);
			wrongNoncePoA.timestamp.push(time);
			wrongNoncePoA.nonce.push(nonceWrongTs[i]);
		}
	});

	it('should cancel a campaign as contract owner', async function () {
		var bid = web3.utils.toHex("0x0000000000000000000000000000000000000000000000000000000000000001");

		var userInitBalance = await getBalance(accounts[1]);
		var contractBalance = await getBalance(addInstance.address);
		var campaignBalance = JSON.parse(await addInstance.getBudgetOfCampaign(bid));

		await addInstance.cancelCampaign(bid);

		var newUserBalance = await getBalance(accounts[1]);
		var newContractBalance = await getBalance(addInstance.address);
		var newCampaignBalance = JSON.parse(await addInstance.getBudgetOfCampaign(bid));
		var validity =  await addInstance.getCampaignValidity(bid);


		expect(validity).to.be.equal(false);
		expect(campaignBalance).to.be.not.equal(0,"Campaign balance is 0");
		expect(newCampaignBalance).to.be.equal(0,"Campaign balance after cancel should be 0");
		expect(userInitBalance+campaignBalance).to.be.equal(newUserBalance,"User balance should be updated");
		expect(contractBalance-campaignBalance).to.be.equal(newContractBalance,"Contract balance not updated");
	})

	it('should cancel a campaign as campaign owner', async function () {
		var bid = web3.utils.toHex("0x0000000000000000000000000000000000000000000000000000000000000001");

		var userInitBalance = await getBalance(accounts[1]);
		var contractBalance = await getBalance(addInstance.address);
		var campaignBalance = JSON.parse(await addInstance.getBudgetOfCampaign(bid));

		await addInstance.cancelCampaign(bid, { from : accounts[1]});

		var newUserBalance = await getBalance(accounts[1]);
		var newContractBalance = await getBalance(addInstance.address);
		var newCampaignBalance = JSON.parse(await addInstance.getBudgetOfCampaign(bid));
		var validity =  await addInstance.getCampaignValidity(bid);

		expect(validity).to.be.equal(false);
		expect(campaignBalance).to.be.not.equal(0,"Campaign balance is 0");
		expect(newCampaignBalance).to.be.equal(0,"Campaign balance after cancel should be 0");
		expect(userInitBalance+campaignBalance).to.be.equal(newUserBalance,"User balance should be updated");
		expect(contractBalance-campaignBalance).to.be.equal(newContractBalance,"Contract balance not updated");
	})

	it('should revert cancel campaign if it is not issued from campaign owner nor from contract owner', async function () {
		var reverted = false;
		var bid = web3.utils.toHex("0x0000000000000000000000000000000000000000000000000000000000000001");
		await addInstance.cancelCampaign(bid,{ from : accounts[2]}).catch(
			(err) => {
				reverted = expectRevert.test(err.message);
			});
		expect(reverted).to.be.equal(true,"Revert expected");
	});

	it('should revert and emit an error event when a campaign is created without allowance', async function(){
		var userInitBalance = await getBalance(accounts[0]);

		await expectErrorMessageTest('Not enough allowance',async () => {
			await addInstance.createCampaign.sendTransaction("org.telegram.messenger","UK,FR",[1,2],campaignPrice,campaignBudget,20,1922838059980);
		})

		var newUserBalance = await getBalance(accounts[0]);

		expect(userInitBalance).to.be.equal(newUserBalance);

	});

	it('should emit an event when PoA is received', function () {
		return addInstance.registerPoA(examplePoA.packageName,examplePoA.bid,examplePoA.timestamp,examplePoA.nonce,accounts[1],accounts[2],walletName).then( instance => {
			expect(instance.logs.length).to.be.equal(1);
		});
	});

	it('should set the Campaign validity to false when the remaining budget is smaller than the price', function () {
		return addInstance.registerPoA(examplePoA.packageName,examplePoA.bid,examplePoA.timestamp,examplePoA.nonce,accounts[1],accounts[2],walletName).then( instance => {
			expect(instance.logs.length).to.be.equal(1);
		});
		return addInstance.registerPoA(examplePoA.packageName,examplePoA.bid,examplePoA.timestamp,examplePoA.nonce,accounts[1],accounts[2],walletName).then( instance => {
			expect(instance.logs.length).to.be.equal(1);
		});

		expect(addInstance.valid).to.be.false;
	});

	it('should registerPoA and transfer the equivalent to one installation to the user registering a PoA', async function () {

		var userInitBalance = await getBalance(accounts[0]);
		var appSInitBalance = await getBalance(accounts[1]);
		var oemInitBalance = await getBalance(accounts[2]);
		var campaignBudget = JSON.parse(await addInstance.getBudgetOfCampaign(examplePoA.bid));
		var contractBalance = JSON.parse(await appcInstance.balanceOf(addInstance.address));

		await addInstance.registerPoA(examplePoA.packageName,examplePoA.bid,examplePoA.timestamp,examplePoA.nonce,accounts[1],accounts[2],walletName);

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

	it('should revert registerPoA and emit an error event when the campaing is invalid', async () => {
		var bid = web3.utils.toHex("0x0000000000000000000000000000000000000000000000000000000000000001");

		await addInstance.cancelCampaign(bid, { from : accounts[1]});
		await expectErrorMessageTest("Registering a Proof of attention to a invalid campaign", async () => {
			await addInstance.registerPoA(examplePoA.packageName,examplePoA.bid,examplePoA.timestamp,examplePoA.nonce,accounts[1],accounts[2],walletName);
		})		
	});

	it('should revert registerPoA and emit an error event when nonce list and timestamp list have diferent lengths', async function () {
		var userInitBalance = await getBalance(accounts[0]);
		
		await expectErrorMessageTest("Nounce list and timestamp list must have same length", async () => {
			await addInstance.registerPoA.sendTransaction(examplePoA.packageName,examplePoA.bid,examplePoA.timestamp,examplePoA.nonce.splice(2,3),accounts[1],accounts[2],walletName);
		})
		var newUserBalance = await getBalance(accounts[0]);
		expect(userInitBalance).to.be.equal(newUserBalance);

	});

	it('should revert registerPoA and emit an error event when same user sends duplicate registerPoA', async function () {
		await addInstance.registerPoA(examplePoA.packageName,examplePoA.bid,examplePoA.timestamp,examplePoA.nonce,accounts[1],accounts[2],walletName);
		
		var userInitBalance = await getBalance(accounts[0]);
		
		await expectErrorMessageTest("User already registered a proof of attention for this campaign", async () =>{
			await addInstance.registerPoA(example2PoA.packageName,example2PoA.bid,example2PoA.timestamp,example2PoA.nonce,accounts[1],accounts[2],walletName);		
		})
		var newUserBalance = await getBalance(accounts[0]);
		expect(userInitBalance).to.be.equal(newUserBalance);

	});

	it('should revert registerPoA and emit an error event if timestamps are not spaced exactly 10 secounds from each other', async function () {
		var userInitBalance = await getBalance(accounts[0]);

		await expectErrorMessageTest("Timestamps should be spaced exactly 10 secounds", async () => {
			await addInstance.registerPoA(wrongTimestampPoA.packageName,wrongTimestampPoA.bid,wrongTimestampPoA.timestamp,wrongTimestampPoA.nonce,accounts[1],accounts[2],walletName);		
		});
		var newUserBalance = await getBalance(accounts[0]);
		expect(userInitBalance).to.be.equal(newUserBalance);

	})

	it('should revert registerPoA and emit an error event if nounces do not generate correct leading zeros', async function () {
		var userInitBalance = await getBalance(accounts[0]);
		
		await expectErrorMessageTest("Incorrect nounces for submited proof of attention", async () => {
			await addInstance.registerPoA(wrongNoncePoA.packageName,wrongNoncePoA.bid,wrongNoncePoA.timestamp,wrongNoncePoA.nonce,accounts[1],accounts[2],walletName);
		});
		var newUserBalance = await getBalance(accounts[0]);
		expect(userInitBalance).to.be.equal(newUserBalance);
		
	})

});
