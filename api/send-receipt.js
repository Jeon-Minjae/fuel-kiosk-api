const twilio = require('twilio');

// These environment variables must be set in Vercel's settings
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER;

// Initialize the Twilio client
const client = twilio(accountSid, authToken);

module.exports = async (req, res) => {
    
    // Set CORS headers for the frontend (done early to catch OPTIONS requests)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 1. ADDED: Handle preflight OPTIONS request for CORS explicitly
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Allow only POST requests (This is the existing check)
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    try {
        // Note: The CORS headers are now set above the try/catch block
        
        const { phone, liters, pricePerLiter, totalCost } = req.body;

        // Check for missing data
        if (!phone || !liters || !totalCost) {
            return res.status(400).json({ success: false, message: 'Missing required fields.' });
        }

        // --- Formatting the Malaysian Phone Number ---
        // 018-9578888 -> whatsapp:+60189578888
        const formattedPhone = `whatsapp:+60${phone.replace(/^0/, "")}`;

        // Construct the message body
        const messageBody = `⛽ *Fuel Receipt*\n---
\n*Pump Station*: Petronas KL
\n*Date*: ${new Date().toLocaleDateString('en-MY')}
\n*Time*: ${new Date().toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}
\n*Fuel Type*: RON 95
\n*Liters*: ${liters} L
\n*Price/Liter*: RM ${pricePerLiter}
\n*Total Paid*: *RM ${totalCost}*
\n---
\n_Thank you for your purchase!_`;

        // Send the WhatsApp message via Twilio
        const message = await client.messages.create({
            to: formattedPhone, // Recipient number
            from: twilioWhatsAppNumber, // Twilio Sandbox number
            body: messageBody,
        });

        // Respond to the kiosk frontend
        res.status(200).json({ 
            success: true, 
            message: 'Receipt sent successfully!', 
            twilioSid: message.sid 
        });

    } catch (error) {
        console.error('Twilio Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to send receipt.', 
            error: error.message 
        });
    }
};
