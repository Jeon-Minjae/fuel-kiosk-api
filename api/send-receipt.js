const twilio = require('twilio');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const {
            to,
            amount,
            litres,
            fuelType,
            pricePerLitre,
            serviceType,
            paymentMethod,
            transactionId
        } = req.body;

        if (!to || !amount || !litres || !fuelType) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Create receipt message - COMPLETELY WITHOUT PUMP INFORMATION
        let receiptMessage = `*Fuel Receipt*\n`;
        receiptMessage += `---\n`;
        receiptMessage += `*Pump Station*: Petronas KL\n`;
        receiptMessage += `*Date*: ${new Date().toLocaleDateString('en-GB')}\n`;
        receiptMessage += `*Time*: ${new Date().toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' })}\n`;
        receiptMessage += `*Fuel Type*: ${fuelType}\n`;
        receiptMessage += `*Total Paid*: *RM ${amount}*\n`;
        receiptMessage += `*Litres*: ${litres}L\n`;
        receiptMessage += `*Price/Litre*: RM${pricePerLitre}\n`;
        receiptMessage += `*Payment Method*: ${paymentMethod}\n`;
        receiptMessage += `*Service Type*: ${serviceType}\n`;
        // NO PUMP NUMBER LINE HERE - COMPLETELY REMOVED
        receiptMessage += `---\n`;
        receiptMessage += `*Transaction ID*: ${transactionId}\n`;
        receiptMessage += `\n_Thank you for your purchase!_\n`;

        console.log('Receipt message (no pump):', receiptMessage);

        // Initialize Twilio client
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
        
        const client = twilio(accountSid, authToken);

        // Send WhatsApp message
        const message = await client.messages.create({
            from: `whatsapp:${twilioPhone}`,
            to: to,
            body: receiptMessage
        });

        console.log('Receipt sent successfully:', message.sid);
        return res.status(200).json({ 
            success: true, 
            messageId: message.sid,
            message: 'Receipt sent successfully' 
        });

    } catch (error) {
        console.error('Error sending receipt:', error);
        return res.status(500).json({ 
            error: 'Failed to send receipt', 
            details: error.message 
        });
    }
};
