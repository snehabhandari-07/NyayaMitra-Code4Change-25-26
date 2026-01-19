const twilio = require('twilio');

// 1. Paste your credentials here
const accountSid = 'AC43c3fdedff713de66f2463ba3223fa8c'; 
const authToken = 'f1cab341178c259c6691a58568c80dea'; 
const twilioNumber = '+18723491605'; // Your Twilio Number

// 2. Paste YOUR personal phone number here to receive the dummy text
const myPhoneNumber = '+919168360781'; 

const client = twilio(accountSid, authToken);

// 3. The Dummy Hearing Message
const hearingDetails = {
    caseName: "Smith vs. Global Tech",
    caseNumber: "CV-2026-0482",
    time: "2:30 PM Today",
    courtroom: "Chancery Court - Room 4C",
    judge: "Judge H. Vanderbilt"
};

client.messages.create({
    body: `TODAY'S HEARING REMINDER\n\n` +
          `Case: ${hearingDetails.caseName}\n` +
          `No: ${hearingDetails.caseNumber}\n` +
          `Time: ${hearingDetails.time}\n` +
          `Loc: ${hearingDetails.courtroom}\n` +
          `Judge: ${hearingDetails.judge}`,
    from: twilioNumber,
    to: myPhoneNumber
})
.then(message => console.log(`Dummy message sent! SID: ${message.sid}`))
.catch(error => console.error(`Error sending message: ${error.message}`));