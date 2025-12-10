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
            pumpNumber, // This might be undefined if not provided
            transactionId
        } = req.body;

        // Validation
        if (!to || !amount || !litres || !fuelType || !paymentMethod || !serviceType) {
            return res.status(400).json({ 
                error: 'Missing required fields',
                required: ['to', 'amount', 'litres', 'fuelType', 'paymentMethod', 'serviceType']
            });
        }

        // Create receipt message WITHOUT pump information if not provided
        let receiptMessage = `*Fuel Receipt*\n`;
        receiptMessage += `---\n`;
        receiptMessage += `*Pump Station*: Petronas KL\n`;
        receiptMessage += `*Date*: ${new Date().toLocaleDateString('en-GB')}\n`;
        receiptMessage += `*Time*: ${new Date().toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' })}\n`;
        receiptMessage += `*Fuel Type*: ${fuelType}\n`;
        receiptMessage += `*Total Paid*: *RM ${parseFloat(amount).toFixed(2)}*\n`;
        receiptMessage += `*Litres*: ${parseFloat(litres).toFixed(2)}L\n`;
        receiptMessage += `*Price/Litre*: RM${parseFloat(pricePerLitre).toFixed(2)}\n`;
        receiptMessage += `*Payment Method*: ${paymentMethod}\n`;
        receiptMessage += `*Service Type*: ${serviceType}\n`;
        
        // Only include pump if provided and valid (not 0 or empty)
        if (pumpNumber && pumpNumber !== "0" && pumpNumber !== "") {
            receiptMessage += `*Pump Number*: ${pumpNumber}\n`;
        }
        
        receiptMessage += `---\n`;
        receiptMessage += `*Transaction ID*: ${transactionId || `TX-${Date.now()}`}\n`;
        receiptMessage += `\n_Thank you for your purchase!_\n`;

        // Log receipt data (for debugging)
        console.log('Sending receipt to:', to);
        console.log('Receipt message preview:', receiptMessage.substring(0, 100) + '...');

        // Initialize Twilio client
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
        
        // Check if Twilio credentials are set
        if (!accountSid || !authToken || !twilioPhone) {
            console.error('Twilio credentials missing');
            return res.status(500).json({ 
                error: 'Server configuration error',
                message: 'Twilio credentials not configured'
            });
        }

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
        
        // Provide more specific error messages
        let errorMessage = 'Failed to send receipt';
        let statusCode = 500;
        
        if (error.code === 21211) {
            errorMessage = 'Invalid phone number format';
            statusCode = 400;
        } else if (error.code === 21608) {
            errorMessage = 'WhatsApp not enabled for this number';
            statusCode = 400;
        } else if (error.code === 20003) {
            errorMessage = 'Authentication failed - check Twilio credentials';
            statusCode = 401;
        }
        
        return res.status(statusCode).json({ 
            error: errorMessage, 
            details: error.message,
            code: error.code
        });
    }
};
    }
};
